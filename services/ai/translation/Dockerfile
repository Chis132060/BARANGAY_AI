FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV TRANSLATION_MODEL_ROOT=/app/models

# Non-root user
RUN useradd --create-home --uid 1000 appuser \
    && mkdir -p /app/models \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Model weights are mounted as a volume (services/ai/translation/models -> /app/models).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]