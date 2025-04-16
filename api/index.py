from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
import os
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

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

    async def process_message(self, message: str, user_id: str) -> Dict[str, Any]:
        """Process a message through all relevant agents."""
        try:
            self.logger.info(f"Processing message: {message}")
            
            # Get user context
            context = self.context_agent.get_user_context(user_id)
            self.logger.info(f"User context: {context}")
            
            # Fact-check the message
            fact_check_result = self.factcheck_agent.verify_claim(message, context)
            self.logger.info(f"Fact check result: {fact_check_result}")
            
            # Search for relevant papers
            papers = await self.scholar_agent.search_papers(message)
            self.logger.info(f"Found {len(papers)} papers")
            
            # Generate citations for found papers
            citations = []
            for paper in papers:
                citation = self.citation_agent.generate_citation(paper, style='apa')
                citations.append(citation)
            self.logger.info(f"Generated {len(citations)} citations")
            
            # Save message to chat history
            self.context_agent.add_to_chat_history(user_id, {
                'role': 'user',
                'content': message,
                'timestamp': datetime.now().isoformat()
            })
            
            # Prepare raw response data
            raw_response = {
                'papers': papers,
                'citations': citations,
                'fact_check': fact_check_result
            }
            
            # Format response using OpenAI
            formatted_response = await self._format_response_with_openai(message, raw_response)
            self.logger.info(f"Formatted response: {formatted_response[:200]}...")  # Log first 200 chars
            
            # Prepare final response
            response = {
                'text': formatted_response,
                'raw_data': raw_response
            }
            
            # Save response to chat history
            self.context_agent.add_to_chat_history(user_id, {
            'role': 'assistant',
                'content': response,
                'timestamp': datetime.now().isoformat()
            })
            
            # Add token limit to response
            MAX_TOKENS = 500
            if len(response['text']) > MAX_TOKENS:
                response['text'] = response['text'][:MAX_TOKENS] + "..."
            
            return response
            
        except Exception as e:
            self.logger.error(f"Error processing message: {str(e)}", exc_info=True)
            return {
                'error': str(e),
                'text': "I encountered an error while processing your request. Please try again later.",
                'raw_data': {
                    'papers': [],
                    'citations': [],
                    'fact_check': None
                }
            }

    async def _format_response_with_openai(self, user_message: str, raw_data: Dict[str, Any]) -> str:
        """Format the raw response data into human-readable text using OpenAI, aiming for thoroughness."""
        try:
            from openai import AsyncOpenAI
            
            # Initialize OpenAI client
            client = AsyncOpenAI()
            
            # Prepare paper summaries - include more detail from top 3-5 papers
            paper_summaries = []
            num_papers_to_include = min(len(raw_data.get('papers', [])), 3) # Use top 3 papers
            
            for paper in raw_data['papers'][:num_papers_to_include]:
                # Allow longer titles and abstracts
                title = paper['title'][:150] + '...' if len(paper['title']) > 150 else paper['title']
                abstract = paper['abstract'][:400] + '...' if len(paper['abstract']) > 400 else paper['abstract']
                authors = ', '.join(paper['authors'][:5]) # Include up to 5 authors
                authors_str = f"{authors}{' et al.' if len(paper['authors']) > 5 else ''}"
                
                summary = f"""
                    Title: {title}
                    Authors: {authors_str}
                    Year: {paper['year']}
                    Abstract Snippet: {abstract}
                """
                paper_summaries.append(summary)
            
            # Prepare the prompt - ask for a detailed and thorough response
            prompt = f"""Provide a comprehensive and thorough response to the user's query based on the provided research summaries.

                        User Query: {user_message}

                        Relevant Research Summaries:
                        {chr(10).join(paper_summaries) if paper_summaries else 'No specific papers found.'}

                        Fact Check Status (if available): {raw_data.get('fact_check', {}).get('status', 'N/A')}

                        Guidelines:
                        - Provide a detailed explanation addressing the user's query.
                        - Integrate key findings and details from the research summaries.
                        - Cite specific papers (using Author, Year) when referencing their findings.
                        - Explain concepts clearly and elaborate where necessary.
                        - Structure the response logically with an introduction, detailed body, and conclusion.
                        - Aim for a response length of around 400-600 words, ensuring completeness.

                        Please synthesize the information into a well-written, informative response."""

            self.logger.info("Sending detailed prompt to OpenAI")
            
            # Call OpenAI API - Allow more tokens and slightly higher temperature
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a knowledgeable research assistant tasked with providing thorough, detailed, and well-supported answers based on academic literature."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.6,  # Slightly higher temperature for more detail
                max_tokens=1500   # Allow ample tokens for a thorough response
            )
            
            self.logger.info("Received response from OpenAI")
            
            # Get the generated response
            gpt_response = response.choices[0].message.content
            self.logger.info(f"GPT Response length: {len(gpt_response)} chars")
            
            # Add concise source attribution if fact-checking occurred (using the simplified result)
            fact_check_status = raw_data.get('fact_check', {}).get('status')
            if fact_check_status and fact_check_status != 'error':
                 verified_response = f"{gpt_response}\n\n---\nVerification Status: {fact_check_status.replace('_', ' ').title()}"
            else:
                verified_response = gpt_response
            
            return verified_response
            
        except Exception as e:
            self.logger.error(f"Error formatting response with OpenAI: {str(e)}", exc_info=True)
            # Fallback response indicating error but still trying to provide some info
            papers_found = len(raw_data.get('papers', []))
            if papers_found > 0:
                paper = raw_data['papers'][0]
                return f"I encountered an error while generating a detailed response. Based on initial findings, research like '{paper['title'][:100]}...' might be relevant."
            return "I encountered an error and couldn't generate a response."

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

# Create global chat manager instance
chat_manager = ChatManager()

@app.route('/api/chat', methods=['POST'])
async def chat():
    """Enhanced chat endpoint that coordinates between multiple agents."""
    try:
        data = request.json
        if not data:
            logger.error("No JSON data received")
            return jsonify({'error': 'No data provided'}), 400
            
        message = data.get('message', '')
        if not message:
            logger.error("No message provided")
            return jsonify({'error': 'Message is required'}), 400
            
        # Generate a temporary user_id if not provided
        user_id = data.get('user_id', str(uuid.uuid4()))
        logger.info(f"Processing message for user {user_id}: {message[:100]}...")
        
        # Process message through chat manager
        response = await chat_manager.process_message(message, user_id)
        
        if 'error' in response:
            logger.error(f"Error processing message: {response['error']}")
            return jsonify({'error': response['error']}), 500
            
        return jsonify(response)  # Return the response directly without nesting
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

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
def search_papers():
    """Endpoint for searching papers."""
    try:
        data = request.json
        query = data.get('query')
        user_id = data.get('user_id')
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        # Search papers using chat manager
        result = chat_manager.search_papers(query, user_id)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in search_papers endpoint: {str(e)}")
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
