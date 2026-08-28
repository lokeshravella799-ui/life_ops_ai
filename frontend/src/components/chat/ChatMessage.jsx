import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy,
  Check,
  Sparkles,
  User,
  FileText,
  Download,
  ArrowRight,
  Code2,
  HelpCircle,
  BookOpen,
  Briefcase,
  AlertTriangle,
  Calendar,
  Layers
} from 'lucide-react';

export default function ChatMessage({ message, onActionClick }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const isUser = message.role === 'user';

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getModeBadge = (mode) => {
    switch (mode) {
      case 'EXPLANATION':
      case 'QUESTION':
        return { label: 'Explanation', icon: HelpCircle, color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
      case 'CODE':
        return { label: 'Code Solution', icon: Code2, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'STUDY_GUIDANCE':
        return { label: 'Study Guidance', icon: BookOpen, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'CONTENT_GENERATION':
      case 'DOCUMENT_GENERATION':
        return { label: 'Document Synthesis', icon: FileText, color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
      case 'BUSINESS_TRIAGE':
        return { label: 'Business Ops', icon: Briefcase, color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'EMERGENCY_GUIDANCE':
        return { label: 'Immediate Action Plan', icon: AlertTriangle, color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
      case 'PLAN':
      case 'WORKFLOW':
        return { label: 'Autonomous Fleet Plan', icon: Layers, color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' };
      default:
        return null;
    }
  };

  const badge = !isUser && message.mode ? getModeBadge(message.mode) : null;

  return (
    <div className={`py-6 px-4 md:px-8 transition-colors ${isUser ? 'bg-transparent' : 'bg-[#131722]/60 border-y border-white/[0.04]'}`}>
      <div className="max-w-4xl mx-auto flex gap-4 md:gap-6 items-start">
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
          isUser
            ? 'bg-gradient-to-tr from-slate-700 to-slate-600 text-slate-200 border border-slate-500/30'
            : 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-indigo-500/20 border border-indigo-400/30'
        }`}>
          {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
        </div>

        {/* Content Body */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Header metadata for AI message */}
          {!isUser && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-300 tracking-wide">LifeOps AI</span>
              {badge && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${badge.color}`}>
                  <badge.icon className="w-3 h-3" />
                  {badge.label}
                </span>
              )}
            </div>
          )}

          {/* Markdown Content */}
          <div className="prose prose-invert prose-indigo max-w-none text-slate-200 text-[15px] leading-relaxed break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-4 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-semibold text-slate-100 mt-4 mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-semibold text-indigo-300 mt-3 mb-1">{children}</h3>,
                p: ({ children }) => <p className="mb-3 text-slate-200">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mb-3 text-slate-300">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mb-3 text-slate-300">{children}</ol>,
                li: ({ children }) => <li className="text-slate-200">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-indigo-500 bg-indigo-500/5 px-4 py-2 my-3 rounded-r text-slate-300 italic">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4 rounded-lg border border-slate-800">
                    <table className="min-w-full divide-y divide-slate-800 text-sm">{children}</table>
                  </div>
                ),
                th: ({ children }) => <th className="bg-slate-800/80 px-3 py-2 text-left font-semibold text-slate-200">{children}</th>,
                td: ({ children }) => <td className="border-t border-slate-800/60 px-3 py-2 text-slate-300">{children}</td>,
                code: ({ node, inline, className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');

                  if (!inline) {
                    return (
                      <div className="relative group my-4 rounded-xl overflow-hidden border border-slate-700/60 bg-[#0B0F19]">
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50 text-xs text-slate-400 font-mono">
                          <span>{match ? match[1].toUpperCase() : 'CODE'}</span>
                          <button
                            onClick={() => copyToClipboard(codeString)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          >
                            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedCode ? 'Copied!' : 'Copy code'}</span>
                          </button>
                        </div>
                        <pre className="p-4 overflow-x-auto text-sm text-emerald-300 font-mono leading-relaxed">
                          <code>{children}</code>
                        </pre>
                      </div>
                    );
                  }
                  return (
                    <code className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 text-xs font-mono border border-slate-700" {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {message.content || message.message || ''}
            </ReactMarkdown>
          </div>

          {/* Generated Artifacts (PDF, DOCX, XLSX) */}
          {message.artifacts && message.artifacts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Generated Physical Artifacts ({message.artifacts.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {message.artifacts.map((art) => (
                  <a
                    key={art.id}
                    href={`/api/artifacts/${art.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-indigo-500/20 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate">{art.name || art.filename}</p>
                        <p className="text-[10px] text-slate-400 uppercase">{art.artifact_type} • {Math.round((art.file_size_bytes || 1024) / 1024)} KB</p>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 shrink-0 ml-2" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Contextual Suggested Actions / Next Steps */}
          {message.suggestedActions && message.suggestedActions.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/[0.04]">
              <p className="text-[11px] font-medium text-slate-400 mb-2">Suggested Next Steps:</p>
              <div className="flex flex-wrap gap-2">
                {message.suggestedActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => onActionClick && onActionClick(action)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800/80 hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-700/60 hover:border-indigo-500 transition-all shadow-sm group cursor-pointer"
                  >
                    <span>{action.label}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
