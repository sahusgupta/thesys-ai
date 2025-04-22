import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import logging
import os
from pathlib import Path
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

def init_database():
    try:
        # Connect to PostgreSQL server
        conn = psycopg2.connect(
            host="localhost",
            database="postgres",
            user="postgres",
            password="ktsg1899"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()

        # Check if database exists
        cur.execute("SELECT 1 FROM pg_database WHERE datname = 'paper_repository'")
        exists = cur.fetchone()
        
        if not exists:
            logger.info("Creating database 'paper_repository'")
            cur.execute('CREATE DATABASE paper_repository')
        
        cur.close()
        conn.close()

        # Connect to the new database
        conn = psycopg2.connect(
            host="localhost",
            database="paper_repository",
            user="postgres",
            password="ktsg1899"
        )
        cur = conn.cursor()

        # Create tables from schema
        logger.info("Creating tables from schema...")
        schema_path = Path(__file__).parent / 'schema.sql'
        with open(schema_path, 'r') as f:
            cur.execute(f.read())

        # Removed redundant CREATE TABLE statements as they are handled by schema.sql

        conn.commit()
        logger.info("Database initialization completed successfully")

    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    init_database() 