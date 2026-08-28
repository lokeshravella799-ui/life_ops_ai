const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const db = require('../src/config/supabase');
const toolRegistry = require('../src/tools/toolRegistry');
const toolExecutionService = require('../src/services/toolExecutionService');
const artifactService = require('../src/services/artifactService');
const orchestratorAgent = require('../src/agents/orchestratorAgent');
const executionAgent = require('../src/agents/executionAgent');
const verificationAgent = require('../src/agents/verificationAgent');

let server;
let baseUrl;
let testUserToken = null;
let testUserId = null;

async function apiRequest(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { 'Authorization': `Bearer ${options.token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await response.json();
    return { status: response.status, body: json, headers: response.headers };
  } else {
    const buffer = Buffer.from(await response.arrayBuffer());
    return { status: response.status, buffer, headers: response.headers };
  }
}

test.before(async () => {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api`;
      resolve();
    });
  });
});

test('Phase 8 Setup: Register Authenticated Test User', async () => {
  const email = `phase8_agent_${Date.now()}@lifeops.ai`;
  const registerRes = await apiRequest('/auth/register', {
    method: 'POST',
    body: {
      email,
      password: 'StrongPassword123!',
      fullName: 'Phase 8 Autonomous Tester'
    }
  });

  assert.strictEqual(registerRes.status, 201);
  testUserToken = registerRes.body.data.token;
  testUserId = registerRes.body.data.user.id;
  assert.ok(testUserToken);
  assert.ok(testUserId);
});

// ==============================================================================
// 1. TOOL REGISTRY & VALIDATION TESTS
// ==============================================================================
test('1. Tool Registry: All 12 Core Tools Registered', () => {
  const tools = toolRegistry.listTools();
  assert.ok(tools.length >= 12);
  
  const toolNames = tools.map(t => t.name);
  assert.ok(toolNames.includes('CALCULATOR'));
  assert.ok(toolNames.includes('PDF_GENERATOR'));
  assert.ok(toolNames.includes('DOCX_GENERATOR'));
  assert.ok(toolNames.includes('SPREADSHEET_GENERATOR'));
  assert.ok(toolNames.includes('MARKDOWN_GENERATOR'));
  assert.ok(toolNames.includes('CHECKLIST_GENERATOR'));
  assert.ok(toolNames.includes('EMAIL_DRAFT_GENERATOR'));
  assert.ok(toolNames.includes('MESSAGE_DRAFT_GENERATOR'));
  assert.ok(toolNames.includes('CALENDAR_DRAFT_GENERATOR'));
  assert.ok(toolNames.includes('REMINDER_RECOMMENDATION'));
  assert.ok(toolNames.includes('DOCUMENT_ANALYSIS'));
  assert.ok(toolNames.includes('WEB_RESEARCH'));
});

test('2. Tool Registry: Missing Tool Handled Safely', async () => {
  const result = await toolExecutionService.executeTool('NON_EXISTENT_TOOL_XYZ', {});
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.errorCode, 'TOOL_NOT_FOUND');
  assert.ok(result.safeMessage.includes('NON_EXISTENT_TOOL_XYZ'));
});

test('3. Tool Execution: Zod Schema Validation Failure Handled Safely', async () => {
  const result = await toolExecutionService.executeTool('CALCULATOR', {
    operation: 'INVALID_OPERATION_ABC'
  });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.errorCode, 'INVALID_TOOL_INPUT');
});

// ==============================================================================
// 2. INDIVIDUAL TOOL EXECUTION TESTS
// ==============================================================================
test('4. Calculator Tool: Budget Breakdown and Timeline Calculations (Zero Eval)', async () => {
  const budgetResult = await toolExecutionService.executeTool('CALCULATOR', {
    operation: 'BUDGET_BREAKDOWN',
    totalAmount: 2000,
    currency: 'USD'
  }, { userId: testUserId });

  assert.strictEqual(budgetResult.success, true);
  assert.strictEqual(budgetResult.result.calculatedTotal, 2000);
  assert.ok(budgetResult.result.breakdown.length >= 4);

  const timelineResult = await toolExecutionService.executeTool('CALCULATOR', {
    operation: 'TIMELINE_MATH',
    days: 10,
    hoursPerDay: 3
  }, { userId: testUserId });

  assert.strictEqual(timelineResult.success, true);
  assert.strictEqual(timelineResult.result.calculatedTotal, 30);
});

