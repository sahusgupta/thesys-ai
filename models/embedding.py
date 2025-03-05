import openai
import faiss
import nltk


import spacy
from typing import List, Dict, Union
import os
from tqdm import tqdm

def chunk_extracted_text(text: str, chunk_size: int = 1000) -> List[str]:

    nlp = spacy.load("en_core_web_sm", disable=["ner", "tagger", "lemmatizer", "attribute_ruler"])
    nlp.max_length = 3000000  # Handle large documents
    
    doc = nlp(text)
    
    sentences = [sent.text.strip() for sent in doc.sents]
    
    chunks = []
    current_chunk = []
    current_word_count = 0
    
    for sentence in sentences:
        sentence_word_count = len(sentence.split())
        
        if current_word_count + sentence_word_count > chunk_size and current_chunk:
            chunks.append(" ".join(current_chunk))
            current_chunk = []
            current_word_count = 0
        
        current_chunk.append(sentence)
        current_word_count += sentence_word_count
    
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    return chunks

def embed_text(chunks: List[str]) -> List[tuple]:

    embeddings = []
    for text in tqdm(chunks, desc="Generating embeddings"):
        response = openai.Embedding.create(
            model="text-embedding-ada-002",
            input=text
        )
        embeddings.append(response.data[0].embedding)
    return list(zip(chunks, embeddings))

def create_faiss_index(embeddings_data: List[tuple]) -> tuple:

    # Extract just the embedding vectors
    embedding_vectors = [item[1] for item in embeddings_data]
    text_db = {i: embeddings_data[i][0] for i in range(len(embeddings_data))}
    import numpy as np
    vectors = np.array(embedding_vectors).astype("float32")
    vector_dim = len(vectors[0])
    index = faiss.IndexFlatL2(vector_dim)
    index.add(vectors)
    return index, text_db
    
