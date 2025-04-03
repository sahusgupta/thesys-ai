from typing import List, Dict, Any, Optional
import numpy as np
import torch
from transformers import AutoTokenizer, AutoModel

# 1) Import the new Pinecone client and (optionally) ServerlessSpec
from pinecone import Pinecone, ServerlessSpec

class VectorKnowledgeBase:
    def __init__(
        self,
        model_name: str = 'sentence-transformers/all-MiniLM-L6-v2',
        pinecone_api_key: str = None,
        pinecone_cloud: str = 'aws',        # e.g. "aws" or "gcp"
        pinecone_region: str = 'us-east-1', # e.g. "us-west-2" or "us-east1-gcp"
        index_name: str = 'thesys-knowledge-base'
    ):
        # Load tokenizer/model
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        
        # 2) Create a Pinecone client object
        self.pc = Pinecone(
            api_key=pinecone_api_key
            # Any other Pinecone configuration as needed
        )
        
        # 3) Check if index already exists; if not, create it
        #    With the new Python client, list_indexes() returns an object with .names(), so call .names() to get a list.
        existing_indexes = self.pc.list_indexes().names()
        if index_name not in existing_indexes:
            self.pc.create_index(
                name=index_name,
                dimension=384,   # matches the model output dimension
                metric='cosine',
                # If you need a serverless index in a particular region, set spec below:
                spec=ServerlessSpec(
                    cloud=pinecone_cloud,
                    region=pinecone_region
                )
            )
        
        # 4) Connect to the index
        self.index = self.pc.Index(index_name)

    def _encode_text(self, text: str) -> np.ndarray:
        with torch.no_grad():
            inputs = self.tokenizer(text, return_tensors='pt',
                                    truncation=True, max_length=512, padding=True)
            outputs = self.model(**inputs)
            embeddings = outputs.last_hidden_state.mean(dim=1)  # mean-pooling
        return embeddings.numpy().astype('float32')

    def store_document(self, document: str, metadata: Optional[Dict[str, Any]] = None):
        embedding = self._encode_text(document)
        doc_id = str(hash(document))  # unique-ish doc ID
        # Upsert to Pinecone
        self.index.upsert(
            vectors=[(
                doc_id,
                embedding[0].tolist(),
                {'document': document, 'metadata': metadata or {}}
            )]
        )

    def semantic_search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        query_embedding = self._encode_text(query)
        # Query Pinecone index
        search_results = self.index.query(
            vector=query_embedding[0].tolist(),
            top_k=top_k,
            include_metadata=True
        )
        results = []
        for match in search_results.matches:
            results.append({
                'document': match.metadata['document'],
                'metadata': match.metadata.get('metadata', {}),
                # Pinecone returns a similarity score if metric='cosine', 
                # so if you want distance you might do `1.0 - score`:
                'distance': 1.0 - match.score
            })
        return results

    def update_knowledge_graph(self, new_connections: List[Dict[str, Any]]):
        """Example method for upserting multiple embeddings."""
        for connection in new_connections:
            source = connection.get('source')
            target = connection.get('target')
            if source and target:
                source_embedding = self._encode_text(source)
                target_embedding = self._encode_text(target)
                source_id = str(hash(source))
                target_id = str(hash(target))
                self.index.upsert(vectors=[
                    (
                        source_id,
                        source_embedding[0].tolist(),
                        {'document': source, 'metadata': connection.get('source_metadata', {})}
                    ),
                    (
                        target_id,
                        target_embedding[0].tolist(),
                        {'document': target, 'metadata': connection.get('target_metadata', {})}
                    )
                ])

    def clear_index(self):
        """Delete all vectors in the index."""
        self.index.delete(delete_all=True)
