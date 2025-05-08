FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
COPY backend /app/backend
COPY models /app/models
COPY utils /app/utils
COPY config.py /app/config.py

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 5000

CMD ["flask", "--app", "api/index.py", "run"]
