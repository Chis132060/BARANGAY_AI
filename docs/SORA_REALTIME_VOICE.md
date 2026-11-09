# Ate Sora real-time voice

The resident PWA already supports browser speech recognition, server transcription,
text-to-speech, and push-to-talk. This change adds an optional continuous speech-to-speech
experience using OpenAI Realtime over WebRTC. Existing text and push-to-talk paths remain.

## Security and data flow
1. The signed-in browser sends a WebRTC SDP offer to `POST /api/realtime/session`.
2. The Next.js route verifies the Supabase user and calls the existing atomic
   `consume_chat_rate_limit(30, 60)` RPC.
3. The server uses `OPENAI_API_KEY`; the browser receives only the SDP answer.
4. The Realtime model has one read-only tool: `get_official_barangay_answer`.
5. The browser executes it through existing authenticated `POST /api/chat`, preserving
   the current grounding, audit, and quota path.
6. No write-capable resident, payment, approval, or staff tools are exposed.

## Configuration
- `OPENAI_API_KEY`: server-only key; never prefix with `NEXT_PUBLIC_`.
- `OPENAI_REALTIME_MODEL`: optional; defaults to `gpt-realtime-2.1`.
- `OPENAI_REALTIME_VOICE`: optional; defaults to `marin`.
- `NEXT_PUBLIC_SORA_REALTIME_ENABLED`: false by default; enable only after staging tests.
The existing chat quota migration must be applied. Quota failures fail closed.

## Rollout
Deploy with the flag disabled; configure the key; run PWA tests and TypeScript checks;
test Chrome, Edge, Safari, and Android Chrome over HTTPS; verify microphone denial,
autoplay restrictions, network interruption, termination, and repeated tool calls.
Enable in staging, measure latency/provider errors, set spend limits, then roll out gradually.

## Privacy and limitations
Audio streams to the Realtime provider and is not persisted by this feature. Transcripts
appear in the chat UI; existing persistence behavior is unchanged. Never log SDP, audio,
tokens, API keys, or raw resident transcripts. Automatic reconnection is not attempted
to avoid silently opening duplicate billable sessions. Client-driven tools must remain
read-only. This PR is not a production-readiness certification; real-device, load, and
latency testing are required before broad enablement.

## Acceptance checklist
- [ ] Signed-out users cannot create sessions.
- [ ] Shared quota blocks excess sessions.
- [ ] Provider secrets never reach browser bundles/responses.
- [ ] Barangay answers use official knowledge.
- [ ] Tool failures do not produce invented barangay facts.
- [ ] No privileged write tools are exposed.
- [ ] Residents can end sessions and release microphone tracks.
- [ ] Existing text and push-to-talk remain usable.
