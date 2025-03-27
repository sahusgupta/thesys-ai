from typing import List, Dict, Any, Optional
import numpy as np
import torch
from transformers import AutoTokenizer, AutoModel
import pinecone

class VectorKnowledgeBase:
    def __init__(self, model_name: str = 'sentence-transformers/all-MiniLM-L6-v2',
                 pinecone_api_key: str = None,
                 pinecone_environment: str = None,
                 index_name: str = 'thesys-knowledge-base'):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        
        # Initialize Pinecone
        pinecone.init(api_key=pinecone_api_key, environment=pinecone_environment)
        
        # Create index if it doesn't exist
        if index_name not in pinecone.list_indexes():
            pinecone.create_index(
                name=index_name,
                dimension=384,  # matches the model's output dimension
                metric='cosine'
            )
        
        self.index = pinecone.Index(index_name)

    def _encode_text(self, text: str) -> np.ndarray:
        with torch.no_grad():
            inputs = self.tokenizer(text, return_tensors='pt', truncation=True, max_length=512, padding=True)
            outputs = self.model(**inputs)
            embeddings = outputs.last_hidden_state.mean(dim=1)
        return embeddings.numpy().astype('float32')

    def store_document(self, document: str, metadata: Optional[Dict[str, Any]] = None):
        embedding = self._encode_text(document)
        
        # Create a unique ID for the document
        doc_id = str(hash(document))
        
        # Store in Pinecone
        self.index.upsert(
            vectors=[(doc_id, embedding[0].tolist(), {
                'document': document,
                'metadata': metadata or {}
            })]
        )

    def semantic_search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        query_embedding = self._encode_text(query)
        
        # Search in Pinecone
        search_results = self.index.query(
            vector=query_embedding[0].tolist(),
            top_k=top_k,
            include_metadata=True
        )
        
        results = []
        for match in search_results.matches:
            results.append({
                'document': match.metadata['document'],
                'metadata': match.metadata['metadata'],
                'distance': 1 - match.score  # Convert cosine similarity to distance
            })
        
        return results

    def update_knowledge_graph(self, new_connections: List[Dict[str, Any]]):
        for connection in new_connections:
            source = connection.get('source')
            target = connection.get('target')
            if source and target:
                source_embedding = self._encode_text(source)
                target_embedding = self._encode_text(target)
                
                # Create unique IDs
                source_id = str(hash(source))
                target_id = str(hash(target))
                
                # Store in Pinecone
                self.index.upsert(vectors=[
                    (source_id, source_embedding[0].tolist(), {
                        'document': source,
                        'metadata': connection.get('source_metadata', {})
                    }),
                    (target_id, target_embedding[0].tolist(), {
                        'document': target,
                        'metadata': connection.get('target_metadata', {})
                    })
                ])

    def clear_index(self):
        # Delete all vectors in the index
        self.index.delete(delete_all=True)