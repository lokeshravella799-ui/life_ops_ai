const toolRegistry = require('../tools/toolRegistry');
const toolExecutionService = require('../services/toolExecutionService');
const db = require('../config/supabase');

class ToolController {
  /**
   * List all registered tools and their capabilities
   */
  async listTools(req, res, next) {
    try {
      const tools = toolRegistry.listTools();
      const capabilities = toolRegistry.listCapabilities();
      return res.status(200).json({
        success: true,
        tools,
        capabilities
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Execute a tool on behalf of the authenticated user
   */
  async executeTool(req, res, next) {
    try {
      const userId = req.user?.id;
      const { toolName, parameters = {}, workflowId = null } = req.body;

      if (!toolName) {
        return res.status(400).json({
          error: 'BAD_REQUEST',
          message: 'toolName is required in request body.'
        });
      }

      const result = await toolExecutionService.executeTool(toolName, parameters, {
        userId,
        workflowId
      });

      if (!result.success && result.errorCode === 'TOOL_NOT_FOUND') {
        return res.status(404).json(result);
      }

      if (!result.success && result.errorCode === 'INVALID_TOOL_INPUT') {
        return res.status(422).json(result);
      }

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get action requests for a workflow
   */
  async getWorkflowActions(req, res, next) {
    try {
      const userId = req.user?.id;
      const { id: workflowId } = req.params;

      const actions = await db.getActionRequestsByWorkflowId(workflowId, userId);
      return res.status(200).json({
        success: true,
        workflowId,
        actions
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Confirm and execute a pending action request
   */
  async confirmAction(req, res, next) {
    try {
      const userId = req.user?.id;
      const { actionId } = req.params;

      const result = await toolExecutionService.confirmActionRequest(actionId, userId);
      return res.status(200).json({
        success: true,
        message: 'Action confirmed and executed successfully',
        ...result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ToolController();
