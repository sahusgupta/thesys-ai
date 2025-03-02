import os

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
