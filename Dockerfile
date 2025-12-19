FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for scientific computing and LightGBM
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    gfortran \
    libblas-dev \
    liblapack-dev \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories for models and data
RUN mkdir -p /app/static /app/models /app/data
RUN chown -R 1000:1000 /app

# Create non-root user
RUN useradd -m -u 1000 arthera && chown -R arthera:arthera /app
USER arthera

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Run demo server
CMD ["python", "demo_server.py"]