# agents/citation_agent/agent.py
from typing import Dict, Any
import re
from crossref.restful import Works
from models.citation import format_citation

class CitationAgent:
    """
    The CitationAgent handles generating properly formatted citations 
    by querying CrossRef if we detect a DOI or 'title:'.
    """
    def __init__(self):
        self.works_api = Works()

    def process_query(self, query: str) -> Dict[str, Any]:
        """
        1. Determine citation style from the query (APA, MLA, IEEE).
        2. Extract a DOI or a 'title: ...' from the query to look up in CrossRef.
        3. Format the returned metadata into a citation using 'citation.py'.
        """
        style = "APA"
        lower_q = query.lower()
        if "mla" in lower_q:
            style = "MLA"
        elif "ieee" in lower_q:
            style = "IEEE"

        # Attempt to parse out a 'doi:' or 'title:' from the query
        doi_match = re.search(r"(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)", query)
        title_match = re.search(r"title:\s*(.*)", query, re.IGNORECASE)

        try:
            metadata = None
            if doi_match:
                found_doi = doi_match.group(1)
                result = self.works_api.doi(found_doi)
                if result:
                    metadata = result
            elif title_match:
                title_text = title_match.group(1).strip()
                search = self.works_api.query(title_text).sort("relevance").order("desc").limit(1)
                results_list = list(search)
                if results_list:
                    metadata = results_list[0]

            if not metadata:
                return {
                    "citations": ["No valid metadata found for your reference."],
                    "error": None
                }

            # call format_citation from your citation.py
            citation_str = format_citation(metadata, style=style)

            return {
                "citations": [citation_str],
                "error": None
            }

        except Exception as e:
            return {
                "citations": [],
                "error": str(e)
            }

    def process_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        user_text = message["content"].get("text", "")
        result = self.process_query(user_text)
        return {
            "message_id": message["id"],
            "result": result
        }
