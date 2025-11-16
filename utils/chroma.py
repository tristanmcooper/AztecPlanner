import uuid
import chromadb

class ChromaVectorStore:
    def __init__(self):
        self.client = chromadb.PersistentClient(path="./chroma_db")
        self.cs_collection = self.client.get_or_create_collection(
            name="cs classes",
        )
        self.ge_collection = self.client.get_or_create_collection(
            name="ge classes",
        )
        self.rating_collection = self.client.get_or_create_collection(
            name="rateMyProf Claseses",
        )

    def collection_selector(self, collection_name):
        if collection_name == "cs classes":
            return self.cs_collection
        elif collection_name == "ge classes":
            return self.ge_collection
        elif collection_name == "rateMyProf Claseses":
            return self.rating_collection
        else:
            raise ValueError(f"Collection '{collection_name}' does not exist.")

    def add_document(self, document_text, collection_name):
        document_id = str(uuid.uuid4())
        collection = self.collection_selector(collection_name)
        collection.add(documents=[document_text], ids=[document_id])
        return document_id

    def query_similar_documents(self, query_text, n_results, collection_name):
        collection = self.collection_selector(collection_name)
        results = collection.query(query_texts=[query_text], n_results=n_results)
        return results["documents"][0]

    def clear_collection(self, collection_name):
        self.client.delete_collection(name=collection_name)
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
        )

    def reset_all_collections(self):
        for collection_name in ["cs classes", "ge classes", "rateMyProf Claseses"]:
            self.clear_collection(collection_name)

    
