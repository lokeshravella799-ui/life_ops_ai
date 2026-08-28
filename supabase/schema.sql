-- ==============================================================================
-- LIFEOPS AI - PostgreSQL Schema for Supabase with Row Level Security (RLS)
-- Uses Supabase Auth (auth.users) -> profiles
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Linked directly to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    full_name VARCHAR(150),
    role VARCHAR(100) DEFAULT 'User',
    interests TEXT[] DEFAULT '{}',
    preferred_study_time VARCHAR(100) DEFAULT 'Evening (6 PM - 9 PM)',
    preferences JSONB DEFAULT '{"maxHoursPerDay": 3, "notifications": true, "focusAreas": ["Academics", "Projects"]}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. GOALS TABLE
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'PERSONAL', -- 'STUDY', 'PROJECT', 'TRAVEL', 'DECISION', 'DOCUMENT', 'BUSINESS', 'PERSONAL'
    target_date TIMESTAMP WITH TIME ZONE,
    constraints JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. WORKFLOWS TABLE
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'NEEDS_REVISION', 'ADAPTED'
    execution_mode VARCHAR(50) DEFAULT 'AUTOMATIC',
    summary TEXT,
    result_data JSONB DEFAULT '{}'::jsonb,
    verification_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'VERIFIED', 'NEEDS_REVISION', 'FAILED'
    verification_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. WORKFLOW_AGENTS TABLE (Dynamic Agent Execution Trace)
CREATE TABLE IF NOT EXISTS public.workflow_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    agent_name VARCHAR(100) NOT NULL,
    agent_role VARCHAR(100) NOT NULL,
    order_index INT NOT NULL,
    status VARCHAR(50) DEFAULT 'WAITING', -- 'WAITING', 'RUNNING', 'COMPLETED', 'FAILED', 'NEEDS_REVISION'
    input_data JSONB DEFAULT '{}'::jsonb,
    output_data JSONB DEFAULT '{}'::jsonb,
    summary TEXT,
    execution_time_ms INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(50) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    status VARCHAR(50) DEFAULT 'TODO', -- 'TODO', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'
    day_number INT,
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_minutes INT DEFAULT 60,
    actual_minutes INT DEFAULT 0,
    notes TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TASK_DEPENDENCIES TABLE
CREATE TABLE IF NOT EXISTS public.task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. MEMORIES TABLE (Context & Preferences Store)
CREATE TABLE IF NOT EXISTS public.memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category VARCHAR(100) DEFAULT 'GENERAL', -- 'STUDY_HABIT', 'SCHEDULE_PREFERENCE', 'TECH_STACK', 'GENERAL'
    key_tag VARCHAR(100),
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. DOCUMENTS TABLE (Extracted Text & Workflows)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    raw_content TEXT NOT NULL,
    extracted_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. ACTIVITY_LOGS TABLE (Real-time Audit Feed)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
    actor_type VARCHAR(50) NOT NULL, -- 'ORCHESTRATOR', 'AGENT', 'USER'
    actor_name VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. PLAN_REVISIONS TABLE (Adaptive Replanning Diffs)
CREATE TABLE IF NOT EXISTS public.plan_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    revision_number INT NOT NULL DEFAULT 1,
    change_reason TEXT NOT NULL,
    old_plan JSONB NOT NULL,
    new_plan JSONB NOT NULL,
    impact_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_goals_user ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_user ON public.workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_goal ON public.workflows(goal_id);
