-- Create extension for full text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create papers table
CREATE TABLE IF NOT EXISTS papers (
    id VARCHAR(255) PRIMARY KEY,
    title TEXT NOT NULL,
    abstract TEXT,
    authors TEXT[],
    year INTEGER,
    venue TEXT,
    citations INTEGER DEFAULT 0,
    url TEXT,
    pdf_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create full text search indices
CREATE INDEX IF NOT EXISTS papers_title_abstract_idx ON papers USING gin(to_tsvector('english', title || ' ' || COALESCE(abstract, '')));
CREATE INDEX IF NOT EXISTS papers_title_idx ON papers USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS papers_authors_idx ON papers USING gin(authors);
CREATE INDEX IF NOT EXISTS papers_year_idx ON papers (year);
CREATE INDEX IF NOT EXISTS papers_venue_idx ON papers (venue);

-- Create citations table
CREATE TABLE IF NOT EXISTS citations (
    id SERIAL PRIMARY KEY,
    citing_paper_id VARCHAR(255) REFERENCES papers(id),
    cited_paper_id VARCHAR(255) REFERENCES papers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create search history table
CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    results_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create paper downloads table
CREATE TABLE IF NOT EXISTS paper_downloads (
    id SERIAL PRIMARY KEY,
    paper_id VARCHAR(255) REFERENCES papers(id) ON DELETE CASCADE,
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user library table
CREATE TABLE IF NOT EXISTS user_library (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    paper_id VARCHAR(255) REFERENCES papers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, paper_id)
);

-- Create user_files table
CREATE TABLE IF NOT EXISTS user_files (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_uploads table
CREATE TABLE IF NOT EXISTS user_uploads (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    paper_id VARCHAR(255) REFERENCES papers(id),
    file_name TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    file_type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for timestamp updates
CREATE TRIGGER update_papers_updated_at
    BEFORE UPDATE ON papers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paper_downloads_updated_at
    BEFORE UPDATE ON paper_downloads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for user_uploads timestamp updates
CREATE TRIGGER update_user_uploads_updated_at
    BEFORE UPDATE ON user_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle paper insertion
CREATE OR REPLACE FUNCTION insert_paper(
    p_id VARCHAR,
    p_title TEXT,
    p_abstract TEXT,
    p_authors TEXT[],
    p_year INTEGER,
    p_venue TEXT,
    p_citations INTEGER DEFAULT 0,
    p_url TEXT DEFAULT NULL,
    p_pdf_path TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO papers (
        id, title, abstract, authors, year, venue,
        citations, url, pdf_path
    ) VALUES (
        p_id, p_title, p_abstract, p_authors, p_year, p_venue,
        p_citations, p_url, p_pdf_path
    ) ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        abstract = EXCLUDED.abstract,
        authors = EXCLUDED.authors,
        year = EXCLUDED.year,
        venue = EXCLUDED.venue,
        citations = EXCLUDED.citations,
        url = EXCLUDED.url,
        pdf_path = EXCLUDED.pdf_path,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create function to record paper download
CREATE OR REPLACE FUNCTION record_paper_download(p_paper_id VARCHAR)
RETURNS VOID AS $$
BEGIN
    INSERT INTO paper_downloads (paper_id, download_count, last_downloaded_at)
    VALUES (p_paper_id, 1, CURRENT_TIMESTAMP)
    ON CONFLICT (paper_id) DO UPDATE SET
        download_count = paper_downloads.download_count + 1,
        last_downloaded_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_papers_title ON papers(title);
CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(year);
CREATE INDEX IF NOT EXISTS idx_user_library_user_id ON user_library(user_id);
CREATE INDEX IF NOT EXISTS idx_user_library_paper_id ON user_library(paper_id);
CREATE INDEX IF NOT EXISTS idx_user_files_user_id ON user_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_uploads_user_id ON user_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_uploads_paper_id ON user_uploads(paper_id); 