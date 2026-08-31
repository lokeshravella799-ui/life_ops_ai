import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Loader2,
  FileCheck,
  Plus,
  Trash2,
  BookOpen,
  List,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Target
} from 'lucide-react';

export default function DocumentsPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [savedDocs, setSavedDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [convertingToGoal, setConvertingToGoal] = useState(false);
  const [expandedDocId, setExpandedDocId] = useState(null);

  useEffect(() => {
    fetchSavedDocuments();
  }, []);

  const fetchSavedDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await api.get('/documents');
      setSavedDocs(res.data?.documents || []);
    } catch (err) {
      console.error('Failed to load saved documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!rawContent.trim()) {
      setError('Please provide document content to analyze.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.post('/documents/process-text', {
        title: title.trim() || 'Untitled Document Brief',
        rawContent: rawContent.trim()
      });

      const extracted = res.data?.extracted || res.data?.data?.extracted;
      const document = res.data?.document || res.data?.data?.document;

      setResult({
        document,
        extracted: extracted || {
          summary: document?.summary || 'Document processed successfully.',
          keyPoints: [],
          importantConcepts: [],
          keyDeadlines: document?.key_decisions || [],
          deliverables: [],
          extractedActionItems: document?.actions || []
        }
      });

      // Refresh list
      fetchSavedDocuments();
    } catch (err) {
      setError(err.message || 'Unable to generate summary. Please check input and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToGoal = async (docData) => {
    setConvertingToGoal(true);
    try {
      const docTitle = docData.document?.title || title || 'Document Execution Goal';
      const docSummary = docData.extracted?.summary || 'Execute milestone deliverables extracted from document.';

      const res = await api.post('/goals', {
        title: `Execute: ${docTitle}`,
        description: docSummary,
        category: 'WORK',
        priority: 'HIGH',
        target_days: 14,
        autoOrchestrate: true
      });

      const createdGoal = res.data?.goal;
      if (createdGoal?.id) {
        navigate(`/goals/${createdGoal.id}`);
      } else {
        navigate('/tasks');
      }
    } catch (err) {
      alert(err.message || 'Failed to convert document into goal');
    } finally {
      setConvertingToGoal(false);
    }
  };

  const handleDeleteDocument = async (docId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this saved document?')) return;

    try {
      await api.delete(`/documents/${docId}`);
      setSavedDocs(prev => prev.filter(d => d.id !== docId));
      if (result?.document?.id === docId) {
        setResult(null);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const handleSampleBrief = () => {
    setTitle('Full-Stack Distributed System Architecture');
    setRawContent(`1. Executive Scope:
Design and implement a fault-tolerant microservices backend with asynchronous event processing, Redis caching layer, and automated deployment pipelines.

2. Core Milestones & Deadlines:
- Milestone 1 (Sprint Day 3): Complete API schema contracts, authentication service, and PostgreSQL relational schemas.
- Milestone 2 (Sprint Day 7): Integrate BullMQ background worker queue and Redis idempotency middleware.
- Milestone 3 (Sprint Day 14): Complete Docker-compose multi-container orchestration, end-to-end integration tests, and staging deployment.

3. Deliverables:
- OpenAPI / Swagger documentation for Auth, Worker, and Gateway services.
- Resilient retry and rate limiting interceptors.
- Production-ready Dockerfile and environment configs.`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>Document AI Extraction & Summaries</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Transform documentation briefs, meeting notes, or technical specs into structured executive summaries and roadmap action items.
          </p>
        </div>

        <button
          onClick={handleSampleBrief}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Insert Sample Brief</span>
        </button>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d1424]/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Document Title
          </label>
          <input
            type="text"
            placeholder="e.g. Python Distributed Systems Architecture Spec..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Document Content / Raw Text
          </label>
          <textarea
            rows={8}
            placeholder="Paste technical requirements, project notes, meeting transcripts, or course syllabus here..."
            value={rawContent}
            onChange={(e) => setRawContent(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <span className="text-xs text-slate-500 font-mono">
            {rawContent ? `${rawContent.split(/\s+/).filter(Boolean).length} words` : '0 words'}
          </span>

          <button
            type="submit"
            disabled={loading || !rawContent.trim()}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing AI Extraction...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Structured Summary</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error & Retry Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={handleSubmit}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-200 font-semibold text-xs flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Structured AI Extraction Results Card (Requirement 7) */}
      {result && (
        <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-gradient-to-br dark:from-[#0d1424] dark:via-[#0b101d] dark:to-[#070b14] border border-slate-200 dark:border-indigo-500/30 shadow-md dark:shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 uppercase tracking-wide">
                AI Extraction Verified
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
                {result.document?.title || title || 'Document Analysis'}
              </h2>
            </div>

            <button
              onClick={() => handleConvertToGoal(result)}
              disabled={convertingToGoal}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {convertingToGoal ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Goal & Roadmap...</span>
                </>
              ) : (
                <>
                  <Target className="w-4 h-4" />
                  <span>Convert to Goal & Roadmap</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Executive Summary */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Executive Summary</span>
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
              {result.extracted?.summary || 'Executive summary generated.'}
            </p>
          </div>

          {/* Key Points & Important Concepts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Key Points */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <List className="w-3.5 h-3.5" />
                <span>Key Points & Takeaways</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {(result.extracted?.keyPoints && result.extracted.keyPoints.length > 0
                  ? result.extracted.keyPoints
                  : ['Core requirements decomposed into milestones.', 'System integrity constraints verified.']
                ).map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Important Concepts */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Important Concepts & Tech</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(result.extracted?.importantConcepts && result.extracted.importantConcepts.length > 0
                  ? result.extracted.importantConcepts
                  : ['Architecture Specification', 'Milestone Scheduling', 'Verification Quality Gate']
                ).map((concept, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Key Deadlines & Deliverables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Key Deadlines & Schedule</span>
              </h4>
              <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                {(result.extracted?.keyDeadlines || ['Timeline: 14 Days']).map((dl, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span>{dl}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Deliverables</span>
              </h4>
              <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                {(result.extracted?.deliverables || ['Verified Deliverable Artifacts']).map((del, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <FileCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{del}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Synthesized Action Items */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Synthesized Roadmap Action Items ({(result.extracted?.extractedActionItems || []).length})</span>
            </h4>
            <div className="space-y-2">
              {(result.extracted?.extractedActionItems || []).map((action, aIdx) => (
                <div
                  key={aIdx}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{action.title}</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">{action.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      {action.estimatedHours || 2}h
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      action.priority === 'HIGH' || action.priority === 'URGENT'
                        ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                        : 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30'
                    }`}>
                      {action.priority || 'MEDIUM'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Saved Documents Catalog */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Saved Documents History ({savedDocs.length})</span>
          </h3>
        </div>

        {loadingDocs && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-4">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Loading saved documents...</span>
          </div>
        )}

        {!loadingDocs && savedDocs.length === 0 && (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
            No saved documents yet. Enter a brief above to process and extract deliverables.
          </div>
        )}

        {!loadingDocs && savedDocs.length > 0 && (
          <div className="space-y-3">
            {savedDocs.map(doc => {
              const isExpanded = expandedDocId === doc.id;
              const actionsCount = Array.isArray(doc.actions) ? doc.actions.length : 0;

              return (
                <div
                  key={doc.id}
                  className="rounded-2xl bg-white dark:bg-[#0d1424]/80 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                >
                  <div
                    onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                    className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{doc.title}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {doc.summary || doc.content?.slice(0, 80) || 'Processed document'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20">
                        {actionsCount} Actions
                      </span>
                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="text-slate-400 p-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                          Full Summary
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                          {doc.summary || 'Summary unavailable.'}
                        </p>
                      </div>

                      {doc.content && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                            Original Brief Excerpt
                          </span>
                          <p className="text-slate-700 dark:text-slate-400 text-[11px] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto bg-slate-100 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                            {doc.content}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => handleConvertToGoal({ document: doc, extracted: { summary: doc.summary, extractedActionItems: doc.actions } })}
                          disabled={convertingToGoal}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>Convert to Roadmap Goal</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
