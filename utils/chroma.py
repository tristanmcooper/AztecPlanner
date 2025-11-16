import json
import uuid
from pathlib import Path
import logging

import chromadb
import shutil


class ChromaVectorStore:
    def __init__(self, db_path: str = "./chroma_db"):
        self.db_path = Path(db_path)
        # Ensure the persistent chroma DB directory is removed on startup so
        # the store starts empty every time the server process starts.
        try:
            if self.db_path.exists():
                shutil.rmtree(self.db_path)
        except Exception:
            logging.getLogger("chroma").exception("Failed to clear existing chroma DB at %s", self.db_path)

        self.client = chromadb.PersistentClient(path=str(self.db_path))
        self.collection = self.client.get_or_create_collection(name="allData")

    def _get_collection(self, collection_name: str):
        if not collection_name:
            raise ValueError("collection_name is required")
        return self.collection

    def add_document(self, document_text: str, collection_name: str):
        document_id = str(uuid.uuid4())
        self.collection.add(documents=[document_text], ids=[document_id])
        return document_id

    def add_documents(self, document_texts, collection_name: str):
        """Add a list of documents to the named collection and return their ids.

        document_texts: iterable of strings
        collection_name: string name for the collection
        """
        if not isinstance(document_texts, (list, tuple)):
            raise ValueError("'document_texts' must be a list or tuple of strings")
        ids = [str(uuid.uuid4()) for _ in document_texts]
        self.collection.add(documents=list(document_texts), ids=ids)
        return ids

    def query_similar_documents(self, query_text, n_results, collection_name: str):
        results = self.collection.query(query_texts=[query_text], n_results=n_results)
        return results.get("documents")

    def clear_collection(self, collection_name: str):
        # delete then recreate to ensure a clean state
        try:
            self.client.delete_collection(name=collection_name)
        except Exception:
            logging.getLogger("chroma").exception("Failed to delete collection %s", collection_name)
        # Ensure `self.collection` points to a valid collection object after deletion
        try:
            self.collection = self.client.get_or_create_collection(name=collection_name)
        except Exception:
            logging.getLogger("chroma").exception("Failed to recreate collection %s", collection_name)

    def reset_all_collections(self):
        # convenience to reset commonly used collections
        for name in ["allData"]:
            try:
                self.clear_collection(name)
            except Exception:
                logging.getLogger("chroma").exception("Failed to clear collection %s", name)

    def populate_from_dir(self, data_dir: str | Path, collection_name: str = "allData", force: bool = False):
        """Load all JSON files from `data_dir` and add them to the given collection.

        - If `force` is False the method will skip population when the chroma
          database path already exists and contains files (to avoid duplicate
          population on every server start).
        - Each top-level JSON array element becomes one document. If an element
          contains a `text` field it will be used verbatim; otherwise the
          element is converted to a compact JSON string.
        """
        data_path = Path(data_dir)
        logger = logging.getLogger("chroma.populate")

        # If DB path already exists and is non-empty, skip unless forced
        if not force and self.db_path.exists():
            try:
                if any(self.db_path.iterdir()):
                    logger.info("Chroma DB at %s already exists and is non-empty; skipping auto-populate", self.db_path)
                    return
            except Exception:
                # if we can't read the dir, proceed to attempt population
                pass

        if not data_path.exists() or not data_path.is_dir():
            logger.warning("Data directory %s does not exist; nothing to populate", data_path)
            return

        documents = []
        for p in sorted(data_path.iterdir()):
            if p.is_file() and p.suffix.lower() == ".json":
                try:
                    text = p.read_text(encoding="utf-8")
                    parsed = json.loads(text)
                except Exception as e:
                    logger.exception("Failed to read/parse %s: %s", p, e)
                    continue

                # If the file is a list, iterate elements; otherwise treat whole file as one document
                if isinstance(parsed, list):
                    for item in parsed:
                        if isinstance(item, dict) and "text" in item and isinstance(item["text"], str):
                            documents.append(item["text"])
                        else:
                            documents.append(json.dumps(item, ensure_ascii=False))
                else:
                    if isinstance(parsed, dict) and "text" in parsed and isinstance(parsed["text"], str):
                        documents.append(parsed["text"])
                    else:
                        documents.append(json.dumps(parsed, ensure_ascii=False))

        if not documents:
            logger.info("No documents found in %s to populate", data_path)
            return

        try:
            self.add_documents(documents, collection_name)
            logger.info("Populated chroma collection '%s' with %d documents from %s", collection_name, len(documents), data_path)
        except Exception as e:
            logger.exception("Failed to populate chroma collection: %s", e)


# Initialize a module-level Chroma store and auto-populate it from the
# `utils/data` directory on import. This ensures chroma starts empty every
# server start and is populated with the project's JSON data automatically.
try:
    _data_dir = Path(__file__).parent / "data"
    chroma_store = ChromaVectorStore()
    # Force population to ensure the freshly-created DB is filled.
    chroma_store.populate_from_dir(_data_dir, collection_name="allData", force=True)
except Exception:
    logging.getLogger("chroma").exception("Failed to initialize chroma store on import")


