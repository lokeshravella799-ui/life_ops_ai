const { createClient } = require('@supabase/supabase-js');
const env = require('./env');
const { v4: uuidv4 } = require('uuid');

// Check if valid Supabase configuration is present (use Local Store during testing)
const isTest = process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('test'));
const hasSupabaseConfig = !isTest && Boolean(
  env.SUPABASE_URL && 
  env.SUPABASE_URL.startsWith('http') && 
  (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY)
);

let supabase = null;

if (hasSupabaseConfig) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  supabase = createClient(env.SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  console.log('✅ Supabase Client initialized with remote database:', env.SUPABASE_URL);
} else {
  console.log('ℹ️ Running with Local Relational Mock Store (Set SUPABASE_URL & SUPABASE_ANON_KEY for remote Supabase).');
}

// In-Memory Relational Store to ensure zero-downtime execution and rapid testing
const memoryDb = {
  users: [],
  profiles: [],
  goals: [],
  workflows: [],
  workflow_agents: [],
  tasks: [],
  task_dependencies: [],
  memories: [],
  documents: [],
  activity_logs: [],
  plan_revisions: [],
  tool_executions: [],
  artifacts: [],
  action_requests: [],
  conversations: [],
  chat_messages: []
};

// Helper: Check if a database error is caused by missing tables or unmigrated schema
function isTableMissingError(error) {
  if (!error) return false;
  const msg = (error.message || error.details || error.hint || error.error_description || JSON.stringify(error)).toLowerCase();
  const code = error.code || '';
  return code === 'PGRST204' || 
         code === '42P01' || 
         code === 'PGRST116' ||
         msg.includes('could not find the table') || 
         msg.includes('schema cache') || 
         msg.includes('relation') ||
         msg.includes('does not exist');
}

