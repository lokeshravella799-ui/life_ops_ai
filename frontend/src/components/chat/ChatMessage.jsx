import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../services/api';
import {
  Sparkles,
  Bot,
  User,
  ExternalLink,
  ChevronRight,
  Code2,
  Calendar,
  Layers,
  FileText,
  Download,
  Target,
  PlusCircle,
  Loader2
} from 'lucide-react';

import { downloadArtifactFile } from '../../utils/fileDownloader';

export default function ChatMessage({ message, onActionClick, onAddGoal }) {
  const isUser = message.role === 'user';
  const [downloadingId, setDownloadingId] = useState(null);

  // Handle formatted message content
  let messageText = '';
  if (typeof message.content === 'string') {
    messageText = message.content;
  } else if (typeof message.message === 'string') {
    messageText = message.message;
  } else if (message.error) {
    messageText = typeof message.error === 'string' ? message.error : message.error.message || 'An error occurred.';
  }

  // Deduplicate artifacts to show only unique physical artifacts
  const uniqueArtifacts = (message.artifacts || []).filter((art, idx, self) =>
    idx === self.findIndex((a) => a.id === art.id || (a.name === art.name && a.artifact_type === art.artifact_type))
  );

  const handleDownloadArtifact = async (art, e) => {
    e.preventDefault();
    setDownloadingId(art.id);
    try {
      await downloadArtifactFile(art);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div
      className={`flex gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl transition-all ${
        isUser
          ? 'bg-gradient-to-r from-indigo-50 dark:from-indigo-900/10 via-purple-50 dark:via-purple-900/10 to-transparent border border-indigo-200 dark:border-indigo-500/15 ml-4 sm:ml-12'
          : 'bg-white dark:bg-[#0b101d]/90 border border-slate-200 dark:border-slate-800/80 mr-4 sm:mr-12 shadow-sm dark:shadow-xl shadow-slate-200/40 dark:shadow-black/20'
      }`}
    >
      {/* Avatar Icon */}
      <div className="shrink-0 pt-0.5">
        {isUser ? (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-600/30 text-white font-semibold text-xs">
            <User className="w-4 h-4" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-white dark:bg-[#0b101d] rounded-xl flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        )}
      </div>

      {/* Main Message Body */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Role & Intent Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isUser ? 'You' : 'LifeOps AI'}
            </span>
            {!isUser && message.mode && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                {message.mode === 'PLAN' ? 'Autonomous Fleet' : message.mode === 'CODE' ? 'Technical Spec' : 'Direct Response'}
              </span>
            )}
          </div>

          {/* Add Goal Action Button on AI responses */}
          {!isUser && onAddGoal && (
            <button
              onClick={() => onAddGoal(message)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-600/15 hover:bg-indigo-600 hover:text-white border border-indigo-200 dark:border-indigo-500/30 hover:border-indigo-500 transition-all cursor-pointer shadow-sm group"
              title="Convert this AI response into a trackable Goal & Roadmap"
            >
              <Target className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>+ Add Goal</span>
            </button>
          )}
        </div>

        {/* Markdown Content */}
        <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed break-words font-normal">
          <div className="prose dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-li:my-0.5 prose-hr:my-4 prose-hr:border-slate-200 dark:prose-hr:border-slate-800">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-3 rounded-xl border border-slate-800">
                      <table className="min-w-full divide-y divide-slate-800 text-xs text-left">
                        {children}
                      </table>
                    </div>
                  );
                },
                thead({ children }) {
                  return <thead className="bg-slate-900/80 font-bold text-slate-300">{children}</thead>;
                },
                th({ children }) {
                  return <th className="px-3 py-2 text-indigo-300 font-semibold border-b border-slate-800">{children}</th>;
                },
                td({ children }) {
                  return <td className="px-3 py-2 border-b border-slate-800/60 text-slate-300">{children}</td>;
                },
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <div className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-[#090d16]">
                      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-mono">
                        <span>{match[1]}</span>
                      </div>
                      <div className="p-4 overflow-x-auto font-mono text-xs text-slate-200">
                        <code>{children}</code>
                      </div>
                    </div>
                  ) : (
                    <code className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-xs" {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {messageText}
            </ReactMarkdown>
          </div>

          {/* Generated Physical Artifacts (PDF Download) */}
          {uniqueArtifacts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Download Full Verified Blueprint ({uniqueArtifacts.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {uniqueArtifacts.map((art) => (
                  <button
                    key={art.id}
                    onClick={(e) => handleDownloadArtifact(art, e)}
                    disabled={downloadingId === art.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/10 transition-all group cursor-pointer text-left w-full shadow-md"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                        {downloadingId === art.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{art.name || art.filename}</p>
                        <p className="text-[10px] text-indigo-300 font-mono uppercase">
                          {art.artifact_type || 'PDF'} • {Math.round((art.file_size_bytes || 2048) / 1024)} KB
                        </p>
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
                    <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
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
