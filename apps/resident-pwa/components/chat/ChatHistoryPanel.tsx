"use client";

import { Clock, MessageSquare, Plus, X, Brain, Loader2 } from "lucide-react";

export type ResidentChatSession = {
  id: string;
  session_token: string;
  title: string | null;
  started_at: string | null;
  last_active_at: string | null;
};

export function ChatHistoryPanel(props: {
  open: boolean;
  loading: boolean;
  busy: boolean;
  sessions: ResidentChatSession[];
  activeToken: string;
  rememberPreviousChats: boolean;
  memoryBusy: boolean;
  error: string;
  onClose: () => void;
  onSelect: (session: ResidentChatSession) => void;
  onNew: () => void;
  onToggleMemory: (value: boolean) => void;
}) {
  if (!props.open) return null;
  return <section role="dialog" aria-modal="true" aria-label="Ate Sora chat history"
    className="absolute inset-0 z-50 flex min-h-0 flex-col bg-white">
    <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
      <div>
        <h2 className="text-base font-bold text-gray-900">My Ate Sora Chats</h2>
        <p className="text-[11px] text-gray-500">Open any saved conversation and continue it.</p>
      </div>
      <button type="button" onClick={props.onClose} aria-label="Close chat history"
        className="flex h-10 w-10 items-center justify-center rounded-full border text-gray-600">
        <X className="h-5 w-5" />
      </button>
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
        <div className="flex gap-3">
          <Brain className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden="true"/>
          <div className="min-w-0 flex-1">
            <label htmlFor="sora-memory-enabled" className="text-sm font-bold text-blue-950">
              Remember previous chats
            </label>
            <p className="mt-1 text-xs leading-relaxed text-blue-900">
              When enabled, Ate Sora can use a limited number of recent messages from
              your earlier conversations as context. Chat history is saved even when memory is off.
              Only your signed-in account can access these chats. Avoid sharing sensitive information.
            </p>
            <label className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-blue-950">
              <input id="sora-memory-enabled" type="checkbox"
                checked={props.rememberPreviousChats}
                disabled={props.memoryBusy || props.busy}
                onChange={event => props.onToggleMemory(event.target.checked)}
                className="h-4 w-4 rounded accent-blue-600" />
              {props.rememberPreviousChats ? "On · Use past chats for context" : "Off · Current chat only"}
            </label>
          </div>
        </div>
      </div>

      {props.error && <p role="alert"
        className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{props.error}</p>}

      <button type="button" onClick={props.onNew} disabled={props.busy || props.loading}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50">
        <Plus className="h-4 w-4"/> New conversation
      </button>

      <div className="mb-2 mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
        <Clock className="h-3.5 w-3.5"/> Saved conversations
      </div>
      {props.loading && <div role="status" className="flex gap-2 py-6 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin"/> Loading chats...
      </div>}
      {!props.loading && !props.sessions.length && !props.error &&
        <p className="py-6 text-sm text-gray-500">No saved conversations yet. Your first chat will appear here after you send a message.</p>}
      <div className="space-y-2">
        {props.sessions.map(session => (
          <button key={session.id} type="button"
            onClick={() => props.onSelect(session)} disabled={props.busy || props.loading}
            aria-current={props.activeToken === session.session_token ? "true" : undefined}
            className={"flex min-h-14 w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-50 " +
              (props.activeToken === session.session_token
                ? "border-blue-300 bg-blue-50" : "border-gray-100 bg-white hover:bg-gray-50")}>
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-blue-600"/>
            <span className="min-w-0 flex-1">
              <span className="block break-words text-sm font-semibold text-gray-900">
                {session.title?.trim() || "Conversation " + new Date(session.started_at ?? Date.now()).toLocaleDateString()}
              </span>
              <span className="mt-1 block text-[11px] text-gray-500">
                {session.last_active_at
                  ? new Date(session.last_active_at).toLocaleString()
                  : "Saved conversation"}
                {props.activeToken === session.session_token ? " · Current" : ""}
              </span>
            </span>
          </button>
        ))}
      </div>
      {props.sessions.length >= 100 &&
        <p className="mt-3 text-xs text-gray-500">Showing 100 most recent conversations. Earlier records are still saved.</p>}
    </div>
  </section>;
}