test('5. PDF Generator Tool: Produces Real Disk PDF Artifact', async () => {
  const pdfResult = await toolExecutionService.executeTool('PDF_GENERATOR', {
    title: 'DBMS Exam 10-Day Master Blueprint',
    subtitle: 'Autonomous Study Schedule & Milestone Review',
    category: 'STUDY',
    summary: 'Comprehensive 10-day preparation roadmap allocating 30 hours of focused revision.',
    sections: [
      {
        heading: 'Phase 1: Relational Foundations & Normalization',
        items: ['Master 1NF, 2NF, 3NF, BCNF algorithms', 'Complete 15 relational algebra problem sets']
      }
    ]
  }, { userId: testUserId });

  assert.strictEqual(pdfResult.success, true);
  assert.ok(pdfResult.result.artifactId);
  assert.ok(pdfResult.result.fileSizeBytes > 500);

  // Verify file buffer on disk
  const bufferResult = await artifactService.getArtifactBuffer(pdfResult.result.artifactId, testUserId);
  assert.ok(bufferResult);
  assert.ok(bufferResult.buffer.length > 500);
  // Verify PDF header magic bytes "%PDF"
  assert.strictEqual(bufferResult.buffer.slice(0, 4).toString('utf8'), '%PDF');
});

test('6. DOCX Generator Tool: Produces Real Disk Word (.docx) Artifact', async () => {
  const docxResult = await toolExecutionService.executeTool('DOCX_GENERATOR', {
    title: 'Senior Software Engineer Resume - Alex Mercer',
    subtitle: 'San Francisco, CA | alex@email.com',
    documentType: 'RESUME',
    summary: 'Full Stack Engineer with expertise in scalable microservices, Node.js, and multi-agent AI workflows.',
    sections: [
      {
        title: 'Technical Skills',
        bulletPoints: ['JavaScript, TypeScript, Node.js, Python, PostgreSQL, Redis, Docker']
      }
    ]
  }, { userId: testUserId });

  assert.strictEqual(docxResult.success, true);
  assert.ok(docxResult.result.artifactId);
  assert.ok(docxResult.result.fileSizeBytes > 1000);

  // Verify file on disk
  const bufferResult = await artifactService.getArtifactBuffer(docxResult.result.artifactId, testUserId);
  assert.ok(bufferResult);
  assert.ok(bufferResult.buffer.length > 1000);
  // Verify DOCX ZIP header "PK"
  assert.strictEqual(bufferResult.buffer.slice(0, 2).toString('utf8'), 'PK');
});

test('7. Spreadsheet Generator Tool: Produces Real Disk Excel (.xlsx) Artifact', async () => {
  const xlsxResult = await toolExecutionService.executeTool('SPREADSHEET_GENERATOR', {
    title: 'Travel_Budget_Tracker',
    sheets: [
      {
        sheetName: 'Expenses',
        headers: ['Category', 'Allocated (USD)', 'Notes'],
        rows: [
          ['Flights', 800, 'Round-trip JFK'],
          ['Hotels', 600, 'Manhattan Midtown'],
          ['Dining', 400, 'Daily food allocation'],
          ['Passes', 200, 'CityPass & Metro']
        ]
      }
    ]
  }, { userId: testUserId });

  assert.strictEqual(xlsxResult.success, true);
  assert.ok(xlsxResult.result.artifactId);
  assert.ok(xlsxResult.result.fileSizeBytes > 1000);

  // Verify file on disk
  const bufferResult = await artifactService.getArtifactBuffer(xlsxResult.result.artifactId, testUserId);
  assert.ok(bufferResult);
  assert.strictEqual(bufferResult.buffer.slice(0, 2).toString('utf8'), 'PK');
});

test('8. Checklist Generator Tool: Generates Categorized Actionable Tasks', async () => {
  const chkResult = await toolExecutionService.executeTool('CHECKLIST_GENERATOR', {
    title: 'Pre-Departure Flight & Visa Checklist',
    domain: 'TRAVEL',
    categories: [
      {
        categoryName: 'Documentation & Entry',
        items: [
          { task: 'Check passport validity > 6 months', priority: 'URGENT', isCritical: true },
          { task: 'Submit ESTA / DS-160 application', priority: 'URGENT', isCritical: true }
        ]
      }
    ]
  }, { userId: testUserId });

  assert.strictEqual(chkResult.success, true);
  assert.strictEqual(chkResult.result.totalItems, 2);
  assert.strictEqual(chkResult.result.criticalItemsCount, 2);
});

