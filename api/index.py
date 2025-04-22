from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import uuid
import os
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import psycopg2
import time
import asyncio

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import agents
try:
    from agents.scholar_agent.agent import ScholarAgent
    from agents.citation_agent.agent import CitationAgent
    from agents.factcheck_agent.agent import FactCheckAgent
    from agents.context_agent.agent import ContextAgent
except ModuleNotFoundError:
    # Add the project root directory to the Python path
    import sys
    from pathlib import Path
    project_root = Path(__file__).parent.parent
    sys.path.append(str(project_root))
    
    # Try imports again
    from agents.scholar_agent.agent import ScholarAgent
    from agents.citation_agent.agent import CitationAgent
    from agents.factcheck_agent.agent import FactCheckAgent
    from agents.context_agent.agent import ContextAgent

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
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Initialize agents
        self.scholar_agent = ScholarAgent()
        self.citation_agent = CitationAgent()
        self.factcheck_agent = FactCheckAgent()
        self.context_agent = ContextAgent()
        
        # Store chat sessions
        self.chat_sessions = {}

        # Initialize DB connection (reuse ScholarAgent's logic if possible, or add here)
        # For simplicity, adding connection logic here for now
        self.db_conn = None
        self._ensure_db_connection()

        # Initialize OpenAI client once
        try:
            from openai import AsyncOpenAI
            self.openai_client = AsyncOpenAI() 
            self.logger.info("OpenAI client initialized successfully.")
        except ImportError:
            self.logger.error("OpenAI library not found. Please install openai.")
            self.openai_client = None
        except Exception as e:
             self.logger.error(f"Failed to initialize OpenAI client: {e}", exc_info=True)
             self.openai_client = None

    # Add DB connection methods (similar to ScholarAgent)
    def _connect_to_db(self, max_retries: int = 3, initial_delay: float = 1.0) -> None:
        """Connect to PostgreSQL with retry logic and exponential backoff."""
        delay = initial_delay
        for attempt in range(max_retries):
            try:
                # TODO: Get DB credentials from config/env vars
                self.db_conn = psycopg2.connect(
                    host="localhost",
                    database="paper_repository",
                    user="postgres",
                    password="ktsg1899"
                )
                self.logger.info("ChatManager successfully connected to database")
                return
            except psycopg2.OperationalError as e:
                if attempt == max_retries - 1:
                    self.logger.error(f"ChatManager failed to connect to database after {max_retries} attempts")
                    raise
                self.logger.warning(f"ChatManager DB connection attempt {attempt + 1} failed: {str(e)}")
                self.logger.info(f"Retrying in {delay} seconds...")
                time.sleep(delay)
                delay *= 2

    def _ensure_db_connection(self) -> None:
        """Ensure ChatManager has an active database connection."""
        try:
            if self.db_conn is None or self.db_conn.closed:
                self._connect_to_db()
        except Exception as e:
             self.logger.error(f"ChatManager failed to ensure DB connection: {e}", exc_info=True)
             # Handle error appropriately - maybe raise or set a flag

    async def process_message(self, message: str, user_id: str, temperature: float, previous_context_vector: Optional[List[float]] = None) -> Dict[str, Any]:
        """Process a message using vector context, including temperature setting."""
        try:
            self.logger.info(f"Processing message for user {user_id} with temp {temperature}.")
            
            # Fact-check the message
            fact_check_result = self.factcheck_agent.verify_claim(message)
            self.logger.info(f"Fact check result: {fact_check_result}")
            
            # Search for relevant papers
            papers = await self.scholar_agent.search_papers(message)
            self.logger.info(f"Found {len(papers)} papers via search")
            
            # Generate citations for searched papers
            citations = [self.citation_agent.generate_citation(p, 'apa') for p in papers]
            
            # Prepare raw data (searched papers)
            raw_response_data = {
                'papers': papers,
                'citations': citations,
                'fact_check': fact_check_result
            }
            
            # Format response using OpenAI, including uploaded file summaries
            formatted_response_text = await self._format_response_with_openai(
                user_id=user_id,
                user_message=message,
                raw_data=raw_response_data,
                temperature=temperature
            )
            self.logger.info(f"Formatted response length: {len(formatted_response_text)} chars")
            
            # Vectorize and prepare final response (as before)
            response_vector = self.factcheck_agent._vectorize_text(formatted_response_text)
            if response_vector is not None:
                response_vector = response_vector.tolist()
                self.logger.info(f"Generated response vector of dimension {len(response_vector)}")
            else:
                self.logger.warning("Failed to generate response vector.")
                response_vector = None
            
            final_response = {
                'text': formatted_response_text,
                'raw_data': raw_response_data, # Keep original raw data
                'response_vector': response_vector
            }
            
            return final_response
            
        except Exception as e:
            self.logger.error(f"Error processing message: {str(e)}", exc_info=True)
            return {
                'error': str(e),
                'text': "I encountered an error while processing your request.",
                'raw_data': {},
                'response_vector': None
            }

    async def _format_response_with_openai(self, user_id: str, user_message: str, raw_data: Dict[str, Any], temperature: float) -> str:
        """Format response using OpenAI, including summaries and temperature setting."""
        if not self.openai_client:
             self.logger.error("OpenAI client not initialized. Cannot format response.")
             return "Error: AI service is unavailable."
        
        try:
            # Prepare summaries of *searched* papers (as before)
            paper_summaries_searched = []
            num_papers_to_include = min(len(raw_data.get('papers', [])), 3)
            for paper in raw_data['papers'][:num_papers_to_include]:
                title = paper['title'][:150] + '...' if len(paper['title']) > 150 else paper['title']
                abstract = paper['abstract'][:400] + '...' if len(paper['abstract']) > 400 else paper['abstract']
                authors = ', '.join(paper['authors'][:5])
                authors_str = f"{authors}{' et al.' if len(paper['authors']) > 5 else ''}"
                summary_text = f"Title: {title}\nAuthors: {authors_str}\nYear: {paper['year']}\nAbstract Snippet: {abstract}"
                paper_summaries_searched.append(summary_text)
            searched_papers_prompt_section = chr(10).join(paper_summaries_searched) if paper_summaries_searched else 'No specific papers found via search related to this query.'

            # --- NEW: Fetch summaries of recently uploaded files --- 
            uploaded_files_summaries = []
            try:
                self._ensure_db_connection()
                with self.db_conn.cursor() as cur:
                    # Fetch summary for the 3 most recent non-null summaries for this user
                    sql = """
                        SELECT file_name, summary 
                        FROM user_files 
                        WHERE user_id = %s AND summary IS NOT NULL
                        ORDER BY created_at DESC
                        LIMIT 3
                    """
                    cur.execute(sql, (user_id,))
                    results = cur.fetchall()
                    for row in results:
                        file_name, summary_text = row
                        if summary_text:
                            uploaded_files_summaries.append(f"File: {file_name}\nSummary: {summary_text}")
                self.logger.info(f"Fetched {len(uploaded_files_summaries)} summaries for uploaded files for user {user_id}")
            except Exception as db_err:
                 self.logger.error(f"Error fetching uploaded file summaries from DB for user {user_id}: {db_err}", exc_info=True)
            uploaded_files_prompt_section = chr(10).join(uploaded_files_summaries) if uploaded_files_summaries else 'No relevant file summaries found from your recent uploads.'
            # --- END NEW SECTION --- 

            # Prepare prompt including both searched and uploaded summaries
            prompt = (
                f"Provide a comprehensive response to the query based *only* on the user's current message, "
                f"the provided research summaries from search, and summaries from recently uploaded files.\n\n"
                f"User Query: {user_message}\n\n"
                f"Relevant Research Summaries (from Search):\n"
                f"{searched_papers_prompt_section}\n\n"
                f"Relevant Summaries (from Your Uploads):\n"
                f"{uploaded_files_prompt_section}\n\n"
                f"Guidelines:\n"
                f"- Address the user's current query directly.\n"
                f"- Integrate findings from both searched research and uploaded file summaries if relevant.\n"
                f"- Cite papers (Author, Year) if used from the search results.\n"
                f"- Refer to uploaded files by name if using their summaries.\n"
                f"- Explain concepts clearly.\n"
                f"- Structure the response logically.\n"
                f"- Aim for a response length of 400-600 words."
            )

            self.logger.info(f"Sending prompt to OpenAI (Temp: {temperature})")
            response = await self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a research assistant answering queries based on the current message, article summaries from search, and summaries from the user's uploaded files. Do not refer to past interactions."},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                max_tokens=2000
            )
            gpt_response = response.choices[0].message.content
            self.logger.info(f"GPT Response length: {len(gpt_response)} chars")
            
            return gpt_response
            
        except Exception as e:
            self.logger.error(f"Error formatting response with OpenAI: {str(e)}", exc_info=True)
            return "I encountered an error while generating the response."

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

    async def search_papers(self, query: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Search for papers and generate citations."""
        try:
            # Search papers
            papers = await self.scholar_agent.search_papers(query)
            self.logger.info(f"ChatManager found {len(papers)} papers for query: '{query}'")

            # Get user context if available
            context = self.context_agent.get_user_context(user_id) if user_id else None

            # Generate citations (this is likely synchronous)
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
            self.logger.error(f"Error searching papers in ChatManager: {str(e)}", exc_info=True)
            return {'error': str(e)}

    def generate_citation(self, source: Dict[str, Any], style: str = 'apa') -> str:
        """Generate a citation for a source."""
        try:
            return self.citation_agent.generate_citation(source, style)
        except Exception as e:
            self.logger.error(f"Error generating citation: {str(e)}")
            return "Citation unavailable"

    # Add __del__ method to close DB connection
    def __del__(self):
        if self.db_conn:
             self.db_conn.close()
             self.logger.info("ChatManager database connection closed")

# Create global chat manager instance
chat_manager = ChatManager()

@app.route('/api/chat', methods=['POST'])
async def chat():
    """Chat endpoint using vector context."""
    try:
        data = request.json
        if not data:
            logger.error("No JSON data received")
            return jsonify({'error': 'No data provided'}), 400
            
        message = data.get('message', '')
        if not message:
            logger.error("No message provided")
            return jsonify({'error': 'Message is required'}), 400
            
        user_id = data.get('user_id', str(uuid.uuid4()))
        previous_context_vector = data.get('previous_context_vector')
        # Get temperature from payload, default to 0.7 if not provided or invalid
        try:
            temperature = float(data.get('temperature', 0.7))
            if not (0.0 <= temperature <= 1.0):
                 logger.warning(f"Invalid temperature received ({temperature}), using default 0.7")
                 temperature = 0.7
        except (ValueError, TypeError):
             logger.warning(f"Could not parse temperature ('{data.get('temperature')}'), using default 0.7")
             temperature = 0.7

        logger.info(f"Processing chat for user {user_id} with temp {temperature}. Has vector: {previous_context_vector is not None}")
        
        # Pass temperature to process_message
        response_data = await chat_manager.process_message(
            message=message, 
            user_id=user_id, 
            temperature=temperature, # Pass validated temperature
            previous_context_vector=previous_context_vector
        )
        
        if 'error' in response_data:
            logger.error(f"Error processing message: {response_data['error']}")
            return jsonify({'error': response_data['error']}), 500
            
        return jsonify(response_data) 
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        return jsonify({'error': str(e), 'response_vector': None}), 500

@app.route('/api/factcheck', methods=['POST'])
def factcheck():
    """Endpoint for fact-checking claims."""
    try:
        data = request.json
        claim = data.get('claim')
        user_id = data.get('user_id')
        
        if not claim:
            return jsonify({'error': 'Claim is required'}), 400
        
        # Verify claim using chat manager
        result = chat_manager.verify_claim(claim, user_id)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in factcheck endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/citations', methods=['POST'])
def generate_citation():
    """Endpoint for generating citations."""
    try:
        data = request.json
        source = data.get('source')
        style = data.get('style', 'apa')
        
        if not source:
            return jsonify({'error': 'Source is required'}), 400
        
        # Generate citation using chat manager
        citation = chat_manager.generate_citation(source, style)
        
        return jsonify({'citation': citation})
        
    except Exception as e:
        logger.error(f"Error in citations endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/papers/search', methods=['POST'])
async def search_papers():
    """Endpoint for searching papers."""
    try:
        data = request.json
        query = data.get('query')
        user_id = data.get('user_id')
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        # Search papers using chat manager
        result = await chat_manager.search_papers(query, user_id)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in search_papers endpoint: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/papers/upload', methods=['POST'])
async def upload_paper():
    """Endpoint for uploading papers."""
    try:
        if 'file' not in request.files:
            logger.error("No file provided in request")
            return jsonify({'error': 'No file provided'}), 400
            
        file = request.files['file']
        user_id = request.form.get('user_id')
        
        if not user_id:
            logger.error("User ID is required")
            return jsonify({'error': 'User ID is required'}), 400
            
        if not file.filename:
            logger.error("No filename provided")
            return jsonify({'error': 'No filename provided'}), 400
            
        # Get file type from content type or extension
        file_type = file.content_type or 'application/pdf'  # Default to PDF if not specified
        file_name = secure_filename(file.filename)
        
        # Read file data
        file_data = file.read()
        
        # Upload paper using scholar agent
        result = await chat_manager.scholar_agent.upload_paper(
            user_id=user_id,
            file_data=file_data,
            file_name=file_name,
            file_type=file_type
        )
        
        if 'error' in result:
            logger.error(f"Error uploading paper: {result['error']}")
            return jsonify(result), 500
            
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in upload_paper endpoint: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/library/files', methods=['GET', 'POST'])
def get_user_files():
    """Get all files in a user's library."""
    try:
        # For GET requests, get user_id from query params
        # For POST requests, get user_id from JSON body
        user_id = request.args.get('user_id') if request.method == 'GET' else request.json.get('user_id')
        
        if not user_id:
            logger.error("User ID is required")
            return jsonify({'error': 'User ID is required'}), 400
            
        files = chat_manager.scholar_agent.get_user_library_files(user_id)
        
        if not files:
            logger.warning(f"No files found for user {user_id}")
            return jsonify({'files': []})
            
        logger.info(f"Found {len(files)} files for user {user_id}")
        
        # Ensure each file has all required fields
        processed_files = []
        for file in files:
            processed_file = {
                'id': file.get('id', ''),
                'file_name': file.get('file_name', ''),
                'file_type': file.get('file_type', 'application/octet-stream'),
                'created_at': file.get('created_at', ''),
                'url': file.get('url', '')
            }
            processed_files.append(processed_file)
        
        return jsonify({
            'status': 'success',
            'files': processed_files
        })
        
    except Exception as e:
        logger.error(f"Error in get_user_files endpoint: {str(e)}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@app.route('/api/library/files/<file_id>', methods=['GET', 'POST'])
def get_file_details(file_id):
    """Get details of a specific file."""
    try:
        # For GET requests, get user_id from query params
        # For POST requests, get user_id from JSON body
        user_id = request.args.get('user_id') if request.method == 'GET' else request.json.get('user_id')
        
        if not user_id:
            logger.error("User ID is required")
            return jsonify({'error': 'User ID is required'}), 400
            
        file_details = chat_manager.scholar_agent.get_file_details(user_id, file_id)
        
        if not file_details:
            logger.warning(f"File {file_id} not found for user {user_id}")
            return jsonify({'error': 'File not found'}), 404
            
        logger.info(f"Found file details for {file_id}")
        return jsonify({
            'status': 'success',
            'file': file_details
        })
        
    except Exception as e:
        logger.error(f"Error in get_file_details endpoint: {str(e)}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@app.route('/api/library/files/<file_id>/delete', methods=['DELETE'])
def delete_file(file_id):
    """Delete a file from the user's library."""
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
            
        success = chat_manager.scholar_agent.delete_file(user_id, file_id)
        
        if not success:
            return jsonify({'error': 'Failed to delete file'}), 500
            
        return jsonify({'message': 'File deleted successfully'})
        
    except Exception as e:
        logger.error(f"Error in delete_file endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/history', methods=['GET'])
def get_chat_history():
    """Get chat history for a user."""
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
            
        history = chat_manager.get_chat_history(user_id)
        
        return jsonify({'history': history})
        
    except Exception as e:
        logger.error(f"Error in get_chat_history endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/history/clear', methods=['POST'])
def clear_chat_history():
    """Clear chat history for a user."""
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
            
        success = chat_manager.clear_chat_history(user_id)
        
        if not success:
            return jsonify({'error': 'Failed to clear chat history'}), 500
            
        return jsonify({'message': 'Chat history cleared successfully'})
        
    except Exception as e:
        logger.error(f"Error in clear_chat_history endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

# --- NEW ROUTE: Add paper to library from search ---
@app.route('/api/library/add_from_search', methods=['POST'])
async def add_library_from_search():
    """Endpoint to add a paper from search results to the user library."""
    try:
        data = request.json
        if not data:
            logger.error("No JSON data received for add_from_search")
            return jsonify({'status': 'error', 'message': 'No data provided'}), 400

        user_id = data.get('user_id')
        paper_details = data.get('paper_details')

        if not user_id:
            logger.error("User ID missing in add_from_search request")
            return jsonify({'status': 'error', 'message': 'User ID is required'}), 400
        if not paper_details or not isinstance(paper_details, dict):
            logger.error("Paper details missing or invalid in add_from_search request")
            return jsonify({'status': 'error', 'message': 'Valid paper details are required'}), 400
        if not paper_details.get('url'):
             logger.error("Paper URL missing in add_from_search request")
             return jsonify({'status': 'error', 'message': 'Paper URL is required within paper details'}), 400

        logger.info(f"Received request to add paper for user {user_id} from URL: {paper_details.get('url')}")

        # Call the ScholarAgent method to handle fetching, uploading, and DB saving
        result = await chat_manager.scholar_agent.add_paper_from_url(
            user_id=user_id,
            paper_details=paper_details
        )

        # Return the result from the agent method
        if result.get('status') == 'success':
            return jsonify(result), 200
        else:
            # Log the specific error message from the agent
            logger.error(f"Failed to add paper from search for user {user_id}: {result.get('message')}")
            return jsonify(result), 500

    except Exception as e:
        logger.error(f"Unexpected error in add_library_from_search endpoint: {str(e)}", exc_info=True)
        return jsonify({'status': 'error', 'message': f'An unexpected server error occurred: {str(e)}'}), 500

# --- NEW: Check Library Status ---
@app.route('/api/library/check_status', methods=['POST'])
async def check_library_status():
    """Checks if multiple papers (by URL) exist in a user's library."""
    try:
        data = request.json
        user_id = data.get('user_id')
        paper_urls = data.get('paper_urls') # Expecting a list of URLs

        if not user_id:
            return jsonify({'status': 'error', 'message': 'User ID required'}), 400
        if not paper_urls or not isinstance(paper_urls, list):
            return jsonify({'status': 'error', 'message': 'List of paper_urls required'}), 400

        # Call the synchronous agent method (consider making agent method async if slow)
        # For now, running sync method in thread executor might be needed if it blocks
        loop = asyncio.get_event_loop()
        status_dict = await loop.run_in_executor(
            None, # Use default executor
            chat_manager.scholar_agent.check_library_status,
            user_id,
            paper_urls
        )
        # status_dict = chat_manager.scholar_agent.check_library_status(user_id, paper_urls) # Simpler if method is fast

        return jsonify({'status': 'success', 'library_status': status_dict}), 200

    except Exception as e:
        logger.error(f"Error in check_library_status endpoint: {str(e)}", exc_info=True)
        return jsonify({'status': 'error', 'message': f'Server error: {str(e)}'}), 500

# --- NEW: Get Presigned URL ---
@app.route('/api/library/files/<file_id>/url', methods=['GET'])
async def get_library_file_url(file_id):
    """Gets a presigned S3 URL for a file in the user's library."""
    try:
        user_id = request.args.get('user_id') # Get user_id from query param for verification
        if not user_id:
            return jsonify({'status': 'error', 'message': 'User ID required'}), 400
        if not file_id:
             return jsonify({'status': 'error', 'message': 'File ID required'}), 400

        # Call the synchronous agent method
        loop = asyncio.get_event_loop()
        presigned_url = await loop.run_in_executor(
            None,
            chat_manager.scholar_agent.get_presigned_url_for_file,
            user_id,
            file_id
        )
        # presigned_url = chat_manager.scholar_agent.get_presigned_url_for_file(user_id, file_id) # Simpler if method is fast

        if presigned_url:
            # Redirect the user to the S3 URL
            # return redirect(presigned_url, code=302)
            # Or return the URL for the frontend to handle
             return jsonify({'status': 'success', 'url': presigned_url}), 200
        else:
            return jsonify({'status': 'error', 'message': 'File not found or access denied'}), 404

    except Exception as e:
        logger.error(f"Error in get_library_file_url endpoint for file {file_id}: {str(e)}", exc_info=True)
        return jsonify({'status': 'error', 'message': f'Server error: {str(e)}'}), 500

# --- Catch-all route for frontend ---
# Serve frontend files from ../frontend/dist
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    frontend_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist'))
    if path != "" and os.path.exists(os.path.join(frontend_folder, path)):
        # Serve specific static file (like CSS, JS, images)
        return send_from_directory(frontend_folder, path)
    else:
        # Serve index.html for SPA routing (handles /, /library, etc.)
        index_path = os.path.join(frontend_folder, 'index.html')
        if not os.path.exists(index_path):
            logger.error(f"Frontend index.html not found at expected path: {index_path}")
            return jsonify({"error": "Frontend not found"}), 404
        return send_from_directory(frontend_folder, 'index.html')

if __name__ == '__main__':
    # Consider debug=False when serving static files this way in production
    app.run(debug=True, port=5000)
