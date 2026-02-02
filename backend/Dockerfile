FROM python:3.10-slim

WORKDIR /app

# Install system dependencies if needed (e.g. for mysql-connector or others)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libmariadb-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p logs downloads public therapy_result

ENV PRODUCTION=True
ENV PORT=3301
ENV HOST=0.0.0.0

CMD ["python", "main.py"]
