import React, { useState } from 'react';
import api from '../services/api';
import {
  Briefcase,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Mail,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  ArrowRight,
  TrendingUp,
  Building
} from 'lucide-react';

export default function BusinessPage() {
  const [customerName, setCustomerName] = useState('Sarah Connor');
  const [orderId, setOrderId] = useState('ORD-77492');
  const [issueText, setIssueText] = useState(
    'I ordered the Ergonomic Mechanical Keyboard Pro, but received a standard membrane keyboard instead. The package was sealed but the SKU inside does not match. I want an immediate refund or expedited exchange.'
  );
  const [requestedResolution, setRequestedResolution] = useState('Full Refund and Prepaid Return Label');

  const [loading, setLoading] = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleTriage = async (e) => {
    e.preventDefault();
    if (!issueText.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/business/triage-complaint', {
        customerName,
        orderId,
        issueText,
        requestedResolution
      });
      setTriageResult(res.data?.triageResult);
    } catch (err) {
      setError(err.message || 'Failed to triage complaint');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmail = () => {
    if (triageResult?.draftCustomerResponse) {
      navigator.clipboard.writeText(triageResult.draftCustomerResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-400 text-xs font-semibold mb-2">
          <Briefcase className="w-3.5 h-3.5" />
          <span>Autonomous Small-Business Workflow</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Customer Support & Refund Triage</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          Coordinate specialized customer care agents to classify issues, evaluate refund SLAs, draft polite responses, and create internal warehouse action items.
        </p>
      </div>

      {/* Input Studio Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0d1424]/90 border border-slate-200 dark:border-purple-500/20 shadow-sm dark:shadow-xl space-y-5">
        <form onSubmit={handleTriage} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Order ID / Reference
              </label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Customer Complaint Description
            </label>
            <textarea
              rows={4}
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none font-normal leading-relaxed"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Customer Requested Resolution
            </label>
            <input
              type="text"
              value={requestedResolution}
              onChange={(e) => setRequestedResolution(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading || !issueText.trim()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Triaging Complaint with Agent Pipeline...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Execute Support Triage</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Triage Output Blueprint */}
      {triageResult && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-purple-500/30 shadow-md dark:shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/20 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-500/30">
                {triageResult.ticketId}
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Refund Eligible: {triageResult.refundEligible ? 'YES' : 'NO'}
              </span>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
              Severity: {triageResult.severity}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Policy Rationale</h4>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">{triageResult.policyRationale}</p>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 space-y-1">
              <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase">Recommended Resolution</h4>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-semibold">{triageResult.recommendedResolution}</p>
            </div>
          </div>

          {/* Draft Customer Response */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Draft Customer Response Email
              </h4>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Email'}</span>
              </button>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-800 dark:text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
              {triageResult.draftCustomerResponse}
            </div>
          </div>

          {/* Internal Tasks */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Generated Warehouse & Operations Tasks ({triageResult.internalActionTasks?.length || 0})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {triageResult.internalActionTasks?.map((task, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                      {task.department}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{task.title}</p>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Est. duration: {task.estimatedHours}h</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