// Unified database query helper that delegates to Supabase or Memory Store
const db = {
  isRemote: hasSupabaseConfig,
  client: supabase,
  memoryDb,

  // Unified Auth verification supporting Clerk JWT, Supabase, and Local Sessions
  async verifyAuthToken(token) {
    if (!token) return null;

    // 1. If Clerk or standard JWT token (3 parts base64-encoded)
    if (token.includes('.')) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          const userId = payload.sub || payload.user_id || payload.id;
          if (userId) {
            const email = payload.email || (payload.email_addresses && payload.email_addresses[0]?.email_address) || `${userId}@user.lifeops.ai`;
            let foundUser = memoryDb.users.find(u => u.id === userId || u.email.toLowerCase() === email.toLowerCase());
            if (!foundUser) {
              foundUser = {
                id: userId,
                email: email.toLowerCase().trim(),
                user_metadata: { full_name: payload.name || payload.first_name || 'LifeOps User' },
                created_at: new Date().toISOString()
              };
              memoryDb.users.push(foundUser);
              await this.createProfile({
                id: foundUser.id,
                email: foundUser.email,
                full_name: payload.name || payload.first_name || 'LifeOps User',
                role: 'Member'
              });
            }
            return foundUser;
          }
        }
      } catch (jwtErr) {
        // Fall through to remote/local verification
      }
    }

    if (hasSupabaseConfig && supabase) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) return user;
      } catch (err) {
        // Fall back to local
      }
    }

    // In local mock mode, tokens correspond to known created user UUIDs or valid session tokens
    const foundUser = memoryDb.users.find(u => u.id === token || u.email === token);
    if (foundUser) return foundUser;

    return null;
  },

  // User & Profile operations (Linked to auth.users)
  async createAuthUser(email, password, metadata = {}) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: metadata }
        });
        if (!error && data?.user) return data.user;
      } catch (err) {
        // Fall back
      }
    }
    const user = {
      id: uuidv4(),
      email: email.toLowerCase().trim(),
      user_metadata: metadata,
      created_at: new Date().toISOString()
    };
    memoryDb.users.push(user);
    
    // Auto create profile
    await this.createProfile({
      id: user.id,
      email: user.email,
      full_name: metadata.full_name || metadata.fullName || email.split('@')[0],
      role: metadata.role || 'Member'
    });
    return user;
  },

  async loginAuthUser(email, password) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (!error && data?.user) return data;
      } catch (err) {
        // Fall back
      }
    }
    let user = memoryDb.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      user = await this.createAuthUser(email, password, { full_name: email.split('@')[0] });
    }
    const profile = await this.getProfileByUserId(user.id);
    return {
      session: { access_token: user.id },
      user,
      profile
    };
  },

  async createProfile(profileData) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('profiles').insert([profileData]).select().single();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const profile = {
      id: profileData.id || uuidv4(),
      email: profileData.email,
      full_name: profileData.full_name || profileData.fullName || 'Member',
      role: profileData.role || 'Member',
      preferred_study_time: profileData.preferred_study_time || profileData.preferredStudyTime || 'Evening (6 PM - 9 PM)',
      preferences: profileData.preferences || { maxHoursPerDay: 3 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memoryDb.profiles.push(profile);
    return profile;
  },

  async getProfileByUserId(userId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else if (data) {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    let profile = memoryDb.profiles.find(p => p.id === userId);
    if (!profile) {
      profile = {
        id: userId,
        email: 'user@lifeops.ai',
        full_name: 'LifeOps User',
        role: 'Member',
        preferred_study_time: 'Evening (6 PM - 9 PM)',
        preferences: { maxHoursPerDay: 3 },
        created_at: new Date().toISOString()
      };
      memoryDb.profiles.push(profile);
    }
    return profile;
  },

  async updateProfile(userId, updates) {
    const dbUpdates = {};
    if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
    if (updates.full_name !== undefined) dbUpdates.full_name = updates.full_name;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.preferredStudyTime !== undefined) dbUpdates.preferred_study_time = updates.preferredStudyTime;
    if (updates.preferred_study_time !== undefined) dbUpdates.preferred_study_time = updates.preferred_study_time;
    if (updates.preferences !== undefined) dbUpdates.preferences = updates.preferences;
    if (updates.interests !== undefined) dbUpdates.interests = updates.interests;

    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('profiles').update(dbUpdates).eq('id', userId).select().single();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const idx = memoryDb.profiles.findIndex(p => p.id === userId);
    if (idx !== -1) {
      memoryDb.profiles[idx] = { ...memoryDb.profiles[idx], ...dbUpdates, updated_at: new Date().toISOString() };
      return memoryDb.profiles[idx];
    }
    return null;
  },

  // Goals operations
  async createGoal(goalData) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('goals').insert([goalData]).select().single();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const goal = { id: uuidv4(), ...goalData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    memoryDb.goals.push(goal);
    return goal;
  },

  async getGoalsByUserId(userId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data || [];
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.goals.filter(g => g.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getGoalById(id, userId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('goals').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else if (data) {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.goals.find(g => g.id === id && g.user_id === userId) || null;
  },

  async updateGoal(id, userId, updates) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('goals').update(updates).eq('id', id).eq('user_id', userId).select().single();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const idx = memoryDb.goals.findIndex(g => g.id === id && g.user_id === userId);
    if (idx !== -1) {
      memoryDb.goals[idx] = { ...memoryDb.goals[idx], ...updates, updated_at: new Date().toISOString() };
      return memoryDb.goals[idx];
    }
    return null;
  },

  async deleteGoal(id, userId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', userId);
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return true;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const idx = memoryDb.goals.findIndex(g => g.id === id && g.user_id === userId);
    if (idx !== -1) {
      memoryDb.goals.splice(idx, 1);
      memoryDb.tasks = memoryDb.tasks.filter(t => t.goal_id !== id);
      memoryDb.workflows = memoryDb.workflows.filter(w => w.goal_id !== id);
      return true;
    }
    return false;
  },

  // Workflows operations
  async createWorkflow(workflowData) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('workflows').insert([workflowData]).select().single();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const wf = { id: uuidv4(), ...workflowData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    memoryDb.workflows.push(wf);
    return wf;
  },

  async getWorkflowsByUserId(userId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('workflows').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data || [];
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.workflows.filter(w => w.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getWorkflowById(id, userId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('workflows').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else if (data) {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.workflows.find(w => w.id === id && w.user_id === userId) || null;
  },

  async updateWorkflow(id, userIdOrUpdates, possibleUpdates) {
    const updates = possibleUpdates !== undefined ? possibleUpdates : userIdOrUpdates;
    const userId = possibleUpdates !== undefined ? userIdOrUpdates : null;

    if (hasSupabaseConfig && supabase) {
      try {
        let query = supabase.from('workflows').update(updates).eq('id', id);
        if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query.select().single();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const idx = memoryDb.workflows.findIndex(w => w.id === id && (!userId || w.user_id === userId));
    if (idx !== -1) {
      memoryDb.workflows[idx] = { ...memoryDb.workflows[idx], ...updates, updated_at: new Date().toISOString() };
      return memoryDb.workflows[idx];
    }
    return null;
  },

  // Workflow Agents operations
  async createWorkflowAgent(agentData) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('workflow_agents').insert([agentData]).select().single();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const agent = { id: uuidv4(), ...agentData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    memoryDb.workflow_agents.push(agent);
    return agent;
  },

  async getWorkflowAgentsByWorkflowId(workflowId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('workflow_agents').select('*').eq('workflow_id', workflowId).order('order_index', { ascending: true });
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data || [];
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.workflow_agents.filter(wa => wa.workflow_id === workflowId).sort((a, b) => a.order_index - b.order_index);
  },

  // Tasks operations
  async createTask(taskData) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('tasks').insert([taskData]).select().single();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const task = { id: uuidv4(), ...taskData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    memoryDb.tasks.push(task);
    return task;
  },

  async createTasksBulk(tasksArray) {
    if (!tasksArray || tasksArray.length === 0) return [];
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('tasks').insert(tasksArray).select();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const created = tasksArray.map((t, idx) => ({
      id: uuidv4(),
      ...t,
      order_index: idx,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    memoryDb.tasks.push(...created);
    return created;
  },

  async getTasks(userId, filter = {}) {
    if (hasSupabaseConfig && supabase) {
      try {
        let query = supabase.from('tasks').select('*').eq('user_id', userId);
        if (filter.goal_id) query = query.eq('goal_id', filter.goal_id);
        if (filter.workflow_id) query = query.eq('workflow_id', filter.workflow_id);
        if (filter.status) query = query.eq('status', filter.status);
        if (filter.priority) query = query.eq('priority', filter.priority);
        const { data, error } = await query.order('day_number', { ascending: true }).order('order_index', { ascending: true });
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data || [];
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    let res = memoryDb.tasks.filter(t => t.user_id === userId);
    if (filter.goal_id) res = res.filter(t => t.goal_id === filter.goal_id);
    if (filter.workflow_id) res = res.filter(t => t.workflow_id === filter.workflow_id);
    if (filter.status) res = res.filter(t => t.status === filter.status);
    if (filter.priority) res = res.filter(t => t.priority === filter.priority);
    return res.sort((a, b) => (a.day_number || 0) - (b.day_number || 0) || (a.order_index || 0) - (b.order_index || 0));
  },

  async getTaskById(id, userId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('tasks').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else if (data) {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.tasks.find(t => t.id === id && t.user_id === userId) || null;
  },

  async updateTask(id, userId, updates) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).eq('user_id', userId).select().single();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const idx = memoryDb.tasks.findIndex(t => t.id === id && t.user_id === userId);
    if (idx !== -1) {
      memoryDb.tasks[idx] = { ...memoryDb.tasks[idx], ...updates, updated_at: new Date().toISOString() };
      return memoryDb.tasks[idx];
    }
    return null;
  },

  async deleteTask(id, userId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId);
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return true;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const idx = memoryDb.tasks.findIndex(t => t.id === id && t.user_id === userId);
    if (idx !== -1) {
      memoryDb.tasks.splice(idx, 1);
      return true;
    }
    return false;
  },

  // Task Dependencies operations
  async createTaskDependency(taskId, dependsOnTaskId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('task_dependencies').insert([{
          task_id: taskId,
          depends_on_task_id: dependsOnTaskId
        }]).select().single();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const dep = { id: uuidv4(), task_id: taskId, depends_on_task_id: dependsOnTaskId, created_at: new Date().toISOString() };
    memoryDb.task_dependencies.push(dep);
    return dep;
  },

  async getTaskDependencies(taskId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('task_dependencies').select('*').eq('task_id', taskId);
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data || [];
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.task_dependencies.filter(d => d.task_id === taskId);
  },

  // Plan Revisions operations
  async createPlanRevision(revisionData) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('plan_revisions').insert([revisionData]).select().single();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const rev = { id: uuidv4(), ...revisionData, created_at: new Date().toISOString() };
    memoryDb.plan_revisions.push(rev);
    return rev;
  },

  async getPlanRevisions(workflowId, userId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('plan_revisions').select('*').eq('workflow_id', workflowId).eq('user_id', userId).order('created_at', { ascending: false });
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data || [];
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.plan_revisions.filter(r => r.workflow_id === workflowId && r.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  // Memory operations
  async createMemory(memoryData) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('memories').insert([memoryData]).select().single();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const mem = { id: uuidv4(), ...memoryData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    memoryDb.memories.push(mem);
    return mem;
  },

  async getMemoriesByUserId(userId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('memories').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data || [];
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.memories.filter(m => m.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async deleteMemory(id, userId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { error } = await supabase.from('memories').delete().eq('id', id).eq('user_id', userId);
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return true;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const idx = memoryDb.memories.findIndex(m => m.id === id && m.user_id === userId);
    if (idx !== -1) {
      memoryDb.memories.splice(idx, 1);
      return true;
    }
    return false;
  },

  // Activity Logs operations
  async createActivityLog(logData) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('activity_logs').insert([logData]).select().single();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const log = { id: uuidv4(), ...logData, created_at: new Date().toISOString() };
    memoryDb.activity_logs.push(log);
    return log;
  },

  async getActivityLogsByUserId(userId, limit = 20) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('activity_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data || [];
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.activity_logs.filter(l => l.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
  },

  // Documents operations
  async createDocument(docData) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('documents').insert([docData]).select().single();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const doc = { id: uuidv4(), ...docData, created_at: new Date().toISOString() };
    memoryDb.documents.push(doc);
    return doc;
  },

  async getDocumentsByUserId(userId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('documents').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data || [];
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.documents.filter(d => d.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  // Tool Executions operations
  async createToolExecution(executionData) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('tool_executions').insert([executionData]).select().single();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const execution = { id: uuidv4(), ...executionData, created_at: new Date().toISOString() };
    memoryDb.tool_executions.push(execution);
    return execution;
  },

  async getToolExecutionsByUserId(userId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('tool_executions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data || [];
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.tool_executions.filter(t => t.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getToolExecutionsByWorkflowId(workflowId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('tool_executions').select('*').eq('workflow_id', workflowId).order('created_at', { ascending: true });
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data || [];
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.tool_executions.filter(t => t.workflow_id === workflowId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },

  // Artifacts operations
  async createArtifact(artifactData) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('artifacts').insert([artifactData]).select().single();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const artifact = { id: uuidv4(), ...artifactData, created_at: new Date().toISOString() };
    memoryDb.artifacts.push(artifact);
    return artifact;
  },

  async getArtifactsByUserId(userId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('artifacts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data || [];
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.artifacts.filter(a => a.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getArtifactsByWorkflowId(workflowId, userId = null) {
    if (hasSupabaseConfig && supabase) {
      try {
        let query = supabase.from('artifacts').select('*').eq('workflow_id', workflowId);
        if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data || [];
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.artifacts.filter(a => a.workflow_id === workflowId && (!userId || a.user_id === userId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getArtifactById(id, userId = null) {
    if (hasSupabaseConfig && supabase) {
      try {
        let query = supabase.from('artifacts').select('*').eq('id', id);
        if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query.maybeSingle();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else if (data) {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.artifacts.find(a => a.id === id && (!userId || a.user_id === userId)) || null;
  },

  // Action Requests operations (Human Confirmation)
  async createActionRequest(requestData) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('action_requests').insert([requestData]).select().single();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const request = { id: uuidv4(), ...requestData, status: requestData.status || 'PENDING', created_at: new Date().toISOString() };
    memoryDb.action_requests.push(request);
    return request;
  },

  async getActionRequestsByUserId(userId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('action_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data || [];
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.action_requests.filter(ar => ar.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getActionRequestsByWorkflowId(workflowId, userId = null) {
    if (hasSupabaseConfig && supabase) {
      try {
        let query = supabase.from('action_requests').select('*').eq('workflow_id', workflowId);
        if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data || [];
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.action_requests.filter(ar => ar.workflow_id === workflowId && (!userId || ar.user_id === userId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getActionRequestById(id, userId = null) {
    if (hasSupabaseConfig && supabase) {
      try {
        let query = supabase.from('action_requests').select('*').eq('id', id);
        if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query.maybeSingle();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else if (data) {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.action_requests.find(ar => ar.id === id && (!userId || ar.user_id === userId)) || null;
  },

  async updateActionRequest(id, userId, updates) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('action_requests').update(updates).eq('id', id).eq('user_id', userId).select().single();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const idx = memoryDb.action_requests.findIndex(ar => ar.id === id && ar.user_id === userId);
    if (idx !== -1) {
      memoryDb.action_requests[idx] = { ...memoryDb.action_requests[idx], ...updates, resolved_at: new Date().toISOString() };
      return memoryDb.action_requests[idx];
    }
    return null;
  },

  // ============================================================================
  // CONVERSATIONS & CHAT HISTORY OPERATIONS
  // ============================================================================
  async createConversation(data) {
    const convId = data.id || uuidv4();
    const convData = {
      id: convId,
      user_id: data.user_id || 'anonymous',
      title: data.title || 'New Conversation',
      mode: data.mode || 'CHAT',
      metadata: data.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (hasSupabaseConfig && supabase) {
      try {
        const { data: inserted, error } = await supabase.from('conversations').insert([convData]).select().single();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return inserted;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    memoryDb.conversations.unshift(convData);
    return convData;
  },

  async getConversationsByUserId(userId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('conversations').select('*').eq('user_id', userId || 'anonymous').order('updated_at', { ascending: false });
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data || [];
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.conversations
      .filter(c => !userId || c.user_id === userId || c.user_id === 'anonymous')
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  },

  async getConversationById(id, userId = null) {
    let conv = null;
    if (hasSupabaseConfig && supabase) {
      try {
        let query = supabase.from('conversations').select('*').eq('id', id);
        if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query.maybeSingle();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else if (data) {
          conv = data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    if (!conv) {
      conv = memoryDb.conversations.find(c => c.id === id) || null;
    }
    if (!conv) return null;

    // Load messages
    const messages = await this.getConversationMessages(id);
    return { ...conv, messages };
  },

  async deleteConversation(id, userId = null) {
    if (hasSupabaseConfig && supabase) {
      try {
        let query = supabase.from('conversations').delete().eq('id', id);
        if (userId) query = query.eq('user_id', userId);
        const { error } = await query;
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return true;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    const idx = memoryDb.conversations.findIndex(c => c.id === id);
    if (idx !== -1) {
      memoryDb.conversations.splice(idx, 1);
      memoryDb.chat_messages = memoryDb.chat_messages.filter(m => m.conversation_id !== id);
      return true;
    }
    return false;
  },

  async saveConversationMessages(conversationId, messagesArray, userId = null) {
    if (!messagesArray || messagesArray.length === 0) return [];
    
    // Ensure conversation exists or create it
    let conv = memoryDb.conversations.find(c => c.id === conversationId);
    if (!conv) {
      const firstUserMsg = messagesArray.find(m => m.role === 'user');
      const title = firstUserMsg ? (firstUserMsg.content || firstUserMsg.message || '').slice(0, 45) : 'New Conversation';
      conv = await this.createConversation({
        id: conversationId,
        user_id: userId || 'anonymous',
        title: title || 'New Conversation'
      });
    } else {
      conv.updated_at = new Date().toISOString();
      if (messagesArray.length > 0 && (!conv.title || conv.title === 'New Conversation')) {
        const firstUserMsg = messagesArray.find(m => m.role === 'user');
        if (firstUserMsg) {
          conv.title = (firstUserMsg.content || firstUserMsg.message || '').slice(0, 45);
        }
      }
    }

    const formattedMsgs = messagesArray.map(m => ({
      id: m.id || uuidv4(),
      conversation_id: conversationId,
      user_id: userId || 'anonymous',
      role: m.role,
      content: m.content || m.message || '',
      mode: m.mode || 'CHAT',
      title: m.title || null,
      code: m.code || null,
      sections: m.sections || [],
      suggested_actions: m.suggestedActions || m.suggested_actions || [],
      artifacts: m.artifacts || [],
      created_at: m.timestamp || m.created_at || new Date().toISOString()
    }));

    if (hasSupabaseConfig && supabase) {
      try {
        await supabase.from('chat_messages').delete().eq('conversation_id', conversationId);
        const { data, error } = await supabase.from('chat_messages').insert(formattedMsgs).select();
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }

    memoryDb.chat_messages = memoryDb.chat_messages.filter(m => m.conversation_id !== conversationId);
    memoryDb.chat_messages.push(...formattedMsgs);
    return formattedMsgs;
  },

  async getConversationMessages(conversationId) {
    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase.from('chat_messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
        if (error) {
          if (!isTableMissingError(error)) throw error;
        } else if (data && data.length > 0) {
          return data;
        }
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
      }
    }
    return memoryDb.chat_messages
      .filter(m => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }
};

module.exports = db;
