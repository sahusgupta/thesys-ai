from fastapi import FastAPI, Request
from task_manager import ThesysOrchestrator
from agents.scholar_agent import ScholarAgent
from agents.factcheck_agent import FactCheckAgent
from agents.context_agent import ContextAgent
from agents.citation_agent import CitationAgent
app = FastAPI()

scholar = ScholarAgent()
factcheck = FactCheckAgent()
context = ContextAgent()
citation = CitationAgent()

orchestrator = ThesysOrchestrator([scholar, context, factcheck, citation])

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