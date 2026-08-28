import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export const isClerkConfigured = Boolean(
  PUBLISHABLE_KEY && 
  PUBLISHABLE_KEY.startsWith('pk_') && 
  !PUBLISHABLE_KEY.includes('your_clerk_publishable_key')
);

// Custom LifeOps Dark Theme Configuration for Clerk UI Components
export const clerkAppearance = {
  layout: {
    socialButtonsPlacement: 'top',
    socialButtonsVariant: 'blockButton',
    termsPageUrl: 'https://clerk.com/terms',
    privacyPageUrl: 'https://clerk.com/privacy'
  },
  variables: {
    colorPrimary: '#6366f1', // Indigo 500
    colorText: '#f1f5f9',    // Slate 100
    colorTextSecondary: '#94a3b8', // Slate 400
    colorBackground: '#090d16',    // Deep slate 950
    colorInputBackground: '#0f172a', // Slate 900
    colorInputText: '#f8fafc',
    colorDanger: '#f43f5e',
    colorSuccess: '#10b981',
    borderRadius: '0.85rem'
  },
  elements: {
    card: 'bg-slate-950/90 backdrop-blur-xl border border-slate-800/80 shadow-2xl shadow-indigo-950/40 rounded-2xl p-6 sm:p-8',
    headerTitle: 'text-xl font-bold text-slate-100 tracking-tight',
    headerSubtitle: 'text-xs text-slate-400',
    socialButtonsBlockButton: 'bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-medium py-2.5 rounded-xl transition-all shadow-sm',
    socialButtonsBlockButtonText: 'text-xs font-semibold text-slate-200',
    dividerLine: 'bg-slate-800',
    dividerText: 'text-xs text-slate-500 font-medium',
    formFieldLabel: 'text-xs font-medium text-slate-300',
    formFieldInput: 'bg-slate-900 border-slate-700/80 text-slate-100 placeholder-slate-500 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm py-2.5',
    formButtonPrimary: 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all text-sm',
    footerActionLink: 'text-indigo-400 hover:text-indigo-300 font-semibold text-xs transition-colors',
    identityPreview: 'bg-slate-900 border border-slate-800 rounded-xl',
    userButtonAvatarBox: 'w-9 h-9 ring-2 ring-indigo-500/50 hover:ring-indigo-400 transition-all shadow-md shadow-indigo-500/20'
  }
};

export function ClerkWrapper({ children }) {
  if (!isClerkConfigured) {
    // Graceful fallback context when key is not yet set
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} appearance={clerkAppearance}>
      {children}
    </ClerkProvider>
  );
}

export default ClerkWrapper;
