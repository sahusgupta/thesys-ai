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

    def process_message(self, message: str, user_id: str) -> Dict[str, Any]:
        """Process a message through all relevant agents."""
        try:
            # Get user context
            context = self.context_agent.get_user_context(user_id)
            
            # Fact-check the message
            fact_check_result = self.factcheck_agent.verify_claim(message, context)
            
            # Search for relevant papers
            papers = self.scholar_agent.search_papers(message)
            
            # Generate citations for found papers
            citations = []
            for paper in papers:
                citation = self.citation_agent.generate_citation(paper, style='apa')
                citations.append(citation)
            
            # Save message to chat history
            self.context_agent.add_to_chat_history(user_id, {
                'role': 'user',
                'content': message,
                'timestamp': datetime.now().isoformat()
            })
            
            # Prepare response
            response = {
                'fact_check': fact_check_result,
                'papers': papers,
                'citations': citations,
                'context': context
            }
            
            # Save response to chat history
            self.context_agent.add_to_chat_history(user_id, {
                'role': 'assistant',
                'content': response,
                'timestamp': datetime.now().isoformat()
            })
            
            return response
            
        except Exception as e:
            self.logger.error(f"Error processing message: {str(e)}")
            return {'error': str(e)}

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