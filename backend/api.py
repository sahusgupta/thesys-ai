from fastapi import FastAPI
from agents.citation_agent.utils import fetch_crossref_metadata
from models.citation import format_citation

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
