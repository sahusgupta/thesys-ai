from crossref.restful import Works

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
       