import json
import fitz  # PyMuPDF
import os
import requests
from bs4 import BeautifulSoup
import re

def clean_text(text):
    # Remove headers/footers
    text = re.sub(r"Page \d+|DOI:\s*\S+", "", text)
    
    # Remove citations
    text = re.sub(r"\([A-Za-z]+(?:\s+and\s+[A-Za-z]+)*,\s+\d{4}\)", "", text)  # APA style
    text = re.sub(r"\[\d+(?:,\s*\d+)*\]", "", text)  # Numeric citations
    
    # Remove figure/table captions
    text = re.sub(r"(?:Figure|Table|Fig\.)\s+\d+:.*?\n", "", text)
    
    return text.strip()

def extract_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    
    # First, extract document metadata
    metadata = {
        "title": doc.metadata.get("title", ""),
        "author": doc.metadata.get("author", ""),
        "subject": doc.metadata.get("subject", ""),
        "sections": {}
    }
    
    # If title is not in metadata, try to get it from the first page
    if not metadata["title"]:
        first_page = doc[0]
        first_page_text = first_page.get_text().split('\n')
        # Usually the title is one of the first few lines with a reasonable length
        for line in first_page_text[:10]:
            line = line.strip()
            if 5 < len(line) < 100 and not re.search(r'^(abstract|introduction|\d+\.)', line.lower()):
                metadata["title"] = line
                break
    
    # Extract full text with formatting information
    full_text = []
    section_pattern = re.compile(r'^\s*(\d+\.(?:\d+\.?)*)\s+([A-Z][A-Za-z\s]+)$')
    section_pattern_alt = re.compile(r'^([A-Z][A-Za-z\s]+)$')
    definition_pattern = re.compile(r'^Definition(?:\s*\d*)?:')
    lemma_pattern = re.compile(r'^Lemma(?:\s*\d*)?(?:\s*\([^)]*\))?:')
    theorem_pattern = re.compile(r'^Theorem(?:\s*\d*)?(?:\s*\([^)]*\))?:')
    
    # Store text with formatting info
    for page_num in range(len(doc)):
        page = doc[page_num]
        blocks = page.get_text("dict")["blocks"]
        
        for block in blocks:
            if "lines" in block:
                for line in block["lines"]:
                    line_text = ""
                    is_bold = False
                    is_italic = False
                    font_size = 0
                    font_name = ""
                    
                    for span in line["spans"]:
                        span_text = span["text"].strip()
                        if not span_text:
                            continue
                        
                        # Extract font information
                        font_size = max(font_size, span["size"])
                        font_name = span["font"]
                        
                        # Check bold/italic
                        font_flags = span["flags"]
                        is_bold |= (font_flags & 2) != 0  # Bold flag
                        is_italic |= (font_flags & 1) != 0  # Italic flag
                        
                        line_text += span_text + " "
                    
                    line_text = line_text.strip()
                    if not line_text:
                        continue
                    
                    full_text.append({
                        "text": line_text,
                        "bold": is_bold,
                        "italic": is_italic,
                        "font_size": font_size,
                        "font_name": font_name,
                        "page": page_num
                    })
    
    # Analyze document structure
    # First, identify the different font sizes used for potential section headers
    font_sizes = [item["font_size"] for item in full_text]
    font_size_counts = {}
    for size in font_sizes:
        if size not in font_size_counts:
            font_size_counts[size] = 0
        font_size_counts[size] += 1
    
    # Get sorted font sizes (largest to smallest)
    sorted_font_sizes = sorted(font_size_counts.keys(), reverse=True)
    
    # The most common font size is likely the body text
    body_font_size = max(font_size_counts.items(), key=lambda x: x[1])[0]
    
    # Font sizes larger than body text might be headers
    potential_header_sizes = [size for size in sorted_font_sizes if size > body_font_size]
    
    # Section detection
    sections = []
    current_section = {"number": "", "title": "Introduction", "content": [], "level": 0}
    
    for item in full_text:
        text = item["text"]
        
        # Check for section header by formatting
        is_section_by_format = (
            (item["bold"] or item["font_size"] in potential_header_sizes) and 
            len(text) < 100 and 
            not text.endswith(".")
        )
        
        # Check for section header by pattern
        section_match = section_pattern.match(text)
        alt_section_match = section_pattern_alt.match(text)
        
        # Check for definitions, lemmas, theorems
        is_definition = definition_pattern.match(text)
        is_lemma = lemma_pattern.match(text)
        is_theorem = theorem_pattern.match(text)
        
        # Determine if this is a section header
        if section_match or (is_section_by_format and (alt_section_match or text.isupper())):
            # Save current section before starting a new one
            if current_section["content"]:
                sections.append(current_section)
            
            # Extract section number and title
            if section_match:
                section_number = section_match.group(1)
                section_title = section_match.group(2).strip()
                # Determine section level by counting dots in section number
                level = section_number.count('.')
            else:
                section_number = ""
                section_title = text.strip()
                level = 0
            
            # Start new section
            current_section = {
                "number": section_number,
                "title": section_title,
                "content": [],
                "level": level
            }
        # Special elements like definitions, lemmas, theorems
        elif is_definition or is_lemma or is_theorem:
            # Add these as special elements within the current section
            element_type = "definition" if is_definition else "lemma" if is_lemma else "theorem"
            current_section["content"].append({
                "type": element_type,
                "text": text
            })
        else:
            # Regular content
            current_section["content"].append({
                "type": "text",
                "text": text
            })
    
    # Add the last section
    if current_section["content"]:
        sections.append(current_section)
    
    # Post-process sections to create proper hierarchy and formatted content
    processed_sections = {}
    
    for section in sections:
        section_key = section["title"].lower()
        if section["number"]:
            section_key = f"{section['number']} {section_key}"
        
        # Format content
        formatted_content = []
        for item in section["content"]:
            if item["type"] == "text":
                formatted_content.append(item["text"])
            else:  # special element
                formatted_content.append(f"[{item['type'].upper()}] {item['text']}")
        
        processed_sections[section_key] = ' '.join(formatted_content)
    
    metadata["sections"] = processed_sections
    return metadata

