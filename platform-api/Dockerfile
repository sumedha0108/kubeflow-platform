# Stage 1 — build dependencies
FROM python:3.11-slim AS builder

WORKDIR /app

# Copy and install dependencies first (separate layer for caching)
# Docker caches each layer — if requirements.txt doesn't change,
# this layer is reused and pip install doesn't re-run on every build
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2 — final image
FROM python:3.11-slim

WORKDIR /app

# Copy installed packages from builder stage
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY app/ ./app/

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Don't run as root inside the container — security best practice
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
