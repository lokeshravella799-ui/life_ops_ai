const test = require('node:test');
const assert = require('node:assert');
const { GeminiService, GeminiError } = require('../src/services/geminiService');
const { extractAndParseJSON } = require('../src/utils/jsonParser');
const {
  orchestratorOutputSchema,
  researchOutputSchema,
  plannerOutputSchema,
  decisionOutputSchema,
  executionOutputSchema,
  verificationOutputSchema
} = require('../src/validators/agentOutputSchemas');

// Helper to create mock Gemini model client
function createMockModel(responses) {
  let callCount = 0;
  return {
    getCallCount: () => callCount,
    generateContent: async () => {
      const resp = Array.isArray(responses) ? responses[callCount] || responses[responses.length - 1] : responses;
      callCount++;

      if (resp instanceof Error) {
        throw resp;
      }

      return {
        response: Promise.resolve({
          text: () => (typeof resp === 'string' ? resp : JSON.stringify(resp))
        })
      };
    }
  };
}

test('1. Valid Pure JSON Response Parsing', async () => {
  const raw = JSON.stringify({
    objective: 'DBMS Exam Prep',
    category: 'STUDY',
    timelineDays: 10,
    constraints: ['3 hours/day'],
    requiredAgents: ['RESEARCH', 'PLANNER'],
    executionPlan: 'Phased breakdown'
  });

  const parsed = extractAndParseJSON(raw);
  assert.strictEqual(parsed.objective, 'DBMS Exam Prep');
  assert.strictEqual(parsed.timelineDays, 10);
});

test('2. JSON inside Markdown Code Fences', async () => {
  const fenced = '```json\n{\n  "keyTopics": ["Relational Model", "SQL", "Transactions"],\n  "facts": ["Core exam syllabus"],\n  "assumptions": ["Basic CS knowledge"],\n  "risks": ["Time crunch"],\n  "recommendations": ["Do PYQs"]\n}\n```';
  
  const parsed = extractAndParseJSON(fenced);
  assert.strictEqual(parsed.keyTopics.length, 3);
  assert.strictEqual(parsed.keyTopics[0], 'Relational Model');
});

test('3. JSON with Surrounding Commentary Text', async () => {
  const surrounded = `Here is the requested verification report from the agent:
{
  "status": "VERIFIED",
  "score": 95,
  "feedback": "All 10 days satisfy the 3-hour constraint.",
  "missingItems": []
}
Hope this helps!`;

  const parsed = extractAndParseJSON(surrounded);
  assert.strictEqual(parsed.status, 'VERIFIED');
  assert.strictEqual(parsed.score, 95);
});

test('4. Invalid JSON Parsing Error Handling (no eval)', () => {
  assert.throws(
    () => {
      extractAndParseJSON('This response contains no JSON brackets whatsoever.');
    },
    (err) => {
      assert.strictEqual(err.code, 'GEMINI_INVALID_RESPONSE');
      return true;
    }
  );
});

test('5. Zod Validation Success with Orchestrator Schema', async () => {
  const service = new GeminiService();
  const mockPayload = {
    objective: 'Prepare for DBMS Exam in 10 days',
    category: 'STUDY',
    timelineDays: 10,
    constraints: ['3 hours per evening'],
    requiredAgents: ['RESEARCH', 'PLANNER', 'DECISION', 'EXECUTION', 'VERIFICATION'],
    executionPlan: 'Dynamic 5-stage coordination'
  };

  service.setMockClient(createMockModel(mockPayload));

  const result = await service.generateStructuredResponse({
    prompt: 'Plan DBMS',
    schema: orchestratorOutputSchema,
    schemaName: 'OrchestratorOutput'
  });

  assert.strictEqual(result.objective, 'Prepare for DBMS Exam in 10 days');
  assert.strictEqual(result.requiredAgents.length, 5);
});

test('6. Zod Validation Failure on Malformed Structure', async () => {
  const service = new GeminiService();
  // Missing required requiredAgents and executionPlan
  const invalidPayload = {
    objective: 'Prepare for DBMS'
  };

  service.setMockClient(createMockModel([invalidPayload, invalidPayload]));

  await assert.rejects(
    async () => {
      await service.generateStructuredResponse({
        prompt: 'Plan DBMS',
        schema: orchestratorOutputSchema,
        schemaName: 'OrchestratorOutput',
        maxRetries: 0
      });
    },
    (err) => {
      assert.strictEqual(err.code, 'GEMINI_SCHEMA_VALIDATION_FAILED');
      return true;
    }
  );
});

