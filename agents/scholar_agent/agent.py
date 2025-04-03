from typing import List, Dict, Any
import requests
from datetime import datetime
import json

class ScholarAgent:
    def __init__(self):
        self.base_url = "https://api.semanticscholar.org/graph/v1"
        self.headers = {
            "Accept": "application/json"
        }

    def search_papers(self, query: str, limit: int = 10, offset: int = 0) -> Dict[str, Any]:
        """
        Search for academic papers using the Semantic Scholar API
        """
        try:
            # Construct the search URL
            search_url = f"{self.base_url}/paper/search"
            
            # Set up query parameters
            params = {
                "query": query,
                "limit": limit,
                "offset": offset,
                "fields": "paperId,title,abstract,authors,year,venue,citationCount,url"
            }
            
            # Make the API request
            response = requests.get(search_url, headers=self.headers, params=params)
            response.raise_for_status()
            
            # Parse the response
            data = response.json()
            
            # Process and format the results
            papers = []
            for paper in data.get("data", []):
                processed_paper = {
                    "id": paper.get("paperId"),
                    "title": paper.get("title"),
                    "abstract": paper.get("abstract"),
                    "authors": [author.get("name") for author in paper.get("authors", [])],
                    "year": paper.get("year"),
                    "venue": paper.get("venue"),
                    "citations": paper.get("citationCount"),
                    "url": paper.get("url"),
                    "timestamp": datetime.now().isoformat()
                }
                papers.append(processed_paper)
            
            return {
                "status": "success",
                "papers": papers,
                "total": data.get("total", 0),
                "offset": offset,
                "limit": limit
            }
            
        except requests.exceptions.RequestException as e:
            return {
                "status": "error",
                "message": f"API request failed: {str(e)}"
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"An error occurred: {str(e)}"
            }

    def get_paper_details(self, paper_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific paper
        """
        try:
            url = f"{self.base_url}/paper/{paper_id}"
            params = {
                "fields": "paperId,title,abstract,authors,year,venue,citationCount,url,references,citations"
            }
            
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            
            paper = response.json()
            
            return {
                "status": "success",
                "paper": {
                    "id": paper.get("paperId"),
                    "title": paper.get("title"),
                    "abstract": paper.get("abstract"),
                    "authors": [author.get("name") for author in paper.get("authors", [])],
                    "year": paper.get("year"),
                    "venue": paper.get("venue"),
                    "citations": paper.get("citationCount"),
                    "url": paper.get("url"),
                    "references": paper.get("references", []),
                    "cited_by": paper.get("citations", [])
                }
            }
            
        except requests.exceptions.RequestException as e:
            return {
                "status": "error",
                "message": f"API request failed: {str(e)}"
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"An error occurred: {str(e)}"
            } 