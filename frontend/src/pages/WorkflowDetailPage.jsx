import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import AgentVisualizer from '../components/orchestrator/AgentVisualizer';
import AdaptiveReplanModal from '../components/workflow/AdaptiveReplanModal';
import { downloadArtifactFile } from '../utils/fileDownloader';
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
  Loader2,
  Plus,
  Trash2,
  Target,
  FileText,
  Download,
  Check
} from 'lucide-react';

export default function WorkflowDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [goal, setGoal] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Workflow Generation State
  const [isGeneratingWorkflow, setIsGeneratingWorkflow] = useState(false);
  const [generationError, setGenerationError] = useState(null);

  // New Task State
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskDay, setNewTaskDay] = useState(1);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Expanded days state
  const [expandedDays, setExpandedDays] = useState({});
  const [isReplanModalOpen, setIsReplanModalOpen] = useState(false);
  const [showAgentTraces, setShowAgentTraces] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // First attempt to fetch by Goal ID
      try {
        const goalRes = await api.get(`/goals/${id}`);
        const data = goalRes.data;
        if (data?.goal) {
          setGoal(data.goal);
          setWorkflow(data.workflow || null);
          setTasks(data.tasks || []);
          setAgents(data.agents || []);
          setRevisions(data.revisions || []);
          setArtifacts(data.artifacts || []);

          const daysMap = {};
          (data.tasks || []).forEach(t => {
            daysMap[t.day_number || 1] = true;
          });
          setExpandedDays(daysMap);
          setLoading(false);
          return;
        }
      } catch (goalErr) {
        // Fall back to /workflows/:id
      }

      const wfRes = await api.get(`/workflows/${id}`);
      const data = wfRes.data;
      setWorkflow(data?.workflow);
      setGoal({
        id: data?.workflow?.goal_id || id,
        title: data?.workflow?.title?.replace(/^Execution Plan:\s*/, '') || 'Autonomous Goal',
        category: data?.workflow?.category || 'PERSONAL',
        description: data?.workflow?.summary || ''
      });
      setAgents(data?.agents || []);
      setTasks(data?.tasks || []);
      setRevisions(data?.revisions || []);
      setArtifacts(data?.artifacts || []);

      const daysMap = {};
      (data?.tasks || []).forEach(t => {
        daysMap[t.day_number || 1] = true;
      });
      setExpandedDays(daysMap);
    } catch (err) {
      setError(err.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWorkflow = async () => {
    if (!goal || isGeneratingWorkflow) return;
    setIsGeneratingWorkflow(true);
    setGenerationError(null);

    try {
      const res = await api.post(`/goals/${goal.id}/generate-workflow`);
      const data = res.data;
      setWorkflow(data?.workflow);
      setTasks(data?.tasks || []);
      setAgents(data?.agents || []);
      setArtifacts(data?.artifacts || []);

      const daysMap = {};
      (data?.tasks || []).forEach(t => {
        daysMap[t.day_number || 1] = true;
      });
      setExpandedDays(daysMap);
    } catch (err) {
      setGenerationError(err.message || 'Failed to generate workflow. Please try again.');
    } finally {
      setIsGeneratingWorkflow(false);
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

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || isSubmittingTask) return;

    setIsSubmittingTask(true);
    try {
      const res = await api.post('/tasks', {
        title: newTaskTitle.trim(),
        goal_id: goal?.id,
        workflow_id: workflow?.id,
        day_number: newTaskDay,
        priority: newTaskPriority,
        estimated_minutes: 60
      });

      const created = res.data?.task;
      if (created) {
        setTasks(prev => [...prev, created]);
        setNewTaskTitle('');
        setIsAddingTask(false);
      }
    } catch (err) {
      alert(err.message || 'Failed to create task');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const toggleDayAccordion = (dayNum) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayNum]: !prev[dayNum]
    }));
  };

  const handleReplanSuccess = () => {
    setIsReplanModalOpen(false);
    fetchDetails();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm text-slate-400">Loading multi-agent execution roadmap...</p>
      </div>
    );
  }

  if (error && !goal) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error || 'Goal not found'}
        </div>
        <button
          onClick={() => navigate('/goals')}
          className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
        >
          Back to Goals
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
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Goals</span>
        </button>

        <div className="flex items-center gap-3">
          {workflow ? (
            <button
              onClick={() => setIsReplanModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Adaptive Replan</span>
            </button>
          ) : (
            <button
              onClick={handleGenerateWorkflow}
              disabled={isGeneratingWorkflow}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGeneratingWorkflow ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing AI Fleet...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate AI Roadmap</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Goal & Workflow Header Hero Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#111728] via-[#0E121E] to-[#0A0D14] border border-indigo-500/20 shadow-2xl relative overflow-hidden space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              {goal?.category || 'PERSONAL'}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
              goal?.priority === 'HIGH' || goal?.priority === 'URGENT'
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
            }`}>
              {goal?.priority || 'MEDIUM'} Priority
            </span>
            {workflow?.verification_status && (
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
                workflow.verification_status === 'VERIFIED'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{workflow.verification_status}</span>
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {goal?.title || workflow?.title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
            {goal?.description || workflow?.summary}
          </p>
        </div>

        {/* Real-time Progress Bar */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 font-semibold">
                Execution Progress: {completedTasks} of {totalTasks} tasks completed
              </span>
            </div>
            <span className="font-mono font-bold text-emerald-400">{completionPercentage}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Generation Error Alert */}
      {generationError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
          <span>{generationError}</span>
          <button
            onClick={handleGenerateWorkflow}
            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* No Workflow State */}
      {!workflow && tasks.length === 0 && (
        <div className="p-10 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Synthesize Multi-Agent Roadmap</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Activate LifeOps AI orchestrator, research agent, scheduler, and verifier to generate a complete step-by-step milestone roadmap.
            </p>
          </div>
          <button
            onClick={handleGenerateWorkflow}
            disabled={isGeneratingWorkflow}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-xl shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {isGeneratingWorkflow ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing Multi-Agent Roadmap...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>⚡ Generate Autonomous AI Workflow</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Multi-Agent Execution Audit Toggle */}
      {agents.length > 0 && (
        <div className="space-y-4">
          <button
            onClick={() => setShowAgentTraces(!showAgentTraces)}
            className="flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>{showAgentTraces ? 'Hide Multi-Agent Execution Traces' : `View Multi-Agent Traces (${agents.length} Agents Executed)`}</span>
            {showAgentTraces ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAgentTraces && (
            <div className="p-4 rounded-2xl bg-[#0d1424] border border-slate-800">
              <AgentVisualizer agents={agents} workflowId={workflow?.id} />
            </div>
          )}
        </div>
      )}

      {/* Generated Artifacts */}
      {artifacts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Verified Execution Blueprint
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {artifacts
              .filter((art, idx, self) => idx === self.findIndex(a => a.id === art.id || (a.name === art.name && a.artifact_type === art.artifact_type)))
              .map(art => (
                <button
                  key={art.id}
                  onClick={async () => {
                    try {
                      await downloadArtifactFile(art);
                    } catch (err) {
                      console.error('Download error:', err);
                    }
                  }}
                  className="p-3.5 rounded-2xl bg-slate-900/90 border border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/10 transition-all flex items-center justify-between group cursor-pointer text-left w-full shadow-lg"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{art.name || art.filename}</p>
                      <p className="text-[10px] text-indigo-300 uppercase font-mono">{art.artifact_type || 'PDF'} • {Math.round((art.file_size_bytes || 2048) / 1024)} KB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 shrink-0 ml-2">
                    <span>Download</span>
                    <Download className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Milestone Roadmap & To-Do Checklist */}
      {(tasks.length > 0 || workflow) && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              <span>Milestone Execution Roadmap</span>
            </h2>

            <button
              onClick={() => setIsAddingTask(!isAddingTask)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>

          {/* Add Task Form */}
          {isAddingTask && (
            <form onSubmit={handleCreateTask} className="p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/30 space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <h4 className="text-xs font-bold text-white">Add Custom Task to Roadmap</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Task title..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="sm:col-span-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newTaskDay}
                    onChange={(e) => setNewTaskDay(Number(e.target.value))}
                    className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 21, 30].map(d => (
                      <option key={d} value={d}>Day {d}</option>
                    ))}
                  </select>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask || !newTaskTitle.trim()}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingTask ? 'Adding...' : 'Add to Roadmap'}
                </button>
              </div>
            </form>
          )}

          {/* Days Accordion */}
          <div className="space-y-4">
            {Object.keys(tasksByDay)
              .sort((a, b) => Number(a) - Number(b))
              .map(dayNum => {
                const dayTasks = tasksByDay[dayNum] || [];
                const dayCompleted = dayTasks.filter(t => t.status === 'COMPLETED').length;
                const isExpanded = expandedDays[dayNum] !== false;

                return (
                  <div
                    key={dayNum}
                    className="rounded-2xl bg-[#0d1424]/90 border border-slate-800/80 overflow-hidden shadow-lg"
                  >
                    {/* Day Accordion Header */}
                    <button
                      onClick={() => toggleDayAccordion(dayNum)}
                      className="w-full px-5 py-3.5 bg-slate-900/60 hover:bg-slate-900/90 flex items-center justify-between transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-mono font-bold flex items-center justify-center">
                          D{dayNum}
                        </span>
                        <div>
                          <span className="text-xs font-bold text-white">Day {dayNum} Milestone</span>
                          <span className="text-[11px] text-slate-400 ml-2">
                            ({dayCompleted}/{dayTasks.length} tasks completed)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {dayCompleted === dayTasks.length && dayTasks.length > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Completed
                          </span>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </button>

                    {/* Day Tasks List */}
                    {isExpanded && (
                      <div className="p-4 space-y-2.5 border-t border-slate-800/60 divide-y divide-slate-800/30">
                        {dayTasks.map(task => {
                          const isDone = task.status === 'COMPLETED';
                          return (
                            <div
                              key={task.id}
                              className={`pt-2.5 first:pt-0 flex items-start justify-between gap-3 group ${isDone ? 'opacity-60' : ''}`}
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <button
                                  onClick={() => handleToggleTask(task.id, task.status)}
                                  className="mt-0.5 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
                                >
                                  {isDone ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-500" />
                                  )}
                                </button>

                                <div className="space-y-0.5 min-w-0">
                                  <p className={`text-xs font-semibold leading-relaxed ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                    {task.title}
                                  </p>
                                  {task.description && (
                                    <p className="text-[11px] text-slate-400 leading-relaxed">
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                                  task.priority === 'URGENT' || task.priority === 'HIGH'
                                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {task.priority || 'MEDIUM'}
                                </span>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1 text-slate-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                  title="Delete Task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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
      )}

      {/* Adaptive Replan Modal */}
      {isReplanModalOpen && workflow && (
        <AdaptiveReplanModal
          workflowId={workflow.id}
          onClose={() => setIsReplanModalOpen(false)}
          onSuccess={handleReplanSuccess}
        />
      )}
    </div>
  );
}
