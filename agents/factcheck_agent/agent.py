# agents/factcheck_agent/agent.py
from typing import Dict, List, Any, Optional
import logging
import requests
from datetime import datetime
import json
import re
import os
import tiktoken
# Added imports for preprocessing and vectorization
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from sentence_transformers import SentenceTransformer
import numpy as np
nltk.download('punkt_tab', quiet=True)
nltk.download('punkt', quiet=True)
nltk.download('stopwords', quiet=True)

class FactCheckAgent:
    """
    The FactCheckAgent checks claims by:
     - Searching external sources like ArXiv and NewsAPI
     - Returning a verification status and evidence
     - Preprocessing queries for better search results
     - Providing text vectorization capabilities
    """
    def __init__(self):
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
        self.MAX_TOKENS = 900 # Max tokens for truncation before vectorization etc.
        self.logger = logging.getLogger(__name__)
        # Removed Semantic Scholar API
        self.arxiv_api = "http://export.arxiv.org/api/query"
        self.news_api = "https://newsapi.org/v2/everything"

        # --- New Initializations ---
        # Preprocessing setup
        self.stop_words = set(stopwords.words('english'))
        # Add custom fluff words if needed
        self.stop_words.update(['tell', 'me', 'about', 'what', 'is', 'are', 'how', 'show', 'find', 'search', 'for', 'papers', 'articles', 'research', 'on'])

        # Vectorization model setup
        try:
            # Using a relatively small but effective model
            self.vectorizer_model = SentenceTransformer('all-MiniLM-L6-v2')
            self.logger.info("SentenceTransformer model loaded successfully.")
        except Exception as e:
            self.logger.error(f"Error loading SentenceTransformer model: {e}. Vectorization will be disabled.")
            self.vectorizer_model = None
        # --- End New Initializations ---

    def truncate_to_token_limit(self, text):
        if not isinstance(text, str):
            return text
        tokens = self.tokenizer.encode(text)
        if len(tokens) > self.MAX_TOKENS:
            truncated_tokens = tokens[:self.MAX_TOKENS]
            return self.tokenizer.decode(truncated_tokens) + "..."
        return text

    def extract_text_from_claim(self, claim):
        """Extract text content from claim object or return claim if it's a string"""
        if isinstance(claim, dict):
            # Try common keys that might contain the text
            for key in ['content', 'text', 'message', 'claim']:
                if key in claim and isinstance(claim[key], str):
                    return claim[key]
            # If no text found, convert the whole dict to string
            return str(claim)
        return str(claim)

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
        """Verify a claim using available sources and context.
        
        Returns a dictionary containing the verification status and evidence, 
        excluding the original claim text to prevent duplication.
        """
        try:
            # Search for relevant papers
            papers = self._search_relevant_papers(claim)
            
            # Search for news articles
            news = self._search_news_articles(claim)
            
            # Analyze claim against context if provided
            context_analysis = self._analyze_against_context(claim, context) if context else None
            
            # Determine claim status
            status = self._determine_claim_status(papers, news, context_analysis)
            
            # Return only status and evidence, excluding the claim itself
            return {
                # "claim": claim,  <-- Removed to prevent duplication
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
            # Return error status without the claim text
            return {
                # "claim": claim, <-- Removed to prevent duplication
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    def _preprocess_query(self, query: str) -> str:
        """Removes stop words and non-alphanumeric characters from a query."""
        if not isinstance(query, str):
            return ""
        try:
            # Tokenize
            word_tokens = word_tokenize(query.lower())
            # Remove stop words and non-alphanumeric (keeping basic punctuation for meaning)
            filtered_tokens = [
                w for w in word_tokens
                if w.isalnum() and w not in self.stop_words
            ]
            # Limit query length after preprocessing
            processed_query = " ".join(filtered_tokens)[:500] # Limit refined query length
            self.logger.debug(f"Original query: '{query}', Processed query: '{processed_query}'")
            return processed_query
        except Exception as e:
            self.logger.error(f"Error preprocessing query '{query}': {e}")
            return query # Return original query on error

    def _vectorize_text(self, text: str) -> Optional[np.ndarray]:
        """Generates a vector embedding for the given text."""
        if not self.vectorizer_model:
            self.logger.warning("Vectorizer model not loaded. Cannot vectorize text.")
            return None
        if not isinstance(text, str) or not text.strip():
            return None
        try:
            # Truncate text before vectorizing if it's too long
            truncated_text = self.truncate_to_token_limit(text)
            # Generate embedding
            embedding = self.vectorizer_model.encode(truncated_text)
            return embedding
        except Exception as e:
            self.logger.error(f"Error vectorizing text: {e}")
            return None

    def _search_relevant_papers(self, claim: str) -> List[Dict[str, Any]]:
        """Search for relevant academic papers using a preprocessed query."""
        processed_claim = self._preprocess_query(claim)
        if not processed_claim:
            self.logger.warning("Claim preprocessing resulted in an empty query. Skipping ArXiv search.")
            return []
        try:
            # Using ArXiv API directly now
            response = requests.get(
                self.arxiv_api,
                params={
                    'search_query': f'all:{processed_claim}', # Use preprocessed query
                    'start': 0,
                    'max_results': 5 # Limit results
                }
            )
            response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

            # Parse ArXiv XML response (requires additional parsing logic)
            # For simplicity, placeholder - replace with proper XML parsing (e.g., using feedparser)
            # papers = self._parse_arxiv_response(response.text)
            # return [self._process_paper(paper) for paper in papers]
            self.logger.warning("ArXiv XML parsing not fully implemented. Returning empty list for papers.")
            # Placeholder: Returning empty list until XML parsing is added
            return []

        except requests.exceptions.RequestException as e:
            self.logger.error(f"Error during ArXiv request: {e}")
            return []
        except Exception as e:
            self.logger.error(f"Error searching ArXiv papers: {e}")
            return []

    def _search_news_articles(self, claim: str) -> List[Dict[str, Any]]:
        """Search for relevant news articles using a preprocessed query."""
        processed_claim = self._preprocess_query(claim)
        if not processed_claim:
             self.logger.warning("Claim preprocessing resulted in an empty query. Skipping NewsAPI search.")
             return []
        try:
            api_key = os.getenv('NEWS_API_KEY')
            if not api_key:
                self.logger.warning("NEWS_API_KEY not set. Skipping news search.")
                return []

            response = requests.get(
                self.news_api,
                params={
                    'q': processed_claim, # Use preprocessed query
                    'apiKey': api_key,
                    'language': 'en',
                    'sortBy': 'relevancy',
                    'pageSize': 5 # Limit results
                }
            )
            response.raise_for_status()
            if response.status_code == 200:
                articles = response.json().get('articles', [])
                return [self._process_news_article(article) for article in articles]
            return []
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Error during NewsAPI request: {e}")
            return []
        except Exception as e:
            self.logger.error(f"Error searching news: {e}")
            return []

    def _analyze_against_context(self, claim: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze claim against provided context."""
        try:
            # Make sure context is a dictionary before using get()
            if isinstance(context, str):
                context = {'text': context}
            
            # Now safely use get()
            text = context.get('text', '')
            
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
            # Ensure inputs are strings before proceeding
            if not isinstance(text, str):
                self.logger.warning(f"_text_contains_claim received non-string text: type={type(text)}, value={text}")
                text = str(text) # Attempt conversion, or return False
            if not isinstance(claim, str):
                self.logger.warning(f"_text_contains_claim received non-string claim: type={type(claim)}, value={claim}")
                claim = str(claim) # Attempt conversion, or return False

            # Simple keyword matching - could be enhanced with NLP
            claim_words = set(claim.lower().split())
            text_words = set(text.lower().split())
            # Handle empty claim case
            if not claim_words:
                return False
            # Check for significant overlap
            return len(claim_words.intersection(text_words)) >= max(1, len(claim_words) * 0.5)
        except Exception as e:
            self.logger.error(f"Error checking text for claim: {str(e)}")
            return False

    def analyze_context(self, claim, context):
        try:
            # Ensure claim is a string
            claim_text = claim.get('content', '') if isinstance(claim, dict) else str(claim)
            
            # Initialize response structure
            response = {
                'papers': [],
                'news': [],
                'context_analysis': {
                    'paper_matches': [],
                    'chat_matches': []
                }
            }

            # Extract and validate context
            if not context or not isinstance(context, dict):
                self.logger.warning("Invalid or empty context provided")
                return response

            # Process papers if available
            papers = context.get('papers', [])
            if isinstance(papers, list):
                for paper in papers:
                    if not isinstance(paper, dict):
                        continue
                    # Process paper content safely
                    title = str(paper.get('title', ''))
                    abstract = str(paper.get('abstract', ''))
                    if self._text_matches(claim_text, title) or self._text_matches(claim_text, abstract):
                        response['papers'].append(paper)

            # Process chat history if available
            chat_history = context.get('chat_history', [])
            if isinstance(chat_history, list):
                for msg in chat_history:
                    if not isinstance(msg, dict):
                        continue
                    # Process message content safely
                    content = str(msg.get('content', ''))
                    if self._text_matches(claim_text, content):
                        response['context_analysis']['chat_matches'].append(msg)

            return response

        except Exception as e:
            self.logger.error(f"Error analyzing context: {str(e)}")
            return {}

    def _text_matches(self, text1, text2):
        """Safely compare two texts for matching content"""
        try:
            if not isinstance(text1, str) or not isinstance(text2, str):
                return False
            
            # Convert both to lowercase strings for comparison
            text1_lower = text1.lower()
            text2_lower = text2.lower()
            
            # Simple matching logic - can be enhanced
            return text1_lower in text2_lower or text2_lower in text1_lower
            
        except Exception as e:
            self.logger.error(f"Error in text matching: {str(e)}")
            return False

    def check_claim(self, claim, context=None):
        """Check a claim against available context"""
        try:
            # Ensure claim is properly formatted
            if isinstance(claim, dict):
                claim_text = claim.get('content', '')
            else:
                claim_text = str(claim)

            # Initialize response
            response = {
                'claim': claim_text,
                'status': 'unverified',
                'evidence': self.analyze_context(claim_text, context),
                'timestamp': datetime.now().isoformat()
            }

            return response

        except Exception as e:
            self.logger.error(f"Error checking claim: {str(e)}")
            return {
                'claim': str(claim),
                'status': 'error',
                'evidence': {},
                'timestamp': datetime.now().isoformat()
            }
