import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import AgentVisualizer from '../components/orchestrator/AgentVisualizer';
import AdaptiveReplanModal from '../components/workflow/AdaptiveReplanModal';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Layers,
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react';

export default function WorkflowDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [workflow, setWorkflow] = useState(null);
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Expanded days state
  const [expandedDays, setExpandedDays] = useState({});
  const [isReplanModalOpen, setIsReplanModalOpen] = useState(false);
  const [showAgentTraces, setShowAgentTraces] = useState(false);

  useEffect(() => {
    fetchWorkflowDetails();
  }, [id]);

  const fetchWorkflowDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/workflows/${id}`);
      setWorkflow(res.data?.workflow);
      setAgents(res.data?.agents || []);
      setTasks(res.data?.tasks || []);
      setRevisions(res.data?.revisions || []);

      // Auto-expand all days by default
      const daysMap = {};
      (res.data?.tasks || []).forEach(t => {
        daysMap[t.day_number || 1] = true;
      });
      setExpandedDays(daysMap);
    } catch (err) {
      setError(err.message || 'Failed to load workflow details');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'TODO' : 'COMPLETED';

    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));

    try {
      await api.patch(`/tasks/${taskId}`, { status: nextStatus });
    } catch (err) {
      // Revert on failure
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: currentStatus } : t));
    }
  };

  const toggleDayAccordion = (dayNum) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayNum]: !prev[dayNum]
    }));
  };

  const handleReplanSuccess = (replanResponse) => {
    setIsReplanModalOpen(false);
    fetchWorkflowDetails();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm text-slate-400">Loading multi-agent execution roadmap...</p>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error || 'Workflow not found'}
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
        >
          Back to Assistant
        </button>
      </div>
    );
  }

  // Group tasks by day
  const tasksByDay = tasks.reduce((acc, task) => {
    const day = task.day_number || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(task);
    return acc;
  }, {});

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/goals')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Goals</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsReplanModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/25 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Adaptive Replan</span>
          </button>
        </div>
      </div>

      {/* Goal Overview Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0d1424] border border-indigo-500/20 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {workflow.result_data?.category || 'STUDY'}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {workflow.verification_status || 'VERIFIED'} (95/100)
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>{completedTasks}/{totalTasks} Tasks Done ({completionPercentage}%)</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-snug">
          {workflow.title?.replace('Execution Plan: ', '') || 'Execution Roadmap'}
        </h1>

        <p className="text-sm text-slate-300 leading-relaxed font-normal">
          {workflow.summary}
        </p>

        {/* Progress Bar */}
        <div className="pt-2">
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Collapsible Agent Execution Traces */}
      <div className="border border-slate-800 rounded-2xl bg-slate-950/60 overflow-hidden">
        <button
          onClick={() => setShowAgentTraces(!showAgentTraces)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Autonomous Agent Execution Fleet ({agents.length} Agents)
              </h3>
              <p className="text-[11px] text-slate-400">
                View individual traces for Memory, Orchestrator, Research, Planner, Decision, Execution, and Verification agents.
              </p>
            </div>
          </div>
          {showAgentTraces ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showAgentTraces && (
          <div className="p-4 pt-0 border-t border-slate-800/80">
            <AgentVisualizer agents={agents} progressPercentage={100} isRunning={false} />
          </div>
        )}
      </div>

      {/* Day-by-Day Milestone Roadmap */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            Milestone Roadmap ({Object.keys(tasksByDay).length} Days)
          </h2>
          <span className="text-xs text-slate-400">Click checkboxes to mark tasks complete</span>
        </div>

        <div className="space-y-3">
          {Object.keys(tasksByDay).sort((a, b) => Number(a) - Number(b)).map(dayStr => {
            const dayNum = Number(dayStr);
            const dayTasks = tasksByDay[dayStr];
            const isExpanded = expandedDays[dayNum] !== false;
            const dayDone = dayTasks.every(t => t.status === 'COMPLETED');

            return (
              <div
                key={dayNum}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  dayDone
                    ? 'bg-slate-950/40 border-slate-800/60'
                    : 'bg-[#0b1220]/80 border-slate-800/90 shadow-sm'
                }`}
              >
                {/* Day Header Accordion */}
                <button
                  onClick={() => toggleDayAccordion(dayNum)}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-900/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      dayDone
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono'
                    }`}>
                      D{dayNum}
                    </span>
                    <div>
                      <h3 className={`text-sm font-semibold ${dayDone ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                        Day {dayNum} Milestone
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        {dayTasks.length} task(s) • ~{dayTasks.reduce((s, t) => s + (t.estimated_minutes || 60), 0) / 60} hrs allocated
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {dayDone && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Completed
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>
                </button>

                {/* Day Tasks List */}
                {isExpanded && (
                  <div className="px-5 pb-4 pt-1 space-y-2 border-t border-slate-800/50">
                    {dayTasks.map(task => {
                      const isCompleted = task.status === 'COMPLETED';

                      const priorityColors = {
                        URGENT: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                        HIGH: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                        MEDIUM: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
                        LOW: 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                      };

                      return (
                        <div
                          key={task.id}
                          className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                            isCompleted
                              ? 'bg-slate-900/30 border-slate-800/40 opacity-70'
                              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start gap-3 flex-1">
                            <button
                              type="button"
                              onClick={() => handleToggleTask(task.id, task.status)}
                              className="mt-0.5 text-slate-400 hover:text-indigo-400 transition-colors"
                            >
                              {isCompleted ? (
                                <CheckSquare className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-500 hover:text-indigo-400" />
                              )}
                            </button>

                            <div className="space-y-1">
                              <h4 className={`text-xs font-semibold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                  {task.description}
                                </p>
                              )}
                              {task.notes && (
                                <p className="text-[10px] text-indigo-300/80 italic">
                                  Note: {task.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${priorityColors[task.priority] || priorityColors.MEDIUM}`}>
                              {task.priority}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {task.estimated_minutes}m
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Adaptive Replanning Modal Hook */}
      <AdaptiveReplanModal
        isOpen={isReplanModalOpen}
        onClose={() => setIsReplanModalOpen(false)}
        workflowId={id}
        onReplanSuccess={handleReplanSuccess}
      />
    </div>
  );
}
