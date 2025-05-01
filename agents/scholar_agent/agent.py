from typing import List, Dict, Any, Optional
import requests
from datetime import datetime
import logging
import json
import arxiv
import time
import psycopg2
import os
from pathlib import Path
from psycopg2 import OperationalError
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from backend.init_db import init_database
import boto3
from botocore.exceptions import ClientError
import PyPDF2
import io
import uuid
from models.summarization import generate_summary

class ScholarAgent:
    def __init__(self, context_agent=None, base_url: str = "http://localhost:5000"):
        # Configure logging first
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
        self.logger = logging.getLogger(__name__)
        
        self.base_url = base_url
        self.headers = {
            "Content-Type": "application/json",
            "User-Agent": "ThesysAIResearchAgent/1.0"
        }
        
        self.context_agent = context_agent
        self.db_conn = None
        try:
            self._ensure_db_connection()
        except Exception as e:
            self.logger.warning(f"Failed to connect to database, continuing without database support: {str(e)}")
            self.db_conn = None

        # Create papers directory if it doesn't exist
        self.papers_dir = Path("data/papers")
        self.papers_dir.mkdir(parents=True, exist_ok=True)
        
        # Rate limiting parameters
        self.max_retries = 1
        self.retry_delay = 1  # Initial delay in seconds
        
        # ArXiv API client
        self.arxiv_client = arxiv.Client(
            page_size=10,
            delay_seconds=3.0,
            num_retries=3
        )
        
        # Initialize S3 client
        try:
            self.s3_bucket = os.getenv('S3_BUCKET')
            if not self.s3_bucket:
                raise ValueError("S3_BUCKET environment variable is not set")
                
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=os.getenv('AWS_REGION', 'us-east-1')
            )
            
            # Verify S3 bucket exists and is accessible
            self.s3_client.head_bucket(Bucket=self.s3_bucket)
            self.logger.info(f"Successfully connected to S3 bucket: {self.s3_bucket}")
            
        except Exception as e:
            self.logger.error(f"Error initializing S3 client: {str(e)}")
            raise
    
    
    async def search_papers(self, query: str, max_results: int = 10) -> List[Dict]:
        """Search for papers using ArXiv API."""
        try:
            # Search ArXiv directly
            self.logger.info(f"Searching ArXiv for: {query}")
            arxiv_papers = self._search_arxiv(query, max_results)
            
            if arxiv_papers:
                return arxiv_papers[:max_results]
            
            # If no results from ArXiv, return empty list
            self.logger.warning(f"No results found for query: {query}")
            return []
            
        except Exception as e:
            self.logger.error(f"Error searching papers: {str(e)}")
            return []


    def _make_request_with_backoff(self, url, params=None):
        """Helper method to make API requests with exponential backoff"""
        retries = 0
        while retries <= self.max_retries:
            try:
                response = requests.get(url, headers=self.headers, params=params)
                
                # If successful, return the response
                if response.status_code == 200:
                    return response
                
                # If rate limited, try ArXiv instead
                if response.status_code == 429:
                    self.logger.warning("Rate limited by Semantic Scholar. Falling back to ArXiv API.")
                    return None
                
                # For other errors, raise the exception
                response.raise_for_status()
                
            except requests.exceptions.RequestException as e:
                if retries == self.max_retries:
                    raise e
                retries += 1
                wait_time = self.retry_delay * (2 ** retries)
                self.logger.warning(f"Request failed. Retrying in {wait_time} seconds. Error: {str(e)}")
                time.sleep(wait_time)
        
        raise requests.exceptions.RequestException(f"Max retries ({self.max_retries}) exceeded")

    def _search_arxiv(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search papers using ArXiv API"""
        try:
            search = arxiv.Search(
                query=query,
                max_results=limit,
                sort_by=arxiv.SortCriterion.Relevance
            )
            
            papers = []
            for result in self.arxiv_client.results(search):
                paper = {
                    "id": result.entry_id,
                    "title": result.title,
                    "abstract": result.summary,
                    "authors": [author.name for author in result.authors],
                    "year": result.published.year,
                    "venue": "arXiv",
                    "citations": None,  # ArXiv doesn't provide citation counts
                    "url": result.pdf_url,
                    "timestamp": datetime.now().isoformat()
                }
                papers.append(paper)
            
            return papers
            
        except Exception as e:
            self.logger.error(f"ArXiv API error: {str(e)}")
            return []

    async def _search_semantic_scholar(self, query: str, limit: int, offset: int) -> Dict[str, Any]:
        """Search papers using Semantic Scholar API"""
        try:
            # Use Semantic Scholar API directly
            url = "https://api.semanticscholar.org/graph/v1/paper/search"
            params = {
                "query": query,
                "limit": limit,
                "offset": offset,
                "fields": "paperId,title,abstract,authors,year,venue,citationCount,url,updated"
            }
            
            response = self._make_request_with_backoff(url, params=params)
            if response:
                data = response.json()
                papers = []
                for result in data.get("data", []):
                    paper = {
                        "id": result.get("paperId", ""),
                        "title": result.get("title", ""),
                        "abstract": result.get("abstract", ""),
                        "authors": [author.get("name", "") for author in result.get("authors", [])],
                        "year": result.get("year", ""),
                        "venue": result.get("venue", ""),
                        "citations": result.get("citationCount", 0),
                        "url": result.get("url", ""),
                        "timestamp": result.get("updated", "").split("T")[0] if result.get("updated") else ""
                    }
                    papers.append(paper)
                
                return {
                    'status': 'success',
                    'papers': papers,
                    'total': data.get("total", 0)
                }
            else:
                return {
                    'status': 'error',
                    'message': 'No response from Semantic Scholar API'
                }
        except Exception as e:
            self.logger.error(f"Semantic Scholar API error: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }

    async def _fetch_semantic_scholar_paper(self, paper_id: str) -> Dict[str, Any]:
        """Fetch paper details from Semantic Scholar API"""
        try:
            response = self._make_request_with_backoff(f"{self.base_url}/paper/{paper_id}")
            if response:
                data = response.json()
                paper = {
                    "id": data["paperId"],
                    "title": data["title"],
                    "abstract": data["abstract"],
                    "authors": [author["name"] for author in data["authors"]],
                    "year": data["year"],
                    "venue": data["venue"],
                    "citations": data["citationCount"],
                    "url": data["url"],
                    "timestamp": data["updated"].split("T")[0]
                }
                return {
                    'status': 'success',
                    'paper': paper
                }
            else:
                return {
                    'status': 'error',
                    'message': 'No response from Semantic Scholar API'
                }
        except Exception as e:
            self.logger.error(f"Semantic Scholar API error: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }

    
    async def upload_paper(self, user_id: str, file_data: bytes, file_name: str, file_type: str) -> Dict:
        """Upload a paper to S3, generate summary, and save metadata to DB."""
        extracted_text = None
        summary = None
        s3_key = None # Initialize s3_key
        file_id = str(uuid.uuid4()) # Generate file_id early

        try:
            self.logger.info(f"Starting file upload process for user {user_id}, file {file_name}")

            # Validate inputs (as before)
            if not user_id: raise ValueError("User ID is required")
            if not file_data: raise ValueError("File data is required")
            if not file_name: raise ValueError("File name is required")
            if not file_type: raise ValueError("File type is required")

            self.logger.info(f"Generated file ID: {file_id}")

            # Create S3 key
            s3_key = f"user_uploads/{user_id}/{file_id}/{file_name}"
            self.logger.info(f"Created S3 key: {s3_key}")

            # Upload to S3
            try:
                self.logger.info("Attempting S3 upload")
                self.s3_client.put_object(
                    Bucket=self.s3_bucket,
                    Key=s3_key,
                    Body=file_data,
                    ContentType=file_type,
                    Metadata={
                        'user_id': user_id,
                        'file_name': file_name,
                        'file_type': file_type,
                        'created_at': datetime.now().isoformat()
                    }
                )
                self.logger.info("S3 upload successful")
            except Exception as e:
                self.logger.error(f"S3 upload error: {str(e)}", exc_info=True)
                # If S3 fails, we don't proceed to DB/summary
                raise ValueError(f"Failed to upload file to S3: {str(e)}")

            # Extract text based on file type
            self.logger.info(f"Attempting text extraction for file type: {file_type}")
            if file_type == 'application/pdf':
                extracted_text = self._extract_text_from_pdf(file_data)
                self.logger.info(f"Extracted ~{len(extracted_text)} chars from PDF")
            elif file_type == 'text/plain':
                try:
                    extracted_text = file_data.decode('utf-8')
                    self.logger.info(f"Decoded ~{len(extracted_text)} chars from TXT")
                except UnicodeDecodeError:
                    self.logger.warning(f"Could not decode file {file_name} as UTF-8. Trying latin-1.")
                    try:
                        extracted_text = file_data.decode('latin-1')
                        self.logger.info(f"Decoded ~{len(extracted_text)} chars from TXT with latin-1")
                    except Exception as decode_err:
                         self.logger.error(f"Failed to decode TXT file {file_name} with any encoding: {decode_err}")
                         extracted_text = None # Ensure it's None if all decoding fails
            else:
                self.logger.warning(f"Skipping text extraction/summarization for unsupported file type: {file_type}")

            # Generate summary if text was extracted
            if extracted_text:
                try:
                    # Assuming generate_summary takes text, a prompt (?), and discipline (?)
                    # We need to define appropriate defaults or pass them in. Using placeholders for now.
                    # TODO: Determine appropriate prompt and discipline for summarization
                    prompt_placeholder = "General Summary"
                    discipline_placeholder = "General"
                    self.logger.info(f"Generating summary for file {file_id}...")
                    summary_result = generate_summary(extracted_text, prompt_placeholder, discipline_placeholder)
                    # Assuming generate_summary returns a dict with a 'summary' key
                    summary = summary_result.get('summary', None)
                    if summary:
                         self.logger.info(f"Generated summary for file {file_id} (length: {len(summary)})")
                    else:
                         self.logger.warning(f"generate_summary did not return a 'summary' key for file {file_id}")

                except Exception as summary_err:
                    self.logger.error(f"Error generating summary for file {file_id}: {summary_err}", exc_info=True)
                    summary = None # Ensure summary is None if generation fails
            else:
                 self.logger.info(f"No text extracted for file {file_id}, skipping summary generation.")

            # Save metadata (including summary, if generated) to DB
            try:
                self.logger.info(f"Saving file metadata to DB for file {file_id}")
                self._ensure_db_connection()
                with self.db_conn.cursor() as cur:
                    sql = """
                        INSERT INTO user_files (id, user_id, file_name, file_type, s3_key, summary, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """
                    params = (
                        file_id,
                        user_id,
                        file_name,
                        file_type,
                        s3_key,
                        summary, # Use the generated summary (can be None)
                        datetime.now() # Use current timestamp for DB
                    )
                    cur.execute(sql, params)
                self.db_conn.commit()
                self.logger.info(f"Successfully saved metadata for file {file_id} to DB")
            except Exception as db_err:
                self.logger.error(f"Database error saving metadata for file {file_id}: {db_err}", exc_info=True)
                # Log DB error, but potentially still return success for upload?
                # Or should this be a critical failure? Deciding to return success for now.
                # Consider if a rollback mechanism for S3 is needed if DB fails.

            # After successful upload (around line 344):
            if self.context_agent:
                self.context_agent.add_uploaded_file(user_id, file_name)
                self.logger.info(f"Logged upload activity for {file_name}")

            # Return success response (even if summary/DB failed, S3 succeeded)
            return {
                'status': 'success',
                'file_id': file_id,
                'message': f"File uploaded successfully. Summary generation {'succeeded' if summary else 'skipped or failed'}.",
                'url': f"https://{self.s3_bucket}.s3.amazonaws.com/{s3_key}" # Use the defined s3_key
            }

        except ValueError as ve:
            self.logger.error(f"Validation error during upload: {str(ve)}")
            return {'status': 'error', 'message': str(ve)}
        except Exception as e:
            self.logger.error(f"Unexpected error in upload_paper: {str(e)}", exc_info=True)
            return {'status': 'error', 'message': f"An unexpected error occurred: {str(e)}"}

    def _extract_text_from_pdf(self, pdf_data: bytes) -> str:
        """Extract text from PDF file."""
        try:
            pdf_file = io.BytesIO(pdf_data)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            return text
        except Exception as e:
            self.logger.error(f"Error extracting text from PDF: {str(e)}")
            return ""


    def _generate_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """Generate a pre-signed URL for an S3 object."""
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.s3_bucket,
                    'Key': key
                },
                ExpiresIn=expires_in
            )
            return url
        except Exception as e:
            self.logger.error(f"Error generating pre-signed URL: {str(e)}")
            return None

    def get_user_library_files(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all files in a user's library from S3."""
        try:
            self.logger.info(f"Getting files for user: {user_id}")
            
            # Verify S3 client is properly initialized
            if not hasattr(self, 's3_client') or not self.s3_client:
                self.logger.error("S3 client not initialized")
                return []
                
            # Verify bucket exists and is accessible
            try:
                self.s3_client.head_bucket(Bucket=self.s3_bucket)
            except Exception as e:
                self.logger.error(f"Error accessing S3 bucket {self.s3_bucket}: {str(e)}")
                return []
            
            # List objects in the user's directory
            try:
                response = self.s3_client.list_objects_v2(
                    Bucket=self.s3_bucket,
                    Prefix=f"user_uploads/{user_id}/"
                )
                
                files = []
                if 'Contents' in response:
                    for obj in response['Contents']:
                        try:
                            # Get object metadata
                            metadata = self.s3_client.head_object(
                                Bucket=self.s3_bucket,
                                Key=obj['Key']
                            )['Metadata']
                            
                            # Extract file ID from the key
                            file_id = obj['Key'].split('/')[2]
                            
                            # Generate pre-signed URL
                            url = self._generate_presigned_url(obj['Key'])
                            
                            if url:
                                files.append({
                                    'id': file_id,
                                    'file_name': metadata.get('file_name', obj['Key'].split('/')[-1]),
                                    'file_type': metadata.get('file_type', 'application/octet-stream'),
                                    'created_at': metadata.get('created_at', obj['LastModified'].isoformat()),
                                    'url': url
                                })
                        except Exception as e:
                            self.logger.error(f"Error processing file {obj['Key']}: {str(e)}")
                            continue
                
                self.logger.info(f"Found {len(files)} files for user {user_id}")
                return files
                
            except Exception as e:
                self.logger.error(f"Error listing objects in S3: {str(e)}")
                return []
            
        except Exception as e:
            self.logger.error(f"Error getting user files: {str(e)}", exc_info=True)
            return []

    def get_file_details(self, user_id: str, file_id: str) -> Optional[Dict[str, Any]]:
        """Get details of a specific file from S3."""
        try:
            self.logger.info(f"Getting details for file {file_id} of user {user_id}")
            
            # List objects with the specific file ID
            response = self.s3_client.list_objects_v2(
                Bucket=self.s3_bucket,
                Prefix=f"user_uploads/{user_id}/{file_id}/"
            )
            
            if 'Contents' not in response or not response['Contents']:
                self.logger.error(f"File {file_id} not found for user {user_id}")
                return None
                
            obj = response['Contents'][0]
            
            # Get object metadata
            metadata = self.s3_client.head_object(
                Bucket=self.s3_bucket,
                Key=obj['Key']
            )['Metadata']
            
            # Generate pre-signed URL
            url = self._generate_presigned_url(obj['Key'])
            
            if not url:
                self.logger.error(f"Failed to generate URL for file {file_id}")
                return None
            
            return {
                'id': file_id,
                'file_name': metadata.get('file_name', obj['Key'].split('/')[-1]),
                'file_type': metadata.get('file_type', 'application/octet-stream'),
                'created_at': metadata.get('created_at', obj['LastModified'].isoformat()),
                'url': url
            }
            
        except Exception as e:
            self.logger.error(f"Error getting file details: {str(e)}", exc_info=True)
            return None

    def delete_file(self, user_id: str, file_id: str) -> bool:
        """Delete a file from S3."""
        try:
            self.logger.info(f"Deleting file {file_id} for user {user_id}")
            
            # List objects with the specific file ID
            response = self.s3_client.list_objects_v2(
                Bucket=self.s3_bucket,
                Prefix=f"user_uploads/{user_id}/{file_id}/"
            )
            
            if 'Contents' not in response:
                self.logger.error(f"File {file_id} not found for user {user_id}")
                return False
                
            # Delete all objects with this prefix (in case there are multiple versions)
            for obj in response['Contents']:
                self.s3_client.delete_object(
                    Bucket=self.s3_bucket,
                    Key=obj['Key']
                )
            
            self.logger.info(f"Successfully deleted file {file_id} for user {user_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error deleting file: {str(e)}", exc_info=True)
            return False

    async def add_paper_from_url(self, user_id: str, url: str) -> Dict:
        """Fetches paper PDF from URL, uploads to S3, and saves metadata to DB."""
        file_id = str(uuid.uuid4()) # Generate unique ID for this file
        pdf_data = None
        s3_key = None
        
        # Extract necessary details safely
        paper_url = url
        file_name_base = url.split('/')[-1]
        # Sanitize filename (basic example)
        safe_file_name = "".join(c if c.isalnum() or c in ('_', '-') else '_' for c in file_name_base)
        file_name = f"{safe_file_name[:100]}.pdf" # Ensure .pdf extension and limit length
        
        try:
            self.logger.info(f"Attempting to add paper for user {user_id} from URL: {paper_url}")
            if not user_id: raise ValueError("User ID is required")
            if not paper_url: raise ValueError("Paper URL is required")

            # 1. Fetch PDF Content from URL
            try:
                self.logger.info(f"Fetching PDF from {paper_url}")
                # Use stream=True for potentially large files, add timeout
                response = requests.get(paper_url, headers=self.headers, stream=True, timeout=30, allow_redirects=True)
                response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
                
                # Check content type - be flexible but prefer application/pdf
                content_type = response.headers.get('content-type', '').lower()
                if 'application/pdf' not in content_type:
                    self.logger.warning(f"Content-Type from {paper_url} is '{content_type}', not application/pdf. Proceeding cautiously.")
                    # Optional: Could add more checks here (e.g., magic numbers) if needed
                
                # Read content (consider memory usage for very large files)
                pdf_data = response.content # Reads the entire content into memory
                self.logger.info(f"Successfully fetched PDF data (approx {len(pdf_data)} bytes)")
                
            except requests.exceptions.RequestException as e:
                self.logger.error(f"Failed to fetch PDF from URL {paper_url}: {e}", exc_info=True)
                raise ValueError(f"Could not retrieve paper from URL: {e}")
            except Exception as e:
                 self.logger.error(f"Unexpected error fetching PDF from {paper_url}: {e}", exc_info=True)
                 raise ValueError(f"An unexpected error occurred while fetching the paper.")
            
            if not pdf_data:
                 raise ValueError("Failed to get PDF data from the URL.")

            # 2. Upload PDF to S3
            s3_key = f"user_uploads/{user_id}/{file_id}/{file_name}"
            try:
                self.logger.info(f"Uploading fetched PDF to S3 key: {s3_key}")
                self.s3_client.put_object(
                    Bucket=self.s3_bucket,
                    Key=s3_key,
                    Body=pdf_data,
                    ContentType='application/pdf',
                    Metadata={
                        'user_id': user_id,
                        'file_name': file_name,
                        'file_type': 'application/pdf',
                        'original_url': paper_url, # Store original source URL
                        'added_from': 'search',
                        'created_at': datetime.now().isoformat()
                    }
                )
                self.logger.info("S3 upload successful")
            except Exception as e:
                self.logger.error(f"S3 upload error for key {s3_key}: {e}", exc_info=True)
                raise ValueError(f"Failed to upload file to S3: {e}")

            # 3. Save Metadata to Database (user_files table)
            # Note: Skipping summarization for now as it wasn't in upload_paper either.
            # If summarization is needed, extract text and call generate_summary here.
            try:
                self.logger.info(f"Saving file metadata to DB for file {file_id}")
                self._ensure_db_connection()
                with self.db_conn.cursor() as cur:
                    sql = """
                        INSERT INTO user_files (id, user_id, file_name, file_type, s3_key, summary, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING -- Or update if needed
                    """
                    params = (
                        file_id,
                        user_id,
                        file_name,
                        'application/pdf', # Set file type as PDF
                        s3_key,
                        None, # No summary generated here
                        datetime.now()
                    )
                    cur.execute(sql, params)
                self.db_conn.commit()
                self.logger.info(f"Successfully saved metadata for file {file_id} to DB")
            except Exception as db_err:
                self.logger.error(f"Database error saving metadata for file {file_id}: {db_err}", exc_info=True)
                # Decide if this failure should prevent success response.
                # For now, log but continue. Consider cleanup (e.g., delete S3 object).
                pass 

            # After successful S3 upload, log the activity
            if self.context_agent:
                self.context_agent.add_uploaded_file(user_id, file_name)
                self.logger.info(f"Logged upload activity for {file_name}")

            return {
                'status': 'success',
                'file_id': file_id,
                'file_name': file_name
            }

        except ValueError as ve:
            self.logger.error(f"Validation error adding paper from URL: {str(ve)}")
            return {'status': 'error', 'message': str(ve)}
        except Exception as e:
            self.logger.error(f"Unexpected error in add_paper_from_url: {str(e)}", exc_info=True)
            return {'status': 'error', 'message': f"An unexpected error occurred: {str(e)}"}

    def __del__(self):
        """Clean up database connection when the object is destroyed."""
        if hasattr(self, 'db_conn') and self.db_conn and not self.db_conn.closed:
            try:
                self.db_conn.close()
                self.logger.info("Database connection closed")
            except Exception as e:
                self.logger.warning(f"Error closing database connection: {str(e)}")

    # --- Method to check library status for multiple papers ---
    def check_library_status(self, user_id: str, paper_urls: List[str]) -> Dict[str, Dict]:
        """Checks the user_files table for papers matching given URLs for a user."""
        status = {}
        if not user_id or not paper_urls:
            return status # Return empty if no user or URLs

        try:
            self.logger.info(f"Checking library status for {len(paper_urls)} URLs for user {user_id}")
            self._ensure_db_connection()
            with self.db_conn.cursor() as cur:
                # We need a way to link search results (by URL) to stored files.
                # Let's assume the original_url was stored as metadata during add_from_search
                # Query user_files based on the S3 metadata original_url (less efficient but doable)

                sql = """
                    SELECT id, s3_key, original_url 
                    FROM user_files 
                    WHERE user_id = %s AND original_url = ANY(%s)
                """
                # Ensure paper_urls is a list or tuple for ANY()
                cur.execute(sql, (user_id, tuple(paper_urls)))
                results = cur.fetchall()

                found_urls = {}
                for row in results:
                    file_id, s3_key, original_url = row
                    if original_url in paper_urls: # Check if the fetched URL is one we queried
                        found_urls[original_url] = {
                            'inLibrary': True,
                            'file_id': file_id,
                            's3_key': s3_key
                        }

                # Populate status for all queried URLs
                for url in paper_urls:
                    status[url] = found_urls.get(url, {'inLibrary': False, 'file_id': None, 's3_key': None})

            self.logger.info(f"Library status check completed for user {user_id}")
            return status

        except Exception as e:
            self.logger.error(f"Error checking library status for user {user_id}: {e}", exc_info=True)
            return {url: {'inLibrary': False, 'file_id': None, 's3_key': None, 'error': 'Failed to check status'} for url in paper_urls}


    # --- Method to get a presigned URL ---
    def get_presigned_url_for_file(self, user_id: str, file_id: str) -> Optional[str]:
        """Generates a presigned URL for a file if it belongs to the user."""
        try:
            self.logger.info(f"Attempting to get presigned URL for file {file_id} for user {user_id}")
            self._ensure_db_connection()
            s3_key = None
            with self.db_conn.cursor() as cur:
                cur.execute("SELECT s3_key FROM user_files WHERE id = %s AND user_id = %s", (file_id, user_id))
                result = cur.fetchone()
                if result:
                    s3_key = result[0]
                else:
                    self.logger.warning(f"File {file_id} not found or does not belong to user {user_id}")
                    return None

            if s3_key:
                url = self._generate_presigned_url(s3_key) # Use existing helper
                self.logger.info(f"Generated presigned URL for file {file_id}")
                return url
            else:
                return None 

        except Exception as e:
            self.logger.error(f"Error generating presigned URL for file {file_id}: {e}", exc_info=True)
            return None

    async def like_paper(self, user_id: str, file_name: str) -> Dict:
        """Add a paper to user's liked papers."""
        try:
            if self.context_agent:
                self.context_agent.add_liked_file(user_id, file_name)
                self.logger.info(f"Logged like activity for {file_name}")
            return {'status': 'success', 'message': f'Paper {file_name} liked successfully'}
        except Exception as e:
            self.logger.error(f"Error liking paper: {str(e)}")
            return {'status': 'error', 'message': str(e)}

    def _ensure_db_connection(self) -> None:
        """Ensure database connection is established."""
        if not self.db_conn or self.db_conn.closed:
            try:
                self.db_conn = psycopg2.connect(
                    host=os.getenv('DB_HOST', 'localhost'),
                    port=os.getenv('DB_PORT', '5432'),
                    dbname=os.getenv('DB_NAME', 'thesys_ai'),
                    user=os.getenv('DB_USER', 'postgres'),
                    password=os.getenv('DB_PASSWORD')
                )
                self.db_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                self.logger.info("Successfully connected to database")
            except Exception as e:
                self.logger.warning(f"Failed to connect to database: {str(e)}")
                self.db_conn = None
                raise  # Re-raise the exception to be handled by the caller