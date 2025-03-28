from crossref.restful import Works

from models.citation import format_citation

def get_crossref_metadata(doi):
    works = Works()
    metadata = works.doi(doi)
    if metadata:
        data = {
            "title": metadata.get("title", ['Unknown'])[0],
            "journal": metadata.get("container-title", ['Unknown'])[0],
            "medium-type": metadata.get("type", ['Unknown'])[0],
            "url": metadata.get("URL", ['Unknown'])[0],
            "date": metadata.get('created', metadata).get('date-parts', ["Unknown"])[0],
            "author": {
                'affiliation': metadata.get('author', [metadata])[0].get('affiliation', ["Unknown"]),
                'name': f'{metadata.get("author", [metadata])[0].get("given", "")} { metadata.get("author", [metadata])[0].get("family", "")}'
            },
            "doi": doi
        }
        return data
    return None


def generate_citations(metadata, style):
    validate_citation(metadata)
    return format_citation(metadata, style)

def validate_citation(metadata):
    if not metadata.get("doi"):
        return False, "DOI is missing."
    if not metadata.get("title"):
        return False, "Title is missing."
    if not metadata.get("author"):
        return False, "Author information is missing."
    return True, "Metadata is valid."