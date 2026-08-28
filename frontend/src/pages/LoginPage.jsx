import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { SignIn } from '@clerk/clerk-react';
import { isClerkConfigured } from '../context/ClerkWrapper';
import { useAuth } from '../context/AuthContext';
import { Bot, Sparkles, Key, Mail, Lock, ArrowRight, AlertCircle, ExternalLink } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleFallbackSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await login('demo@lifeops.ai', 'Password123!');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center space-y-3 mb-6">
        <Link to="/" className="inline-flex items-center space-x-2.5 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-xl shadow-indigo-500/25 border border-white/10 group-hover:scale-105 transition-transform duration-200">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            LIFEOPS AI
          </span>
        </Link>
        <h2 className="text-xl font-semibold text-slate-200">
          Sign in to your AI Workforce
        </h2>
        <p className="text-xs text-slate-400">
          Autonomous multi-agent orchestration for personal & business goals
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 flex flex-col items-center">
        {isClerkConfigured ? (
          /* Real Clerk Sign-In Component */
          <div className="w-full flex justify-center animate-fadeIn">
            <SignIn
              routing="path"
              path="/login"
              signUpUrl="/register"
              fallbackRedirectUrl="/"
            />
          </div>
        ) : (
          /* Graceful Clerk Setup & Local Sandbox Mode */
          <div className="w-full glass-panel py-8 px-6 sm:px-10 rounded-2xl border border-slate-800/80 shadow-2xl space-y-6">
            {/* Setup Notice Banner */}
            <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs space-y-2">
              <div className="flex items-center justify-between font-semibold text-indigo-300">
                <div className="flex items-center space-x-1.5">
                  <Key className="w-4 h-4 text-indigo-400" />
                  <span>Clerk Authentication Setup</span>
                </div>
                <a
                  href="https://dashboard.clerk.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 underline font-normal"
                >
                  <span>Get Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                To enable Google/GitHub social logins and real Clerk auth, paste your key in <code className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-indigo-300">frontend/.env</code> as:
              </p>
              <div className="p-2 rounded bg-slate-900/90 font-mono text-[10px] text-slate-300 border border-slate-800 select-all overflow-x-auto">
                VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
              </div>
            </div>

            {/* Quick Demo Sandbox Access */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-500/20 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span className="text-xs text-indigo-200 font-medium">Instant Sandbox Access</span>
              </div>
              <button
                type="button"
                onClick={handleDemoFill}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-500/20 transition-all"
              >
                {isLoading ? 'Entering...' : 'Enter Demo'}
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-start space-x-2.5 animate-fadeIn">
                <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleFallbackSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email address
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center">
              <Link to="/register" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                Don't have an account? Create one &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
