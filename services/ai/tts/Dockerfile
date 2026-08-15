FROM python:3.11-slim

# f5-tts inference benefits from ffmpeg for audio handling.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY requirements-ml.txt .
RUN pip install --no-cache-dir -r requirements-ml.txt

COPY app ./app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV TTS_OUTPUT_DIR=/app/output

# Non-root user
RUN useradd --create-home --uid 1000 appuser \
    && mkdir -p /app/output /app/models \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Model weights are mounted as a volume; generated audio lives in the tts_audio volume.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]