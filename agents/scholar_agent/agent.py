# agents/scholar_agent/agent.py
from typing import Dict, Any
from crossref.restful import Works
from models.summarization import generate_summary

class ScholarAgent:
    """
    The ScholarAgent handles searching external academic databases (CrossRef) 
    and optionally summarizing the found results to return 'summary' + 'sources'.
    """
    def __init__(self):
        self.works_api = Works()

    def process_query(self, query: str) -> Dict[str, Any]:
        """
        Called by the orchestrator or other code to search CrossRef using 'query'
        and produce a short summary of top results plus a 'sources' list.
        """
        try:
            # Search Crossref for up to 3 papers
            search_results = self.works_api.query(query).sort("relevance").rows(3)
            papers = list(search_results)

            if not papers:
                return {
                    "summary": f"No papers found for '{query}'.",
                    "sources": [],
                    "error": None
                }

            # Combine text from top results
            combined_text = ""
            sources_list = []
            for paper in papers:
                title_list = paper.get("title", ["Unknown title"])
                title = "; ".join(title_list)
                abstract = paper.get("abstract", "")
                authors = paper.get("author", [])
                author_str = ", ".join([
                    f"{auth.get('given', '')} {auth.get('family', '')}".strip()
                    for auth in authors
                ]) or "Unknown Authors"

                snippet = f"Title: {title}\nAuthors: {author_str}\nAbstract: {abstract}\n"
                combined_text += snippet + "\n"

                # For 'sources'
                year = "UnknownYear"
                published = paper.get("published-print") or paper.get("published-online")
                if published:
                    date_parts = published.get("date-parts", [[]])[0]
                    if date_parts:
                        year = str(date_parts[0])
                sources_list.append(f"{title} ({year}), by {author_str}")

            # Summarize with your summarization logic
            summary_data = generate_summary(
                text=combined_text,
                prompt="Crossref Papers",
                discipline="Academic Searching"
            )
            if "Error" in summary_data:
                summary_text = f"Could not summarize: {summary_data['Error']}"
            else:
                summary_text = "\n".join([
                    f"{k}: {v}" for k, v in summary_data.items()
                ])

            return {
                "summary": summary_text.strip(),
                "sources": sources_list,
                "error": None
            }

        except Exception as e:
            return {
                "summary": "",
                "sources": [],
                "error": str(e)
            }

    def process_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Called by AgentCommunicationProtocol when this agent receives a message dict.
        Usually includes 'sender', 'content', etc. 
        We'll look for content['text'] to pass to process_query.
        """
        user_text = message["content"].get("text", "")
        result = self.process_query(user_text)
        return {
            "message_id": message["id"],
            "result": result
        }
