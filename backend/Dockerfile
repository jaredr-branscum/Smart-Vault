# Use official slim Python image for smaller footprint and security
FROM python:3.13-slim

# Security: Set working directory
WORKDIR /app

# Security: Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PAGER=cat

# Install system dependencies for psycopg2 and other tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Security: Create a non-root user and switch to it
RUN useradd -m smartuser && chown -R smartuser /app
RUN chmod +x /app/prestart.sh

USER smartuser

# Expose the port the app runs on
EXPOSE 8000

# Security: Entrypoint ensures migrations run before CMD
ENTRYPOINT ["/app/prestart.sh"]

# Start the application using Gunicorn with Uvicorn workers for scalability
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "main:app", "--bind", "0.0.0.0:8000", "--access-log", "-", "--error-log", "-"]