def extract_site(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Remove non-content elements
    for tag in soup(['script', 'style', 'nav', 'footer', 'aside', 'header']):
        tag.decompose()
    
    # Find the main content
    article = (
        soup.find('article') or 
        soup.find('div', class_=['content', 'main', 'article']) or
        soup.find('main')
    )
    
    if not article:
        article = soup  # Use the entire document if can't find main content
    
    # Extract title
    title_tag = soup.find('h1')
    title = title_tag.get_text().strip() if title_tag else ""
    
    # Extract sections
    sections = {}
    current_section = "Introduction"
    current_text = []
    
    # Find all headings (h1-h6) and paragraphs
    elements = article.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'])
    
    for elem in elements:
        text = clean_text(elem.get_text())
        
        if elem.name.startswith('h') and len(text) < 100:  # It's a heading
            # Save previous section
            if current_section and current_text:
                sections[current_section.lower()] = ' '.join(current_text)
            
            # Start new section
            current_section = text
            current_text = []
        elif text:  # It's content
            current_text.append(text)
    
    # Save last section
    if current_section and current_text:
        sections[current_section.lower()] = ' '.join(current_text)
    
    return {
        "title": title,
        "author": "",
        "subject": "",
        "sections": sections
    }

def process_document(file_path=None, url=None):
    """Process either a PDF file or website URL and extract structured content."""
    if file_path and os.path.exists(file_path):
        if file_path.lower().endswith('.pdf'):
            return extract_pdf(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_path}")
    elif url:
        return extract_site(url)
    else:
        raise ValueError("Either file_path or url must be provided")

if __name__ == "__main__":
    try:
        # Example usage with PDF
        result = process_document(file_path="data/sample_papers/a86e2ffbc8a505b53f9051b60587763c_MIT18_657F15_L8.pdf")
        
        with open("extracted_document.json", "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"Successfully extracted {len(result['sections'])} sections from the document")
        print("Extracted text saved to 'extracted_document.json'")
    
    except Exception as e:
        print(f"Error processing document: {type(e).__name__}: {e}")