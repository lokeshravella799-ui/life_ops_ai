import React, { useState } from 'react';
import api from '../../services/api';
import {
  Sparkles,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  X,
  Loader2,
  ArrowRight,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

export default function AdaptiveReplanModal({ isOpen, onClose, workflowId, onReplanSuccess }) {
  const [disruptionReason, setDisruptionReason] = useState("I couldn't study yesterday (missed Day 2).");
  const [missedDays, setMissedDays] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [replanResult, setReplanResult] = useState(null);

  if (!isOpen) return null;

  const handleReplanSubmit = async (e) => {
    e.preventDefault();
    if (!disruptionReason.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/workflows/${workflowId}/replan`, {
        disruptionReason,
        missedDays: parseInt(missedDays, 10)
      });
      setReplanResult(res.data);
      if (onReplanSuccess) {
        onReplanSuccess(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to adapt workflow schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-indigo-500/30 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Glow Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Adaptive Replanning Engine
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                  Self-Healing
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Intelligently rebalance remaining milestones without dropping high-priority concepts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form State */}
        {!replanResult ? (
          <form onSubmit={handleReplanSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500 dark:text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                What unexpected disruption occurred?
              </label>
              <textarea
                rows={3}
                value={disruptionReason}
                onChange={(e) => setDisruptionReason(e.target.value)}
                placeholder="e.g. I got sick and couldn't study yesterday, or I have only 1.5 hours today..."
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                required
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 self-center mr-1">Quick Presets:</span>
              {[
                "I couldn't study yesterday (missed 1 day).",
                "I fell 2 days behind due to work deadlines.",
                "I only have 1.5 hours/day for the remaining days."
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDisruptionReason(preset)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Missed / Delayed Days
                </label>
                <select
                  value={missedDays}
                  onChange={(e) => setMissedDays(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value={1}>1 Day Missed</option>
                  <option value={2}>2 Days Missed</option>
                  <option value={3}>3 Days Missed</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-xs text-indigo-800 dark:text-indigo-200 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                <p>Completed tasks will remain locked. The AI will redistribute pending high-yield topics across the remaining buffer days.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/30 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing & Rebalancing Schedule...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run Adaptive Replan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Replan Result Comparison View */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div>
                <span className="font-bold">Schedule Rebalanced Successfully!</span>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400/90 mt-0.5">
                  The plan was adapted dynamically and saved to the database.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                <TrendingUp className="w-4 h-4" />
                Adjustment Strategy
              </div>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {replanResult.replanData?.adjustmentStrategy}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">Original Plan Overview</h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {replanResult.replanData?.oldPlanOverview}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30">
                <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase mb-2">New Adapted Plan Overview</h4>
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {replanResult.replanData?.newPlanOverview}
                </p>
              </div>
            </div>

            {replanResult.replanData?.changesMade?.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300 mb-2">Specific Adjustments Applied:</h4>
                <ul className="space-y-1.5">
                  {replanResult.replanData.changesMade.map((change, idx) => (
                    <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                Done & View Updated Roadmap
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
