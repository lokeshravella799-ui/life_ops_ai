import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import { ShieldCheck, User, Mail, Sparkles, Clock, CheckCircle2, Bot, ArrowRight } from 'lucide-react';

export default function DashboardPreviewPage() {
  const { user, profile, updateProfile } = useAuth();
  const [preferredTime, setPreferredTime] = useState(profile?.preferred_study_time || 'Evening (6 PM - 9 PM)');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdatePreference = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await updateProfile({
        preferredStudyTime: preferredTime
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert('Failed to update preference: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-10 flex-1 w-full space-y-8">
        {/* Welcome Banner */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Phase 2: Supabase Session Authenticated</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome, {profile?.full_name || user?.email?.split('@')[0]}!
            </h1>
            <p className="text-slate-400 text-sm">
              Your Supabase user identity and profile session have been successfully verified and protected by Row Level Security (RLS).
            </p>
          </div>
        </div>

        {/* User Identity & Tenancy Verification Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-400" /> Authenticated User Identity
            </h3>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/60">
                <span className="text-slate-500 block">User UUID (auth.users)</span>
                <span className="font-mono text-slate-200 text-[11px] break-all">{user?.id}</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/60">
                <span className="text-slate-500 block">Email Address</span>
                <span className="font-medium text-slate-200">{user?.email}</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/60">
                <span className="text-slate-500 block">Assigned Role</span>
                <span className="font-medium text-slate-200">{profile?.role || 'Member'}</span>
              </div>
            </div>
          </div>

          {/* Profile Preferences & Memory Update */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" /> Active Working Preferences
            </h3>

            <form onSubmit={handleUpdatePreference} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5">Preferred Study / Work Time</label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Morning (6 AM - 9 AM)">Morning (6 AM - 9 AM)</option>
                  <option value="Afternoon (2 PM - 5 PM)">Afternoon (2 PM - 5 PM)</option>
                  <option value="Evening (6 PM - 9 PM)">Evening (6 PM - 9 PM)</option>
                  <option value="Night (9 PM - 12 AM)">Night (9 PM - 12 AM)</option>
                  <option value="Flexible Blocks">Flexible Blocks</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="w-full py-2 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isUpdating ? 'Saving...' : 'Update Preference in Supabase'}
              </button>

              {savedSuccess && (
                <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Preference updated successfully!
                </div>
              )}
            </form>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        LifeOps AI • Phase 2 Auth Engine Online
      </footer>
    </div>
  );
}
