
class CitationAgent:
    def __init__(self, config=None):
        self.config = config

    def process_query(self, query: str):
        # Process the query to extract relevant information
        if query.contains("doi"):
            doi = query.split("doi:")[-1].strip()
            metadata = self.get_crossref_metadata(doi)
            if metadata:
                citation = self.generate_citation(metadata, "apa")
                return citation
            else:
                return "DOI not found."
        else:
            return "Invalid query format. Please provide a DOI."