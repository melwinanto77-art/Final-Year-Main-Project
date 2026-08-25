import React, { useState, useEffect, useCallback, useRef } from "react";
import { Upload, FileText, Trash2, Download, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { uploadDocument, listDocuments, deleteDocument, downloadDocument } from "../api.js";

/* ============================================================
   CLIENT DOCUMENT UPLOAD
   Drag-and-drop or browse, one clear status line per file, and a
   list of what has already been uploaded. Read-only for admins
   (canDelete=false) so they can review without removing client
   evidence.
   ============================================================ */

const CATEGORIES = [
  { id: "PITCH_DECK", label: "Pitch deck", hint: "Your investor or company presentation" },
  { id: "FINANCIALS", label: "Financials", hint: "P&L, projections, unit economics sheet" },
  { id: "REGISTRATION", label: "Registration / legal", hint: "Incorporation, GST, licences, trademarks" },
  { id: "MARKET_RESEARCH", label: "Market research", hint: "Surveys, competitor studies, customer data" },
  { id: "SUPPORTING", label: "Other supporting file", hint: "Anything else that backs up your submission" },
];

const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.md,.png,.jpg,.jpeg,.webp,.zip";
const MAX_MB = 15;

const labelCls = "font-mono text-[0.68rem] uppercase font-bold text-[#B8860B] tracking-wider";

function prettySize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentUpload({
  reportId,
  uploadedBy,
  canDelete = true,
  compact = false,
  title = "Supporting Documents",
}) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("PITCH_DECK");
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(false);
  /* One entry per file in this session: { name, state, message } where state
     is 'uploading' | 'done' | 'error'. */
  const [progress, setProgress] = useState([]);
  const inputRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const params = {};
      if (reportId) params.reportId = reportId;
      else if (uploadedBy) params.uploadedBy = uploadedBy;
      const data = await listDocuments(params);
      setDocuments(data?.documents || []);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [reportId, uploadedBy]);

  useEffect(() => { refresh(); }, [refresh]);

  const setFileState = (name, state, message) =>
    setProgress((prev) => {
      const next = prev.filter((p) => p.name !== name);
      return [...next, { name, state, message }];
    });

  const handleFiles = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;

    for (const file of list) {
      if (file.size > MAX_MB * 1024 * 1024) {
        setFileState(file.name, "error", `Too large (${prettySize(file.size)}) — limit is ${MAX_MB} MB`);
        continue;
      }
      setFileState(file.name, "uploading", "Uploading…");
      try {
        await uploadDocument({ file, reportId, category, note, uploadedBy });
        setFileState(file.name, "done", `Uploaded · ${prettySize(file.size)}`);
      } catch (err) {
        setFileState(file.name, "error", err.message || "Upload failed");
      }
    }
    setNote("");
    if (inputRef.current) inputRef.current.value = "";
    refresh();
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Remove "${doc.filename}"?`)) return;
    try {
      await deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      alert(err.message || "Could not remove the file.");
    }
  };

  const activeCategory = CATEGORIES.find((c) => c.id === category);

  return (
    <div className="bg-white/90 border border-[#D4AF37]/40 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      <div>
        <h3 className="font-serif text-lg font-bold text-[#081428]">{title}</h3>
        <p className="text-xs text-[#3D5A80]">
          Attach the files that back up your submission. Accepted: PDF, Word, Excel, PowerPoint,
          CSV, images and ZIP — up to {MAX_MB} MB each.
        </p>
      </div>

      {canDelete && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelCls} htmlFor="doc-category">What kind of file is this?</label>
              <select
                id="doc-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-[#D4AF37]/60 bg-white px-3 py-2.5 text-xs text-[#0B1B36] focus:border-[#081428] focus:outline-none cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <p className="text-[0.65rem] text-[#6E7B91]">{activeCategory?.hint}</p>
            </div>
            <div className="space-y-1">
              <label className={labelCls} htmlFor="doc-note">Short note (optional)</label>
              <input
                id="doc-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Updated FY26 projections"
                className="w-full rounded-xl border border-[#D4AF37]/60 bg-white px-3 py-2.5 text-xs text-[#0B1B36] placeholder-[#6E7B91]/60 focus:border-[#081428] focus:outline-none"
              />
              <p className="text-[0.65rem] text-[#6E7B91]">Helps the reviewer understand the file at a glance.</p>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
            className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition ${
              dragging ? "border-[#081428] bg-[#EDF2F9]" : "border-[#D4AF37]/60 bg-[#FBFCFE]/60 hover:bg-[#EDF2F9]/60"
            }`}
          >
            <Upload size={24} className="mx-auto text-[#B8860B]" />
            <p className="mt-2 text-sm font-bold text-[#081428]">
              Tap to choose files, or drag them here
            </p>
            <p className="text-[0.7rem] text-[#3D5A80] mt-0.5">
              You can select more than one file at a time.
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
          </div>
        </>
      )}

      {/* Per-file status for this session */}
      {progress.length > 0 && (
        <div className="space-y-1.5">
          {progress.map((p) => (
            <div key={p.name} className="flex items-center gap-2 text-xs">
              {p.state === "uploading" && <Loader2 size={13} className="text-[#B8860B] animate-spin shrink-0" />}
              {p.state === "done" && <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />}
              {p.state === "error" && <AlertTriangle size={13} className="text-red-600 shrink-0" />}
              <span className="font-medium text-[#0B1B36] truncate flex-1 min-w-0">{p.name}</span>
              <span className={`shrink-0 ${p.state === "error" ? "text-red-700" : "text-[#3D5A80]"}`}>
                {p.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Already uploaded */}
      <div className="space-y-2">
        <p className={labelCls}>
          Uploaded files {documents.length > 0 && `(${documents.length})`}
        </p>

        {loading ? (
          <p className="text-xs text-[#6E7B91]">Loading…</p>
        ) : documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D4AF37]/50 bg-[#FBFCFE]/60 p-5 text-center">
            <p className="text-xs font-semibold text-[#0B1B36]">No files uploaded yet</p>
            <p className="text-[0.68rem] text-[#3D5A80] mt-0.5">
              {canDelete ? "Anything you upload appears here." : "This client has not uploaded any documents."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/40 bg-[#FBFCFE] px-3 py-2.5"
              >
                <FileText size={16} className="text-[#B8860B] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#0B1B36] truncate">{doc.filename}</p>
                  <p className="text-[0.65rem] text-[#3D5A80] truncate">
                    {CATEGORIES.find((c) => c.id === doc.category)?.label || doc.category}
                    {" · "}{prettySize(doc.sizeBytes)}
                    {doc.note ? ` · ${doc.note}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => downloadDocument(doc.id, doc.filename).catch((err) =>
                    alert(err.message || "Could not download this file.")
                  )}
                  title="Download"
                  className="p-1.5 rounded-lg border border-[#D4AF37]/50 text-[#0B1B36] hover:bg-[#EDF2F9] shrink-0 cursor-pointer"
                >
                  <Download size={13} />
                </button>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(doc)}
                    title="Remove"
                    className="p-1.5 rounded-lg border border-[#D4AF37]/50 text-[#3D5A80] hover:bg-[#EDF2F9] shrink-0 cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
