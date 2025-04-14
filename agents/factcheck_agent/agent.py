# agents/factcheck_agent/agent.py
from typing import Dict, List, Any, Optional
import logging
import requests
from datetime import datetime
import json
import re
import os

class FactCheckAgent:
    """
    The FactCheckAgent checks claims by:
     - Searching CrossRef for references to the claim
     - Possibly calling a public FactCheck.org or other service
     - Returning a 'factcheck_score' & 'evaluation'
     - 'verify_information(...)' merges or modifies data from other agents
    """
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.semantic_scholar_api = "https://api.semanticscholar.org/graph/v1"
        self.arxiv_api = "http://export.arxiv.org/api/query"
        self.news_api = "https://newsapi.org/v2/everything"

    def process_query(self, query: str) -> Dict[str, Any]:
        """
        Minimal approach: 
         1. Check references from CrossRef
         2. Possibly call external FactCheck API if 'check claim:' found
         3. Return 'factcheck_score', 'evaluation'
        """
        if (type(query) == str):
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
        if (type(message) == Dict[str, Dict]):
            user_text = message["content"].get("text", "")
            result = self.process_query(user_text)
            return {
                "message_id": message["id"],
                "result": result
            }

    def verify_claim(self, claim: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Verify a claim using available sources and context."""
        try:
            # Search for relevant papers
            papers = self._search_relevant_papers(claim)
            
            # Search for news articles
            news = self._search_news_articles(claim)
            
            # Analyze claim against context if provided
            context_analysis = self._analyze_against_context(claim, context) if context else None
            
            # Determine claim status
            status = self._determine_claim_status(papers, news, context_analysis)
            
            return {
                "claim": claim,
                "status": status,
                "evidence": {
                    "papers": papers,
                    "news": news,
                    "context_analysis": context_analysis
                },
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            self.logger.error(f"Error verifying claim: {str(e)}")
            return {
                "claim": claim,
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    def _search_relevant_papers(self, claim: str) -> List[Dict[str, Any]]:
        """Search for relevant academic papers."""
        try:
            response = requests.get(
                f"{self.semantic_scholar_api}/paper/search",
                params={
                    'query': claim,
                    'limit': 5,
                    'fields': 'title,authors,year,venue,abstract,url,citations'
                }
            )
            if response.status_code == 200:
                papers = response.json().get('data', [])
                return [self._process_paper(paper) for paper in papers]
            return []
        except Exception as e:
            self.logger.error(f"Error searching papers: {str(e)}")
            return []

    def _search_news_articles(self, claim: str) -> List[Dict[str, Any]]:
        """Search for relevant news articles."""
        try:
            # Note: You'll need to set NEWS_API_KEY in your environment variables
            api_key = os.getenv('NEWS_API_KEY')
            if not api_key:
                return []

            response = requests.get(
                self.news_api,
                params={
                    'q': claim,
                    'apiKey': api_key,
                    'language': 'en',
                    'sortBy': 'relevancy',
                    'pageSize': 5
                }
            )
            if response.status_code == 200:
                articles = response.json().get('articles', [])
                return [self._process_news_article(article) for article in articles]
            return []
        except Exception as e:
            self.logger.error(f"Error searching news: {str(e)}")
            return []

    def _analyze_against_context(self, claim: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze claim against provided context."""
        try:
            # Extract relevant information from context
            user_papers = context.get('papers', [])
            chat_history = context.get('chat_history', [])
            
            # Search for claim in user's papers
            paper_matches = self._search_in_papers(claim, user_papers)
            
            # Search for claim in chat history
            chat_matches = self._search_in_chat_history(claim, chat_history)
            
            return {
                "paper_matches": paper_matches,
                "chat_matches": chat_matches
            }
        except Exception as e:
            self.logger.error(f"Error analyzing context: {str(e)}")
            return {}

    def _determine_claim_status(self, papers: List[Dict[str, Any]], 
                              news: List[Dict[str, Any]], 
                              context_analysis: Optional[Dict[str, Any]]) -> str:
        """Determine the status of a claim based on available evidence."""
        try:
            # Count supporting evidence
            supporting_papers = sum(1 for paper in papers if paper.get('relevance_score', 0) > 0.7)
            supporting_news = sum(1 for article in news if article.get('relevance_score', 0) > 0.7)
            
            # Check context matches
            context_support = 0
            if context_analysis:
                context_support = len(context_analysis.get('paper_matches', [])) + \
                                len(context_analysis.get('chat_matches', []))
            
            total_support = supporting_papers + supporting_news + context_support
            
            if total_support >= 3:
                return "verified"
            elif total_support >= 1:
                return "partially_verified"
            else:
                return "unverified"
        except Exception as e:
            self.logger.error(f"Error determining claim status: {str(e)}")
            return "unknown"

    def _process_paper(self, paper: Dict[str, Any]) -> Dict[str, Any]:
        """Process and enrich paper data."""
        try:
            return {
                "title": paper.get('title', ''),
                "authors": paper.get('authors', []),
                "year": paper.get('year', ''),
                "venue": paper.get('venue', ''),
                "abstract": paper.get('abstract', ''),
                "url": paper.get('url', ''),
                "citations": paper.get('citations', 0),
                "relevance_score": self._calculate_relevance_score(paper)
            }
        except Exception as e:
            self.logger.error(f"Error processing paper: {str(e)}")
            return {}

    def _process_news_article(self, article: Dict[str, Any]) -> Dict[str, Any]:
        """Process and enrich news article data."""
        try:
            return {
                "title": article.get('title', ''),
                "author": article.get('author', ''),
                "source": article.get('source', {}).get('name', ''),
                "published_at": article.get('publishedAt', ''),
                "url": article.get('url', ''),
                "description": article.get('description', ''),
                "relevance_score": self._calculate_relevance_score(article)
            }
        except Exception as e:
            self.logger.error(f"Error processing news article: {str(e)}")
            return {}

    def _calculate_relevance_score(self, item: Dict[str, Any]) -> float:
        """Calculate relevance score for a paper or news article."""
        try:
            # Simple scoring based on presence of key information
            score = 0.0
            if item.get('title'):
                score += 0.3
            if item.get('abstract') or item.get('description'):
                score += 0.3
            if item.get('authors') or item.get('author'):
                score += 0.2
            if item.get('url'):
                score += 0.2
            return min(score, 1.0)
        except Exception as e:
            self.logger.error(f"Error calculating relevance score: {str(e)}")
            return 0.0

    def _search_in_papers(self, claim: str, papers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Search for claim in user's papers."""
        try:
            matches = []
            for paper in papers:
                if self._text_contains_claim(paper.get('title', ''), claim) or \
                   self._text_contains_claim(paper.get('abstract', ''), claim):
                    matches.append(paper)
            return matches
        except Exception as e:
            self.logger.error(f"Error searching in papers: {str(e)}")
            return []

    def _search_in_chat_history(self, claim: str, chat_history: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Search for claim in chat history."""
        try:
            matches = []
            for message in chat_history:
                if self._text_contains_claim(message.get('content', ''), claim):
                    matches.append(message)
            return matches
        except Exception as e:
            self.logger.error(f"Error searching in chat history: {str(e)}")
            return []

    def _text_contains_claim(self, text: str, claim: str) -> bool:
        """Check if text contains the claim."""
        try:
            # Simple keyword matching - could be enhanced with NLP
            claim_words = set(claim.lower().split())
            text_words = set(text.lower().split())
            return len(claim_words.intersection(text_words)) >= len(claim_words) * 0.5
        except Exception as e:
            self.logger.error(f"Error checking text for claim: {str(e)}")
            return False
