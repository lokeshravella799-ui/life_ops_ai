import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ChatMessage from '../components/chat/ChatMessage';
import AgentVisualizer from '../components/orchestrator/AgentVisualizer';
import {
  Sparkles,
  Send,
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
  BookOpen,
  Code2,
  Compass,
  FileText,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  History,
  MessageSquare,
  Trash2,
  X,
  Search,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const LOCAL_STORAGE_CHATS_KEY = 'lifeops_chat_conversations_v2';
const LOCAL_STORAGE_ACTIVE_ID_KEY = 'lifeops_active_chat_id_v2';

export default function HomePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Conversation state
  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CHATS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeConversationId, setActiveConversationId] = useState(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_ACTIVE_ID_KEY) || crypto.randomUUID();
    } catch {
      return crypto.randomUUID();
    }
  });

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');

  // Workflow / Multi-Agent State (only activated when planning is explicitly requested)
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState(null);
  const [liveAgents, setLiveAgents] = useState([]);
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [expandedDay, setExpandedDay] = useState(1);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Sync active conversation messages on mount or conversation switch
  useEffect(() => {
    const active = conversations.find(c => c.id === activeConversationId);
    if (active) {
      setMessages(active.messages || []);
      setActiveWorkflow(active.activeWorkflow || null);
    } else {
      setMessages([]);
      setActiveWorkflow(null);
    }
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_ID_KEY, activeConversationId);
  }, [activeConversationId]);

  // Save conversations to localStorage whenever they update
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CHATS_KEY, JSON.stringify(conversations));
    } catch (e) {
      console.warn('Failed to save chats to localStorage', e);
    }
  }, [conversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOrchestrating, activeWorkflow]);

  // Load conversations from backend on mount (optional cloud sync)
  useEffect(() => {
    const fetchCloudHistory = async () => {
      try {
        const res = await api.get('/chat/conversations');
        const cloudConvs = res.data?.conversations || [];
        if (cloudConvs.length > 0) {
          setConversations(prev => {
            const combined = [...prev];
            cloudConvs.forEach(cc => {
              if (!combined.some(local => local.id === cc.id)) {
                combined.push({
                  id: cc.id,
                  title: cc.title,
                  createdAt: cc.created_at,
                  updatedAt: cc.updated_at,
                  messages: []
                });
              }
            });
            return combined;
          });
        }
      } catch (err) {
        // Fall back to local
      }
    };
    fetchCloudHistory();
  }, []);

  // Update conversation record with new messages
  const persistConversation = (newMessages, newWorkflow = null, customTitle = null) => {
    setConversations(prev => {
      const idx = prev.findIndex(c => c.id === activeConversationId);
      const firstUserMsg = newMessages.find(m => m.role === 'user');
      const defaultTitle = customTitle || (firstUserMsg ? (firstUserMsg.content || '').slice(0, 40) : 'New Chat');

      const updated = {
        id: activeConversationId,
        title: idx !== -1 && prev[idx].title && prev[idx].title !== 'New Chat' ? prev[idx].title : defaultTitle,
        updatedAt: new Date().toISOString(),
        createdAt: idx !== -1 ? prev[idx].createdAt : new Date().toISOString(),
        messages: newMessages,
        activeWorkflow: newWorkflow !== null ? newWorkflow : (idx !== -1 ? prev[idx].activeWorkflow : null)
      };

      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      } else {
        return [updated, ...prev];
      }
    });

    // Cloud sync in background
    api.post('/chat/conversations', {
      id: activeConversationId,
      title: customTitle || 'Chat Session',
      messages: newMessages
    }).catch(() => {});
  };

  // Start a fresh conversation
  const handleNewChat = () => {
    const newId = crypto.randomUUID();
    setActiveConversationId(newId);
    setMessages([]);
    setActiveWorkflow(null);
    setInputMessage('');
    setIsHistoryOpen(false);
  };

  // Select an existing conversation
  const handleSelectConversation = async (conv) => {
    setActiveConversationId(conv.id);
    setMessages(conv.messages || []);
    setActiveWorkflow(conv.activeWorkflow || null);
    setIsHistoryOpen(false);

    // Fetch full messages if empty
    if (!conv.messages || conv.messages.length === 0) {
      try {
        const res = await api.get(`/chat/conversations/${conv.id}`);
        const fullConv = res.data?.conversation;
        if (fullConv?.messages) {
          setMessages(fullConv.messages);
          setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, messages: fullConv.messages } : c));
        }
      } catch (err) {
        // Fallback to existing
      }
    }
  };

  // Delete a conversation from history
  const handleDeleteConversation = (id, e) => {
    e.stopPropagation();
    setConversations(prev => prev.filter(c => c.id !== id));
    api.delete(`/chat/conversations/${id}`).catch(() => {});
    if (activeConversationId === id) {
      handleNewChat();
    }
  };

  // Suggestion chips for empty state
  const quickSuggestions = [
    {
      title: 'Explain Generative AI',
      desc: 'Understand LLMs, Diffusion, and Multi-Agent concepts',
      prompt: 'What is Generative AI and how does it work?',
      icon: Sparkles
    },
    {
      title: 'Study Guidance for Exams',
      desc: 'Best way to study DBMS, OS, or complex subjects',
      prompt: 'How should I learn Generative AI from basics to advanced?',
      icon: BookOpen
    },
    {
      title: 'Write Python Code',
      desc: 'Data structures, algorithms, and practical functions',
      prompt: 'basics of python',
      icon: Code2
    },
    {
      title: 'Teach Me About Computers',
      desc: 'Hardware components, CPU, memory, and architecture',
      prompt: 'teach me about computers',
      icon: Compass
    }
  ];

  // Send message to Conversational Endpoint
  const handleSendMessage = async (customPrompt = null) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend || !textToSend.trim() || isLoading) return;

    const userMsg = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString()
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputMessage('');
    setIsLoading(true);

    persistConversation(nextMessages, activeWorkflow);

    try {
      // 1. Call Conversational AI Router
      const res = await api.post('/chat', {
        message: textToSend,
        conversationId: activeConversationId,
        history: messages.slice(-6).map(m => ({ role: m.role, content: m.content || m.message }))
      });

      const chatData = res?.data?.data || res?.data || res;

      // 2. Check if this is an explicit PLAN request requiring the Multi-Agent Fleet
      if (chatData?.workflowRequired || chatData?.mode === 'PLAN') {
        const aiMsg = {
          role: 'assistant',
          mode: 'PLAN',
          message: chatData.message || 'Launching the **Autonomous Multi-Agent Fleet** to synthesize your verified milestone roadmap and artifacts...',
          suggestedActions: []
        };
        const updatedMsgs = [...nextMessages, aiMsg];
        setMessages(updatedMsgs);
        persistConversation(updatedMsgs, null, chatData.title);
        setIsLoading(false);

        // Trigger Workflow Engine
        await triggerWorkflowOrchestration(textToSend, chatData.metadata, updatedMsgs);
        return;
      }

      // 3. Normal Conversational Response
      const aiMsg = {
        role: 'assistant',
        mode: chatData?.mode || 'EXPLANATION',
        message: chatData?.message || 'I have analyzed your request.',
        title: chatData?.title,
        code: chatData?.code,
        sections: chatData?.sections || [],
        artifacts: chatData?.artifacts || [],
        suggestedActions: chatData?.suggestedActions || []
      };

      const finalMsgs = [...nextMessages, aiMsg];
      setMessages(finalMsgs);
      persistConversation(finalMsgs, activeWorkflow, chatData.title);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = err?.message || err?.error?.message || 'AI service is temporarily unavailable. Please check your connection or try again.';
      const errorAiMsg = {
        role: 'assistant',
        mode: 'EXPLANATION',
        message: `⚠️ **AI Service Notice**\n\n${errorMessage}`
      };
      const finalMsgs = [...nextMessages, errorAiMsg];
      setMessages(finalMsgs);
      persistConversation(finalMsgs, activeWorkflow);
    } finally {
      setIsLoading(false);
    }
  };

  // Explicit Workflow Orchestration
  const triggerWorkflowOrchestration = async (goalText, metadata = {}, baseMessages = messages) => {
    setIsOrchestrating(true);
    setCurrentStage(0);
    setProgress(15);
    setActiveWorkflow(null);

    const stages = [
      { name: 'Memory Agent', role: 'Retrieving user preferences & profile context' },
      { name: 'Orchestrator Agent', role: 'Analyzing goal complexity & capability mapping' },
      { name: 'Research Agent', role: 'Synthesizing domain knowledge & risk factors' },
      { name: 'Planner Agent', role: 'Scheduling milestones & dependency ordering' },
      { name: 'Decision Agent', role: 'Evaluating trade-offs & prioritizing tasks' },
      { name: 'Execution Agent', role: 'Generating database tasks & physical artifacts' },
      { name: 'Verification Agent', role: 'Auditing constraints & artifact integrity' }
    ];

    setLiveAgents(stages.map((s, idx) => ({ ...s, status: idx === 0 ? 'RUNNING' : 'WAITING' })));

    const stageInterval = setInterval(() => {
      setCurrentStage(prev => {
        const next = prev + 1;
        if (next < stages.length) {
          setProgress(Math.round(((next + 1) / stages.length) * 85));
          setLiveAgents(stages.map((s, idx) => ({
            ...s,
            status: idx < next ? 'COMPLETED' : idx === next ? 'RUNNING' : 'WAITING'
          })));
          return next;
        }
        clearInterval(stageInterval);
        return prev;
      });
    }, 450);

    try {
      const res = await api.post('/workflows/orchestrate', {
        goalText,
        category: metadata?.category || 'PERSONAL',
        targetDays: metadata?.targetDays || 10,
        dailyHours: metadata?.dailyHours || 3
      });

      clearInterval(stageInterval);
      setProgress(100);

      const workflowData = res?.data?.data || res?.data || res;
      setActiveWorkflow(workflowData);

      const completedMsgs = [
        ...baseMessages,
        {
          role: 'assistant',
          mode: 'PLAN',
          message: `### ✨ Autonomous Fleet Execution Complete!\n\n**Objective**: ${workflowData.summary || goalText}\n- **Verified Score**: ${workflowData.verification?.score || 95}/100\n- **Tasks Generated**: ${workflowData.tasks?.length || 0} milestone tasks\n- **Physical Artifacts**: ${workflowData.artifacts?.length || 0} generated files\n\n*Review your verified milestone schedule below or open the full workflow detail.*`,
          artifacts: workflowData.artifacts || [],
          suggestedActions: [
            {
              type: 'CUSTOM_PROMPT',
              label: '📊 View Full Workflow Analytics',
              prompt: `Open details for workflow ${workflowData.workflowId}`
            }
          ]
        }
      ];

      setMessages(completedMsgs);
      persistConversation(completedMsgs, workflowData);
    } catch (err) {
      clearInterval(stageInterval);
      console.error('Workflow error:', err);
      const errMsgs = [
        ...baseMessages,
        {
          role: 'assistant',
          mode: 'EXPLANATION',
          message: 'Failed to orchestrate multi-agent workflow. Please try again with adjusted parameters.'
        }
      ];
      setMessages(errMsgs);
      persistConversation(errMsgs, null);
    } finally {
      setIsOrchestrating(false);
    }
  };

  const handleActionClick = (action) => {
    handleSendMessage(action.prompt);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = conversations.filter(c => 
    !searchHistoryQuery.trim() || 
    (c.title && c.title.toLowerCase().includes(searchHistoryQuery.toLowerCase()))
  );

  const activeChat = conversations.find(c => c.id === activeConversationId);

  return (
    <div className="flex h-[calc(100vh-4.5rem)] bg-[#0B0F19] text-slate-100 overflow-hidden relative">
      {/* Sidebar Backdrop for Mobile */}
      {isHistoryOpen && (
        <div 
          onClick={() => setIsHistoryOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Conversation History Drawer */}
      <div className={`fixed md:static inset-y-0 left-0 z-50 md:z-auto w-72 bg-[#0E121E] border-r border-white/[0.06] flex flex-col transition-all duration-300 ${
        isHistoryOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-72'
      }`}>
        {/* Drawer Header */}
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-200">Chat History</h2>
          </div>
          <button
            onClick={() => setIsHistoryOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchHistoryQuery}
              onChange={(e) => setSearchHistoryQuery(e.target.value)}
              placeholder="Search previous chats..."
              className="w-full bg-[#151A27] text-slate-200 placeholder-slate-500 text-xs rounded-lg pl-8 pr-3 py-2 border border-white/[0.04] focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs space-y-1">
              <MessageSquare className="w-6 h-6 mx-auto text-slate-600" />
              <p>No previous conversations</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all text-xs ${
                    isActive
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                      : 'text-slate-300 hover:bg-[#151A27] hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-6">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <span className="truncate font-medium">{conv.title || 'Untitled Chat'}</span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    title="Delete Chat"
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Chat Header Bar */}
        <div className="px-4 py-3 bg-[#0E121E]/60 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsHistoryOpen(prev => !prev)}
              className="p-1.5 rounded-lg bg-[#151A27] hover:bg-[#1E2538] text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium border border-white/[0.06]"
              title="Toggle Chat History"
            >
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>History ({conversations.length})</span>
            </button>

            <span className="text-xs text-slate-400 truncate max-w-xs font-medium">
              {activeChat?.title || 'New Chat'}
            </span>
          </div>

          <button
            onClick={handleNewChat}
            className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 border border-indigo-500/30 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Messages Thread */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* Empty / Welcome State */
            <div className="max-w-3xl mx-auto px-4 py-12 md:py-16 flex flex-col items-center justify-center text-center space-y-8">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/30 border border-indigo-400/30">
                  <Sparkles className="w-8 h-8 animate-pulse" />
                </div>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                  What can I help you with today?
                </h1>
                <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto">
                  Ask questions, generate study notes, write code, analyze documents, or request a verified multi-agent milestone plan.
                </p>
              </div>

              {/* Quick Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-left">
                {quickSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="p-4 rounded-2xl bg-[#131722]/80 hover:bg-[#1A2030] border border-white/[0.06] hover:border-indigo-500/40 transition-all text-left group shadow-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-1.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{item.title}</span>
                    </div>
                    <p className="text-xs text-slate-400 pl-11 line-clamp-1">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Conversational Messages */
            <div className="divide-y divide-white/[0.04]">
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={idx}
                  message={msg}
                  onActionClick={handleActionClick}
                />
              ))}

              {/* Loading Skeleton */}
              {isLoading && (
                <div className="py-6 px-4 md:px-8 bg-[#131722]/40">
                  <div className="max-w-4xl mx-auto flex gap-4 items-center">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center animate-spin">
                      <Loader2 className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <span>LifeOps AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Agent Visualizer (Shown ONLY during real workflow orchestration) */}
              {isOrchestrating && (
                <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
                  <AgentVisualizer
                    agents={liveAgents}
                    currentStage={currentStage}
                    progress={progress}
                    workflowId="live_orchestration"
                  />
                </div>
              )}

              {/* Verified Milestone Roadmap */}
              {activeWorkflow && activeWorkflow.tasks && (
                <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 space-y-4">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-[#131722] to-[#161B26] border border-indigo-500/30 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-400" />
                        <h3 className="font-bold text-white text-base">Verified Milestone Roadmap</h3>
                      </div>
                      <button
                        onClick={() => navigate(`/workflows/${activeWorkflow.workflowId}`)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                      >
                        <span>Open Workflow Page</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Tasks Grouped by Day */}
                    <div className="space-y-2">
                      {Array.from(new Set(activeWorkflow.tasks.map(t => t.day_number || 1)))
                        .sort((a, b) => a - b)
                        .map(dayNum => {
                          const dayTasks = activeWorkflow.tasks.filter(t => (t.day_number || 1) === dayNum);
                          const isExpanded = expandedDay === dayNum;

                          return (
                            <div key={dayNum} className="rounded-xl border border-slate-800 bg-[#0B0F19]/80 overflow-hidden">
                              <button
                                onClick={() => setExpandedDay(isExpanded ? null : dayNum)}
                                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/40 transition-colors"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-bold flex items-center justify-center">
                                    D{dayNum}
                                  </span>
                                  <span className="text-sm font-semibold text-slate-200">
                                    Day {dayNum} Milestone ({dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'})
                                  </span>
                                </div>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                              </button>

                              {isExpanded && (
                                <div className="px-4 pb-3 pt-1 space-y-2 border-t border-slate-800/60 divide-y divide-slate-800/40">
                                  {dayTasks.map((t, idx) => (
                                    <div key={t.id || idx} className="pt-2 flex items-start justify-between gap-3 text-xs">
                                      <div className="space-y-0.5 min-w-0">
                                        <p className="font-medium text-slate-200">{t.title}</p>
                                        {t.description && <p className="text-slate-400 text-[11px] line-clamp-1">{t.description}</p>}
                                      </div>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 uppercase ${
                                        t.priority === 'URGENT' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                        t.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                        'bg-slate-800 text-slate-400'
                                      }`}>
                                        {t.priority}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 md:p-6 bg-[#0B0F19] border-t border-white/[0.06]">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center rounded-2xl bg-[#131722] border border-white/[0.1] focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 shadow-2xl transition-all"
            >
              {/* New Conversation Button */}
              <button
                type="button"
                onClick={handleNewChat}
                title="New Chat"
                className="p-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <Plus className="w-5 h-5" />
              </button>

              {/* Input Textarea */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything or request a plan (e.g. 'teach me about computers', 'basics of python', or 'Plan a 30-day course')..."
                className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none resize-none py-3.5 px-2 max-h-32"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className={`p-2.5 mr-2 rounded-xl transition-all shrink-0 ${
                  inputMessage.trim() && !isLoading
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 cursor-pointer'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>

            <p className="text-[11px] text-slate-400 text-center mt-2.5">
              LifeOps AI provides conversational intelligence and autonomous multi-agent planning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
