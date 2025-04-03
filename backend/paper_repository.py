from typing import Dict, List, Optional
import boto3
from botocore.exceptions import ClientError
import psycopg2
from opensearchpy import OpenSearch
import json
from datetime import datetime
from utils.config import Config

class PaperRepository:
    def __init__(self):
        # Initialize AWS S3
        self.s3 = boto3.client('s3',
            aws_access_key_id=Config.AWS_ACCESS_KEY,
            aws_secret_access_key=Config.AWS_SECRET_KEY
        )
        self.bucket_name = Config.S3_BUCKET
        
        # Initialize PostgreSQL
        self.db = psycopg2.connect(
            host=Config.DB_HOST,
            database=Config.DB_NAME,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD
        )
        
        # Initialize OpenSearch
        self.search_client = OpenSearch(
            hosts=[{'host': Config.OPENSEARCH_HOST, 'port': 443}],
            http_auth=Config.OPENSEARCH_AUTH,
            use_ssl=True,
            verify_certs=True
        )
        
        self.init_db()

    def init_db(self):
        """Initialize database schema"""
        with self.db.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS papers (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    authors JSONB,
                    year INTEGER,
                    venue TEXT,
                    abstract TEXT,
                    s3_key TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS citations (
                    paper_id TEXT REFERENCES papers(id),
                    cited_paper_id TEXT REFERENCES papers(id),
                    PRIMARY KEY (paper_id, cited_paper_id)
                );

                CREATE TABLE IF NOT EXISTS user_libraries (
                    user_id TEXT,
                    paper_id TEXT REFERENCES papers(id),
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    notes TEXT,
                    PRIMARY KEY (user_id, paper_id)
                );
            """)
            self.db.commit() 