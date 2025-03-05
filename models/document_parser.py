import pymupdf
import bs4
import os
import requests
from bs4 import BeautifulSoup
import re

def clean_text(text):
    # Remove headers/footers
    text = re.sub(r"Page \d+|DOI:\s*\S+", "", text)
    
    # Remove citations
    text = re.sub(r"\([A-Za-z]+(?:\s+and\s+[A-Za-z]+)*,\s+\d{4}\)", "", text) # APA style
    text = re.sub(r"\[\d+(?:,\s*\d+)*\]", "", text) # Numeric citations
    
    # Remove figure/table captions
    text = re.sub(r"(?:Figure|Table|Fig\.)\s+\d+:.*?\n", "", text)
    
    return text.strip()

def extract_pdf(pdf_path):
    doc = pymupdf.open(pdf_path)
    
    raw_text = ""
    for page in doc:
        raw_text += page.get_text()
    
    cleaned_text = remove_headers_footers(raw_text)
    cleaned_text = clean_text(raw_text)
    sections = {}
    current_section = ""
    current_text = []
    
    for line in cleaned_text.split('\n'):
        line = line.strip()
        if not line:
            continue
            
        if line.isupper() or line.endswith(':'):
            if current_section:
                sections[current_section.lower()] = ' '.join(current_text)
            current_section = line
            current_text = []
        else:
            current_text.append(line)
    
    if current_section:
        sections[current_section.lower()] = ' '.join(current_text)
    
    first_page_text = doc[0].get_text().split('\n')
    title = next((line.strip() for line in first_page_text if line.strip()), "")
    
    return {
        "title": title,
        "sections": sections
    }
def remove_headers_footers(text):
    text = re.sub(r'\b(?:Page|Pg\.?|p\.?)\s*\d+\b', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^\s*\d+\s*$', '', text, flags=re.MULTILINE)
    
    lines = text.split('\n')
    cleaned_lines = []
    
    for i, line in enumerate(lines):
        if any([
            (i < 3 or i > len(lines)-4) and len(line.strip()) < 50,
            re.search(r'copyright|all rights reserved|submitted to|accepted for publication', 
                     line.lower()),
            i < 5 and re.match(r'^[\w\s,\.]+(?:University|Institute|Laboratory)', line),
            line.strip().isdigit()
        ]):
            continue
            
        cleaned_lines.append(line)
        
    return '\n'.join(cleaned_lines)

def extract_site(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    for tag in soup(['script', 'style', 'nav', 'footer', 'aside', 'header']):
        tag.decompose()
        
    article = soup.find('article') or soup.find('div', class_=['content', 'main', 'article'])
    
    if not article:
        return None
        
    title_tag = soup.find('h1')
    title = title_tag.get_text().strip() if title_tag else ""
    
    sections = {}
    current_section = "content"
    current_text = []
    
    for elem in article.find_all(['h2', 'h3', 'p']):
        text = clean_text(elem.get_text())
        
        if elem.name in ['h2', 'h3']:
            if current_section:
                sections[current_section.lower()] = ' '.join(current_text)
            current_section = text
            current_text = []
        else:
            current_text.append(text)
            
    if current_section:
        sections[current_section.lower()] = ' '.join(current_text)
        
    return {
        "title": title,
        "sections": sections
    }
    
print(extract_pdf("data/sample_papers/adam a method for stochastic optimization.pdf"))
print(extract_site("https://arxiv.org/pdf/2503.02020"))