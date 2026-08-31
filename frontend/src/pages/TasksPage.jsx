import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import {
  CheckSquare,
  Square,
  Clock,
  Filter,
  Layers,
  Loader2,
  Calendar,
  CheckCircle2,
  Target,
  Plus,
  Trash2,
  ArrowRight,
  Sparkles,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Play,
  Check,
  RotateCcw,
  BookOpen,
  ListOrdered,
  Lightbulb,
  AlertCircle
} from 'lucide-react';

export default function TasksPage() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Expand states
  const [expandedTaskIds, setExpandedTaskIds] = useState({});
  const [collapsedGoals, setCollapsedGoals] = useState({});

  // Add task inline per goal
  const [addingTaskGoalId, setAddingTaskGoalId] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  useEffect(() => {
    fetchRoadmapData();
  }, []);

  const fetchRoadmapData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [goalsRes, tasksRes] = await Promise.all([
        api.get('/goals'),
        api.get('/tasks')
      ]);
      setGoals(goalsRes.data?.goals || []);
      setTasks(tasksRes.data?.tasks || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch roadmap data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    const prevStatus = tasks.find(t => t.id === taskId)?.status || 'TODO';

    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await api.patch(`/tasks/${taskId}`, { status: newStatus });
    } catch (err) {
      // Revert on error
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: prevStatus } : t));
    }
  };

  const handleCreateTask = async (goalId) => {
    if (!newTaskTitle.trim() || isSubmittingTask) return;

    setIsSubmittingTask(true);
    try {
      const res = await api.post('/tasks', {
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim(),
        goal_id: goalId,
        priority: newTaskPriority,
        day_number: 1,
        estimated_minutes: 90
      });

      const created = res.data?.task;
      if (created) {
        setTasks(prev => [...prev, created]);
        setNewTaskTitle('');
        setNewTaskDescription('');
        setAddingTaskGoalId(null);
      }
    } catch (err) {
      alert(err.message || 'Failed to create task');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleDeleteTask = async (taskId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this task?')) return;

    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const toggleTaskExpansion = (taskId) => {
    setExpandedTaskIds(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const toggleGoalCollapse = (goalId) => {
    setCollapsedGoals(prev => ({
      ...prev,
      [goalId]: !prev[goalId]
    }));
  };

  // Helper to construct structured blueprints for any task
  const getTaskBlueprint = (task) => {
    const title = task.title || 'Task Objective';
    const desc = task.description || '';
    const minutes = task.estimated_minutes || 90;
    const hours = (minutes / 60).toFixed(1);

    const steps = [
      `Analyze requirements and dependencies for "${title}"`,
      `Implement core milestone deliverables and test against constraints`,
      `Review output, document results, and verify completion criteria`
    ];

    const whyMatters = desc
      ? `This task directly advances your milestone goal by establishing: ${desc.slice(0, 120)}...`
      : `Completing this task builds foundational prerequisites required for the subsequent milestone phases.`;

    const whatToDo = desc || `Execute the core implementation steps for "${title}". Ensure all edge cases and milestone criteria are met before completing.`;

    return {
      whatToDo,
      steps,
      whyMatters,
      hours
    };
  };

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'TODO' && t.status !== 'TODO' && t.status !== 'PENDING') return false;
      if (statusFilter === 'IN_PROGRESS' && t.status !== 'IN_PROGRESS') return false;
      if (statusFilter === 'COMPLETED' && t.status !== 'COMPLETED') return false;
    }
    if (priorityFilter !== 'ALL' && (t.priority || 'MEDIUM') !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (t.title || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  // Calculate global statistics
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const inProgressTasksCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const globalProgress = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header & Global Progress Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>Central Execution Roadmap</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Track and execute all goals, milestone tasks, step-by-step blueprints, and completion statuses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/goals')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        </div>
      </div>

      {/* Global Progress Bar Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-gradient-to-br dark:from-[#111728] dark:via-[#0E121E] dark:to-[#0A0D14] border border-slate-200 dark:border-indigo-500/20 shadow-sm dark:shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{goals.length} Goals</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span className="text-slate-800 dark:text-slate-200 font-semibold">
                {completedTasksCount} / {totalTasksCount} Completed
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {inProgressTasksCount} In Progress
              </span>
            </div>
          </div>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">{globalProgress}% Completed</span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${globalProgress}%` }}
          />
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#0d1424]/80 border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[220px] bg-slate-50 dark:bg-slate-900/90 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search tasks and steps across all goals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none w-full"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status & Priority Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-800">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'TODO', label: 'To Do' },
              { id: 'IN_PROGRESS', label: 'In Progress' },
              { id: 'COMPLETED', label: 'Completed' }
            ].map(st => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">🔴 High Priority</option>
            <option value="MEDIUM">🟡 Medium Priority</option>
            <option value="LOW">🟢 Low Priority</option>
            <option value="URGENT">⚡ Urgent</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading Central Execution Roadmap...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && goals.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Your Roadmap is Empty</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              Create your first goal to automatically synthesize a multi-agent execution roadmap.
            </p>
          </div>
          <button
            onClick={() => navigate('/goals')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Goal & Roadmap</span>
          </button>
        </div>
      )}

      {/* Grouped Goals & Workflows Roadmap */}
      {!loading && goals.length > 0 && (
        <div className="space-y-6">
          {goals.map(goal => {
            const goalTasks = filteredTasks.filter(t => t.goal_id === goal.id);
            const allGoalTasks = tasks.filter(t => t.goal_id === goal.id);
            const completedCount = allGoalTasks.filter(t => t.status === 'COMPLETED').length;
            const inProgressCount = allGoalTasks.filter(t => t.status === 'IN_PROGRESS').length;
            const totalCount = allGoalTasks.length;
            const goalProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const isCollapsed = collapsedGoals[goal.id] === true;

            return (
              <div
                key={goal.id}
                className="rounded-3xl bg-white dark:bg-[#0d1424]/90 border border-slate-200 dark:border-slate-800/80 overflow-hidden shadow-sm dark:shadow-xl"
              >
                {/* Goal Header Bar */}
                <div className="p-5 sm:p-6 bg-slate-50/80 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800/60 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <button
                        onClick={() => toggleGoalCollapse(goal.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer mt-0.5 sm:mt-0"
                        title={isCollapsed ? 'Expand Goal' : 'Collapse Goal'}
                      >
                        {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                      </button>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                            {goal.category || 'PERSONAL'}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            goal.priority === 'HIGH' || goal.priority === 'URGENT'
                              ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 font-bold'
                              : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                          }`}>
                            {goal.priority || 'MEDIUM'} PRIORITY
                          </span>
                        </div>

                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                          {goal.title}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => setAddingTaskGoalId(addingTaskGoalId === goal.id ? null : goal.id)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-sm transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Task</span>
                      </button>

                      <button
                        onClick={() => navigate(`/goals/${goal.id}`)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1 border border-indigo-200 dark:border-indigo-500/30 transition-all cursor-pointer"
                      >
                        <span>Full Roadmap</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Goal Detailed Context Block (Requirement 6) */}
                  {!isCollapsed && (
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-3">
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          Goal Overview & Description
                        </h4>
                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                          {goal.description || `Autonomous milestone execution plan for ${goal.title}.`}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase block mb-1">
                            What to Learn & Execute
                          </span>
                          <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                            Deconstruct objective into verifiable milestones, master prerequisite concepts, and complete daily tasks.
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block mb-1">
                            Expected Outcome
                          </span>
                          <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                            Achieve 100% completion across all scheduled milestones with verified physical artifacts and deliverables.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Goal Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        Goal Progress: {completedCount} of {totalCount} tasks completed ({inProgressCount} in progress)
                      </span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-300">{goalProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                        style={{ width: `${goalProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Inline Add Task Form */}
                {addingTaskGoalId === goal.id && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-b border-indigo-200 dark:border-indigo-500/30 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Add Task to {goal.title}</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Task title..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="Specific instructions or description (optional)..."
                        value={newTaskDescription}
                        onChange={(e) => setNewTaskDescription(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                      >
                        <option value="HIGH">🔴 High Priority</option>
                        <option value="MEDIUM">🟡 Medium Priority</option>
                        <option value="LOW">🟢 Low Priority</option>
                        <option value="URGENT">⚡ Urgent</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAddingTaskGoalId(null)}
                          className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleCreateTask(goal.id)}
                          disabled={isSubmittingTask || !newTaskTitle.trim()}
                          className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                        >
                          {isSubmittingTask ? 'Adding...' : 'Save Task'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Goal Tasks List with Deep Dropdown (Requirement 5) */}
                {!isCollapsed && (
                  <div className="p-4 sm:p-5">
                    {goalTasks.length === 0 ? (
                      <div className="py-6 text-center space-y-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {allGoalTasks.length === 0
                            ? 'No workflow or tasks generated yet for this goal.'
                            : 'No tasks matching current filter.'}
                        </p>
                        {allGoalTasks.length === 0 && (
                          <button
                            onClick={() => navigate(`/goals/${goal.id}`)}
                            className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-500/30 transition-all cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Generate AI Workflow</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {goalTasks.map(task => {
                          const isDone = task.status === 'COMPLETED';
                          const isInProgress = task.status === 'IN_PROGRESS';
                          const isExpanded = expandedTaskIds[task.id] === true;
                          const blueprint = getTaskBlueprint(task);

                          return (
                            <div
                              key={task.id}
                              className={`rounded-2xl border transition-all ${
                                isDone
                                  ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/50 opacity-70'
                                  : isInProgress
                                  ? 'bg-amber-50/40 dark:bg-[#0f172a]/90 border-amber-300 dark:border-amber-500/40 shadow-sm dark:shadow-lg shadow-amber-950/20'
                                  : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-500/40 shadow-sm'
                              }`}
                            >
                              {/* Task Card Header / Bar */}
                              <div
                                onClick={() => toggleTaskExpansion(task.id)}
                                className="p-4 flex items-start justify-between gap-3 cursor-pointer select-none"
                              >
                                <div className="flex items-start gap-3 min-w-0">
                                  {/* Status Icon Indicator */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateTaskStatus(task.id, isDone ? 'TODO' : 'COMPLETED');
                                    }}
                                    className="mt-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
                                    title={isDone ? 'Mark To Do' : 'Mark Completed'}
                                  >
                                    {isDone ? (
                                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                                    ) : isInProgress ? (
                                      <Play className="w-4 h-4 text-amber-500 animate-pulse" />
                                    ) : (
                                      <Square className="w-4 h-4 text-slate-400" />
                                    )}
                                  </button>

                                  <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-bold">
                                        Day {task.day_number || 1}
                                      </span>
                                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded uppercase ${
                                        isDone
                                          ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                                          : isInProgress
                                          ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                      }`}>
                                        {task.status === 'IN_PROGRESS' ? 'IN PROGRESS' : task.status || 'TO DO'}
                                      </span>
                                    </div>
                                    <p className={`text-xs font-bold leading-relaxed ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                      {task.title}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                                    task.priority === 'URGENT' || task.priority === 'HIGH'
                                      ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                  }`}>
                                    {task.priority || 'MEDIUM'}
                                  </span>

                                  <div className="text-slate-400 hover:text-slate-800 dark:hover:text-white p-1">
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </div>
                                </div>
                              </div>

                              {/* Task Expanded Deep Blueprint (Requirement 5) */}
                              {isExpanded && (
                                <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/70 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                                  {/* What to do */}
                                  <div>
                                    <h5 className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                      <BookOpen className="w-3.5 h-3.5" />
                                      <span>What to do</span>
                                    </h5>
                                    <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                                      {blueprint.whatToDo}
                                    </p>
                                  </div>

                                  {/* Steps */}
                                  <div>
                                    <h5 className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                                      <ListOrdered className="w-3.5 h-3.5" />
                                      <span>Steps & Action Items</span>
                                    </h5>
                                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                                      {blueprint.steps.map((step, sIdx) => (
                                        <li key={sIdx} className="flex items-start gap-2">
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                          <span>{step}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  {/* Why this matters */}
                                  <div>
                                    <h5 className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                      <Lightbulb className="w-3.5 h-3.5" />
                                      <span>Why this matters</span>
                                    </h5>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                      {blueprint.whyMatters}
                                    </p>
                                  </div>

                                  {/* Estimated Time & Quick Action Buttons */}
                                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/60">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Estimated time: {blueprint.hours} hours</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {task.status !== 'IN_PROGRESS' && !isDone && (
                                        <button
                                          onClick={() => handleUpdateTaskStatus(task.id, 'IN_PROGRESS')}
                                          className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white text-xs font-semibold flex items-center gap-1 border border-amber-500/30 transition-all cursor-pointer"
                                        >
                                          <Play className="w-3 h-3" />
                                          <span>Start Task</span>
                                        </button>
                                      )}

                                      {!isDone ? (
                                        <button
                                          onClick={() => handleUpdateTaskStatus(task.id, 'COMPLETED')}
                                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                        >
                                          <Check className="w-3 h-3" />
                                          <span>Complete Task</span>
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleUpdateTaskStatus(task.id, 'TODO')}
                                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-all cursor-pointer"
                                        >
                                          <RotateCcw className="w-3 h-3" />
                                          <span>Reopen Task</span>
                                        </button>
                                      )}

                                      <button
                                        onClick={(e) => handleDeleteTask(task.id, e)}
                                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                        title="Delete Task"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
