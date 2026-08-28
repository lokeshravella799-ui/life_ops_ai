import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  CheckSquare,
  Square,
  Clock,
  Filter,
  Layers,
  Loader2,
  Calendar,
  CheckCircle2
} from 'lucide-react';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;

      const res = await api.get('/tasks', { params });
      setTasks(res.data?.tasks || []);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'TODO' : 'COMPLETED';

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));

    try {
      await api.patch(`/tasks/${taskId}`, { status: nextStatus });
    } catch (err) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: currentStatus } : t));
    }
  };

  const priorityColors = {
    URGENT: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    HIGH: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    MEDIUM: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    LOW: 'bg-slate-500/15 text-slate-400 border-slate-500/30'
  };

  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Tasks Roadmap</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            All actionable milestone deliverables across your active workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            {completedCount} / {tasks.length} Completed
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-500" />
            Status:
          </span>
          {['ALL', 'TODO', 'COMPLETED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 mr-1">Priority:</span>
          {['ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'].map(pr => (
            <button
              key={pr}
              onClick={() => setPriorityFilter(pr)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                priorityFilter === pr
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              {pr}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          <p className="text-xs text-slate-400">Loading tasks...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && tasks.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-slate-900/30 border border-slate-800/60 space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Tasks Found</h3>
          <p className="text-xs text-slate-400">
            {statusFilter !== 'ALL' || priorityFilter !== 'ALL'
              ? 'Try adjusting your filters to see more tasks.'
              : 'Orchestrate a goal from the AI Assistant to generate milestone tasks.'}
          </p>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-2.5">
        {tasks.map(task => {
          const isDone = task.status === 'COMPLETED';

          return (
            <div
              key={task.id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                isDone
                  ? 'bg-slate-950/40 border-slate-800/50 opacity-60'
                  : 'bg-[#0b1220]/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3.5 flex-1">
                <button
                  type="button"
                  onClick={() => handleToggleTask(task.id, task.status)}
                  className="mt-0.5 text-slate-400 hover:text-indigo-400 transition-colors"
                >
                  {isDone ? (
                    <CheckSquare className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-500 hover:text-indigo-400" />
                  )}
                </button>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                      Day {task.day_number || 1}
                    </span>
                    <h3 className={`text-sm font-semibold ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>
                      {task.title}
                    </h3>
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  {task.notes && (
                    <p className="text-[11px] text-indigo-300/80 italic">
                      Note: {task.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-shrink-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${priorityColors[task.priority] || priorityColors.MEDIUM}`}>
                  {task.priority}
                </span>
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {task.estimated_minutes}m
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
