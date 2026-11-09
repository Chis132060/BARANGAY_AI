# Ate Sora voice upgrade

## Scope

This change makes Cebuano (Bisaya) the default language for new chat and voice requests, adds ElevenLabs as the primary server-side TTS provider, and retains Gemini/OpenAI as configurable fallback providers. Existing chat, RAG, push-to-talk, and audio playback response contracts remain compatible.

This is not a full-duplex realtime voice implementation. Continuous streaming, barge-in, VAD, and persistent WebSocket/WebRTC sessions are a separate delivery phase.

## Runtime configuration

Set these in the FastAPI deployment environment only; never expose them through NEXT_PUBLIC variables.

| Variable | Default | Purpose |
| --- | --- | --- |
| TTS_PROVIDER | elevenlabs | Primary provider |
| ELEVENLABS_API_KEY | empty | Secret API key |
| ELEVENLABS_VOICE_ID | empty | Account-authorized female voice ID |
| ELEVENLABS_TTS_MODEL | eleven_v4 | TTS model |
| ELEVENLABS_OUTPUT_FORMAT | mp3_44100_128 | Audio format |
| TTS_FALLBACK_PROVIDERS | gemini,openai | Ordered fallback list |

A valid API key and voice ID are required. Choose a voice and evaluate Cebuano pronunciation with native speakers; a female voice ID alone does not guarantee a natural regional accent.

The existing PWA expects an audio_url. ElevenLabs audio is returned as a Base64 audio/mpeg data URL; legacy provider fallback audio remains WAV. The browser detects the MIME type from the data URL.

## Language defaults

- New resident chat sessions default to ceb.
- Explicit saved language preferences remain respected.
- API codes remain ceb, tgl, and en.
- Browser speech fallback uses ceb-PH, tl-PH, and en-US; installed browser voices vary.

## Security and operations

- Keep provider credentials server-side.
- Do not log text, audio, or provider credentials.
- Fallbacks are sequential and bounded by provider HTTP timeouts.
- Existing authentication and quota behavior is unchanged.
- Production requires shared rate limiting, usage/cost telemetry, request tracing, and a defined audio retention policy.

## Verification

From apps/api, run:

```bash
python -m unittest discover -s tests -p "test_*.py" -v
```

From repository root, run:

```bash
npm run type-check --workspace=apps/resident-pwa
npm run build --workspace=apps/resident-pwa
```

Manual acceptance requires a configured ElevenLabs account and Cebuano speakers to evaluate pronunciation, code-switching, voice quality, and latency.
