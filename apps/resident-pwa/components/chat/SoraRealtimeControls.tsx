"use client";
import { useEffect } from "react";
import { useSoraRealtimeVoice, type SoraRealtimeLanguage } from "@/hooks/useSoraRealtimeVoice";
interface Props {
  language: SoraRealtimeLanguage; sessionId: string;
  onUserTranscript: (value: string) => void;
  onAssistantMessage: (value: string) => void;
  onEnd: () => void;
}
export function SoraRealtimeControls(props: Props) {
  const voice = useSoraRealtimeVoice({
    language: props.language, sessionId: props.sessionId,
    onUserTranscript: props.onUserTranscript,
    onAssistantMessage: props.onAssistantMessage,
  });
  useEffect(() => { void voice.start(); return () => voice.stop(); }, [voice.start, voice.stop]);
  const message = voice.status === "connecting" ? "Connecting securely..." :
    voice.status === "listening" ? "Listening — speak naturally" :
    voice.status === "thinking" ? "Thinking..." : voice.status === "speaking" ? "Speaking..." :
    voice.status === "error" ? voice.error || "Voice connection failed" : "Starting voice session...";
  return <div className="px-4 py-2 bg-sky-50 border-t border-sky-100 flex items-center justify-between gap-2">
    <div className="min-w-0"><p className="text-xs font-bold text-sky-900">Ate Sora · Real-time voice</p>
      <p className="text-[10px] text-sky-700" role="status">{message}</p></div>
    <button type="button" onClick={props.onEnd} className="shrink-0 rounded-full bg-slate-800 px-3 py-2 text-[10px] font-bold text-white">End</button>
  </div>;
}
