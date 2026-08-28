import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import GoalsPage from './pages/GoalsPage';
import WorkflowDetailPage from './pages/WorkflowDetailPage';
import TasksPage from './pages/TasksPage';
import MemoriesPage from './pages/MemoriesPage';
import DocumentsPage from './pages/DocumentsPage';
import BusinessPage from './pages/BusinessPage';
import ActivityPage from './pages/ActivityPage';

function LayoutRoute({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>
        {children}
      </AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public Auth Routes (Supports Clerk path routing & SSO callbacks) */}
      <Route path="/login/*" element={<LoginPage />} />
      <Route path="/register/*" element={<RegisterPage />} />

      {/* Protected App Routes */}
      <Route path="/" element={<LayoutRoute><HomePage /></LayoutRoute>} />
      <Route path="/goals" element={<LayoutRoute><GoalsPage /></LayoutRoute>} />
      <Route path="/goals/:id" element={<LayoutRoute><WorkflowDetailPage /></LayoutRoute>} />
      <Route path="/workflows/:id" element={<LayoutRoute><WorkflowDetailPage /></LayoutRoute>} />
      <Route path="/tasks" element={<LayoutRoute><TasksPage /></LayoutRoute>} />
      <Route path="/memories" element={<LayoutRoute><MemoriesPage /></LayoutRoute>} />
      <Route path="/documents" element={<LayoutRoute><DocumentsPage /></LayoutRoute>} />
      <Route path="/business" element={<LayoutRoute><BusinessPage /></LayoutRoute>} />
      <Route path="/activity" element={<LayoutRoute><ActivityPage /></LayoutRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
