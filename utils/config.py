import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    FETCHAI_SDK_KEY = os.getenv("FETCHAI_SDK_KEY")
    GOOGLE_SCHOLAR_API = os.getenv("GOOGLE_SCHOLAR_API")
    CROSSREF_API_KEY = os.getenv("CROSSREF_API_KEY")
    PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
    VECTOR_DB_PATH = os.getenv("VECTOR_DB_PATH", "data/vector_storage")

    # Fetch.ai Agent Configuration
    AGENTVERSE_ENDPOINT = "https://agentverse.fetch.ai"
    SCHOLAR_AGENT_ID = "scholar-agent"
    FACTCHECK_AGENT_ID = "factcheck-agent"
    CITATION_AGENT_ID = "citation-agent"

    # API Settings
    API_HOST = "0.0.0.0"
    API_PORT = 8000

    # AWS Configuration
    AWS_ACCESS_KEY = os.getenv('AWS_ACCESS_KEY')
    AWS_SECRET_KEY = os.getenv('AWS_SECRET_KEY')
    S3_BUCKET = os.getenv('S3_BUCKET')
    
    # PostgreSQL Configuration
    DB_HOST = os.getenv('DB_HOST')
    DB_NAME = os.getenv('DB_NAME')
    DB_USER = os.getenv('DB_USER')
    DB_PASSWORD = os.getenv('DB_PASSWORD')
    
    # OpenSearch Configuration
    OPENSEARCH_HOST = os.getenv('OPENSEARCH_HOST')
    OPENSEARCH_AUTH = (
        os.getenv('OPENSEARCH_USERNAME'),
        os.getenv('OPENSEARCH_PASSWORD')
    )