test('7. Automatic Retry after Transient Network Failure', async () => {
  const service = new GeminiService();
  const validOutput = {
    prioritizationRationale: 'Focus on high weightage topics',
    prioritizedTasks: [{ title: 'SQL Joins', priority: 'HIGH', rationale: 'Frequent questions' }]
  };

  // First call throws transient 429 rate limit error, second call succeeds
  const mockModel = createMockModel([
    new Error('429 Resource exhausted: Rate limit exceeded'),
    JSON.stringify(validOutput)
  ]);

  service.setMockClient(mockModel);

  const result = await service.generateStructuredResponse({
    prompt: 'Prioritize tasks',
    schema: decisionOutputSchema,
    schemaName: 'DecisionOutput',
    maxRetries: 1
  });

  assert.strictEqual(mockModel.getCallCount(), 2);
  assert.strictEqual(result.prioritizedTasks[0].title, 'SQL Joins');
  assert.strictEqual(result.prioritizedTasks[0].priority, 'HIGH');
});

test('8. Maximum Retry Limit Enforcement', async () => {
  const service = new GeminiService();
  const mockModel = createMockModel([
    new Error('503 Service Unavailable'),
    new Error('503 Service Unavailable')
  ]);

  service.setMockClient(mockModel);

  await assert.rejects(
    async () => {
      await service.generateStructuredResponse({
        prompt: 'Test prompt',
        schema: verificationOutputSchema,
        maxRetries: 1
      });
    },
    (err) => {
      assert.strictEqual(mockModel.getCallCount(), 2);
      assert.strictEqual(err.code, 'GEMINI_UNKNOWN_ERROR');
      return true;
    }
  );
});

test('9. API Configuration Failure without Key', async () => {
  const service = new GeminiService();
  service.clearMockClient(); // No mock and no env key

  // Temporarily ensure no GEMINI_API_KEY or GROQ_API_KEY
  const env = require('../src/config/env');
  const originalEnvGemini = env.GEMINI_API_KEY;
  const originalEnvGroq = env.GROQ_API_KEY;
  const originalProcGemini = process.env.GEMINI_API_KEY;
  const originalProcGroq = process.env.GROQ_API_KEY;

  env.GEMINI_API_KEY = undefined;
  env.GROQ_API_KEY = undefined;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GROQ_API_KEY;

  await assert.rejects(
    async () => {
      await service.generateStructuredResponse({
        prompt: 'Test prompt',
        schema: verificationOutputSchema
      });
    },
    (err) => {
      assert.strictEqual(err.code, 'GEMINI_CONFIG_ERROR');
      return true;
    }
  );

  env.GEMINI_API_KEY = originalEnvGemini;
  env.GROQ_API_KEY = originalEnvGroq;
  if (originalProcGemini) process.env.GEMINI_API_KEY = originalProcGemini;
  if (originalProcGroq) process.env.GROQ_API_KEY = originalProcGroq;
});

test('10. One-Shot JSON Repair Flow Success', async () => {
  const service = new GeminiService();
  // 1st response is malformed JSON with unescaped quotes; 2nd (repair) response is valid
  const malformed = '{"status": "VERIFIED", "score": 90, "feedback": "All good, "missingItems": []}';
  const repaired = '{"status": "VERIFIED", "score": 90, "feedback": "All good", "missingItems": []}';

  const mockModel = createMockModel([malformed, repaired]);
  service.setMockClient(mockModel);

  const result = await service.generateStructuredResponse({
    prompt: 'Verify plan',
    schema: verificationOutputSchema,
    schemaName: 'VerificationOutput'
  });

  assert.strictEqual(result.status, 'VERIFIED');
  assert.strictEqual(result.score, 90);
});

test('11. Repair Flow Still Invalid Failure', async () => {
  const service = new GeminiService();
  const unrepairable = 'Non-JSON garbage text on both attempts';

  const mockModel = createMockModel([unrepairable, unrepairable]);
  service.setMockClient(mockModel);

  await assert.rejects(
    async () => {
      await service.generateStructuredResponse({
        prompt: 'Verify plan',
        schema: verificationOutputSchema,
        schemaName: 'VerificationOutput',
        maxRetries: 0
      });
    },
    (err) => {
      assert.strictEqual(err.code, 'GEMINI_SCHEMA_VALIDATION_FAILED');
      return true;
    }
  );
});

test('12. No Secrets in Error Messages or Logs', async () => {
  const secretKey = 'AIzaSySecretApiKey12345678901234567';
  const service = new GeminiService();
  const mockModel = createMockModel(
    new Error(`Failed with API Key ${secretKey} at endpoint`)
  );

  service.setMockClient(mockModel);

  try {
    await service.generateStructuredResponse({
      prompt: 'Test security',
      schema: verificationOutputSchema,
      maxRetries: 0
    });
    assert.fail('Should have thrown');
  } catch (err) {
    assert.strictEqual(err.code, 'GEMINI_AUTH_ERROR');
    // Ensure raw secret key string does NOT appear in error message
    assert.strictEqual(err.message.includes(secretKey), false);
    assert.ok(err.message.includes('[REDACTED'));
  }
});
