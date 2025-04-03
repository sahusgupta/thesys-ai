from typing import List, Dict, Any
import requests
from datetime import datetime
import logging
import json

class ScholarAgent:
    def __init__(self, api_key=None):
        self.base_url = "https://api.semanticscholar.org/graph/v1"
        self.headers = {"Accept": "application/json"}
        
        # Add API key if available (recommended to avoid stricter rate limits)
        if api_key:
            self.headers["x-api-key"] = api_key
            
        # Configure logging
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
        self.logger = logging.getLogger(__name__)
        
        # Rate limiting parameters
        self.max_retries = 3
        self.retry_delay = 1  # Initial delay in seconds
    
    def _make_request_with_backoff(self, url, params=None):
        """Helper method to make API requests with exponential backoff"""
        retries = 0
        while retries <= self.max_retries:
            try:
                response = requests.get(url, headers=self.headers, params=params)
                
                # If successful, return the response
                if response.status_code == 200:
                    return response
                
                # If rate limited, implement backoff
                if response.status_code == 429:
                    wait_time = self.retry_delay * (2 ** retries)
                    self.logger.warning(f"Rate limited. Waiting {wait_time} seconds before retry.")
                    time.sleep(wait_time)
                    retries += 1
                    continue
                
                # For other errors, raise the exception
                response.raise_for_status()
                
            except requests.exceptions.RequestException as e:
                if retries == self.max_retries:
                    raise e
                retries += 1
                wait_time = self.retry_delay * (2 ** retries)
                self.logger.warning(f"Request failed. Retrying in {wait_time} seconds. Error: {str(e)}")
                time.sleep(wait_time)
        
        raise requests.exceptions.RequestException(f"Max retries ({self.max_retries}) exceeded")

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
                "fields": "title,abstract,authors,year,venue,citationCount,url"
            }
            
            # Make the API request with backoff
            self.logger.info(f"Searching for papers with query: {query}")
            response = self._make_request_with_backoff(search_url, params=params)
            
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
            
            self.logger.info(f"Found {len(papers)} papers")
            return {
                "status": "success",
                "papers": papers,
                "total": data.get("total", 0),
                "offset": offset,
                "limit": limit
            }
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"API request failed: {str(e)}")
            return {
                "status": "error",
                "message": f"API request failed: {str(e)}"
            }
        except Exception as e:
            self.logger.error(f"An error occurred: {str(e)}")
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
            
            self.logger.info(f"Getting details for paper ID: {paper_id}")
            response = self._make_request_with_backoff(url, params=params)
            
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
            self.logger.error(f"API request failed: {str(e)}")
            return {
                "status": "error",
                "message": f"API request failed: {str(e)}"
            }
        except Exception as e:
            self.logger.error(f"An error occurred: {str(e)}")
            return {
                "status": "error",
                "message": f"An error occurred: {str(e)}"
            }