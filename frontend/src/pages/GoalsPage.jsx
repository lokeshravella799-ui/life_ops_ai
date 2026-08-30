import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Target,
  PlusCircle,
  Calendar,
  Sparkles,
  ArrowRight,
  Loader2,
  Trash2,
  X,
  Check,
  Edit2,
  CheckCircle2,
  Clock,
  Layers,
  Filter,
  Search
} from 'lucide-react';

export default function GoalsPage() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Goal State
  const [editingGoal, setEditingGoal] = useState(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [goalForm, setGoalForm] = useState({
    title: '',
    category: 'CAREER',
    priority: 'HIGH',
    targetDays: 14,
    dailyHours: 2,
    description: '',
    autoOrchestrate: true
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
      setError(err.message || 'Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdateGoal = async (e) => {
    e.preventDefault();
    if (!goalForm.title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (editingGoal) {
        const res = await api.patch(`/goals/${editingGoal.id}`, {
          title: goalForm.title.trim(),
          category: goalForm.category,
          priority: goalForm.priority,
          target_days: Number(goalForm.targetDays) || 7,
          daily_hours: Number(goalForm.dailyHours) || 2,
          description: goalForm.description.trim()
        });
        const updated = res.data?.goal || res.data;
        setGoals(prev => prev.map(g => g.id === editingGoal.id ? { ...g, ...updated } : g));
      } else {
        const res = await api.post('/goals', {
          title: goalForm.title.trim(),
          category: goalForm.category,
          priority: goalForm.priority,
          target_days: Number(goalForm.targetDays) || 7,
          daily_hours: Number(goalForm.dailyHours) || 2,
          description: goalForm.description.trim() || `Achieve ${goalForm.title.trim()}`,
          autoOrchestrate: goalForm.autoOrchestrate
        });

        const newGoal = res.data?.goal || res.data;
        if (newGoal) {
          setGoals(prev => [newGoal, ...prev]);
        }
      }

      setIsModalOpen(false);
      setEditingGoal(null);
      setGoalForm({
        title: '',
        category: 'CAREER',
        priority: 'HIGH',
        targetDays: 14,
        dailyHours: 2,
        description: '',
        autoOrchestrate: true
      });
    } catch (err) {
      alert(err.message || 'Failed to save goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (goal, e) => {
    e.stopPropagation();
    setEditingGoal(goal);
    setGoalForm({
      title: goal.title || '',
      category: goal.category || 'CAREER',
      priority: goal.priority || 'MEDIUM',
      targetDays: goal.target_days || 14,
      dailyHours: goal.daily_hours || 2,
      description: goal.description || '',
      autoOrchestrate: false
    });
    setIsModalOpen(true);
  };

  const handleDeleteGoal = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this goal and its associated tasks/workflows?')) return;

    try {
      await api.delete(`/goals/${id}`);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete goal');
    }
  };

  // Filtered Goals
  const filteredGoals = goals.filter(g => {
    if (categoryFilter !== 'ALL' && g.category !== categoryFilter) return false;
    if (priorityFilter !== 'ALL' && (g.priority || 'MEDIUM') !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (g.title || '').toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Goals & Roadmaps</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track objectives, generate multi-agent workflows, and view real-time task progress.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/tasks')}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Open Unified Roadmap</span>
          </button>
          <button
            onClick={() => {
              setEditingGoal(null);
              setGoalForm({
                title: '',
                category: 'CAREER',
                priority: 'HIGH',
                targetDays: 14,
                dailyHours: 2,
                description: '',
                autoOrchestrate: true
              });
              setIsModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0d1424]/80 border border-slate-800">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-slate-900/90 rounded-xl px-3 py-2 border border-slate-800">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search goals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white text-xs">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="CAREER">Career & Tech</option>
            <option value="STUDY">Study & Academic</option>
            <option value="HEALTH">Health & Fitness</option>
            <option value="FINANCE">Finance</option>
            <option value="PERSONAL">Personal</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          <p className="text-xs text-slate-400">Loading your goals and roadmaps...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredGoals.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {goals.length === 0 ? 'No Goals Created Yet' : 'No Goals Matching Filters'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              {goals.length === 0
                ? 'Add a goal manually or ask LifeOps AI to synthesize an autonomous multi-day roadmap.'
                : 'Try adjusting your search query or filters above.'}
            </p>
          </div>
          {goals.length === 0 && (
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
          )}
        </div>
      )}

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredGoals.map(goal => {
          const totalTasks = goal.total_tasks || 0;
          const completedTasks = goal.completed_tasks || 0;
          const progressPercentage = goal.progress_percentage || (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);

          return (
            <div
              key={goal.id}
              onClick={() => navigate(`/goals/${goal.id}`)}
              className="p-5 rounded-2xl bg-[#0d1424]/90 border border-slate-800/80 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-950/30 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                {/* Badges & Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {goal.category || 'PERSONAL'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      goal.priority === 'HIGH' || goal.priority === 'URGENT'
                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        : goal.priority === 'LOW'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}>
                      {goal.priority || 'MEDIUM'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleOpenEdit(goal, e)}
                      title="Edit Goal"
                      className="p-1 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteGoal(goal.id, e)}
                      title="Delete Goal"
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
                    {goal.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {goal.description || 'Autonomous goal managed by LifeOps AI.'}
                  </p>
                </div>
              </div>

              {/* Progress & Footer */}
              <div className="space-y-3 pt-3 border-t border-slate-800/60">
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>{completedTasks}/{totalTasks} tasks</span>
                    </span>
                    <span className="font-semibold text-indigo-300 font-mono">{progressPercentage}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Meta details */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>{goal.target_days ? `${goal.target_days} Days Plan` : 'Active'}</span>
                  </span>
                  <span className="text-indigo-400 font-semibold flex items-center gap-1 text-xs group-hover:translate-x-1 transition-transform">
                    <span>Roadmap</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Goal Modal */}
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
                  <h3 className="text-base font-bold text-white">
                    {editingGoal ? 'Edit Goal' : 'Create New Goal'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingGoal ? 'Modify goal parameters & priority' : 'Set your timeline, category, and objective'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateOrUpdateGoal} className="space-y-4">
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
                    className="w-full bg-[#151A27] text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-white/[0.06] focus:outline-none focus:border-indigo-500/60 cursor-pointer"
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
                    Priority
                  </label>
                  <select
                    value={goalForm.priority}
                    onChange={(e) => setGoalForm({ ...goalForm, priority: e.target.value })}
                    className="w-full bg-[#151A27] text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-white/[0.06] focus:outline-none focus:border-indigo-500/60 cursor-pointer"
                  >
                    <option value="HIGH">🔴 High Priority</option>
                    <option value="MEDIUM">🟡 Medium Priority</option>
                    <option value="LOW">🟢 Low Priority</option>
                    <option value="URGENT">⚡ Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Timeline (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={goalForm.targetDays}
                    onChange={(e) => setGoalForm({ ...goalForm, targetDays: Number(e.target.value) })}
                    className="w-full bg-[#151A27] text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-white/[0.06] focus:outline-none focus:border-indigo-500/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Daily Time (Hours/day)
                  </label>
                  <input
                    type="number"
                    min={0.5}
                    max={16}
                    step={0.5}
                    value={goalForm.dailyHours}
                    onChange={(e) => setGoalForm({ ...goalForm, dailyHours: Number(e.target.value) })}
                    className="w-full bg-[#151A27] text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-white/[0.06] focus:outline-none focus:border-indigo-500/60"
                  />
                </div>
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

              {!editingGoal && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="autoOrchestrate"
                    checked={goalForm.autoOrchestrate}
                    onChange={(e) => setGoalForm({ ...goalForm, autoOrchestrate: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="autoOrchestrate" className="text-xs text-slate-300 cursor-pointer">
                    Automatically generate AI multi-agent workflow & tasks
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
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
                      <span>{editingGoal ? 'Update Goal' : 'Save Goal'}</span>
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
