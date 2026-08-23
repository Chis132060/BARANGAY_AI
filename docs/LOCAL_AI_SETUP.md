# Local Gemini AI Setup

The Gemini key must stay in a local environment file or secret manager. Never commit it, put it in frontend code, or paste it into chat, screenshots, logs, or pull requests.

## API service

Copy `apps/api/.env.example` to `apps/api/.env`, then set:

```env
GEMINI_API_KEY=your_rotated_gemini_key
GEMINI_MODEL=gemini-2.5-flash
AI_PROVIDER_PRIMARY=gemini
OLLAMA_ENABLED=false
```

The key must be configured before starting FastAPI because providers are initialized during application startup.

## Resident PWA

Set these values in `apps/resident-pwa/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
AI_TTS_SERVICE_URL=http://localhost:8003
```

`NEXT_PUBLIC_API_BASE_URL` is safe to expose as a URL. The Gemini key is not safe to expose and must never be placed in the resident PWA environment.

## Start order

1. Start the API service on port 8000.
2. Start the optional TTS service on port 8003.
3. Start the resident PWA on port 3000.
4. Open `/chat` and test English, Tagalog, Cebuano, and Voice Mode.

If the API is unavailable, the PWA shows a fallback response. If the TTS service is unavailable, the browser speech fallback may still read responses.

Ollama is disabled by default. Set `OLLAMA_ENABLED=true` only when a local Ollama server and the configured model are ready. Keep `AI_PROVIDER_PRIMARY=gemini` so Gemini is used when Ollama is unavailable.
