import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = rel => readFileSync(new URL(rel, import.meta.url), "utf8");
const chat = read("../components/chat/ChatInterface.tsx");
const ptt = read("../hooks/useSoraVoiceConversation.ts");
const tts = read("../hooks/useTTS.ts");
const api = read("../../api/routers/voice_router.py");
const css = read("../app/globals.css");
const realtime = read("../components/chat/SoraRealtimeControls.tsx");

test("voice request returns answer without waiting on sequential server TTS", () => {
  assert.match(ptt, /skip_tts:\s*true/);
  assert.match(api, /skip_tts: bool = False/);
  assert.match(api, /if not request\.skip_tts:/);
  assert.match(ptt, /onReplyRef\.current\?\.\(reply\)/);
  assert.match(chat, /if \(!reply\.audio\?\.audio_url && voiceModeRef\.current\)/);
  assert.match(chat, /speak\(aiId, reply\.answer, reply\.language\)/);
});

test("voice greeting starts on tap, with natural provider voice preferred over device speech", () => {
  assert.match(chat, /voiceIntroLanguageRef\.current = ttsLang;/);
  assert.match(chat, /speak\("voice-intro", VOICE_GREETING\[ttsLang\], ttsLang\)/);
  assert.match(tts, /const res = await fetch\("\/api\/tts"/);
  assert.ok(tts.indexOf('fetch("/api/tts"') < tts.indexOf("played = await playBrowserSpeech"), "provider audio must precede basic browser fallback");
  assert.doesNotMatch(tts, /if \(preferFast\) played = await playBrowserSpeech/);
  assert.match(tts, /setTimeout\(\(\) => controller\.abort\(\), 22000\)/);
  assert.match(tts, /const startTimeout = window\.setTimeout/);
  assert.match(tts, /utteranceRef\.current = utterance/);
  assert.match(tts, /setPlaybackError\("No audio started/);
  assert.match(tts, /providerResult === "blocked"/);
  assert.match(tts, /cachedNaturalAudioRef\.current = \{ text: spokenText, language, url: audioUrl \}/);
  assert.match(tts, /const retryLastSpeech = useCallback/);
  assert.match(tts, /setPlaybackNotice\("Natural Ate Sora voice is unavailable/);
  assert.match(chat, /onClick=\{retryLastSpeech\}>Hear natural voice/);
  assert.match(chat, /playbackError && \(/);
  assert.match(chat, /<div role="alert"/);
  assert.match(chat, /Hear natural voice/);
});

test("speaking avatar only animates when real playback starts", () => {
  assert.match(tts, /utterance\.onstart = \(\) =>/);
  assert.match(tts, /audio\.onplay = \(\) =>/);
  assert.match(chat, /const soraIsSpeaking = Boolean\(speakingId \|\| \(voiceMode && soraVoice\.status === "speaking"\)/);
  assert.doesNotMatch(chat, /Boolean\(speakingId \|\| loadingId\)/);
  assert.match(chat, /sora-speaking-mouth/);
  assert.match(chat, /sora-speaking-bar/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(realtime, /onSpeakingChange/);
  assert.doesNotMatch(chat, /absolute inset-0 z-50 flex items-center justify-center bg-slate-950/);
});

test("voice remains a deliberate push-to-talk action and retains official grounding", () => {
  assert.match(chat, /Tap to Talk in/);
  assert.match(chat, /Stop & Ask/);
  assert.match(ptt, /Authorization: \`Bearer \${session\.access_token}\`/);
  assert.match(api, /from routers\.rag_router import ChatRequest, chat/);
  assert.doesNotMatch(ptt, /OPENAI_API_KEY/);
});

test("fast talk sends on-device final transcripts through authenticated chat, not a second cloud STT upload", () => {
  assert.match(chat, /isLoggedIn && isOnline && isSupported/);
  assert.match(chat, /startListening\(ttsLang, transcript =>/);
  assert.match(chat, /void handleSend\(\{ preventDefault\(\) \{\} \} as React\.FormEvent, transcript\)/);
  assert.match(chat, /Fast Talk/);
  assert.match(chat, /Record instead/);
  assert.match(chat, /speak\(latest\.id, latest\.text, ttsLang\)/);
  assert.match(chat, /stopSpeaking\(\);\s+startListening/);
});
