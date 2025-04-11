from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
import os
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
# Load environment variables from .env file
load_dotenv()

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

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'txt'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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
            
        result = await chat_manager.scholar_agent.search_papers(query, limit)
        return jsonify({
            'status': 'success',
            'papers': result,
            'total': len(result)
        })
        
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
        url = chat_manager.scholar_agent.get_paper_url(paper_id)
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

@app.route('/api/library/search', methods=['POST'])
async def search_library():
    try:
        data = request.get_json()
        query = data.get('query')
        user_id = data.get('user_id')  # This should come from the authenticated user's session
        limit = data.get('limit', 10)
        
        if not query:
            return jsonify({
                'status': 'error',
                'message': 'Query parameter is required'
            }), 400
            
        if not user_id:
            return jsonify({
                'status': 'error',
                'message': 'User ID is required'
            }), 400
            
        result = await chat_manager.scholar_agent.search_user_library(query, user_id, limit)
        return jsonify({
            'status': 'success',
            'papers': result,
            'total': len(result)
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/papers/upload', methods=['POST'])
async def upload_paper():
    try:
        logger.info("Starting file upload process")
        
        # Check if file is present in request
        if 'file' not in request.files:
            logger.error("No file part in request")
            return jsonify({
                'status': 'error',
                'message': 'No file part in request'
            }), 400
            
        file = request.files['file']
        logger.info(f"Received file: {file.filename}")
        
        # Validate file
        if not file or file.filename == '':
            logger.error("No file selected")
            return jsonify({
                'status': 'error',
                'message': 'No file selected'
            }), 400
            
        # Get user ID from form data
        user_id = request.form.get('user_id')
        logger.info(f"User ID from request: {user_id}")
        
        if not user_id:
            logger.error("No user ID provided")
            return jsonify({
                'status': 'error',
                'message': 'User ID is required'
            }), 400
            
        # Read file data
        try:
            logger.info("Attempting to read file data")
            file_data = file.read()
            logger.info(f"File data length: {len(file_data) if file_data else 0}")
            
            if not file_data:
                logger.error("File is empty")
                return jsonify({
                    'status': 'error',
                    'message': 'File is empty'
                }), 400
        except Exception as e:
            logger.error(f"Error reading file: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'Error reading file: {str(e)}'
            }), 400
            
        # Get file metadata
        file_name = secure_filename(file.filename)
        file_type = file.content_type or 'application/octet-stream'
        logger.info(f"File metadata - Name: {file_name}, Type: {file_type}")
        
        # Upload file
        logger.info("Calling scholar_agent.upload_paper")
        result = await chat_manager.scholar_agent.upload_paper(
            user_id=user_id,
            file_data=file_data,
            file_name=file_name,
            file_type=file_type
        )
        logger.info(f"Upload result: {result}")
        
        if result['status'] == 'success':
            return jsonify(result)
        else:
            logger.error(f"Upload failed: {result}")
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Error in upload_paper endpoint: {str(e)}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': f'An unexpected error occurred: {str(e)}'
        }), 500

@app.route('/api/papers/<paper_id>/content', methods=['GET'])
async def get_paper_content(paper_id):
    try:
        # Get user ID from session (you'll need to implement proper authentication)
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({
                'status': 'error',
                'message': 'User ID is required'
            }), 400
            
        result = await chat_manager.scholar_agent.get_uploaded_paper(user_id, paper_id)
        
        if result['status'] == 'success':
            return jsonify(result)
        else:
            return jsonify(result), 404
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/library/files', methods=['POST'])
async def get_user_files():
    try:
        data = request.get_json()
        if not data or 'user_id' not in data:
            return jsonify({
                'status': 'error',
                'message': 'User ID is required'
            }), 400
            
        user_id = data['user_id']
        files = chat_manager.scholar_agent.get_user_library_files(user_id)
        
        return jsonify({
            'status': 'success',
            'files': files
        })
        
    except Exception as e:
        logger.error(f"Error getting user files: {str(e)}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': 'Error retrieving files'
        }), 500

@app.route('/api/library/files/<file_id>', methods=['POST'])
async def get_file_details(file_id):
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({
                'status': 'error',
                'message': 'User ID is required'
            }), 400
            
        file_details = chat_manager.scholar_agent.get_file_details(user_id, file_id)
        if not file_details:
            return jsonify({
                'status': 'error',
                'message': 'File not found'
            }), 404
            
        return jsonify({
            'status': 'success',
            'file': file_details
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/library/files/<file_id>/delete', methods=['POST'])
async def delete_file(file_id):
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({
                'status': 'error',
                'message': 'User ID is required'
            }), 400
            
        success = chat_manager.scholar_agent.delete_file(user_id, file_id)
        if not success:
            return jsonify({
                'status': 'error',
                'message': 'Failed to delete file'
            }), 500
            
        return jsonify({
            'status': 'success',
            'message': 'File deleted successfully'
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    # This ensures the app runs with debug on port 5000 
    # or whatever you like
    app.run(debug=True, port=5000)
