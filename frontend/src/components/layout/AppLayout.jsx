import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { isClerkConfigured } from '../../context/ClerkWrapper';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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
  Download,
  Sun,
  Moon
} from 'lucide-react';

export default function AppLayout({ children }) {
  const { user, profile, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
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

  const userInitial = profile?.full_name ? profile.full_name.charAt(0) : user?.email?.charAt(0) || 'U';
  const userName = profile?.full_name || 'LifeOps User';

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#070b14] text-slate-800 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      {/* Sidebar - Desktop & Laptop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0b101d]/95 backdrop-blur-xl z-20 shrink-0 h-full transition-colors duration-200">
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between shrink-0">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
              <div className="w-full h-full bg-white dark:bg-[#0b101d] rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-600 dark:from-white dark:via-slate-100 dark:to-indigo-200 bg-clip-text text-transparent">
                LifeOps <span className="text-indigo-600 dark:text-indigo-400">AI</span>
              </span>
              <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Autonomous Agent Fleet
              </div>
            </div>
          </Link>
        </div>

        {/* Action Button */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <button
            onClick={() => navigate('/goals')}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all duration-200 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        </div>

        {/* Navigation Menu (Scrollable) */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto min-h-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                    item.badge === 'Demo' 
                      ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30' 
                      : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout Footer (Sticky at Bottom) */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-900/60 shrink-0 sticky bottom-0">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40 shadow-sm">
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
              {isClerkConfigured ? (
                <UserButton afterSignOutUrl="/login" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white uppercase shrink-0">
                  {userInitial}
                </div>
              )}
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{userName}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            {!isClerkConfigured && (
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0 ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-gradient-to-b from-slate-50 via-slate-100/50 to-slate-50 dark:from-[#070b14] dark:via-[#090e1a] dark:to-[#060a12] transition-colors duration-200">
        {/* Top Navbar */}
        <header className="h-14 border-b border-slate-200 dark:border-slate-800/60 bg-white/90 dark:bg-[#070b14]/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 z-10 shrink-0 transition-colors duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              <span className="hidden sm:inline">Workspace</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 hidden sm:inline shrink-0" />
              <span className="text-slate-900 dark:text-slate-200 font-semibold truncate">
                {navItems.find(i => i.path === location.pathname)?.label || 'Workspace'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Multi-Agent Engine Online</span>
            </div>

            {/* Dark / Light Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              id="themeToggleBtn"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700/60 transition-all duration-200 cursor-pointer flex items-center justify-center shadow-sm"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-300 hover:-rotate-12" />
              )}
            </button>

            <a
              href="/downloads/lifeops-ai-chrome-extension.zip"
              download="lifeops-ai-chrome-extension.zip"
              id="downloadChromeExtensionBtn"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/40 border border-indigo-400/30 transition-all duration-200 group shrink-0"
              title="Download LifeOps AI Chrome Extension & Local Agent Package (v1.0.0)"
            >
              <Download className="w-3.5 h-3.5 text-indigo-200 group-hover:animate-bounce" />
              <span className="hidden md:inline">Add Chrome Extension</span>
              <span className="md:hidden">Extension</span>
            </a>

            {/* Top Navbar User & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white uppercase shrink-0">
                  {userInitial}
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 hidden lg:inline truncate max-w-[120px]">
                  {userName}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 hover:border-rose-300 dark:hover:border-rose-500/40 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101d] px-4 py-3 space-y-1 z-30 shrink-0 shadow-2xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Theme</span>
              <button
                onClick={toggleTheme}
                className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>
            <a
              href="/downloads/lifeops-ai-chrome-extension.zip"
              download="lifeops-ai-chrome-extension.zip"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 mb-2"
            >
              <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Add Chrome Extension</span>
            </a>
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              >
                <item.icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{item.label}</span>
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
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
