const calculatorTool = require('./calculatorTool');
const pdfGeneratorTool = require('./pdfGeneratorTool');
const docxGeneratorTool = require('./docxGeneratorTool');
const spreadsheetGeneratorTool = require('./spreadsheetGeneratorTool');
const markdownGeneratorTool = require('./markdownGeneratorTool');
const checklistGeneratorTool = require('./checklistGeneratorTool');
const emailDraftGeneratorTool = require('./emailDraftGeneratorTool');
const messageDraftGeneratorTool = require('./messageDraftGeneratorTool');
const calendarDraftGeneratorTool = require('./calendarDraftGeneratorTool');
const reminderRecommendationTool = require('./reminderRecommendationTool');
const documentAnalysisTool = require('./documentAnalysisTool');
const webResearchTool = require('./webResearchTool');

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.registerDefaultTools();
  }

  registerTool(tool) {
    if (!tool.name || typeof tool.execute !== 'function') {
      throw new Error(`Invalid tool registration: missing name or execute function`);
    }
    const normalizedName = tool.name.toUpperCase();
    this.tools.set(normalizedName, {
      ...tool,
      name: normalizedName
    });
  }

  registerDefaultTools() {
    [
      calculatorTool,
      pdfGeneratorTool,
      docxGeneratorTool,
      spreadsheetGeneratorTool,
      markdownGeneratorTool,
      checklistGeneratorTool,
      emailDraftGeneratorTool,
      messageDraftGeneratorTool,
      calendarDraftGeneratorTool,
      reminderRecommendationTool,
      documentAnalysisTool,
      webResearchTool
    ].forEach(tool => this.registerTool(tool));
  }

  getTool(name) {
    if (!name) return null;
    return this.tools.get(name.toUpperCase()) || null;
  }

  hasTool(name) {
    if (!name) return false;
    return this.tools.has(name.toUpperCase());
  }

  listTools() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      capability: t.capability,
      riskLevel: t.riskLevel,
      requiresConfirmation: Boolean(t.requiresConfirmation)
    }));
  }

  listCapabilities() {
    const capabilitiesMap = new Map();
    this.tools.forEach(tool => {
      const cap = tool.capability || 'GENERAL';
      if (!capabilitiesMap.has(cap)) {
        capabilitiesMap.set(cap, []);
      }
      capabilitiesMap.get(cap).push(tool.name);
    });

    return Array.from(capabilitiesMap.entries()).map(([capability, tools]) => ({
      capability,
      tools
    }));
  }

  getToolsByCapability(capability) {
    if (!capability) return [];
    return Array.from(this.tools.values()).filter(t => t.capability?.toUpperCase() === capability.toUpperCase());
  }
}

module.exports = new ToolRegistry();
