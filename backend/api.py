from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid

# Import your orchestrator & ACP
from backend.task_manager import ThesysOrchestrator
from backend.agent_communication import AgentCommunicationProtocol

# Import your agents
""" from agents.scholar_agent.agent import ScholarAgent
from agents.factcheck_agent.agent import FactCheckAgent
from agents.citation_agent.agent import CitationAgent
from agents.context_agent.agent import ContextAgent """
from agents.scholar_agent.agent import ScholarAgent

app = Flask(__name__)
CORS(app)

class ChatManager:
    """
    ChatManager glues everything together:
     - The ThesysOrchestrator for single-step queries (like /api/chat).
     - The AgentCommunicationProtocol for advanced multi-agent messaging (like /api/advanced_workflow).
     - Storing chat sessions if needed.
    """

    def __init__(self):
        # Agents for orchestrator usage
        self.scholar_agent = ScholarAgent()
        """         self.fact_check_agent = FactCheckAgent()
        self.citation_agent = CitationAgent()
        self.context_agent = ContextAgent() """

        # Initialize orchestrator with these agents
        self.orchestrator = ThesysOrchestrator([
            self.scholar_agent,
"""             self.fact_check_agent,
            self.context_agent,
            self.citation_agent """
        ])

        # ACP for advanced messaging
        self.agent_protocol = AgentCommunicationProtocol([
            self.scholar_agent,
"""             self.fact_check_agent,
            self.citation_agent,
            self.context_agent """
        ])

        # Store chat sessions if you want to track history
        self.chat_sessions = {}

        # Initialize paper repository

    def process_chat_message(self, message: str, chat_id: str):
        """
        Called by /api/chat for single-step usage:
         1) We pass 'message' to orchestrator.execute_research_workflow
         2) Or we handle minimal logic to store in chat_sessions
        """
        if chat_id not in self.chat_sessions:
            self.chat_sessions[chat_id] = {
                'messages': []
            }

        # store user message
        self.chat_sessions[chat_id]['messages'].append({
            'role': 'user',
            'content': message
        })

        # call orchestrator
        final_report = self.orchestrator.execute_research_workflow(message)
        # final_report example:
        # {
        #   'summary': '...',
        #   'citations': [...],
        #   'sources': [...]
        # }

        # store orchestrator result as an 'assistant' message
        self.chat_sessions[chat_id]['messages'].append({
            'role': 'assistant',
            'content': final_report
        })

        # Return final_report as a simple user-facing response
        return final_report

    def run_advanced_flow(self, user_message: str):
        """
        Called by /api/advanced_workflow for multi-step usage with the ACP.
        AgentCommunicationProtocol -> run_advanced_messaging_workflow
        """
        final_data = self.agent_protocol.run_advanced_messaging_workflow(user_message)
        return final_data

# -----------------------------
# Create global chat_manager
# -----------------------------
chat_manager = ChatManager()

@app.route('/api/chat', methods=['POST'])
def handle_chat():
    """
    Single-step usage: 
    1) Takes user's 'message'
    2) chat_id is optional in the request
    3) calls chat_manager.process_chat_message => orchestrator
    4) returns final orchestrator result
    """
    data = request.json
    if not data or 'message' not in data:
        return jsonify({'error': 'Invalid request, "message" is required'}), 400

    chat_id = data.get('chatId', str(uuid.uuid4()))
    message_text = data['message']

    try:
        response_data = chat_manager.process_chat_message(message_text, chat_id)
        return jsonify({
            'message': response_data,
            'chatId': chat_id
        })
    except Exception as e:
        return jsonify({
            'error': f'Error handling chat: {str(e)}',
            'chatId': chat_id
        }), 500

@app.route('/api/advanced_workflow', methods=['POST'])
def advanced_workflow():
    """
    Multi-step usage with advanced agent messaging flow:
    1) user sends "message"
    2) we call chat_manager.run_advanced_flow
    3) returns final aggregated multi-agent result
    """
    data = request.json
    if not data or 'message' not in data:
        return jsonify({'error': 'Invalid request, "message" is required'}), 400

    user_message = data['message']
    try:
        final_data = chat_manager.run_advanced_flow(user_message)
        return jsonify(final_data)
    except Exception as e:
        return jsonify({
            'error': str(e)
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

@app.route('/api/papers/search', methods=['POST'])
async def search_papers():
    try:
        data = request.get_json()
        query = data.get('query')
        limit = data.get('limit', 10)
        offset = data.get('offset', 0)
        
        if not query:
            return jsonify({
                'status': 'error',
                'message': 'Query parameter is required'
            }), 400
            
        result = await chat_manager.scholar_agent.search_papers(query, limit, offset)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/papers/<paper_id>', methods=['GET'])
async def get_paper_details(paper_id):
    try:
        result = await chat_manager.scholar_agent.get_paper_details(paper_id)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/papers/<paper_id>/pdf', methods=['GET'])
def get_paper_pdf(paper_id):
    try:
        url = chat_manager.paper_repository.get_paper_url(paper_id)
        if url:
            return jsonify({
                'status': 'success',
                'url': url
            })
        return jsonify({
            'status': 'error',
            'message': 'PDF not found'
        }), 404
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    # This ensures the app runs with debug on port 5000 
    # or whatever you like
    app.run(debug=True, port=5000)
