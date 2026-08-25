import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Send, CheckCircle2, Clock, Loader2, Trash2 } from "lucide-react";
import { listQueries, createQuery, respondToQuery, deleteQuery } from "../api.js";

/* ============================================================
   QUERIES — client questions and admin answers.

   One component, two roles:
   - role="client" : ask a question, read the admin's reply.
   - role="admin"  : read every question, write a reply.
   ============================================================ */

const CATEGORIES = [
  "General", "Market Foundation", "Business Viability", "Pricing",
  "Go-To-Market", "Regulatory & Compliance", "Report Query", "Technical Support",
];

const STATUS_STYLES = {
  OPEN: "bg-amber-100 text-amber-800 border-amber-300",
  IN_REVIEW: "bg-blue-100 text-blue-800 border-blue-300",
  ANSWERED: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

const labelCls = "font-mono text-[0.68rem] uppercase font-bold text-[#B8860B] tracking-wider";
const fieldCls =
  "w-full rounded-xl border border-[#D4AF37]/60 bg-white px-3.5 py-2.5 text-xs text-[#4A0A13] placeholder-[#8C6D58]/60 focus:border-[#400A12] focus:outline-none";

export default function QueriesPanel({ role = "client", clientEmail, clientName, reportId }) {
  const isAdmin = role === "admin";

  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  // Client compose form
  const [form, setForm] = useState({ subject: "", category: "General", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // Admin reply state, keyed by query id
  const [replyDraft, setReplyDraft] = useState({});
  const [replyingId, setReplyingId] = useState(null);

  const refresh = useCallback(async () => {
    try {
      // A client only ever sees their own thread; the admin sees everything.
      const params = !isAdmin && clientEmail ? { clientEmail } : {};
      const data = await listQueries(params);
      setQueries(data?.queries || []);
    } catch {
      setQueries([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, clientEmail]);

  useEffect(() => { refresh(); }, [refresh]);

  // Poll so a client sees the admin's answer, and the admin sees new questions.
  useEffect(() => {
    const id = setInterval(() => { refresh(); }, 20000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [refresh]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (form.subject.trim().length < 3 || form.message.trim().length < 10) {
      setError("Give the question a short subject and at least a sentence of detail.");
      return;
    }
    setSending(true);
    setError("");
    try {
      await createQuery({
        subject: form.subject.trim(),
        message: form.message.trim(),
        category: form.category,
        reportId: reportId || undefined,
        clientEmail: clientEmail || undefined,
        clientName: clientName || undefined,
      });
      setForm({ subject: "", category: "General", message: "" });
      setSent(true);
      setTimeout(() => setSent(false), 3000);
      refresh();
    } catch (err) {
      setError(err.message || "Could not send the question.");
    } finally {
      setSending(false);
    }
  };

  const handleReply = async (query) => {
    const text = (replyDraft[query.id] || "").trim();
    if (!text) return;
    setReplyingId(query.id);
    try {
      const data = await respondToQuery(query.id, { response: text, respondedBy: "admin", status: "ANSWERED" });
      setQueries((prev) => prev.map((q) => (q.id === query.id ? data.query : q)));
      setReplyDraft((prev) => ({ ...prev, [query.id]: "" }));
    } catch (err) {
      alert(err.message || "Could not save the response.");
    } finally {
      setReplyingId(null);
    }
  };

  const handleDelete = async (query) => {
    if (!window.confirm(`Delete the query "${query.subject}"?`)) return;
    try {
      await deleteQuery(query.id);
      setQueries((prev) => prev.filter((q) => q.id !== query.id));
    } catch (err) {
      alert(err.message || "Could not delete the query.");
    }
  };

  const visible = filter === "ALL" ? queries : queries.filter((q) => q.status === filter);
  const openCount = queries.filter((q) => q.status !== "ANSWERED").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-[#400A12]">
            {isAdmin ? "Client Queries" : "Ask a Question"}
          </h3>
          <p className="text-xs text-[#7A1C29]">
            {isAdmin
              ? `Questions raised by clients. ${openCount} awaiting a response.`
              : "Ask anything about your venture or your report — an administrator replies here."}
          </p>
        </div>

        {queries.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1">
            {["ALL", "OPEN", "IN_REVIEW", "ANSWERED"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  filter === s
                    ? "bg-[#400A12] text-[#F5D77F]"
                    : "bg-[#FAF4E8] text-[#4A0A13] border border-[#D4AF37]/30 hover:bg-[#F5EAD4]"
                }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Client compose */}
      {!isAdmin && (
        <form onSubmit={handleAsk} className="bg-white/90 border border-[#D4AF37]/40 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
            <div className="space-y-1">
              <label className={labelCls} htmlFor="q-subject">Subject *</label>
              <input
                id="q-subject" type="text" value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. How should we price against local competitors?"
                className={fieldCls}
              />
              <p className="text-[0.65rem] text-[#8C6D58]">A short title so the reviewer can scan it quickly.</p>
            </div>
            <div className="space-y-1">
              <label className={labelCls} htmlFor="q-category">Topic</label>
              <select
                id="q-category" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={`${fieldCls} cursor-pointer`}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="text-[0.65rem] text-[#8C6D58]">Routes it to the right area.</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelCls} htmlFor="q-message">Your question *</label>
            <textarea
              id="q-message" rows={4} value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Describe what you need to know, and any numbers or context that would help us answer accurately."
              className={`${fieldCls} rounded-2xl resize-none`}
            />
            <p className="text-[0.65rem] text-[#8C6D58]">
              The more context you give, the more specific the answer — mention your market, price
              point or constraint.
            </p>
          </div>

          {error && (
            <p className="text-[0.7rem] font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            {sent && (
              <span className="text-[0.7rem] font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 size={13} /> Sent — you'll see the reply below
              </span>
            )}
            <button
              type="submit" disabled={sending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#400A12] hover:bg-[#5C0F1A] text-[#F5D77F] font-extrabold text-xs shadow-lg transition cursor-pointer border border-[#D4AF37]/40 disabled:opacity-60"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>{sending ? "Sending…" : "Send Question"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Thread */}
      {loading ? (
        <p className="text-xs text-[#8C6D58]">Loading queries…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D4AF37]/50 bg-white/70 p-8 text-center">
          <MessageSquare size={22} className="mx-auto text-[#B8860B]" />
          <p className="text-sm font-semibold text-[#400A12] mt-2">
            {queries.length === 0
              ? isAdmin ? "No client queries yet" : "You haven't asked anything yet"
              : `No ${filter.replace("_", " ").toLowerCase()} queries`}
          </p>
          <p className="text-xs text-[#7A1C29] mt-1">
            {isAdmin
              ? "Questions submitted from client dashboards appear here."
              : "Use the form above and your question will reach an administrator."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((q) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white/90 border border-[#D4AF37]/40 rounded-2xl p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[0.6rem] uppercase font-bold text-[#B8860B]">{q.category}</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[0.6rem] font-extrabold ${STATUS_STYLES[q.status] || STATUS_STYLES.OPEN}`}>
                      {q.status.replace("_", " ")}
                    </span>
                  </div>
                  <h4 className="font-serif text-base font-bold text-[#400A12] mt-0.5 break-words">{q.subject}</h4>
                  {isAdmin && (
                    <p className="text-[0.68rem] text-[#7A1C29]">
                      {q.clientName || "Client"}{q.clientEmail ? ` · ${q.clientEmail}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[0.62rem] text-[#8C6D58] font-mono">
                    {(q.createdAt || "").split("T")[0]}
                  </span>
                  {isAdmin && (
                    <button onClick={() => handleDelete(q)} title="Delete query"
                      className="p-1 rounded-lg border border-[#D4AF37]/40 text-[#7A1C29] hover:bg-[#F5EAD4] cursor-pointer">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-[#4A0A13] whitespace-pre-wrap break-words">{q.message}</p>

              {/* Answer */}
              {q.response ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-1">
                  <p className="font-mono text-[0.6rem] uppercase font-bold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Response from {q.respondedBy || "admin"}
                  </p>
                  <p className="text-xs text-emerald-900 whitespace-pre-wrap break-words">{q.response}</p>
                </div>
              ) : isAdmin ? (
                <div className="space-y-2">
                  <label className={labelCls} htmlFor={`reply-${q.id}`}>Your response</label>
                  <textarea
                    id={`reply-${q.id}`} rows={3}
                    value={replyDraft[q.id] || ""}
                    onChange={(e) => setReplyDraft((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Answer the client's question directly, referencing their numbers where relevant."
                    className={`${fieldCls} rounded-2xl resize-none`}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleReply(q)}
                      disabled={replyingId === q.id || !(replyDraft[q.id] || "").trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4A0A13] hover:bg-[#5C0F1A] text-[#F5D77F] text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      {replyingId === q.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      <span>Send Response</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[0.7rem] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
                  <Clock size={12} /> Waiting for an administrator to respond.
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
