from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
from backend.task_manager import ThesysOrchestrator
from agents.citation_agent.agent import CitationAgent
from agents.context_agent.agent import ContextAgent
from agents.factcheck_agent.agent import FactCheckAgent
from agents.scholar_agent.agent import ScholarAgent

class ChatManager:
    def __init__(self):
        # Initialize agents
        self.scholar_agent = ScholarAgent()
        self.fact_check_agent = FactCheckAgent()
        self.context_agent = ContextAgent()
        self.citation_agent = CitationAgent()

        # Initialize orchestrator with agents
        self.orchestrator = ThesysOrchestrator([
            self.scholar_agent, 
            self.fact_check_agent, 
            self.context_agent, 
            self.citation_agent
        ])

        # Store chat sessions
        self.chat_sessions = {}

    def process_chat_message(self, message, chat_id):
        """
        Process a chat message using the Thesys research workflow
        
        Args:
            message (str): User's input message
            chat_id (str): Unique identifier for the chat session
        
        Returns:
            dict: Response from the orchestrator
        """
        # Create a new chat session if it doesn't exist
        if chat_id not in self.chat_sessions:
            self.chat_sessions[chat_id] = {
                'messages': [],
                'context': {}
            }

        # Add current message to session history
        self.chat_sessions[chat_id]['messages'].append({
            'role': 'user',
            'content': message
        })

        # Use orchestrator to generate a research-based response
        try:
            research_results = self.orchestrator.execute_research_workflow(message)
            
            # Generate a response based on research results
            response = self._generate_response(research_results)

            # Add AI response to session history
            self.chat_sessions[chat_id]['messages'].append({
                'role': 'assistant',
                'content': response
            })

            return response

        except Exception as e:
            # Fallback response in case of errors
            return f"I apologize, but I encountered an error processing your request: {str(e)}"

    def _generate_response(self, research_results):
        """
        Generate a human-readable response from research results
        
        Args:
            research_results (dict): Results from research workflow
        
        Returns:
            str: Formatted response
        """
        # Basic response generation logic
        summary = research_results.get('summary', 'I couldn\'t find specific information about your query.')
        citations = research_results.get('citations', [])
        sources = research_results.get('sources', [])

        # Construct a more detailed response
        response = summary

        # Append citations if available
        if citations:
            response += "\n\nRelevant Citations:"
            for citation in citations[:3]:  # Limit to top 3 citations
                response += f"\n- {citation}"

        # Append sources if available
        if sources:
            response += "\n\nSources:"
            for source in sources[:3]:  # Limit to top 3 sources
                response += f"\n- {source}"

        return response

# Flask Application Setup
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize chat manager
chat_manager = ChatManager()

@app.route('/api/chat', methods=['POST'])
def handle_chat():
    """
    Endpoint for processing chat messages
    
    Expected JSON payload:
    {
        'message': str,  # User's message
        'chatId': str    # Unique chat session ID
    }
    """
    data = request.json
    
    # Validate input
    if not data or 'message' not in data:
        return jsonify({'error': 'Invalid request, message is required'}), 400
    
    # Use a default chat ID if not provided
    chat_id = data.get('chatId', str(uuid.uuid4()))
    message = data['message']

    try:
        # Process the message
        response = chat_manager.process_chat_message(message, chat_id)
        
        return jsonify({
            'response': response,
            'chatId': chat_id
        })

    except Exception as e:
        return jsonify({
            'error': f'An error occurred: {str(e)}',
            'chatId': chat_id
        }), 500

@app.route('/api/chats', methods=['GET'])
def get_chat_sessions():
    """
    Retrieve all active chat sessions
    """
    return jsonify({
        'chats': list(chat_manager.chat_sessions.keys())
    })

@app.route('/api/chat/<chat_id>', methods=['GET'])
def get_chat_history(chat_id):
    """
    Retrieve history for a specific chat session
    """
    session = chat_manager.chat_sessions.get(chat_id)
    if not session:
        return jsonify({'error': 'Chat session not found'}), 404
    
    return jsonify({
        'chatId': chat_id,
        'messages': session['messages']
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)