from typing import List, Dict, Any
import requests
from datetime import datetime
import logging
import json
import arxiv
import time

class ScholarAgent:
    def __init__(self, api_key=None):
        self.base_url = "https://api.semanticscholar.org/graph/v1"
        self.headers = {"Accept": "application/json"}
        
        # Add API key if available (recommended to avoid stricter rate limits)
        if api_key:
            self.headers["x-api-key"] = api_key
            
        # Initialize paper repository
        
        # Configure logging
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
        self.logger = logging.getLogger(__name__)
        
        # Rate limiting parameters
        self.max_retries = 3
        self.retry_delay = 1  # Initial delay in seconds
        
        # ArXiv API client
        self.arxiv_client = arxiv.Client(
            page_size=10,
            delay_seconds=3.0,
            num_retries=3
        )
    
    def _make_request_with_backoff(self, url, params=None):
        """Helper method to make API requests with exponential backoff"""
        retries = 0
        while retries <= self.max_retries:
            try:
                response = requests.get(url, headers=self.headers, params=params)
                
                # If successful, return the response
                if response.status_code == 200:
                    return response
                
                # If rate limited, try ArXiv instead
                if response.status_code == 429:
                    self.logger.warning("Rate limited by Semantic Scholar. Falling back to ArXiv API.")
                    return None
                
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

    def _search_arxiv(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search papers using ArXiv API"""
        try:
            search = arxiv.Search(
                query=query,
                max_results=limit,
                sort_by=arxiv.SortCriterion.Relevance
            )
            
            papers = []
            for result in self.arxiv_client.results(search):
                paper = {
                    "id": result.entry_id,
                    "title": result.title,
                    "abstract": result.summary,
                    "authors": [author.name for author in result.authors],
                    "year": result.published.year,
                    "venue": "arXiv",
                    "citations": None,  # ArXiv doesn't provide citation counts
                    "url": result.pdf_url,
                    "timestamp": datetime.now().isoformat()
                }
                papers.append(paper)
            
            return papers
            
        except Exception as e:
            self.logger.error(f"ArXiv API error: {str(e)}")
            return []

    async def search_papers(self, query: str, limit: int = 10, offset: int = 0) -> Dict[str, Any]:
        """Search papers using OpenSearch and fall back to Semantic Scholar if needed"""
        try:
            # First try OpenSearch
            search_results = self.paper_repository.search_client.search(
                index="papers",
                body={
                    "query": {
                        "multi_match": {
                            "query": query,
                            "fields": ["title^3", "abstract^2", "content"]
                        }
                    },
                    "size": limit,
                    "from": offset
                }
            )
            
            papers = []
            for hit in search_results['hits']['hits']:
                paper_data = hit['_source']
                papers.append({
                    'id': hit['_id'],
                    'title': paper_data['title'],
                    'abstract': paper_data['abstract'],
                    'authors': paper_data['authors'],
                    'year': paper_data['year'],
                    'venue': paper_data['venue'],
                    'score': hit['_score']
                })
            
            if papers:
                return {
                    'status': 'success',
                    'papers': papers,
                    'total': search_results['hits']['total']['value']
                }
            
            # If no results, fall back to Semantic Scholar API
            return await self._search_semantic_scholar(query, limit, offset)
            
        except Exception as e:
            self.logger.error(f"Search error: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }

    async def get_paper_details(self, paper_id: str) -> Dict[str, Any]:
        """Get paper details from local storage or Semantic Scholar"""
        try:
            # First check local database
            with self.paper_repository.db.cursor() as cur:
                cur.execute("""
                    SELECT id, title, authors, year, venue, abstract, s3_key
                    FROM papers WHERE id = %s
                """, (paper_id,))
                result = cur.fetchone()
                
                if result:
                    # Generate presigned URL for PDF if available
                    pdf_url = None
                    if result[6]:  # s3_key
                        pdf_url = self.paper_repository.get_paper_url(paper_id)
                    
                    return {
                        'status': 'success',
                        'paper': {
                            'id': result[0],
                            'title': result[1],
                            'authors': result[2],
                            'year': result[3],
                            'venue': result[4],
                            'abstract': result[5],
                            'pdf_url': pdf_url
                        }
                    }
            
            # If not found locally, fetch from Semantic Scholar
            return await self._fetch_semantic_scholar_paper(paper_id)
            
        except Exception as e:
            self.logger.error(f"Error fetching paper details: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }