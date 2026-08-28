const toolRegistry = require('../tools/toolRegistry');
const db = require('../config/supabase');
const logger = require('../utils/logger');

class ToolExecutionService {
  /**
   * Helper to sanitize error logs to prevent leaking secrets/keys
   */
  sanitizeError(error) {
    if (!error) return 'Unknown execution error';
    let msg = error.message || String(error);
    msg = msg.replace(/(key|token|secret|authorization)=([^\s&]+)/gi, '$1=REDACTED');
    msg = msg.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
    return msg;
  }

  /**
   * Execute a registered tool safely with parameter validation and tenant isolation
   */
  async executeTool(toolName, inputParams = {}, context = {}) {
    const startTime = Date.now();
    const normalizedName = (toolName || '').toUpperCase();
    const userId = context.userId || 'system_user';
    const workflowId = context.workflowId || null;

    logger.info(`🛠️ [ToolExecutionService] Preparing execution for tool "${normalizedName}" for user: ${userId}`);

    const tool = toolRegistry.getTool(normalizedName);
    if (!tool) {
      const durationMs = Date.now() - startTime;
      logger.error(`❌ [ToolExecutionService] Tool not found: "${normalizedName}"`);
      return {
        success: false,
        tool: normalizedName,
        errorCode: 'TOOL_NOT_FOUND',
        safeMessage: `The requested tool "${normalizedName}" is not registered in the LifeOps AI tool catalog.`,
        durationMs
      };
    }

    // 1. Input Schema Validation
    let validatedInput = inputParams;
    if (tool.inputSchema) {
      const parseResult = tool.inputSchema.safeParse(inputParams);
      if (!parseResult.success) {
        const durationMs = Date.now() - startTime;
        logger.warn(`⚠️ [ToolExecutionService] Input validation failed for ${normalizedName}:`, parseResult.error.format());
        return {
          success: false,
          tool: normalizedName,
          errorCode: 'INVALID_TOOL_INPUT',
          safeMessage: `Input parameters failed validation for tool "${normalizedName}".`,
          details: parseResult.error.errors,
          durationMs
        };
      }
      validatedInput = parseResult.data;
    }

    // 2. Human Confirmation Check for HIGH / EXTERNAL Risk Actions
    const isHighRisk = tool.riskLevel === 'HIGH' || tool.riskLevel === 'EXTERNAL';
    if ((isHighRisk || tool.requiresConfirmation) && !context.isConfirmed) {
      logger.info(`🛑 [ToolExecutionService] Tool "${normalizedName}" requires human confirmation. Creating action request...`);

      const actionRequest = await db.createActionRequest({
        workflow_id: workflowId,
        user_id: userId,
        tool_name: normalizedName,
        action_type: tool.capability || 'ACTION',
        description: `Execution of ${normalizedName} requires explicit user approval.`,
        parameters: validatedInput,
        risk_level: tool.riskLevel || 'HIGH',
        status: 'PENDING'
      });

      await db.createActivityLog({
        user_id: userId,
        workflow_id: workflowId,
        actor_type: 'TOOL',
        actor_name: normalizedName,
        action: 'ACTION_CONFIRMATION_REQUIRED',
        details: { tool: normalizedName, actionRequestId: actionRequest.id }
      });

      return {
        success: true,
        tool: normalizedName,
        requiresConfirmation: true,
        actionRequestId: actionRequest.id,
        actionRequest,
        status: 'PENDING_CONFIRMATION',
        durationMs: Date.now() - startTime
      };
    }

    // 3. Tool Execution
    try {
      console.log(`[DIAGNOSTIC: TOOL] Executing ${normalizedName}...`);
      const executionResult = await tool.execute(validatedInput, {
        userId,
        workflowId,
        ...context
      });

      const durationMs = Date.now() - startTime;

      // 4. Validate output schema if defined
      let validatedOutput = executionResult;
      if (tool.outputSchema) {
        const outputParsed = tool.outputSchema.safeParse(executionResult);
        if (outputParsed.success) {
          validatedOutput = outputParsed.data;
        }
      }

      // 5. Persist Tool Execution Record
      const executionRecord = await db.createToolExecution({
        workflow_id: workflowId,
        user_id: userId,
        tool_name: normalizedName,
        action_description: `Executed ${normalizedName} successfully.`,
        input_parameters: validatedInput,
        output_result: validatedOutput,
        risk_level: tool.riskLevel || 'LOW',
        status: 'COMPLETED',
        duration_ms: durationMs
      });

      await db.createActivityLog({
        user_id: userId,
        workflow_id: workflowId,
        actor_type: 'TOOL',
        actor_name: normalizedName,
        action: 'TOOL_COMPLETED',
        details: { tool: normalizedName, durationMs, executionId: executionRecord.id }
      });

      logger.info(`✅ [ToolExecutionService] Tool "${normalizedName}" finished in ${durationMs}ms.`);

      return {
        success: true,
        tool: normalizedName,
        executionId: executionRecord.id,
        result: validatedOutput,
        artifacts: validatedOutput?.artifactId ? [validatedOutput] : [],
        durationMs
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const sanitized = this.sanitizeError(err);
      logger.error(`❌ [ToolExecutionService] Tool "${normalizedName}" execution failed in ${durationMs}ms: ${sanitized}`);

      const executionRecord = await db.createToolExecution({
        workflow_id: workflowId,
        user_id: userId,
        tool_name: normalizedName,
        action_description: `Failed executing ${normalizedName}.`,
        input_parameters: validatedInput,
        output_result: { error: sanitized },
        risk_level: tool.riskLevel || 'LOW',
        status: 'FAILED',
        duration_ms: durationMs,
        error_message: sanitized
      });

      return {
        success: false,
        tool: normalizedName,
        executionId: executionRecord.id,
        errorCode: 'TOOL_EXECUTION_FAILED',
        safeMessage: `Execution failed for tool "${normalizedName}": ${sanitized}`,
        durationMs
      };
    }
  }

  /**
   * Confirm and execute a pending action request
   */
  async confirmActionRequest(actionRequestId, userId) {
    const actionReq = await db.getActionRequestById(actionRequestId, userId);
    if (!actionReq) {
      throw new Error('Action request not found or unauthorized');
    }

    if (actionReq.status !== 'PENDING') {
      throw new Error(`Action request is already ${actionReq.status}`);
    }

    // Execute the confirmed tool
    const execResult = await this.executeTool(actionReq.tool_name, actionReq.parameters, {
      userId,
      workflowId: actionReq.workflow_id,
      isConfirmed: true
    });

    await db.updateActionRequest(actionRequestId, userId, {
      status: execResult.success ? 'EXECUTED' : 'FAILED',
      resolved_at: new Date().toISOString()
    });

    return {
      actionRequest: actionReq,
      executionResult: execResult
    };
  }
}

module.exports = new ToolExecutionService();
