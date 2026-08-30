import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { isClerkConfigured } from '../../context/ClerkWrapper';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  Target,
  CheckSquare,
  Brain,
  FileText,
  Briefcase,
  Activity,
  LogOut,
  PlusCircle,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Download
} from 'lucide-react';

export default function AppLayout({ children }) {
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'AI Assistant', path: '/', icon: Sparkles, badge: 'Active' },
    { label: 'Goals', path: '/goals', icon: Target },
    { label: 'Tasks Roadmap', path: '/tasks', icon: CheckSquare },
    { label: 'Memories & Habits', path: '/memories', icon: Brain },
    { label: 'Document Extraction', path: '/documents', icon: FileText },
    { label: 'Business Triage', path: '/business', icon: Briefcase, badge: 'Demo' },
    { label: 'Activity & History', path: '/activity', icon: Activity },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800/80 bg-[#0b101d]/90 backdrop-blur-xl z-20">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/60 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
              <div className="w-full h-full bg-[#0b101d] rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                LifeOps <span className="text-indigo-400">AI</span>
              </span>
              <div className="flex items-center gap-1.5 text-[10px] text-indigo-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Autonomous Agent Fleet
              </div>
            </div>
          </Link>
        </div>

        {/* Action Button */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all duration-200"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    item.badge === 'Demo' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-800/60 bg-slate-900/30">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-700/40">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {isClerkConfigured ? (
                <UserButton afterSignOutUrl="/login" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white uppercase flex-shrink-0">
                  {profile?.full_name ? profile.full_name.charAt(0) : user?.email?.charAt(0) || 'U'}
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-200 truncate">{profile?.full_name || 'LifeOps User'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            {!isClerkConfigured && (
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-b from-[#070b14] via-[#090e1a] to-[#060a12]">
        {/* Top Navbar */}
        <header className="h-14 border-b border-slate-800/60 bg-[#070b14]/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span className="text-slate-500">Workspace</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-slate-200 font-semibold">
                {navItems.find(i => i.path === location.pathname)?.label || 'Workspace'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Multi-Agent Engine Online</span>
            </div>

            <a
              href="/downloads/lifeops-ai-chrome-extension.zip"
              download="lifeops-ai-chrome-extension.zip"
              id="downloadChromeExtensionBtn"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/40 border border-indigo-400/30 transition-all duration-200 group"
              title="Download LifeOps AI Chrome Extension & Local Agent Package (v1.0.0)"
            >
              <Download className="w-3.5 h-3.5 text-indigo-200 group-hover:animate-bounce" />
              <span>Add Chrome Extension</span>
            </a>
          </div>
        </header>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-800 bg-[#0b101d] px-4 py-3 space-y-1 z-30">
            <a
              href="/downloads/lifeops-ai-chrome-extension.zip"
              download="lifeops-ai-chrome-extension.zip"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-indigo-300 bg-indigo-600/20 border border-indigo-500/30 mb-2"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Add Chrome Extension</span>
            </a>
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800/60"
              >
                <item.icon className="w-4 h-4 text-indigo-400" />
                <span>{item.label}</span>
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
