# agents/citation_agent/agent.py
from typing import List, Dict, Any, Optional
import logging
import requests
from datetime import datetime
import json
import re
from crossref.restful import Works
from models.citation import format_citation

class CitationAgent:
    """
    The CitationAgent handles generating properly formatted citations 
    by querying CrossRef if we detect a DOI or 'title:'.
    """
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.works_api = Works()
        self.semantic_scholar_api = "https://api.semanticscholar.org/graph/v1"
        self.arxiv_api = "http://export.arxiv.org/api/query"

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

    def generate_citation(self, source: Dict[str, Any], style: str = "apa") -> str:
        """Generate a citation for a source in the specified style."""
        try:
            if source.get('type') == 'paper':
                return self._generate_paper_citation(source, style)
            elif source.get('type') == 'webpage':
                return self._generate_webpage_citation(source, style)
            else:
                return self._generate_generic_citation(source, style)
        except Exception as e:
            self.logger.error(f"Error generating citation: {str(e)}")
            return "Citation unavailable"

    def _generate_paper_citation(self, paper: Dict[str, Any], style: str) -> str:
        """Generate a citation for a paper."""
        try:
            authors = paper.get('authors', [])
            year = paper.get('year', datetime.now().year)
            title = paper.get('title', '')
            venue = paper.get('venue', '')
            url = paper.get('url', '')

            if style.lower() == 'apa':
                # APA style: Author, A. A., & Author, B. B. (Year). Title of article. Journal Name, Volume(Issue), pages.
                author_str = self._format_authors_apa(authors)
                return f"{author_str} ({year}). {title}. {venue}. {url}"
            elif style.lower() == 'mla':
                # MLA style: Author, A. A., and B. B. Author. "Title of Article." Journal Name, vol. Volume, no. Issue, Year, pages.
                author_str = self._format_authors_mla(authors)
                return f"{author_str}. \"{title}.\" {venue}, {year}. {url}"
            else:
                # Default to APA style
                author_str = self._format_authors_apa(authors)
                return f"{author_str} ({year}). {title}. {venue}. {url}"
        except Exception as e:
            self.logger.error(f"Error generating paper citation: {str(e)}")
            return "Citation unavailable"

    def _generate_webpage_citation(self, webpage: Dict[str, Any], style: str) -> str:
        """Generate a citation for a webpage."""
        try:
            author = webpage.get('author', '')
            title = webpage.get('title', '')
            site_name = webpage.get('site_name', '')
            url = webpage.get('url', '')
            date = webpage.get('date', datetime.now().strftime('%Y-%m-%d'))

            if style.lower() == 'apa':
                return f"{author}. ({date}). {title}. {site_name}. {url}"
            elif style.lower() == 'mla':
                return f"{author}. \"{title}.\" {site_name}, {date}, {url}"
            else:
                return f"{author}. ({date}). {title}. {site_name}. {url}"
        except Exception as e:
            self.logger.error(f"Error generating webpage citation: {str(e)}")
            return "Citation unavailable"

    def _generate_generic_citation(self, source: Dict[str, Any], style: str) -> str:
        """Generate a citation for a generic source."""
        try:
            author = source.get('author', '')
            title = source.get('title', '')
            date = source.get('date', datetime.now().strftime('%Y-%m-%d'))
            url = source.get('url', '')

            if style.lower() == 'apa':
                return f"{author}. ({date}). {title}. {url}"
            elif style.lower() == 'mla':
                return f"{author}. \"{title}.\" {date}, {url}"
            else:
                return f"{author}. ({date}). {title}. {url}"
        except Exception as e:
            self.logger.error(f"Error generating generic citation: {str(e)}")
            return "Citation unavailable"

    def _format_authors_apa(self, authors: List[str]) -> str:
        """Format authors in APA style."""
        if not authors:
            return "Anonymous"
        if len(authors) == 1:
            return self._format_author_name(authors[0])
        if len(authors) == 2:
            return f"{self._format_author_name(authors[0])} & {self._format_author_name(authors[1])}"
        return f"{self._format_author_name(authors[0])} et al."

    def _format_authors_mla(self, authors: List[str]) -> str:
        """Format authors in MLA style."""
        if not authors:
            return "Anonymous"
        if len(authors) == 1:
            return self._format_author_name(authors[0])
        if len(authors) == 2:
            return f"{self._format_author_name(authors[0])} and {self._format_author_name(authors[1])}"
        return f"{self._format_author_name(authors[0])} et al."

    def _format_author_name(self, name: str) -> str:
        """Format a single author's name."""
        parts = name.split()
        if len(parts) == 1:
            return parts[0]
        return f"{parts[-1]}, {' '.join(parts[:-1])}"

    def get_paper_details(self, paper_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a paper from Semantic Scholar."""
        try:
            response = requests.get(f"{self.semantic_scholar_api}/paper/{paper_id}")
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            self.logger.error(f"Error getting paper details: {str(e)}")
            return None

    def search_papers(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search for papers using Semantic Scholar API."""
        try:
            response = requests.get(
                f"{self.semantic_scholar_api}/paper/search",
                params={
                    'query': query,
                    'limit': limit,
                    'fields': 'title,authors,year,venue,abstract,url'
                }
            )
            if response.status_code == 200:
                return response.json().get('data', [])
            return []
        except Exception as e:
            self.logger.error(f"Error searching papers: {str(e)}")
            return []
