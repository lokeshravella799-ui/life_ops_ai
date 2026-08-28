const db = require('../config/supabase');
const logger = require('../utils/logger');
const env = require('../config/env');
const orchestratorAgent = require('../agents/orchestratorAgent');
const memoryAgent = require('../agents/memoryAgent');
const researchAgent = require('../agents/researchAgent');
const plannerAgent = require('../agents/plannerAgent');
const decisionAgent = require('../agents/decisionAgent');
const executionAgent = require('../agents/executionAgent');
const verificationAgent = require('../agents/verificationAgent');

class WorkflowEngine {
  /**
   * Run full dynamic multi-agent workflow
   */
  async orchestrateGoal({ userId, goalText, category = 'PERSONAL', targetDays, dailyHours, existingGoalId = null, idempotencyKey = null }) {
    const workflowStartTime = Date.now();
    logger.info(`🚀 [WorkflowEngine] Starting Orchestration for user ${userId}: "${goalText}"`);

    console.log('\n=================== [LIFEOPS AI DIAGNOSTIC TRACE] ===================');
    console.log(`[DIAGNOSTIC] Incoming Goal: "${goalText}"`);
    console.log(`[DIAGNOSTIC] Category Hint: "${category}"`);
    console.log(`[DIAGNOSTIC] Gemini Configured: ${Boolean(env.GEMINI_API_KEY)} | Model: "${env.GEMINI_MODEL || 'gemini-1.5-flash'}"`);
    console.log('======================================================================\n');

    let goal = null;
    let workflow = null;

    try {
      // 1. Retrieve Active Memory Context
      await db.createActivityLog({
        user_id: userId,
        actor_type: 'ORCHESTRATOR',
        actor_name: 'Workflow Engine',
        action: 'WORKFLOW_STARTED',
        details: { goalText: goalText.slice(0, 100), idempotencyKey }
      });

      const memoryResult = await memoryAgent.getContextForUser(userId);
      const userMemories = memoryResult.data ? memoryResult.data.relevantMemories : [];

      await db.createActivityLog({
        user_id: userId,
        actor_type: 'AGENT',
        actor_name: 'Memory Agent',
        action: 'MEMORY_AGENT_COMPLETED',
        details: { memoriesCount: userMemories.length }
      });

      // 2. Orchestrator: Understand Goal & Dynamic Agent Selection
      const orchestratorResult = await orchestratorAgent.analyzeGoal(goalText, userMemories, category);
      if (!orchestratorResult.success) {
        throw new Error(`Orchestrator failed: ${orchestratorResult.error}`);
      }
      const orchestrationPlan = orchestratorResult.data;

      console.log('\n--- [DIAGNOSTIC: ORCHESTRATOR OUTPUT] ---');
      console.log(`Objective: "${orchestrationPlan.objective}"`);
      console.log(`Resolved Category: "${orchestrationPlan.category}"`);
      console.log(`Selected Agents: [${orchestrationPlan.requiredAgents.join(', ')}]`);
      console.log(`Constraints: ${JSON.stringify(orchestrationPlan.constraints)}`);
      console.log('-------------------------------------------\n');

      const effectiveDays = targetDays || orchestrationPlan.timelineDays || orchestrationPlan.timeline || 10;
      const effectiveHours = dailyHours || 3;
      const effectiveCategory = category || orchestrationPlan.category || 'PERSONAL';

      // 3. Create or Link Goal in Database
      if (existingGoalId) {
        goal = await db.getGoalById(existingGoalId, userId);
      }
      if (!goal) {
        goal = await db.createGoal({
          user_id: userId,
          title: orchestrationPlan.objective.slice(0, 100) + (orchestrationPlan.objective.length > 100 ? '...' : ''),
          description: goalText,
          category: effectiveCategory,
          target_date: new Date(Date.now() + effectiveDays * 24 * 60 * 60 * 1000).toISOString(),
          constraints: orchestrationPlan.constraints,
          status: 'ACTIVE'
        });
      }

      // 4. Create Workflow Record
      workflow = await db.createWorkflow({
        user_id: userId,
        goal_id: goal.id,
        title: `Execution Plan: ${goal.title}`,
        status: 'RUNNING',
        summary: orchestrationPlan.executionPlan,
        verification_status: 'PENDING'
      });

      const agentTraces = [];
      let orderIndex = 1;

      // Record Memory Agent Run
      const memRecord = await db.createWorkflowAgent({
        workflow_id: workflow.id,
        agent_name: 'Memory Agent',
        agent_role: 'Personal Context Retrieval & Preference Injection',
        order_index: orderIndex++,
        status: 'COMPLETED',
        input_data: { userId },
        output_data: memoryResult.data,
        summary: `Retrieved ${userMemories.length} active preferences & habit constraints.`,
        execution_time_ms: memoryResult.executionTimeMs
      });
      agentTraces.push(memRecord);

      // Record Orchestrator Agent Run
      const orchAgentRecord = await db.createWorkflowAgent({
        workflow_id: workflow.id,
        agent_name: 'Orchestrator Agent',
        agent_role: 'Goal Understanding & Capability Mapping',
        order_index: orderIndex++,
        status: 'COMPLETED',
        input_data: { goalText, userMemories },
        output_data: orchestrationPlan,
        summary: `Activated ${orchestrationPlan.requiredAgents.length} specialized agents: ${orchestrationPlan.requiredAgents.join(' → ')}.`,
        execution_time_ms: orchestratorResult.executionTimeMs
      });
      agentTraces.push(orchAgentRecord);

      await db.createActivityLog({
        user_id: userId,
        workflow_id: workflow.id,
        actor_type: 'AGENT',
        actor_name: 'Orchestrator Agent',
        action: 'ORCHESTRATOR_COMPLETED',
        details: { requiredAgents: orchestrationPlan.requiredAgents }
      });

      // 5. Conditionally Run Research Agent
      let researchResult = { data: { keyTopics: [], facts: [], assumptions: [], risks: [], recommendations: [] }, executionTimeMs: 0 };
      if (orchestrationPlan.requiredAgents.includes('RESEARCH')) {
        researchResult = await researchAgent.conductResearch(
          orchestrationPlan.objective,
          effectiveCategory,
          orchestrationPlan.constraints
        );

        console.log('\n--- [DIAGNOSTIC: RESEARCH OUTPUT] ---');
        console.log(`Key Topics: ${JSON.stringify(researchResult.data.keyTopics)}`);
        console.log(`Recommendations: ${JSON.stringify(researchResult.data.recommendations)}`);
        console.log('--------------------------------------\n');

        const resRecord = await db.createWorkflowAgent({
          workflow_id: workflow.id,
          agent_name: 'Research Agent',
          agent_role: 'Domain Context & Topic Decomposition',
          order_index: orderIndex++,
          status: researchResult.success ? 'COMPLETED' : 'FAILED',
          input_data: { objective: orchestrationPlan.objective, constraints: orchestrationPlan.constraints },
          output_data: researchResult.data,
          summary: `Extracted ${researchResult.data.keyTopics?.length || 0} core topics, ${researchResult.data.facts?.length || 0} facts, and ${researchResult.data.assumptions?.length || 0} assumptions.`,
          execution_time_ms: researchResult.executionTimeMs
        });
        agentTraces.push(resRecord);

        await db.createActivityLog({
          user_id: userId,
          workflow_id: workflow.id,
          actor_type: 'AGENT',
          actor_name: 'Research Agent',
          action: 'RESEARCH_COMPLETED',
          details: { topicsCount: researchResult.data.keyTopics?.length || 0 }
        });
      }

      // 6. Conditionally Run Planner Agent
      let plannerResult = { data: { schedule: [] }, executionTimeMs: 0 };
      if (orchestrationPlan.requiredAgents.includes('PLANNER')) {
        plannerResult = await plannerAgent.createPlan({
          goalObjective: orchestrationPlan.objective,
          totalDays: effectiveDays,
          dailyHours: effectiveHours,
          researchFindings: researchResult.data
        });

        console.log('\n--- [DIAGNOSTIC: PLANNER OUTPUT] ---');
        console.log(`Total Days: ${plannerResult.data.totalDays}`);
        console.log(`Milestone Days Count: ${plannerResult.data.schedule?.length}`);
        if (plannerResult.data.schedule?.length > 0) {
          console.log(`Day 1 Theme: "${plannerResult.data.schedule[0].theme}"`);
          console.log(`Day 1 Tasks: ${JSON.stringify(plannerResult.data.schedule[0].tasks.map(t => t.title))}`);
        }
        console.log('-------------------------------------\n');

        const planRecord = await db.createWorkflowAgent({
          workflow_id: workflow.id,
          agent_name: 'Planner Agent',
          agent_role: 'Milestone Scheduling & Task Dependency Graphing',
          order_index: orderIndex++,
          status: plannerResult.success ? 'COMPLETED' : 'FAILED',
          input_data: { totalDays: effectiveDays, dailyHours: effectiveHours },
          output_data: plannerResult.data,
          summary: `Created ${plannerResult.data.schedule?.length || 0}-day milestone roadmap with task dependencies.`,
          execution_time_ms: plannerResult.executionTimeMs
        });
        agentTraces.push(planRecord);

        await db.createActivityLog({
          user_id: userId,
          workflow_id: workflow.id,
          actor_type: 'AGENT',
          actor_name: 'Planner Agent',
          action: 'PLANNER_COMPLETED',
          details: { daysPlanned: plannerResult.data.schedule?.length || 0 }
        });
      }

      // 7. Conditionally Run Decision Agent
      let decisionResult = { data: { prioritizationRationale: 'Standard', prioritizedTasks: [] }, executionTimeMs: 0 };
      if (orchestrationPlan.requiredAgents.includes('DECISION')) {
        decisionResult = await decisionAgent.evaluateAndPrioritize({
          goalObjective: orchestrationPlan.objective,
          schedule: plannerResult.data.schedule,
          constraints: orchestrationPlan.constraints
        });

        const decRecord = await db.createWorkflowAgent({
          workflow_id: workflow.id,
          agent_name: 'Decision Agent',
          agent_role: 'Trade-off Evaluation & Prioritization Optimization',
          order_index: orderIndex++,
          status: decisionResult.success ? 'COMPLETED' : 'FAILED',
          input_data: { scheduleCount: plannerResult.data.schedule?.length },
          output_data: decisionResult.data,
          summary: `Prioritized ${decisionResult.data.prioritizedTasks?.length || 0} tasks: ${decisionResult.data.prioritizationRationale?.slice(0, 80)}...`,
          execution_time_ms: decisionResult.executionTimeMs
        });
        agentTraces.push(decRecord);

        await db.createActivityLog({
          user_id: userId,
          workflow_id: workflow.id,
          actor_type: 'AGENT',
          actor_name: 'Decision Agent',
          action: 'DECISION_COMPLETED',
          details: { prioritizedCount: decisionResult.data.prioritizedTasks?.length || 0 }
        });
      }

      // 8. Run Execution Agent & Tool Execution Engine
      let executionResult = await executionAgent.synthesizeTasks({
        goalObjective: orchestrationPlan.objective,
        category: effectiveCategory,
        schedule: plannerResult.data.schedule,
        taskPriorities: decisionResult.data.prioritizedTasks,
        requiredTools: orchestrationPlan.requiredTools || [],
        researchFindings: researchResult.data,
        userId,
        workflowId: workflow.id
      });

      console.log('\n--- [DIAGNOSTIC: EXECUTION OUTPUT] ---');
      console.log(`Tasks Synthesized Count: ${executionResult.data.executableTasks?.length}`);
      console.log(`Tools Executed Count: ${executionResult.data.actions?.length || 0}`);
      console.log(`Artifacts Generated Count: ${executionResult.data.generatedArtifacts?.length || 0}`);
      console.log(`Sample Task 1: ${JSON.stringify(executionResult.data.executableTasks?.[0]?.title)}`);
      console.log('---------------------------------------\n');

      const execRecord = await db.createWorkflowAgent({
        workflow_id: workflow.id,
        agent_name: 'Execution Agent',
        agent_role: 'Action Item Generation, Tool Orchestration & Database Entity Synthesis',
        order_index: orderIndex++,
        status: executionResult.success ? 'COMPLETED' : 'FAILED',
        input_data: { schedule: plannerResult.data.schedule, requiredTools: orchestrationPlan.requiredTools },
        output_data: executionResult.data,
        summary: `Synthesized ${executionResult.data.executableTasks?.length || 0} tasks and executed ${executionResult.data.actions?.length || 0} tools (${executionResult.data.generatedArtifacts?.length || 0} artifacts).`,
        execution_time_ms: executionResult.executionTimeMs
      });
      agentTraces.push(execRecord);

      await db.createActivityLog({
        user_id: userId,
        workflow_id: workflow.id,
        actor_type: 'AGENT',
        actor_name: 'Execution Agent',
        action: 'EXECUTION_COMPLETED',
        details: {
          taskEntitiesSynthesized: executionResult.data.executableTasks?.length || 0,
          artifactsCount: executionResult.data.generatedArtifacts?.length || 0
        }
      });

      // 9. Run Verification Agent (with 2-loop self-correction feedback)
      let verificationResult = await verificationAgent.verifyWorkflow({
        goalObjective: orchestrationPlan.objective,
        constraints: orchestrationPlan.constraints,
        researchOutput: researchResult.data,
        plannerOutput: plannerResult.data,
        executableTasks: executionResult.data.executableTasks,
        generatedArtifacts: executionResult.data.generatedArtifacts || [],
        toolActions: executionResult.data.actions || []
      });

      let loopCount = 0;
      const MAX_VERIFICATION_LOOPS = 2;

      while (verificationResult.data.status === 'NEEDS_REVISION' && loopCount < MAX_VERIFICATION_LOOPS) {
        loopCount++;
        logger.warn(`⚠️ [WorkflowEngine] Verification loop ${loopCount}: ${verificationResult.data.feedback}. Re-planning...`);

        plannerResult = await plannerAgent.createPlan({
          goalObjective: `${orchestrationPlan.objective} (Feedback: ${verificationResult.data.feedback})`,
          totalDays: effectiveDays,
          dailyHours: effectiveHours,
          researchFindings: researchResult.data
        });

        executionResult = await executionAgent.synthesizeTasks({
          goalObjective: orchestrationPlan.objective,
          category: effectiveCategory,
          schedule: plannerResult.data.schedule,
          taskPriorities: decisionResult.data.prioritizedTasks,
          requiredTools: orchestrationPlan.requiredTools || [],
          researchFindings: researchResult.data,
          userId,
          workflowId: workflow.id
        });

        verificationResult = await verificationAgent.verifyWorkflow({
          goalObjective: orchestrationPlan.objective,
          constraints: orchestrationPlan.constraints,
          researchOutput: researchResult.data,
          plannerOutput: plannerResult.data,
          executableTasks: executionResult.data.executableTasks,
          generatedArtifacts: executionResult.data.generatedArtifacts || [],
          toolActions: executionResult.data.actions || []
        });
      }

      console.log('\n--- [DIAGNOSTIC: VERIFICATION OUTPUT] ---');
      console.log(`Status: "${verificationResult.data.status}"`);
      console.log(`Score: ${verificationResult.data.score}/100`);
      console.log(`Feedback: "${verificationResult.data.feedback}"`);
      console.log('-----------------------------------------\n');

      const verRecord = await db.createWorkflowAgent({
        workflow_id: workflow.id,
        agent_name: 'Verification Agent',
        agent_role: 'Feasibility, Completeness & Artifact Integrity Verification',
        order_index: orderIndex++,
        status: 'COMPLETED',
        input_data: { taskCount: executionResult.data.executableTasks?.length },
        output_data: verificationResult.data,
        summary: `Verification Status: ${verificationResult.data.status} (Score: ${verificationResult.data.score}/100). Feedback: ${verificationResult.data.feedback?.slice(0, 80)}...`,
        execution_time_ms: verificationResult.executionTimeMs
      });
      agentTraces.push(verRecord);

      // 10. Persist Generated Tasks to Supabase
      const createdTasks = [];
      const titleToTaskIdMap = new Map();

      for (let i = 0; i < executionResult.data.executableTasks.length; i++) {
        const item = executionResult.data.executableTasks[i];
        const taskRecord = await db.createTask({
          workflow_id: workflow.id,
          goal_id: goal.id,
          user_id: userId,
          title: item.title,
          description: item.description,
          status: 'TODO',
          priority: item.priority || 'MEDIUM',
          day_number: item.dayNumber || 1,
          order_index: i + 1,
          estimated_minutes: item.estimatedMinutes || (effectiveHours * 60),
          due_date: item.dueDate || null,
          notes: item.notes || `Allocated for Day ${item.dayNumber || 1}`
        });

        titleToTaskIdMap.set(item.title, taskRecord.id);
        createdTasks.push(taskRecord);
      }

      // Fetch workflow artifacts from database
      const persistedArtifacts = await db.getArtifactsByWorkflowId(workflow.id, userId);

      // 11. Finalize and Update Workflow Status
      const finalStatus = verificationResult.data.status === 'VERIFIED' ? 'COMPLETED' : 'FAILED';
      workflow = await db.updateWorkflow(workflow.id, {
        status: finalStatus,
        verification_status: verificationResult.data.status,
        result_data: {
          category: effectiveCategory,
          totalDays: effectiveDays,
          dailyHours: effectiveHours,
          verificationScore: verificationResult.data.score,
          verificationFeedback: verificationResult.data.feedback,
          tasksCount: createdTasks.length,
          artifactsCount: persistedArtifacts.length
        }
      });

      await db.createActivityLog({
        user_id: userId,
        workflow_id: workflow.id,
        actor_type: 'ORCHESTRATOR',
        actor_name: 'Workflow Engine',
        action: 'WORKFLOW_COMPLETED',
        details: { workflowId: workflow.id, tasksCount: createdTasks.length, verificationStatus: verificationResult.data.status }
      });

      const totalWorkflowTimeMs = Date.now() - workflowStartTime;
      logger.info(`✨ [WorkflowEngine] Orchestration finished in ${totalWorkflowTimeMs}ms. Status: ${finalStatus}.`);

      return {
        workflowId: workflow.id,
        goalId: goal.id,
        status: finalStatus,
        verificationStatus: verificationResult.data.status,
        summary: workflow.summary,
        workflow,
        goal,
        tasks: createdTasks,
        agents: agentTraces,
        artifacts: persistedArtifacts,
        actions: executionResult.data.actions || [],
        plan: {
          schedule: plannerResult.data.schedule,
          totalDays: effectiveDays,
          dailyHours: effectiveHours,
          verification: verificationResult.data
        },
        verification: verificationResult.data
      };
    } catch (err) {
      logger.error(`❌ [WorkflowEngine] Orchestration fatal failure: ${err.message}`);
      if (workflow) {
        await db.updateWorkflow(workflow.id, {
          status: 'FAILED',
          verification_status: 'FAILED'
        });
      }
      throw err;
    }
  }
}

module.exports = new WorkflowEngine();
