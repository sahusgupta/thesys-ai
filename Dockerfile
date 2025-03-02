

FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
COPY backend /app/backend
COPY models /app/models
COPY utils /app/utils
COPY .env /app/.env
COPY config.py /app/config.py

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8000

CMD ["uvicorn", "backend.api:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
