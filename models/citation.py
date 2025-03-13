def format_citation(metadata, style="APA"):
    """ Formats metadata into APA, MLA, or IEEE citation style. """
    # Extract metadata values
    title = metadata.get("title", ["Unknown"])[0]
    journal = metadata.get("container-title", ["Unknown"])[0]
    medium_type = metadata.get("type", ["Unknown"])[0]
    url = metadata.get("URL", ["Unknown"])[0]

    # Extract date
    date_parts = metadata.get("created", {}).get("date-parts", [["Unknown"]])
    date = "-".join(map(str, date_parts[0])) if isinstance(date_parts, list) and date_parts else "Unknown"

    # Extract author information (handles multiple authors)
    authors = metadata.get("author", [])
    formatted_authors = []

    for author in authors:
        given = author.get("given", "").strip()
        family = author.get("family", "").strip()
        name = f"{given} {family}".strip()
        affiliation = author.get("affiliation", ["Unknown"])
        
        if name:
            formatted_authors.append({
                "name": name,
                "affiliation": affiliation
            })

    # Format author names for citation
    author_names = ", ".join([author["name"] for author in formatted_authors])
    if len(formatted_authors) > 1:
        author_names = author_names.replace(", ", ", ", len(formatted_authors) - 2) + ", & " + formatted_authors[-1]["name"]

    # Extract DOI
    doi = metadata.get("doi", "Unknown")

    # Store structured data
    data = {
        "title": title,
        "journal": journal,
        "medium_type": medium_type,
        "url": url,
        "date": date,
        "authors": formatted_authors,
        "doi": doi
    }

    # Format citation in APA format
    if style == "APA":
        return f"{author_names} ({date}). {title}. *{journal}*. DOI: {doi}" if journal != "Unknown" else f"{author_names} ({date}). {title}. Retrieved from {url}"

    # Format citation in MLA format
    if style == "MLA":
        return f"{author_names}. \"{title}.\" *{journal}*, {date}, {url}." if journal != "Unknown" else f"{author_names}. \"{title}.\" {date}, {url}."

    if style == "IEEE":
        return f"{author_names}, \"{title},\" *{journal}*, {date}. [Online]. Available: {url}."
    
    else:
        return "Unsupported citation style. Please reach out to our support team for more information or a request."