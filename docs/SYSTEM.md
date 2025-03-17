# Agents
    - Scholar Agent: Pulls from APIs and other knowledge stores such as Semantic Scholar, retrieving literature related to the user's query.
    - Fact Check Agent: Verifies claims against Google's Factcheck API and through referencing literature within the current context
    - Citation Agent: Generate dynamic citations for content within or outside of the context using just a title, doi, or author name by calling the CrossRef api to fetch metadata
    - Context Agent: Pull information from the user's current project and literature uploaded to that project using vector searching to find the most similar paper to the users request

# Models
    - Citation Generator: generate citations dynamically and call APIs to fill in missing data
    - Document Parser: extract information from a PDF or web article given the URL or file
    - Embedding: generate embeddings for the titles of stored articles and for queries for rapid and accurate article lookup
    - Factcheck: verify the validity of claims made
    - Summarization: Calls the GPT 4.5 API to summarize research articles for rapid lookup and extracts insights from the paper relative to the user's request

# Backend:
    - handles communication between models and users and between models.