test('9. Email Draft Generator Tool: Generates Professional Formatted Draft', async () => {
  const emailResult = await toolExecutionService.executeTool('EMAIL_DRAFT_GENERATOR', {
    recipientType: 'CUSTOMER',
    recipientPlaceholder: 'Valued Customer',
    subject: 'Order Refund Confirmation & Resolution',
    tone: 'EMPATHETIC',
    keyPoints: [
      'Your refund of $129.99 has been authorized.',
      'A replacement unit has been dispatched with tracking #TN-98124.'
    ],
    proposedAction: 'Attach return shipping label'
  }, { userId: testUserId });

  assert.strictEqual(emailResult.success, true);
  assert.ok(emailResult.result.draftBody.includes('Valued Customer'));
  assert.ok(emailResult.result.draftBody.includes('$129.99'));
});

test('10. Web Research Tool: Provides Structured Sources & Timestamps', async () => {
  const resResult = await toolExecutionService.executeTool('WEB_RESEARCH', {
    query: 'Travel requirements and visa guidelines for United States',
    maxResults: 3
  }, { userId: testUserId });

  assert.strictEqual(resResult.success, true);
  assert.ok(resResult.result.sources.length > 0);
  assert.ok(resResult.result.sources[0].url.startsWith('http'));
  assert.ok(resResult.result.retrievalTimestamp);
});

// ==============================================================================
// 3. HUMAN CONFIRMATION / ACTION REQUEST TESTS
// ==============================================================================
test('11. Action Confirmation Flow: High-Risk Action Halts for Human Approval', async () => {
  // Register a temporary high-risk action tool
  toolRegistry.registerTool({
    name: 'DISPATCH_REFUND_TRANSACTION',
    description: 'Executes actual refund transaction on payment gateway',
    capability: 'FINANCIAL',
    riskLevel: 'HIGH',
    requiresConfirmation: true,
    inputSchema: require('zod').object({ amount: require('zod').number(), customerId: require('zod').string() }),
    execute: async (input) => ({ transactionId: 'tx_998124', status: 'REFUND_DISPATCHED', amount: input.amount })
  });

  // Attempt execution without explicit confirmation flag
  const pendingResult = await toolExecutionService.executeTool('DISPATCH_REFUND_TRANSACTION', {
    amount: 150,
    customerId: 'cust_881'
  }, { userId: testUserId });

  assert.strictEqual(pendingResult.success, true);
  assert.strictEqual(pendingResult.requiresConfirmation, true);
  assert.strictEqual(pendingResult.status, 'PENDING_CONFIRMATION');
  assert.ok(pendingResult.actionRequestId);

  // Now confirm and execute the action request
  const confirmResult = await toolExecutionService.confirmActionRequest(pendingResult.actionRequestId, testUserId);
  assert.strictEqual(confirmResult.actionRequest.status, 'PENDING');
  assert.strictEqual(confirmResult.executionResult.success, true);
  assert.strictEqual(confirmResult.executionResult.result.status, 'REFUND_DISPATCHED');
});

// ==============================================================================
// 4. VERIFICATION AGENT ARTIFACT INTEGRITY TESTS
// ==============================================================================
test('12. Verification Agent: Detects Corrupted or Missing File Artifacts', async () => {
  const auditResult = await verificationAgent.verifyWorkflow({
    goalObjective: 'Test Artifact Integrity Audit',
    constraints: [],
    plannerOutput: { schedule: [{ day: 1, theme: 'Test', tasks: [{ title: 'Task 1' }] }] },
    executableTasks: [{ title: 'Task 1', dayNumber: 1, estimatedMinutes: 60 }],
    generatedArtifacts: [
      { name: 'Missing_File.pdf', filePath: 'C:\\Invalid\\NonExistent\\Path.pdf', artifact_type: 'PDF' }
    ]
  });

  assert.strictEqual(auditResult.data.status, 'NEEDS_REVISION');
  assert.ok(auditResult.data.score <= 50);
  assert.strictEqual(auditResult.data.verifiedArtifacts[0].status, 'EMPTY');
});

