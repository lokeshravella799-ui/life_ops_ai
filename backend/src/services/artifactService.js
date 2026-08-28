const fs = require('fs');
const path = require('path');
const db = require('../config/supabase');
const logger = require('../utils/logger');

const STORAGE_DIR = path.resolve(__dirname, '../../storage/artifacts');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

class ArtifactService {
  /**
   * Save a generated file artifact to disk and register in database
   */
  async saveArtifactFile({
    userId,
    workflowId = null,
    toolExecutionId = null,
    name,
    artifactType,
    filename,
    mimeType,
    bufferOrString,
    metadata = {}
  }) {
    if (!userId) {
      throw new Error('userId is required to persist an artifact');
    }

    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const userStorageDir = path.join(STORAGE_DIR, userId);
    if (!fs.existsSync(userStorageDir)) {
      fs.mkdirSync(userStorageDir, { recursive: true });
    }

    const uniqueFilename = `${Date.now()}_${safeFilename}`;
    const filePath = path.join(userStorageDir, uniqueFilename);

    let fileSizeBytes = 0;
    if (Buffer.isBuffer(bufferOrString)) {
      fs.writeFileSync(filePath, bufferOrString);
      fileSizeBytes = bufferOrString.length;
    } else if (typeof bufferOrString === 'string') {
      fs.writeFileSync(filePath, bufferOrString, 'utf8');
      fileSizeBytes = Buffer.byteLength(bufferOrString, 'utf8');
    } else {
      const jsonStr = JSON.stringify(bufferOrString, null, 2);
      fs.writeFileSync(filePath, jsonStr, 'utf8');
      fileSizeBytes = Buffer.byteLength(jsonStr, 'utf8');
    }

    const artifactRecord = await db.createArtifact({
      workflow_id: workflowId,
      user_id: userId,
      tool_execution_id: toolExecutionId,
      name: name || safeFilename,
      artifact_type: artifactType,
      filename: uniqueFilename,
      mime_type: mimeType || 'application/octet-stream',
      file_path: filePath,
      file_size_bytes: fileSizeBytes,
      metadata,
      verification_status: 'VERIFIED'
    });

    logger.info(`💾 [ArtifactService] Created ${artifactType} artifact: "${safeFilename}" (${fileSizeBytes} bytes)`);
    return artifactRecord;
  }

  /**
   * Get artifact metadata by ID (tenant isolated)
   */
  async getArtifactById(id, userId) {
    return db.getArtifactById(id, userId);
  }

  /**
   * Get all artifacts for a workflow
   */
  async getArtifactsByWorkflowId(workflowId, userId) {
    return db.getArtifactsByWorkflowId(workflowId, userId);
  }

  /**
   * Get all artifacts for a user
   */
  async getArtifactsByUserId(userId) {
    return db.getArtifactsByUserId(userId);
  }

  /**
   * Read raw artifact buffer from disk (tenant isolated & path traversal protected)
   */
  async getArtifactBuffer(id, userId) {
    const artifact = await db.getArtifactById(id, userId);
    if (!artifact) {
      return null;
    }

    const resolvedPath = path.resolve(artifact.file_path);
    // Security check: Must reside within STORAGE_DIR
    if (!resolvedPath.startsWith(path.resolve(STORAGE_DIR))) {
      throw new Error('Access denied: Invalid artifact storage path');
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error('Artifact file missing from storage');
    }

    const buffer = fs.readFileSync(resolvedPath);
    return {
      artifact,
      buffer
    };
  }
}

module.exports = new ArtifactService();
