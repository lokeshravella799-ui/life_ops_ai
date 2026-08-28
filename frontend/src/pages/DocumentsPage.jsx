import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  FileText,
  Sparkles,
  ArrowRight,
  Clock,
  Calendar,
  CheckCircle2,
  PlusCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [docTitle, setDocTitle] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [processing, setProcessing] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents');
      setDocuments(res.data?.documents || []);
    } catch (err) {
      console.error('Failed to load documents', err);
    }
  };

  const sampleDocument = `Q3 Engineering Roadmap Sync:
We need to migrate the authentication layer to Supabase Auth by next Friday.
Lokesh is responsible for finalizing the database schemas and Row Level Security policies.
All integration tests must achieve 100% pass rate before staging deployment on September 15.
Warehouse team must also prepare return labels for defect tickets.`;

  const handleProcessDocument = async (e) => {
    e.preventDefault();
    if (!rawContent.trim()) return;

    setProcessing(true);
    setError(null);
    try {
      const res = await api.post('/documents/process-text', {
        title: docTitle || 'Processed Text Document',
        rawContent
      });
      setCurrentResult(res.data?.extracted);
      fetchDocuments();
    } catch (err) {
      setError(err.message || 'Failed to process document');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Document Action Extraction</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Paste meeting notes, syllabus outlines, or project briefs. The AI extracts deliverables, deadlines, and structured tasks.
        </p>
      </div>

      {/* Input Studio Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0d1424]/90 border border-indigo-500/20 shadow-xl space-y-5">
        <form onSubmit={handleProcessDocument} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Document Title
            </label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g. Q3 Roadmap Sync or DBMS Unit Syllabus"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Document Content / Text
              </label>
              <button
                type="button"
                onClick={() => {
                  setDocTitle('Q3 Engineering Roadmap Sync Notes');
                  setRawContent(sampleDocument);
                }}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
              >
                Insert Sample Meeting Notes
              </button>
            </div>
            <textarea
              rows={5}
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              placeholder="Paste raw text, syllabus, transcripts, or specifications here..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={processing || !rawContent.trim()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting Actions & Deadlines...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Process Document</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Extraction Result */}
      {currentResult && (
        <div className="p-6 rounded-3xl bg-[#0d1424] border border-emerald-500/30 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            Extracted Structured Blueprint
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <h4 className="text-xs font-bold text-slate-400 uppercase">Executive Summary</h4>
            <p className="text-xs text-slate-200 leading-relaxed font-normal">{currentResult.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Key Deadlines */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Key Deadlines
              </h4>
              <ul className="space-y-1">
                {currentResult.keyDeadlines?.map((d, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Deliverables */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-purple-400 uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Deliverables
              </h4>
              <ul className="space-y-1">
                {currentResult.deliverables?.map((deliv, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    <span>{deliv}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Items */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Synthesized Action Items ({currentResult.extractedActionItems?.length || 0})
            </h4>
            <div className="space-y-2">
              {currentResult.extractedActionItems?.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <h5 className="text-xs font-semibold text-slate-200">{item.title}</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      {item.priority}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {item.estimatedHours}h
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