// ==============================================================================
// 5. REST API ENDPOINTS TESTS
// ==============================================================================
test('13. API: GET /api/tools Lists Capabilities', async () => {
  const res = await apiRequest('/tools');
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.tools.length >= 12);
  assert.ok(res.body.capabilities.length >= 5);
});

test('14. API: POST /api/tools/execute Direct Execution', async () => {
  const res = await apiRequest('/tools/execute', {
    method: 'POST',
    token: testUserToken,
    body: {
      toolName: 'CALCULATOR',
      parameters: {
        operation: 'TOTAL_SUM',
        numbers: [100, 250, 450]
      }
    }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.result.calculatedTotal, 800);
});

test('15. API: GET /api/artifacts and Download Artifact Buffer', async () => {
  // Generate a test artifact
  const pdfToolRes = await toolExecutionService.executeTool('PDF_GENERATOR', {
    title: 'Downloadable Artifact Test',
    summary: 'Checking streaming endpoint.'
  }, { userId: testUserId });

  const artifactId = pdfToolRes.result.artifactId;

  // List user artifacts
  const listRes = await apiRequest('/artifacts', { token: testUserToken });
  assert.strictEqual(listRes.status, 200);
  assert.ok(listRes.body.artifacts.some(a => a.id === artifactId));

  // Download raw file
  const downloadRes = await apiRequest(`/artifacts/${artifactId}/download`, { token: testUserToken });
  assert.strictEqual(downloadRes.status, 200);
  assert.strictEqual(downloadRes.headers.get('content-type'), 'application/pdf');
  assert.ok(downloadRes.buffer.length > 500);
});

// ==============================================================================
// 6. MULTI-DOMAIN DYNAMIC EXECUTION & DEMO ACCEPTANCE TESTS
// ==============================================================================
test('16. DEMO A: Travel Goal Orchestrates Real Tools & Artifacts', async () => {
  const travelGoal = 'I want to travel to America. Help me organize the trip.';
  const res = await apiRequest('/workflows/orchestrate', {
    method: 'POST',
    token: testUserToken,
    body: {
      goalText: travelGoal,
      category: 'TRAVEL',
      targetDays: 14,
      dailyHours: 3
    }
  });

  assert.strictEqual(res.status, 201);
  const data = res.body.data;
  assert.strictEqual(data.status, 'COMPLETED');
  assert.strictEqual(data.verificationStatus, 'VERIFIED');
  
  // Verify Travel domain tasks
  assert.ok(data.tasks.some(t => /visa|flight|hotel|route|itinerary/i.test(t.title)));
  // Verify real generated artifacts (PDF Blueprint)
  assert.ok(data.artifacts.length > 0);
  assert.ok(data.artifacts.some(a => a.artifact_type === 'PDF'));
});

test('17. DEMO B: Resume Request Generates Real DOCX Artifact', async () => {
  const resumeGoal = 'Create a professional software developer resume.';
  const res = await apiRequest('/workflows/orchestrate', {
    method: 'POST',
    token: testUserToken,
    body: {
      goalText: resumeGoal,
      category: 'PROJECT',
      targetDays: 5,
      dailyHours: 2
    }
  });

  assert.strictEqual(res.status, 201);
  const data = res.body.data;
  assert.ok(data.artifacts.some(a => a.artifact_type === 'DOCX'));
});

test('18. DEMO C: Business Complaint Generates Email Draft & Resolution Plan', async () => {
  const businessGoal = 'My customer received the wrong product and wants a refund.';
  const res = await apiRequest('/workflows/orchestrate', {
    method: 'POST',
    token: testUserToken,
    body: {
      goalText: businessGoal,
      category: 'BUSINESS',
      targetDays: 3,
      dailyHours: 2
    }
  });

  assert.strictEqual(res.status, 201);
  const data = res.body.data;
  assert.strictEqual(data.status, 'COMPLETED');
  assert.ok(data.actions.some(a => a.tool === 'EMAIL_DRAFT_GENERATOR'));
});

test.after(() => {
  if (server && server.close) {
    server.close();
  }
});
