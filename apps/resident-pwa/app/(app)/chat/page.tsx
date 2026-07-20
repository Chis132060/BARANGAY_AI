"use client";

import { useState } from "react";
import { Send, Bot, User } from "lucide-react";

/**
 * AI Chat page — client component because it manages live message state.
 * TODO: Wire to FastAPI RAG endpoint with streaming via fetch + ReadableStream.
 */
export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Hi! I'm the Smart Barangay AI. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    // TODO: POST to /api/chat, stream response, append ai message
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b bg-white flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">AI Assistant</p>
          <p className="text-xs text-green-500 font-medium">Online</p>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            {/* Avatar */}
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0
                ${msg.role === "ai" ? "bg-blue-600" : "bg-gray-300"}`}
            >
              {msg.role === "ai" ? (
                <Bot className="h-4 w-4 text-white" />
              ) : (
                <User className="h-4 w-4 text-white" />
              )}
            </div>
            {/* Bubble */}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                ${msg.role === "ai"
                  ? "bg-white text-gray-800 shadow-sm border border-gray-100"
                  : "bg-blue-600 text-white"
                }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div className="px-4 py-3 bg-white border-t flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask me anything…"
          className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
        />
        <button
          onClick={handleSend}
          className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center
                     justify-center text-white transition-colors shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
