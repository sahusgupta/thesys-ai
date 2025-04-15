from typing import Dict, List, Any, Optional
import logging
from datetime import datetime
from agents.scholar_agent.agent import ScholarAgent
from agents.citation_agent.agent import CitationAgent
from agents.factcheck_agent.agent import FactCheckAgent
from agents.context_agent.agent import ContextAgent

class ChatManager:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Initialize agents
        self.scholar_agent = ScholarAgent()
        self.citation_agent = CitationAgent()
        self.factcheck_agent = FactCheckAgent()
        self.context_agent = ContextAgent()
        
        # Store chat sessions
        self.chat_sessions = {}

    async def process_message(self, message: str, user_id: str) -> Dict[str, Any]:
        """Process a message, generate a response, and return structured data."""
        self.logger.info(f"Processing message for user {user_id}: {message}")
        try:
            # Get user context
            context = self.context_agent.get_user_context(user_id)
            self.logger.debug(f"User context retrieved for {user_id}")

            # Fact-check the message (ensure verify_claim handles potential errors)
            # Assuming verify_claim returns a dict like {'status': 'verified/unverified/error', 'evidence': ...}
            fact_check_result = self.factcheck_agent.verify_claim(message, context)
            self.logger.debug(f"Fact check result for {user_id}: {fact_check_result}")

            # Search for relevant papers
            papers = self.scholar_agent.search_papers(message)
            self.logger.debug(f"Found {len(papers)} papers for {user_id}")

            # Generate citations for found papers
            citations = []
            if papers:
                for paper in papers:
                    # Ensure paper is a dict before generating citation
                    if isinstance(paper, dict):
                        citation = self.citation_agent.generate_citation(paper, style='apa')
                        citations.append(citation)
                    else:
                        self.logger.warning(f"Skipping citation for non-dict paper item: {paper}")
                self.logger.debug(f"Generated {len(citations)} citations for {user_id}")

            # Save user message to chat history FIRST
            self.context_agent.add_to_chat_history(user_id, {
                'role': 'user',
                'content': message,
                'timestamp': datetime.now().isoformat()
            })
            self.logger.debug(f"User message saved to history for {user_id}")

            # **Generate a textual response**
            # (This is a simple example; you might use an LLM or more complex logic)
            response_parts = []
            fc_status = fact_check_result.get('status', 'unknown')
            response_parts.append(f"Fact Check Status: {fc_status.capitalize()}")

            if papers:
                response_parts.append(f"\nFound {len(papers)} relevant paper(s):")
                for i, paper in enumerate(papers[:3]): # Limit display
                     title = paper.get('title', 'N/A') if isinstance(paper, dict) else 'N/A'
                     response_parts.append(f"- {title}")
                if len(papers) > 3:
                    response_parts.append("  ...")
            else:
                 response_parts.append("\nNo relevant papers found.")

            # Combine parts into a single string
            response_text = "\n".join(response_parts)
            self.logger.debug(f"Generated response text for {user_id}: {response_text[:100]}...") # Log snippet

            # **Construct the final response object for the API**
            api_response = {
                'text': response_text,  # User-facing text
                'raw_data': {           # Optional: Raw data for potential frontend use
                    'fact_check': fact_check_result,
                    'papers': papers,
                    'citations': citations,
                }
            }

            # **Save the generated text as the assistant's message**
            self.context_agent.add_to_chat_history(user_id, {
                'role': 'assistant',
                'content': response_text, # Save the actual text response
                'timestamp': datetime.now().isoformat()
            })
            self.logger.debug(f"Assistant response saved to history for {user_id}")

            return api_response # Return the structured response

        except Exception as e:
            self.logger.exception(f"Critical error processing message for user {user_id}: {str(e)}") # Use exception for stack trace
            # Return an error structure consistent with what the API expects
            return {'error': f"An internal error occurred: {str(e)}"}

    def get_chat_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Get chat history for a user."""
        try:
            return self.context_agent._get_chat_history(user_id)
        except Exception as e:
            self.logger.error(f"Error getting chat history: {str(e)}")
            return []

    def clear_chat_history(self, user_id: str) -> bool:
        """Clear chat history for a user."""
        try:
            return self.context_agent.save_chat_history(user_id, [])
        except Exception as e:
            self.logger.error(f"Error clearing chat history: {str(e)}")
            return False

    def verify_claim(self, claim: str, user_id: str) -> Dict[str, Any]:
        """Verify a claim using the fact-checking agent."""
        try:
            context = self.context_agent.get_user_context(user_id)
            return self.factcheck_agent.verify_claim(claim, context)
        except Exception as e:
            self.logger.error(f"Error verifying claim: {str(e)}")
            return {'error': str(e)}

    def search_papers(self, query: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Search for papers and generate citations."""
        try:
            # Search papers
            papers = self.scholar_agent.search_papers(query)
            
            # Get user context if available
            context = self.context_agent.get_user_context(user_id) if user_id else None
            
            # Generate citations
            citations = []
            for paper in papers:
                citation = self.citation_agent.generate_citation(paper, style='apa')
                citations.append(citation)
            
            return {
                'papers': papers,
                'citations': citations,
                'context': context
            }
            
        except Exception as e:
            self.logger.error(f"Error searching papers: {str(e)}")
            return {'error': str(e)}

    def generate_citation(self, source: Dict[str, Any], style: str = 'apa') -> str:
        """Generate a citation for a source."""
        try:
            return self.citation_agent.generate_citation(source, style)
        except Exception as e:
            self.logger.error(f"Error generating citation: {str(e)}")
            return "Citation unavailable" 