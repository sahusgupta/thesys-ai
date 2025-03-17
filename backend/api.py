from fastapi import FastAPI, Request
from agents.citation_agent.utils import fetch_crossref_metadata
from models.citation import format_citation
from models.summarization import generate_summary, extract_keywords, filter_sentences

app = FastAPI()

@app.get("/citation/")
def get_citation(doi: str, style: str = "APA"):
    """
    API Endpoint to fetch citation in different formats.
    """
    metadata = fetch_crossref_metadata(doi)
    if not metadata:
        return {"error": "Invalid DOI or metadata not found"}
    
    return {"citation": format_citation(metadata, style)}

@app.post("/summarize/")
def summarization(request: Request):
    data = request.json()
    text = data.get("text")