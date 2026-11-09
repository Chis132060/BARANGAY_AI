# Ate Sora voice upgrade

## Scope

This upgrade preserves the existing resident PWA, RAG/chat endpoint, authentication, text messaging, browser speech recognition, and push-to-talk voice conversation. It makes Cebuano (Bisaya) the default for new interactions and adds ElevenLabs as the primary server-side speech synthesis provider. Gemini and OpenAI remain configurable fallbacks.

This is still push-to-talk, not continuous full-duplex voice. WebRTC/WebSocket streaming, voice activity detection, interruption/barge-in, and persistent realtime sessions are not claimed by this change.

## Resident experience

- New chat sessions default to Cebuano.
- A previously saved language in `barangay-ai-language` is respected.
- Supported language codes remain `ceb`, `tgl`, and `en`.
- Residents can continue to use text, browser speech recognition, and push-to-talk.
- Browser speech recognition maps Cebuano to `fil-PH` where browser locale support is limited; server transcription is prompted for Cebuano/Bisaya.
- Browser speech synthesis requests `ceb-PH`; actual installed browser voice availability varies.

## ElevenLabs configuration

Set these variables in the FastAPI deployment environment only. Never expose provider credentials through `NEXT_PUBLIC_*` variables.

| Variable | Default | Purpose |
| --- | --- | --- |
| `TTS_PROVIDER` | `elevenlabs` | Primary synthesis provider |
| `ELEVENLABS_API_KEY` | empty | Secret API key |
| `ELEVENLABS_VOICE_ID` | empty | Account voice ID; choose a female voice |
| `ELEVENLABS_TTS_MODEL` | `eleven_v3` | Multilingual expressive TTS model |
| `ELEVENLABS_OUTPUT_FORMAT` | `mp3_44100_128` | MP3 response format |
| `TTS_FALLBACK_PROVIDERS` | `gemini,openai` | Ordered fallback providers |

The female voice is selected by the configured ElevenLabs voice ID, not by a gender field in the request. Select a female voice available in your ElevenLabs account, put its ID in `ELEVENLABS_VOICE_ID`, and test Cebuano pronunciation with native speakers. Do not commit the API key or voice ID to source control.

ElevenLabs v3 requests intentionally omit legacy voice-setting fields that are not accepted by that model. Older multilingual models retain their supported voice settings. The API returns the existing `data.audio_url` contract as an MP3 data URL, so the current PWA audio player remains compatible.

## Provider fallback behavior

- ElevenLabs is tried first.
- Gemini then OpenAI are tried in configured order when a provider is unavailable or returns a server-side failure.
- Client/request errors are returned instead of silently retrying another provider.
- Provider credentials and raw provider error bodies are never returned to the browser.
- If all providers fail, the endpoint returns a generic 503 response.

## Security and operational notes

- Provider keys stay in the API environment.
- Existing voice authentication and quotas remain enforced. The voice conversation route must charge the voice quota once per request; it must not call the quota guard a second time after the router dependency.
- Audio is not persisted by this feature.
- Existing base64 audio response compatibility is retained. Large data URLs increase memory and response size; binary streaming is a future optimization.
- Per-worker in-memory quotas are not a distributed rate limiter. Use shared Redis/database rate limiting before horizontal scale.

## Verification

From `apps/api`, run:

```bash
python -m unittest discover -s tests -p "test_*.py" -v
```

From the repository root, run:

```bash
npm run type-check --workspace=apps/resident-pwa
npm run build --workspace=apps/resident-pwa
```

Manual acceptance requires configured ElevenLabs credentials and a female voice ID, plus Cebuano speakers to evaluate pronunciation, code-switching, voice quality, and latency. A green unit test does not prove the selected voice sounds natural in regional Bisaya.
