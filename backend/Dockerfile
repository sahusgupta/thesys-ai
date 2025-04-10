FROM python:3.9-slim

# Add build arguments
ARG PYTHON_ENV=production
ENV PYTHON_ENV=${PYTHON_ENV}

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libmagic1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK data
RUN python -m nltk.downloader punkt
RUN python -m spacy download en_core_web_sm

# Copy the rest of the application
COPY . .

# Set environment variables
ENV PYTHONPATH=/app
ENV FLASK_APP=api.py
ENV FLASK_ENV=${PYTHON_ENV}

# Expose the port the app runs on
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Command to run the application with gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120", "api:app"] 