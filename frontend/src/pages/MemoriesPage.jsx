import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Brain,
  PlusCircle,
  Trash2,
  Clock,
  Sparkles,
  ShieldCheck,
  Save,
  Loader2,
  CheckCircle2
} from 'lucide-react';

export default function MemoriesPage() {
  const { profile, updateProfile } = useAuth();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Preference fields
  const [preferredStudyTime, setPreferredStudyTime] = useState(
    profile?.preferred_study_time || 'Evening (6 PM - 9 PM)'
  );
  const [maxHoursPerDay, setMaxHoursPerDay] = useState(
    profile?.preferences?.maxHoursPerDay || 3
  );
  const [saveProfileLoading, setSaveProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Add memory modal state
  const [newContent, setNewContent] = useState('');
  const [newKeyTag, setNewKeyTag] = useState('habit');
  const [newCategory, setNewCategory] = useState('STUDY_HABIT');
  const [addingMemory, setAddingMemory] = useState(false);

  useEffect(() => {
    fetchMemories();
    if (profile) {
      if (profile.preferred_study_time) setPreferredStudyTime(profile.preferred_study_time);
      if (profile.preferences?.maxHoursPerDay) setMaxHoursPerDay(profile.preferences.maxHoursPerDay);
    }
  }, [profile]);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/memories');
      setMemories(res.data?.memories || []);
    } catch (err) {
      console.error('Failed to load memories', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSaveProfileLoading(true);
    setProfileSuccess(false);

    try {
      await updateProfile({
        preferredStudyTime,
        preferences: { maxHoursPerDay: parseFloat(maxHoursPerDay) }
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      alert(err.message || 'Failed to save preferences');
    } finally {
      setSaveProfileLoading(false);
    }
  };

  const handleAddMemory = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setAddingMemory(true);
    try {
      const res = await api.post('/memories', {
        content: newContent.trim(),
        keyTag: newKeyTag,
        category: newCategory
      });
      setMemories(prev => [res.data?.memory, ...prev]);
      setNewContent('');
    } catch (err) {
      alert(err.message || 'Failed to add memory');
    } finally {
      setAddingMemory(false);
    }
  };

  const handleDeleteMemory = async (id) => {
    try {
      await api.delete(`/memories/${id}`);
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete memory');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Memories & Personalization</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          LifeOps AI uses your active habits, working windows, and learning preferences to orchestrate tailored plans.
        </p>
      </div>

      {/* Global Preference Controls */}
      <div className="p-6 rounded-3xl bg-[#0d1424]/90 border border-slate-800 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Core Working & Study Habits</h3>
            <p className="text-xs text-slate-400">These limits are automatically injected into the Memory Agent for all new goals.</p>
          </div>
        </div>

        <form onSubmit={handleSavePreferences} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Preferred Study / Working Window
            </label>
            <input
              type="text"
              value={preferredStudyTime}
              onChange={(e) => setPreferredStudyTime(e.target.value)}
              placeholder="e.g. Evening (6 PM - 9 PM) or Morning (7 AM - 10 AM)"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Maximum Daily Availability (Hours)
            </label>
            <input
              type="number"
              min="0.5"
              max="16"
              step="0.5"
              value={maxHoursPerDay}
              onChange={(e) => setMaxHoursPerDay(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="sm:col-span-2 flex items-center justify-between pt-2">
            {profileSuccess && (
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Preferences updated successfully!
              </span>
            )}
            <div className="ml-auto">
              <button
                type="submit"
                disabled={saveProfileLoading}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
              >
                {saveProfileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Preferences</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Add Custom Habit / Preference */}
      <div className="p-6 rounded-3xl bg-[#0d1424]/70 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          Add Custom Habit or Constraint
        </h3>

        <form onSubmit={handleAddMemory} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <input
                type="text"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="e.g. Prefers active coding and diagramming over reading long textbook passages..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                required
              />
            </div>
            <div>
              <input
                type="text"
                value={newKeyTag}
                onChange={(e) => setNewKeyTag(e.target.value)}
                placeholder="Key Tag (e.g. learning_style)"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={addingMemory || !newContent.trim()}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
            >
              {addingMemory ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
              <span>Save Memory</span>
            </button>
          </div>
        </form>
      </div>

      {/* Active Memories List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Saved Personal Context Items ({memories.length})
        </h3>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        )}

        {!loading && memories.length === 0 && (
          <p className="text-xs text-slate-500 italic">No custom memories saved yet.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {memories.map(m => (
            <div
              key={m.id}
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                  {m.key_tag || 'preference'}
                </span>
                <p className="text-xs text-slate-200 leading-relaxed pt-1">
                  {m.content}
                </p>
              </div>

              <button
                onClick={() => handleDeleteMemory(m.id)}
                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
