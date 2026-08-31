import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Activity,
  CheckCircle2,
  Clock,
  Cpu,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Target,
  Loader2,
  Calendar
} from 'lucide-react';

export default function ActivityPage() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityData();
  }, []);

  const fetchActivityData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/activity/dashboard-stats');
      setStats(res.data?.stats || null);
      setLogs(res.data?.recentActivity || []);
    } catch (err) {
      console.error('Failed to load activity logs', err);
    } finally {
      setLoading(false);
    }
  };

  const actionIcons = {
    WORKFLOW_STARTED: Sparkles,
    WORKFLOW_COMPLETED: CheckCircle2,
    TASK_COMPLETED: CheckCircle2,
    PLAN_ADAPTED: RotateCcw,
    GOAL_CREATED: Target,
    ORCHESTRATOR_COMPLETED: Cpu
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Activity & Execution History</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          Real-time audit stream of all multi-agent lifecycle actions and user milestone updates.
        </p>
      </div>

      {/* KPI Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#0d1424]/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Goals</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalGoals}</p>
          </div>
          <div className="p-5 rounded-3xl bg-white dark:bg-[#0d1424]/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Workflows</span>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.activeWorkflows}</p>
          </div>
          <div className="p-5 rounded-3xl bg-white dark:bg-[#0d1424]/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tasks Completed</span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.completedTasks} / {stats.totalTasks}</p>
          </div>
          <div className="p-5 rounded-3xl bg-white dark:bg-[#0d1424]/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completion Rate</span>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.completionRate}%</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading audit stream...</p>
        </div>
      )}

      {/* Activity Timeline */}
      {!loading && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Recent Audit Events ({logs.length})
          </h3>

          <div className="space-y-2.5">
            {logs.map((log) => {
              const Icon = actionIcons[log.action] || Activity;

              return (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {log.actor_name || 'LifeOps AI Engine'}
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-500/20">
                          {log.action}
                        </span>
                      </div>
                      {log.details && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                          {JSON.stringify(log.details)}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 flex-shrink-0">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
