const artifactService = require('../services/artifactService');

class ArtifactController {
  /**
   * List all artifacts for the authenticated user
   */
  async getUserArtifacts(req, res, next) {
    try {
      const userId = req.user?.id;
      const artifacts = await artifactService.getArtifactsByUserId(userId);
      return res.status(200).json({
        success: true,
        artifacts
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * List all artifacts for a specific workflow
   */
  async getWorkflowArtifacts(req, res, next) {
    try {
      const userId = req.user?.id;
      const { id: workflowId } = req.params;

      const artifacts = await artifactService.getArtifactsByWorkflowId(workflowId, userId);
      return res.status(200).json({
        success: true,
        workflowId,
        artifacts
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get artifact metadata by ID
   */
  async getArtifactById(req, res, next) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const artifact = await artifactService.getArtifactById(id, userId);
      if (!artifact) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Artifact not found or unauthorized.'
        });
      }

      return res.status(200).json({
        success: true,
        artifact
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Download raw artifact file content (stream binary or text)
   */
  async downloadArtifact(req, res, next) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const artifactResult = await artifactService.getArtifactBuffer(id, userId);
      if (!artifactResult) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Artifact not found or unauthorized.'
        });
      }

      const { artifact, buffer } = artifactResult;

      res.setHeader('Content-Type', artifact.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${artifact.filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ArtifactController();
