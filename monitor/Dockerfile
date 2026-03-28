# Dependencies
FROM python:3.10-slim

WORKDIR /app

COPY requirements_hub.txt .
RUN pip install --no-cache-dir -r requirements_hub.txt

COPY . .

# Cloud Run defaults to port 8080
ENV PORT 8080
EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
