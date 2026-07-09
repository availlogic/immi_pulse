# ---- Builder Stage ----
FROM python:3.12-slim AS builder

# Install uv package manager
RUN pip install --no-cache-dir uv

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY pyproject.toml uv.lock ./

# Install dependencies into a virtual environment
RUN uv sync --frozen

# Copy application source code
COPY . .

# ---- Runtime Stage ----
FROM python:3.12-slim AS runtime

# Install uv in runtime for the CMD entrypoint
RUN pip install --no-cache-dir uv

WORKDIR /app

# Copy the virtual environment and application from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app /app

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
