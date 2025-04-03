# agents/factcheck_agent/agent.py
from typing import Dict, Any
from crossref.restful import Works
import requests

class FactCheckAgent:
    """
    The FactCheckAgent checks claims by:
     - Searching CrossRef for references to the claim
     - Possibly calling a public FactCheck.org or other service
     - Returning a 'factcheck_score' & 'evaluation'
     - 'verify_information(...)' merges or modifies data from other agents
    """
    def __init__(self):
        self.works_api = Works()
        # Example external fact-check endpoint 
        self.factcheck_api = "https://api.factchecktools.googleapis.com/v1alpha1/claims:search"

    def process_query(self, query: str) -> Dict[str, Any]:
        """
        Minimal approach: 
         1. Check references from CrossRef
         2. Possibly call external FactCheck API if 'check claim:' found
         3. Return 'factcheck_score', 'evaluation'
        """
        lower_q = query.lower()
        factcheck_score = 0.5
        evaluation = "No strong evidence found."

        try:
            # 1) Crossref search for the claim
            crossref_results = self.works_api.query(query).sort("score").rows(2)
            found_papers = list(crossref_results)
            if found_papers:
                factcheck_score = 0.7
                evaluation = "Found some references in Crossref. Claim might have academic coverage."

            # 2) If 'factcheck:' or 'verify:' in query, call an example FactCheck endpoint
            if "factcheck:" in lower_q or "verify:" in lower_q:
                # This would require a valid factchecktools API key, etc.
                # We'll do a minimal logic
                # real usage: response = requests.get(self.factcheck_api, params={"query": query, "key": FACTCHECK_API_KEY})
                # parse response...
                factcheck_score += 0.1
                evaluation += " External fact-check suggests partial support."

            # Adjust if user specifically wrote "false?" or "true?"
            if "false?" in lower_q:
                factcheck_score = 1 - factcheck_score
                evaluation += " The query implies negativity about the claim."

            # clamp the score
            factcheck_score = max(0.0, min(factcheck_score, 1.0))

            return {
                "factcheck_score": factcheck_score,
                "evaluation": evaluation,
                "error": None
            }

        except Exception as e:
            return {
                "factcheck_score": 0.0,
                "evaluation": "An error occurred during fact-checking.",
                "error": str(e)
            }

    def verify_information(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Called in orchestrator._validate_agent_responses to combine or confirm data.
        We set 'verified' = True if factcheck_score >= 0.7, e.g.
        """
        score = data.get("factcheck_score", 0.0)
        data["verified"] = (score >= 0.7)
        return data

    def process_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        For agent_communication usage. 
        """
        user_text = message["content"].get("text", "")
        result = self.process_query(user_text)
        return {
            "message_id": message["id"],
            "result": result
        }
