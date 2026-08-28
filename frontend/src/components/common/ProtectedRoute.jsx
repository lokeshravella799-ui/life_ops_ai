import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bot } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/30 animate-pulse flex items-center justify-center">
            <Bot className="w-8 h-8 text-brand-400 animate-bounce" />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-brand-500/10 blur-xl animate-pulse"></div>
        </div>
        <div className="text-sm text-slate-400 font-medium tracking-wide">
          Verifying Supabase Session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
