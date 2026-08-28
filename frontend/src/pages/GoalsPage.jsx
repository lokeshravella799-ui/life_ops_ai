import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Target,
  PlusCircle,
  Calendar,
  Layers,
  ArrowRight,
  Trash2,
  Loader2,
  Clock,
  Sparkles,
  X,
  Check,
  Zap,
  Info
} from 'lucide-react';

export default function GoalsPage() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [goalForm, setGoalForm] = useState({
    title: '',
    category: 'CAREER',
    targetDays: 14,
    dailyHours: 2,
    description: ''
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/goals');
      setGoals(res.data?.goals || []);
    } catch (err) {
      console.warn('Goals fetch note:', err.message);
      // Ensure we don't show scary technical red banners
      if (err.message && err.message.includes('schema cache')) {
        setGoals([]);
      } else {
        setError(err.message || 'Failed to fetch goals');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!goalForm.title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/goals', {
        title: goalForm.title.trim(),
        category: goalForm.category,
        target_days: Number(goalForm.targetDays) || 7,
        daily_hours: Number(goalForm.dailyHours) || 2,
        description: goalForm.description.trim() || `Achieve ${goalForm.title.trim()}`
      });

      const newGoal = res.data?.goal || res.data;
      if (newGoal) {
        setGoals(prev => [newGoal, ...prev]);
      }
      setIsModalOpen(false);
      setGoalForm({
        title: '',
        category: 'CAREER',
        targetDays: 14,
        dailyHours: 2,
        description: ''
      });
    } catch (err) {
      alert(err.message || 'Failed to create goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlanWithAI = () => {
    if (!goalForm.title.trim()) return;
    setIsModalOpen(false);
    navigate('/', {
      state: {
        autoPrompt: `Create a ${goalForm.targetDays}-day milestone roadmap for: ${goalForm.title}. Dedicating ${goalForm.dailyHours} hours per day.`
      }
    });
  };

  const handleDeleteGoal = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this goal and its associated tasks?')) return;

    try {
      await api.delete(`/goals/${id}`);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete goal');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Your Goals</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track, orchestrate, and achieve your autonomous objectives and multi-day roadmaps.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          <p className="text-xs text-slate-400">Loading goals...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && goals.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Goals Created Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Add a new goal manually or ask LifeOps AI to synthesize an autonomous multi-day roadmap.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create a Goal</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-2 transition-all border border-slate-700 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Ask AI in Chat</span>
            </button>
          </div>
        </div>
      )}

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map(goal => (
          <div
            key={goal.id}
            onClick={() => navigate(`/goals/${goal.id}`)}
            className="p-6 rounded-2xl bg-[#0d1424]/90 border border-slate-800 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-950/30 transition-all duration-200 cursor-pointer space-y-4 group"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {goal.category || 'PERSONAL'}
              </span>

              <button
                onClick={(e) => handleDeleteGoal(goal.id, e)}
                title="Delete Goal"
                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                {goal.title}
              </h3>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {goal.description || 'Autonomous goal managed by LifeOps AI.'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{goal.target_days ? `${goal.target_days} Days Plan` : 'Active'}</span>
              </span>
              <span className="text-indigo-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E121E] border border-white/[0.08] rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create New Goal</h3>
                  <p className="text-xs text-slate-400">Set your timeline, category, and objective</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Goal Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Machine Learning Fundamentals"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  className="w-full bg-[#151A27] text-slate-100 placeholder-slate-500 text-xs rounded-xl px-3.5 py-2.5 border border-white/[0.06] focus:outline-none focus:border-indigo-500/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Category
                  </label>
                  <select
                    value={goalForm.category}
                    onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}
                    className="w-full bg-[#151A27] text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-white/[0.06] focus:outline-none focus:border-indigo-500/60"
                  >
                    <option value="CAREER">Career & Tech</option>
                    <option value="STUDY">Study & Exams</option>
                    <option value="HEALTH">Health & Fitness</option>
                    <option value="FINANCE">Finance & Budget</option>
                    <option value="TRAVEL">Travel & Logistics</option>
                    <option value="PERSONAL">Personal Growth</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Timeline (Days)
                  </label>
                  <select
                    value={goalForm.targetDays}
                    onChange={(e) => setGoalForm({ ...goalForm, targetDays: Number(e.target.value) })}
                    className="w-full bg-[#151A27] text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-white/[0.06] focus:outline-none focus:border-indigo-500/60"
                  >
                    <option value={7}>7 Days (1 Week)</option>
                    <option value={14}>14 Days (2 Weeks)</option>
                    <option value={30}>30 Days (1 Month)</option>
                    <option value={60}>60 Days (2 Months)</option>
                    <option value={90}>90 Days (Quarter)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Daily Time Commitment (Hours/day)
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  step={0.5}
                  value={goalForm.dailyHours}
                  onChange={(e) => setGoalForm({ ...goalForm, dailyHours: Number(e.target.value) })}
                  className="w-full bg-[#151A27] text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-white/[0.06] focus:outline-none focus:border-indigo-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Description / Specific Requirements
                </label>
                <textarea
                  rows={3}
                  placeholder="Optional details, target milestones, or constraints..."
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  className="w-full bg-[#151A27] text-slate-100 placeholder-slate-500 text-xs rounded-xl px-3.5 py-2.5 border border-white/[0.06] focus:outline-none focus:border-indigo-500/60 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={handlePlanWithAI}
                  disabled={!goalForm.title.trim()}
                  className="px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5 border border-purple-500/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Plan with AI Fleet</span>
                </button>

                <button
                  type="submit"
                  disabled={!goalForm.title.trim() || isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Goal</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
