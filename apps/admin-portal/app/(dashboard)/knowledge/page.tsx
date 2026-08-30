"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload, FileText, CheckCircle, Clock, Archive,
  Trash2, RefreshCw, Eye, AlertTriangle, BookOpen,
  BarChart2, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface KnowledgeDoc {
  id: string;
  title: string;
  source_type: string;
  audience: "public" | "staff" | "admin";
  status: "active" | "draft" | "archived";
  created_at: string;
  chunk_count?: number;
}

interface AuditLog {
  id: string;
  query_text: string;
  response_text: string;
  model_used: string;
  latency_ms: number;
  flagged: boolean;
  flag_reason: string | null;
  created_at: string;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active:   { label: "Active",    cls: "bg-green-100 text-green-700 border-green-200" },
  draft:    { label: "Draft",     cls: "bg-amber-100 text-amber-700 border-amber-200" },
  archived: { label: "Archived",  cls: "bg-gray-100 text-gray-500 border-gray-200"  },
};

const AUDIENCE_BADGE: Record<string, string> = {
  public: "bg-blue-50 text-blue-600",
  staff:  "bg-purple-50 text-purple-600",
  admin:  "bg-red-50 text-red-600",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  const supabase = createClient();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<"docs" | "audit">("docs");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Upload form state
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState<"public" | "staff" | "admin">("public");
  const [sourceType, setSourceType] = useState<"txt" | "md" | "manual">("txt");
  const [textContent, setTextContent] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Data loading ─────────────────────────────────────────────────────────

  const loadDocs = useCallback(async () => {
    setRefreshing(true);
    const { data } = await supabase
      .from("knowledge_docs")
      .select("*")
      .order("created_at", { ascending: false });
    setDocs(data ?? []);
    setRefreshing(false);
  }, [supabase]);

  const loadAuditLogs = useCallback(async () => {
    const { data } = await supabase
      .from("ai_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setAuditLogs(data ?? []);
  }, [supabase]);

  useEffect(() => {
    loadDocs();
    loadAuditLogs();
  }, [loadDocs, loadAuditLogs]);

  // ── Upload flow ───────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setTextContent(text);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    setSourceType(file.name.endsWith(".md") ? "md" : "txt");
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError("");
    setUploadSuccess("");

    if (!title.trim() || !textContent.trim()) {
      setUploadError("Please provide a title and document content.");
      return;
    }

    setUploading(true);

    try {
      // 1. Insert doc record
      const { data: docData, error: docError } = await supabase
        .from("knowledge_docs")
        .insert({
          title: title.trim(),
          source_type: sourceType,
          audience,
          status: "active",
        })
        .select()
        .single();

      if (docError) throw new Error(docError.message);

      // 2. Send to FastAPI for chunking + embedding
      const res = await fetch(`${apiBase}/api/v1/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_id: docData.id,
          text: textContent,
          metadata: { title: title.trim(), audience, source_type: sourceType },
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Embedding failed: ${errBody}`);
      }

      const result = await res.json();
      setUploadSuccess(`Document ingested — ${result.chunks_created} chunks embedded.`);
      setTitle("");
      setTextContent("");
      if (fileRef.current) fileRef.current.value = "";
      loadDocs();
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // ── Status update ─────────────────────────────────────────────────────────

  const updateStatus = async (docId: string, status: "active" | "archived") => {
    await supabase.from("knowledge_docs").update({ status }).eq("id", docId);
    loadDocs();
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = {
    total: docs.length,
    active: docs.filter((d) => d.status === "active").length,
    flagged: auditLogs.filter((l) => l.flagged).length,
    avgLatency: auditLogs.length
      ? Math.round(auditLogs.reduce((a, l) => a + l.latency_ms, 0) / auditLogs.length)
      : 0,
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            Knowledge Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload and manage AI knowledge documents · Monitor audit logs
          </p>
        </div>
        <button
          onClick={() => { loadDocs(); loadAuditLogs(); }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Docs", value: stats.total, icon: FileText, color: "text-blue-600 bg-blue-50" },
          { label: "Active Docs", value: stats.active, icon: CheckCircle, color: "text-green-600 bg-green-50" },
          { label: "Flagged Queries", value: stats.flagged, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
          { label: "Avg Latency", value: `${stats.avgLatency}ms`, icon: BarChart2, color: "text-purple-600 bg-purple-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["docs", "audit"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab === "docs" ? "Documents" : "AI Audit Logs"}
          </button>
        ))}
      </div>

      {/* ── DOCS TAB ───────────────────────────────────────────────────────── */}
      {activeTab === "docs" && (
        <div className="grid lg:grid-cols-5 gap-6">

          {/* Upload form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-500" /> Upload Knowledge Document
              </h2>

              <form onSubmit={handleUpload} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Document Title *</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Barangay Clearance Guidelines"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Audience</label>
                    <select
                      value={audience}
                      onChange={(e) => setAudience(e.target.value as any)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="public">Public</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Type</label>
                    <select
                      value={sourceType}
                      onChange={(e) => setSourceType(e.target.value as any)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="txt">Plain Text</option>
                      <option value="md">Markdown</option>
                      <option value="manual">Manual Entry</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Upload File (.txt / .md)</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".txt,.md"
                    onChange={handleFileChange}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold file:text-xs hover:file:bg-blue-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    Or paste content directly *
                  </label>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    rows={8}
                    placeholder="Paste your barangay policy text here..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                  />
                </div>

                {uploadError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-200">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {uploadError}
                  </div>
                )}
                {uploadSuccess && (
                  <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2 border border-green-200">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                    {uploadSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" /> Embedding…</>
                  ) : (
                    <><Upload className="h-4 w-4" /> Upload &amp; Embed</>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Documents list */}
          <div className="lg:col-span-3 space-y-3">
            <h2 className="text-sm font-bold text-gray-800">Knowledge Documents ({docs.length})</h2>
            {docs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-400">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No documents yet. Upload your first knowledge document.</p>
              </div>
            ) : (
              docs.map((doc) => {
                const badge = STATUS_BADGE[doc.status];
                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-9 w-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{doc.title}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.cls}`}>
                            {badge.label}
                          </span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${AUDIENCE_BADGE[doc.audience]}`}>
                            {doc.audience}
                          </span>
                          <span className="text-[10px] text-gray-400 uppercase font-medium">
                            {doc.source_type}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {doc.status === "active" ? (
                        <button
                          onClick={() => updateStatus(doc.id, "archived")}
                          title="Archive"
                          className="h-8 w-8 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 flex items-center justify-center transition-all border border-gray-200"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => updateStatus(doc.id, "active")}
                          title="Reactivate"
                          className="h-8 w-8 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 flex items-center justify-center transition-all border border-green-200"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── AUDIT LOG TAB ─────────────────────────────────────────────────── */}
      {activeTab === "audit" && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-800">
            AI Audit Logs — Last 50 interactions
          </h2>
          {auditLogs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-400">
              <Eye className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No audit logs yet. They appear after residents chat with the AI.</p>
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className={`bg-white rounded-2xl border shadow-sm p-4 space-y-2 ${
                  log.flagged ? "border-red-200 bg-red-50/30" : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {log.flagged && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full border border-red-200">
                        <AlertTriangle className="h-2.5 w-2.5" /> FLAGGED
                      </span>
                    )}
                    <p className="text-xs font-semibold text-gray-700 truncate">
                      Q: {log.query_text}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-[10px] text-gray-400">
                    <Clock className="h-3 w-3" />
                    {log.latency_ms}ms
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                  A: {log.response_text}
                </p>
                {log.flagged && log.flag_reason && (
                  <p className="text-[10px] text-red-600 font-medium bg-red-100 px-2 py-1 rounded-lg flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>{log.flag_reason}</span>
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
