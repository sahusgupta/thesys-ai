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

class ScholarAgent:
    def __init__(self, base_url: str = "http://localhost:5000"):
        # Configure logging first
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
        self.logger = logging.getLogger(__name__)
        
        self.base_url = base_url
        self.headers = {
            "Content-Type": "application/json",
        }
        
        # Initialize database connection
        self.db_conn = None
        self._ensure_db_connection()
        
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
    
    def _connect_to_db(self, max_retries: int = 3, initial_delay: float = 1.0) -> None:
        """Connect to PostgreSQL with retry logic and exponential backoff."""
        delay = initial_delay
        for attempt in range(max_retries):
            try:
                self.db_conn = psycopg2.connect(
                    host="localhost",
                    database="paper_repository",
                    user="postgres",
                    password="ktsg1899"
                )
                self.logger.info("Successfully connected to database")
                return
            except psycopg2.OperationalError as e:
                if attempt == max_retries - 1:
                    self.logger.error(f"Failed to connect to database after {max_retries} attempts")
                    raise
                
                self.logger.warning(f"Database connection attempt {attempt + 1} failed: {str(e)}")
                self.logger.info(f"Retrying in {delay} seconds...")
                time.sleep(delay)
                delay *= 2  # Exponential backoff

    def _ensure_db_connection(self) -> None:
        """Ensure we have an active database connection."""
        try:
            if self.db_conn is None or self.db_conn.closed:
                self._connect_to_db()
        except psycopg2.OperationalError as e:
            if "database \"paper_repository\" does not exist" in str(e):
                self.logger.info("Database does not exist. Initializing...")
                init_database()
                self._connect_to_db()
            else:
                raise

    def get_paper_url(self, paper_id: str) -> Optional[str]:
        """Get the URL for a paper by its ID."""
        try:
            self._ensure_db_connection()
            with self.db_conn.cursor() as cur:
                cur.execute("""
                    SELECT url FROM papers WHERE id = %s
                """, (paper_id,))
                result = cur.fetchone()
                if result:
                    return result[0]
                return None
        except Exception as e:
            self.logger.error(f"Error getting paper URL: {str(e)}")
            return None

    async def search_papers(self, query: str, max_results: int = 10) -> List[Dict]:
        """Search for papers in both Semantic Scholar and ArXiv APIs."""
        try:
            # First try Semantic Scholar
            semantic_results = await self._search_semantic_scholar(query, max_results, 0)
            semantic_papers = semantic_results.get('papers', []) if semantic_results.get('status') == 'success' else []
            
            # If we got results from Semantic Scholar, return them
            if semantic_papers:
                return semantic_papers[:max_results]
            
            # If no results from Semantic Scholar, try ArXiv
            self.logger.info("No results from Semantic Scholar, falling back to ArXiv")
            arxiv_papers = self._search_arxiv(query, max_results)
            
            if arxiv_papers:
                return arxiv_papers[:max_results]
            
            # If no results from either source, return empty list
            self.logger.warning(f"No results found for query: {query}")
            return []
            
        except Exception as e:
            self.logger.error(f"Error searching papers: {str(e)}")
            return []

    async def get_paper_details(self, paper_id: str) -> Optional[Dict]:
        """Get detailed information about a paper."""
        try:
            self._ensure_db_connection()
            with self.db_conn.cursor() as cur:
                cur.execute("""
                    SELECT p.*, COUNT(c.id) as citation_count
                    FROM papers p
                    LEFT JOIN citations c ON p.id = c.cited_paper_id
                    WHERE p.id = %s
                    GROUP BY p.id
                """, (paper_id,))
                
                row = cur.fetchone()
                if row:
                    return {
                        'id': row[0],
                        'title': row[1],
                        'abstract': row[2],
                        'authors': row[3],
                        'year': row[4],
                        'url': row[5],
                        'citation_count': row[6]
                    }
                return None
        except Exception as e:
            self.logger.error(f"Error getting paper details: {str(e)}")
            return None

    def save_paper(self, paper_data: Dict) -> bool:
        """Save paper data to the database."""
        try:
            self._ensure_db_connection()
            with self.db_conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO papers (id, title, abstract, authors, year, url)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE
                    SET title = EXCLUDED.title,
                        abstract = EXCLUDED.abstract,
                        authors = EXCLUDED.authors,
                        year = EXCLUDED.year,
                        url = EXCLUDED.url
                """, (
                    paper_data['id'],
                    paper_data['title'],
                    paper_data['abstract'],
                    paper_data['authors'],
                    paper_data['year'],
                    paper_data['url']
                ))
                self.db_conn.commit()
                return True
        except Exception as e:
            self.logger.error(f"Error saving paper: {str(e)}")
            return False

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

    async def search_user_library(self, query: str, user_id: str, max_results: int = 10) -> List[Dict]:
        """Search for papers in the user's library."""
        try:
            self._ensure_db_connection()
            with self.db_conn.cursor() as cur:
                cur.execute("""
                    SELECT p.*, COUNT(c.id) as citation_count
                    FROM papers p
                    LEFT JOIN citations c ON p.id = c.cited_paper_id
                    INNER JOIN user_library ul ON p.id = ul.paper_id
                    WHERE ul.user_id = %s
                    AND to_tsvector('english', p.title || ' ' || p.abstract) @@ to_tsquery('english', %s)
                    GROUP BY p.id
                    ORDER BY citation_count DESC
                    LIMIT %s
                """, (user_id, query, max_results))
                
                results = []
                for row in cur.fetchall():
                    results.append({
                        'id': row[0],
                        'title': row[1],
                        'abstract': row[2],
                        'authors': row[3],
                        'year': row[4],
                        'url': row[5],
                        'citation_count': row[6]
                    })
                return results
        except Exception as e:
            self.logger.error(f"Error searching user library: {str(e)}")
            return []

    async def upload_paper(self, user_id: str, file_data: bytes, file_name: str, file_type: str) -> Dict:
        """Upload a paper to S3."""
        try:
            self.logger.info("Starting file upload in ScholarAgent")
            
            # Validate inputs
            if not user_id:
                self.logger.error("User ID is missing")
                raise ValueError("User ID is required")
            if not file_data:
                self.logger.error("File data is missing")
                raise ValueError("File data is required")
            if not file_name:
                self.logger.error("File name is missing")
                raise ValueError("File name is required")
            if not file_type:
                self.logger.error("File type is missing")
                raise ValueError("File type is required")

            # Generate a unique file ID
            file_id = str(uuid.uuid4())
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
                raise ValueError(f"Failed to upload file to S3: {str(e)}")
            
            return {
                'status': 'success',
                'file_id': file_id,
                'message': 'File uploaded successfully',
                'url': f"https://{self.s3_bucket}.s3.amazonaws.com/{s3_key}"
            }
            
        except ValueError as ve:
            self.logger.error(f"Validation error: {str(ve)}", exc_info=True)
            return {
                'status': 'error',
                'message': str(ve)
            }
        except Exception as e:
            self.logger.error(f"Unexpected error in upload_paper: {str(e)}", exc_info=True)
            return {
                'status': 'error',
                'message': f"An unexpected error occurred: {str(e)}"
            }

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

    async def get_uploaded_paper(self, user_id: str, paper_id: str) -> Dict:
        """Get an uploaded paper's content and metadata."""
        try:
            self._ensure_db_connection()
            with self.db_conn.cursor() as cur:
                # Get upload metadata
                cur.execute("""
                    SELECT u.*, p.title, p.abstract
                    FROM user_uploads u
                    JOIN papers p ON u.paper_id = p.id
                    WHERE u.user_id = %s AND u.paper_id = %s
                """, (user_id, paper_id))
                
                upload = cur.fetchone()
                if not upload:
                    return {
                        'status': 'error',
                        'message': 'Paper not found'
                    }
                
                # Get file from S3
                try:
                    response = self.s3_client.get_object(
                        Bucket=self.s3_bucket,
                        Key=upload[4]  # s3_key
                    )
                    file_content = response['Body'].read()
                    
                    return {
                        'status': 'success',
                        'paper': {
                            'id': paper_id,
                            'title': upload[7],  # title
                            'abstract': upload[8],  # abstract
                            'file_name': upload[3],  # file_name
                            'file_type': upload[5],  # file_type
                            'content': file_content.decode('utf-8') if upload[5] == 'text/plain' else None,
                            'url': f"https://{self.s3_bucket}.s3.amazonaws.com/{upload[4]}"  # s3_key
                        }
                    }
                except ClientError as e:
                    self.logger.error(f"Error retrieving file from S3: {str(e)}")
                    return {
                        'status': 'error',
                        'message': 'Error retrieving file'
                    }
                    
        except Exception as e:
            self.logger.error(f"Error getting uploaded paper: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }

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

    def __del__(self):
        """Clean up database connection when the object is destroyed."""
        if self.db_conn and not self.db_conn.closed:
            self.db_conn.close()