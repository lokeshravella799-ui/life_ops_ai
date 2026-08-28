const db = require('../config/supabase');
const geminiService = require('../services/geminiService');
const { businessTriageOutputSchema } = require('../validators/agentOutputSchemas');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class BusinessController {
  /**
   * Triage Customer Complaints & Return Requests with Autonomous Multi-Agent Pipeline
   */
  async triageComplaint(req, res, next) {
    try {
      const { customerName, orderId, issueText, requestedResolution } = req.body;
      if (!issueText) {
        return errorResponse(res, 'Issue description is required', 'VALIDATION_ERROR', 400);
      }

      const systemInstruction = `You are the Business Automation Orchestrator in LifeOps AI.
A small business receives customer complaints and refund requests. Coordinate specialized agents to:
1. Classification Agent: Categorize issue (e.g. DAMAGED_GOODS, WRONG_ITEM, SHIPPING_DELAY, BILLING).
2. Policy Research Agent: Check refund eligibility against standard e-commerce SLA (e.g. 14-day return window, replacement policy).
3. Decision Agent: Make concrete resolution recommendation (APPROVE_REFUND, OFFER_REPLACEMENT, REQUEST_PHOTOS).
4. Response Drafting Agent: Write a polite, empathetic, professional customer service email draft.
5. Execution Agent: Generate follow-up internal tasks for Warehouse & Finance.

Respond strictly with a JSON object matching this schema:
{
  "ticketId": "TICK-XXXXX",
  "customerName": "Customer Name",
  "issueClassification": "WRONG_ITEM_SHIPPED",
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "refundEligible": true | false,
  "policyRationale": "Explanation of company return policy applied",
  "recommendedResolution": "Approve refund or dispatch replacement",
  "draftCustomerResponse": "Full email draft addressing customer by name with tracking/refund instructions",
  "internalActionTasks": [
    {
      "title": "Task title",
      "department": "Warehouse / Logistics / Finance",
      "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      "estimatedHours": 1
    }
  ]
}`;

      const prompt = `Customer Name: "${customerName || 'Valued Customer'}"
Order ID: "${orderId || 'ORD-98231'}"
Issue Description: "${issueText}"
Requested Resolution: "${requestedResolution || 'Refund'}"`;

      const fallbackGenerator = () => ({
        ticketId: `TICK-${Math.floor(10000 + Math.random() * 90000)}`,
        customerName: customerName || 'Alex Johnson',
        issueClassification: 'WRONG_ITEM_RECEIVED_AND_REFUND_REQUEST',
        severity: 'HIGH',
        refundEligible: true,
        policyRationale: 'Under Section 4.2 of the Merchant Return Policy, items delivered incorrectly or damaged qualify for an immediate 100% refund or expedited replacement without restocking fees.',
        recommendedResolution: 'Immediate approval of refund with prepaid return label issuance for the incorrect item.',
        draftCustomerResponse: `Dear ${customerName || 'Valued Customer'},\n\nThank you for reaching out to us regarding Order #${orderId || 'ORD-98231'}. We sincerely apologize that you received an incorrect item.\n\nWe have initiated a full refund of your purchase, which will reflect in your account within 3–5 business days. A prepaid return shipping label has been generated for your convenience.\n\nPlease let us know if you would like an expedited replacement dispatched at no additional charge.\n\nWarm regards,\nCustomer Support Team | LifeOps AI Automated Care`,
        internalActionTasks: [
          {
            title: `Issue 100% refund for Order #${orderId || 'ORD-98231'}`,
            department: 'Finance & Billing',
            priority: 'HIGH',
            estimatedHours: 0.5
          },
          {
            title: `Dispatch prepaid return courier for misdelivered SKU on Order #${orderId || 'ORD-98231'}`,
            department: 'Warehouse Logistics',
            priority: 'MEDIUM',
            estimatedHours: 1
          },
          {
            title: 'Audit SKU barcode scanner at Packing Bay 3 to prevent recurring mismatch',
            department: 'Quality Assurance',
            priority: 'LOW',
            estimatedHours: 2
          }
        ]
      });

      const triageResult = await geminiService.generateStructuredOutput({
        prompt,
        systemInstruction,
        schema: businessTriageOutputSchema,
        agentName: 'Business Orchestrator',
        fallbackGenerator
      });

      // Persist as an activity log and optionally as tasks
      await db.createActivityLog({
        user_id: req.user.id,
        actor_type: 'ORCHESTRATOR',
        actor_name: 'Business Agent Engine',
        action: 'BUSINESS_COMPLAINT_TRIAGED',
        details: {
          ticketId: triageResult.ticketId,
          customerName: triageResult.customerName,
          severity: triageResult.severity
        }
      });

      return successResponse(res, { triageResult });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BusinessController();
