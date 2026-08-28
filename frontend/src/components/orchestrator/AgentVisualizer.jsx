import React from 'react';
import {
  Brain,
  Cpu,
  Search,
  Calendar,
  Layers,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles
} from 'lucide-react';

export default function AgentVisualizer({ agents = [], currentStageIndex = 0, isRunning = false, progressPercentage = 0 }) {
  const agentIcons = {
    'Memory Agent': Brain,
    'Memory / Context Agent': Brain,
    'Orchestrator Agent': Cpu,
    'Research Agent': Search,
    'Planner Agent': Calendar,
    'Decision Agent': Layers,
    'Execution Agent': PlayCircle,
    'Verification Agent': CheckCircle2
  };

  const defaultAgentFleet = [
    { name: 'Memory Agent', role: 'Context Retrieval', description: 'Injecting active user study habits & constraints' },
    { name: 'Orchestrator Agent', role: 'Goal Understanding', description: 'Decomposing goals & capability DAG selection' },
    { name: 'Research Agent', role: 'Domain Knowledge', description: 'Analyzing syllabus concepts, facts & risks' },
    { name: 'Planner Agent', role: 'Milestone Scheduling', description: 'Constructing multi-day task dependency graphs' },
    { name: 'Decision Agent', role: 'Trade-off Optimization', description: 'Prioritizing high-yield exam/project concepts' },
    { name: 'Execution Agent', role: 'Entity Synthesis', description: 'Generating database-persisted actionable tasks' },
    { name: 'Verification Agent', role: 'Feasibility Audit', description: 'Auditing daily hours limits & milestone completeness' }
  ];

  // Merge live agent results with template fleet
  const displayAgents = defaultAgentFleet.map((def, idx) => {
    const liveMatch = agents.find(a => a.agent_name?.toLowerCase().includes(def.name.toLowerCase().split(' ')[0]));
    const isPast = idx < currentStageIndex || (liveMatch && liveMatch.status === 'COMPLETED');
    const isCurrent = idx === currentStageIndex && isRunning;
    const isPending = idx > currentStageIndex && !liveMatch;

    return {
      ...def,
      status: liveMatch?.status || (isCurrent ? 'RUNNING' : isPast ? 'COMPLETED' : 'PENDING'),
      summary: liveMatch?.summary || def.description,
      executionTimeMs: liveMatch?.execution_time_ms || 0,
      isCurrent,
      isPast,
      isPending
    };
  });

  return (
    <div className="w-full bg-[#0b1120]/80 backdrop-blur-xl border border-indigo-500/20 rounded-2xl p-6 shadow-2xl shadow-indigo-950/40">
      {/* Header with Progress Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              Autonomous Multi-Agent Fleet
              {isRunning && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Live Orchestration
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Coordinated dynamic multi-agent DAG pipeline with automated verification loop
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-36 bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-700/50">
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, progressPercentage))}%` }}
            ></div>
          </div>
          <span className="text-xs font-mono text-indigo-300 font-semibold">{Math.round(progressPercentage)}%</span>
        </div>
      </div>

      {/* Agents Linear DAG Stream */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {displayAgents.map((agent, index) => {
          const Icon = agentIcons[agent.name] || Cpu;

          return (
            <div
              key={agent.name}
              className={`relative rounded-xl p-4 transition-all duration-300 border ${
                agent.isCurrent
                  ? 'bg-indigo-950/30 border-indigo-500/60 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                  : agent.status === 'COMPLETED'
                  ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700/80'
                  : 'bg-slate-950/40 border-slate-800/30 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      agent.isCurrent
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        : agent.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {agent.isCurrent ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    ) : agent.status === 'COMPLETED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200 truncate">{agent.name}</h4>
                    <p className="text-[10px] text-slate-400 truncate">{agent.role}</p>
                  </div>
                </div>

                {agent.executionTimeMs > 0 && (
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {agent.executionTimeMs}ms
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                {agent.summary}
              </p>

              {agent.isCurrent && (
                <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-indigo-400 font-medium animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  Processing structured reasoning...
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