CREATE INDEX IF NOT EXISTS idx_workflow_agents_wf ON public.workflow_agents(workflow_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal ON public.tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_wf ON public.tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_memories_user ON public.memories(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_revisions_wf ON public.plan_revisions(workflow_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_revisions ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 2. Goals Policies
CREATE POLICY "Users can view own goals" ON public.goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON public.goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON public.goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON public.goals
    FOR DELETE USING (auth.uid() = user_id);

-- 3. Workflows Policies
CREATE POLICY "Users can view own workflows" ON public.workflows
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workflows" ON public.workflows
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflows" ON public.workflows
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workflows" ON public.workflows
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Workflow Agents Policies
CREATE POLICY "Users can view workflow agents for own workflows" ON public.workflow_agents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workflows
            WHERE workflows.id = workflow_agents.workflow_id
            AND workflows.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert workflow agents for own workflows" ON public.workflow_agents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workflows
            WHERE workflows.id = workflow_agents.workflow_id
            AND workflows.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update workflow agents for own workflows" ON public.workflow_agents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.workflows
            WHERE workflows.id = workflow_agents.workflow_id
            AND workflows.user_id = auth.uid()
        )
    );

-- 5. Tasks Policies
CREATE POLICY "Users can view own tasks" ON public.tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON public.tasks
    FOR DELETE USING (auth.uid() = user_id);

-- 6. Task Dependencies Policies
CREATE POLICY "Users can view task dependencies" ON public.task_dependencies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_dependencies.task_id
            AND tasks.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert task dependencies" ON public.task_dependencies
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_dependencies.task_id
            AND tasks.user_id = auth.uid()
        )
    );

-- 7. Memories Policies
CREATE POLICY "Users can view own memories" ON public.memories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories" ON public.memories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories" ON public.memories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories" ON public.memories
    FOR DELETE USING (auth.uid() = user_id);

-- 8. Documents Policies
CREATE POLICY "Users can view own documents" ON public.documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON public.documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON public.documents
    FOR DELETE USING (auth.uid() = user_id);

-- 9. Activity Logs Policies
CREATE POLICY "Users can view own activity logs" ON public.activity_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity logs" ON public.activity_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 10. Plan Revisions Policies
CREATE POLICY "Users can view own plan revisions" ON public.plan_revisions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plan revisions" ON public.plan_revisions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 11. TOOL_EXECUTIONS TABLE
CREATE TABLE IF NOT EXISTS public.tool_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    action_description TEXT,
    input_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    risk_level VARCHAR(50) NOT NULL DEFAULT 'LOW', -- 'LOW', 'MEDIUM', 'HIGH', 'EXTERNAL'
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED', -- 'COMPLETED', 'FAILED', 'PENDING_CONFIRMATION', 'REJECTED'
    duration_ms INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. ARTIFACTS TABLE
CREATE TABLE IF NOT EXISTS public.artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_execution_id UUID REFERENCES public.tool_executions(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    artifact_type VARCHAR(50) NOT NULL, -- 'PDF', 'DOCX', 'XLSX', 'MD', 'TXT', 'JSON'
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(150) NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes INT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    verification_status VARCHAR(50) DEFAULT 'VERIFIED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. ACTION_REQUESTS TABLE (Human-in-the-loop Confirmations)
CREATE TABLE IF NOT EXISTS public.action_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    risk_level VARCHAR(50) NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'EXTERNAL'
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'EXECUTED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for Phase 8 Tables
CREATE INDEX IF NOT EXISTS idx_tool_executions_user ON public.tool_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_executions_workflow ON public.tool_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_user ON public.artifacts(user_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_workflow ON public.artifacts(workflow_id);
CREATE INDEX IF NOT EXISTS idx_action_requests_user ON public.action_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_action_requests_status ON public.action_requests(status);

-- Enable RLS for Phase 8 Tables
ALTER TABLE public.tool_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Phase 8 Tables
CREATE POLICY "Users can view own tool executions" ON public.tool_executions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tool executions" ON public.tool_executions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own artifacts" ON public.artifacts
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own artifacts" ON public.artifacts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own artifacts" ON public.artifacts
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own action requests" ON public.action_requests
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own action requests" ON public.action_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own action requests" ON public.action_requests
    FOR UPDATE USING (auth.uid() = user_id);

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON SUPABASE SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'Member')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
