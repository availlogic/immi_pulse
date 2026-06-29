FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml ./
COPY src ./src
RUN pip install --no-cache-dir "psycopg[binary]" python-dateutil apscheduler httpx beautifulsoup4 numpy pydantic pytest pytest-asyncio
COPY tests ./tests
ENV PYTHONPATH=/app/src
CMD ["python", "-m", "src.main"]