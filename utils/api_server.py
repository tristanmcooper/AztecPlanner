"""Lightweight HTTP API to expose LLM, Chroma, and CourseDB functionality.

Expected base url:
http://127.0.0.1:8000/

Endpoints:
- GET  /health
- GET  /courses               (query params: prefix)
- GET  /courses/search        (query param: q)
- GET  /courses/{code}
- POST /chroma/add            (json: {collection, document})
- POST /chroma/query          (json: {collection, query, n_results})
- POST /llm                   (json: {system_prompt?, message})
- POST /rag                   (json: {message})

This module uses FastAPI. If FastAPI/uvicorn aren't installed yet, the
module is still importable for static checks; to run the server install
requirements and run `uvicorn api_server:app --reload`.
"""
from __future__ import annotations


from typing import Any, Dict, List, Optional
import logging
# Lazy import pattern: imports that require third-party packages are executed
# inside create_app so the module can be imported by static tools without
# immediately needing installed dependencies.


def create_app() -> "FastAPI":
    """Create and return a FastAPI app wired to the project's utilities."""
    try:
        from fastapi import FastAPI, HTTPException
        from fastapi.middleware.cors import CORSMiddleware
        from pydantic import BaseModel
    except Exception as e:  # pragma: no cover - helpful error when deps missing
        raise RuntimeError(
            "FastAPI and its dependencies are required to create the app. "
            "Install requirements.txt and try again. Original error: " + str(e)
        )

    # local imports from utils
    from utils.course_db import CourseDB
    # chroma may require optional third-party deps; import safely
    try:
        from utils.chroma import ChromaVectorStore
    except Exception:
        ChromaVectorStore = None
    # llm module may or may not instantiate a workable client depending on env
    try:
        from utils.llm import lite_llm
    except Exception:
        lite_llm = None

    app = FastAPI(title="AztecPlanner API", version="0.1")

    # Configure a dedicated logger for this module. Prefer propagation so
    # Uvicorn's configured handlers display the messages. Only add a local
    # handler when no root handlers exist (e.g., running standalone).
    logger = logging.getLogger("api_server")
    logger.setLevel(logging.INFO)
    # If there are no handlers on the root logger, add one so logs appear
    # when running the module directly (outside of Uvicorn's logging).
    if not logging.getLogger().handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
        logger.addHandler(handler)
    # Allow messages to propagate to parent handlers (Uvicorn's handlers)
    logger.propagate = True

    # Allow local front-end to call the API during development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- simple pydantic models ---
    class LLMRequest(BaseModel):
        message: str
        system_prompt: Optional[str] = ""

    class ChromaAddRequest(BaseModel):
        collection: str
        document: str

    class ChromaAddBatchRequest(BaseModel):
        collection: str
        documents: List[str]

    class ChromaQueryRequest(BaseModel):
        collection: str
        query: str
        n_results: Optional[int] = 3

    # --- initialize service instances ---
    course_db = CourseDB()  # uses utils/data/sdsu_cs_courses.json by default

    # Provide a lightweight dummy fallback when chroma isn't available so
    # the API can still start for endpoints that don't require vectors.
    class _DummyChroma:
        def add_document(self, document_text, collection_name):
            raise RuntimeError("Chroma client not available in this environment")

        def add_documents(self, document_texts, collection_name):
            raise RuntimeError("Chroma client not available in this environment")

        def query_similar_documents(self, query_text, n_results, collection_name):
            return []

        def clear_collection(self, collection_name):
            raise RuntimeError("Chroma client not available in this environment")

        def reset_all_collections(self):
            raise RuntimeError("Chroma client not available in this environment")

        def populate_from_dir(self, data_dir, collection_name="allData", force=False):
            return

    if ChromaVectorStore is None:
        chroma = _DummyChroma()
        logging.getLogger("api_server").warning(
            "ChromaVectorStore not importable; running with dummy chroma (vector features disabled)"
        )
    else:
        try:
            chroma = ChromaVectorStore()
        except Exception:
            logging.getLogger("api_server").exception("Failed to initialize ChromaVectorStore; using dummy fallback")
            chroma = _DummyChroma()

    # Auto-populate chroma from utils/data if possible (no-op for dummy)
    try:
        from pathlib import Path
        data_dir = Path(__file__).parent / "data"
        if hasattr(chroma, "populate_from_dir"):
            chroma.populate_from_dir(data_dir, collection_name="allData")
    except Exception:
        logger = logging.getLogger("api_server")
        logger.exception("Failed to auto-populate Chroma DB from utils/data")

    @app.get("/health")
    def health() -> Dict[str, Any]:
        return {
            "status": "ok",
            "lite_llm": bool(lite_llm),
            "chroma_collections": ["allClasses", "rateMyProfClasses"],
        }

    # --- course DB endpoints ---
    @app.get("/courses")
    def list_courses(prefix: Optional[str] = None) -> List[Dict[str, Any]]:
        if prefix:
            return course_db.query_codes(prefix)
        return course_db.get_all()

    @app.get("/courses/search")
    def search_courses(q: str) -> List[Dict[str, Any]]:
        return course_db.search(q)

    @app.get("/courses/{code}")
    def get_course(code: str):
        c = course_db.get(code)
        if not c:
            raise HTTPException(status_code=404, detail="Course not found")
        return c

    # --- chroma endpoints ---
    @app.post("/chroma/add")
    def chroma_add(payload: Dict[str, Any]):
        """Accept raw JSON and validate keys manually to provide clearer errors.

        This avoids returning FastAPI 422 when callers send slightly different
        payloads. We still enforce the required fields and types here.
        """
        try:
            collection = payload.get("collection")
            document = payload.get("document")
            if not collection or not isinstance(collection, str):
                raise HTTPException(status_code=400, detail="'collection' is required and must be a string")
            if not document or not isinstance(document, str):
                raise HTTPException(status_code=400, detail="'document' is required and must be a string")

            doc_id = chroma.add_document(document, collection)
            return {"id": doc_id}
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            # Log the full exception with traceback so the server logs contain
            # useful diagnostics for why the chroma add endpoint failed.
            logging.getLogger("api_server").exception("Unhandled error in /chroma/add: %s", e)
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/chroma/query")
    def chroma_query(payload: Dict[str, Any]):
        try:
            collection = payload.get("collection")
            query_text = payload.get("query")
            n_results = payload.get("n_results", 3)

            if not collection or not isinstance(collection, str):
                raise HTTPException(status_code=400, detail="'collection' is required and must be a string")
            if not query_text or not isinstance(query_text, str):
                raise HTTPException(status_code=400, detail="'query' is required and must be a string")
            try:
                n_results = int(n_results)
            except Exception:
                raise HTTPException(status_code=400, detail="'n_results' must be an integer")

            results = chroma.query_similar_documents(query_text, n_results, collection)
            return {"results": results}
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logging.getLogger("api_server").exception("Unhandled error in /chroma/query: %s", e)
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/chroma/add_batch")
    def chroma_add_batch(payload: Dict[str, Any]):
        """Add multiple documents to a collection in one request.

        Expected JSON: {"collection": "allClasses", "documents": ["doc1", "doc2", ...]}
        Returns: {"ids": [...]} on success.
        """
        try:
            collection = payload.get("collection")
            documents = payload.get("documents")

            if not collection or not isinstance(collection, str):
                raise HTTPException(status_code=400, detail="'collection' is required and must be a string")
            if not isinstance(documents, (list, tuple)):
                raise HTTPException(status_code=400, detail="'documents' is required and must be a list of strings")
            if any(not isinstance(d, str) for d in documents):
                raise HTTPException(status_code=400, detail="all 'documents' entries must be strings")

            ids = chroma.add_documents(documents, collection)
            return {"ids": ids}
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logging.getLogger("api_server").exception("Unhandled error in /chroma/add_batch: %s", e)
            raise HTTPException(status_code=500, detail=str(e))

    # --- LLM endpoint ---
    @app.post("/llm")
    def call_llm(payload: Dict[str, Any]):
        try:
            message = payload.get("message")
            system_prompt = payload.get("system_prompt", "")
            if not message or not isinstance(message, str):
                raise HTTPException(status_code=400, detail="'message' is required and must be a string")

            if not lite_llm:
                raise HTTPException(status_code=503, detail="LLM client not configured on server")
            resp = lite_llm.send_message(system_prompt or "", message)
            if resp is None:
                raise HTTPException(status_code=500, detail="LLM call failed")
            return {"reply": resp}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        
    @app.post("/rag")
    def rag_query(payload: Dict[str, Any]):
        try:
            message = payload.get("message")
            collection = "allClasses"
            n_results = 5

            # Validate incoming message
            if not message or not isinstance(message, str):
                raise HTTPException(status_code=400, detail="'message' is required and must be a string")

            if not lite_llm:
                raise HTTPException(status_code=503, detail="LLM client not configured on server")

            # Retrieve similar documents from the vector store
            context_results = chroma.query_similar_documents(message, n_results, collection)

            # chromadb returns documents as a list-of-lists when querying with
            # a single query (one inner list per query). Flatten that shape
            # to a simple list of strings for joining.
            if isinstance(context_results, list) and len(context_results) > 0 and isinstance(context_results[0], list):
                docs = context_results[0]
            else:
                docs = context_results

            # Ensure all retrieved docs are strings before joining
            docs = [str(d) for d in docs]

            # Combine retrieved documents into a single context string and
            # provide it in the system prompt while sending the original
            # user question as the user message.
            context = "\n\n".join(docs)
            system_prompt = f"Answer the question [{message}] using the following context. ONLY USE CONTEXT, DO NOT USE YOUR OWN INFORMATION:"
            resp = lite_llm.send_message(system_prompt, context)
            logging.getLogger("api_server").info("RAG context: %s", context)
            # logging.getLogger("api_server").info("llm response: %s", resp)
            if resp is None:
                raise HTTPException(status_code=500, detail="LLM call failed")

            return {"reply": resp, "retrieved_documents": docs}
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    return app


# expose `app` for uvicorn: will raise if FastAPI is not installed when create_app is called
try:
    app = create_app()
except Exception:
    # Keep module importable even if dependencies are missing; provide a minimal
    # FastAPI fallback so the module-level `app` is always a callable ASGI
    # application. This prevents Uvicorn from receiving `None` which leads to
    # a confusing TypeError in middleware.
    logging.getLogger("api_server").exception("create_app() failed; providing minimal fallback FastAPI app")
    try:
        from fastapi import FastAPI
        app = FastAPI(title="AztecPlanner API (fallback)", version="0.0")
    except Exception:
        # If FastAPI isn't installed at all, provide a very small ASGI app
        def app(scope):
            raise RuntimeError("FastAPI not available and create_app failed")


if __name__ == "__main__":
    # minimal ad-hoc runner for local development. Requires uvicorn installed.
    import uvicorn
    import logging

    if app is None:
        raise SystemExit("App not available. Install dependencies from requirements.txt and try again.")

    uvicorn.run("api_server:app", host="127.0.0.1", port=8000, reload=True)
