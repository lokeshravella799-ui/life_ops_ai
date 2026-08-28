const intentRouterService = require('./intentRouterService');
const geminiService = require('./geminiService');
const { generalChatResponseSchema } = require('../validators/chatValidator');
const { extractDestination, isUSATravel } = require('../utils/domainExtractor');
const logger = require('../utils/logger');

class ChatService {
  /**
   * Process a conversational AI message, classify intent, and generate natural responses with suggested follow-up actions
   */
  async processMessage({ message, conversationId = null, history = [], userId = null }) {
    const classification = intentRouterService.classifyIntent(message);
    const mode = classification.mode;
    const isWorkflow = classification.workflowRequired;

    logger.info(`💬 [ChatService] Processing message (Intent: ${classification.intent || mode}, Mode: ${mode}, WorkflowRequired: ${isWorkflow}): "${message.slice(0, 60)}"`);

    // System instruction for Gemini Conversational Mode
    const systemInstruction = `You are LifeOps AI, a powerful and thoughtful conversational AI assistant.
Your goal is to answer the user's message conversationally, clearly, accurately, and naturally.
CRITICAL BEHAVIOR RULES:
1. For questions, explanations, coding, notes, study advice, text generation, and general conversation: respond CONVERSATIONALLY with rich markdown. DO NOT format responses as "Day 1", "Day 2", "Tasks", or "Milestones" unless the user explicitly requested a multi-day plan.
2. If the user asks about travel to a specific city (e.g. Mumbai, Goa, Paris), do NOT mention US Visa/ESTA unless the destination is the USA.
3. Provide 2-4 context-aware "suggestedActions" that allow the user to dig deeper or explicitly create a structured plan as an optional next step.
4. If the user asks for code, provide clean syntax-highlighted code with brief explanations.

You MUST respond strictly with a JSON object conforming to this schema:
{
  "mode": "${mode}",
  "intent": "${classification.intent || mode}",
  "message": "Your natural, direct, rich Markdown conversational response",
  "title": "Optional descriptive title",
  "sections": [
    { "heading": "Section Heading", "content": "Section Markdown content" }
  ],
  "code": {
    "language": "cpp | python | javascript | sql",
    "snippet": "Source code",
    "explanation": "Brief explanation"
  },
  "citations": ["Source 1", "Source 2"],
  "suggestedActions": [
    {
      "type": "CREATE_PLAN" | "EXPLAIN_MORE" | "GENERATE_DOC" | "CODE_DEMO",
      "label": "Button Label",
      "prompt": "Prompt to send when user clicks",
      "category": "STUDY" | "PROJECT" | "TRAVEL" | "BUSINESS" | "PERSONAL",
      "targetDays": 10
    }
  ],
  "workflowRequired": ${isWorkflow}
}`;

    const prompt = `User Message: "${message}"\nDetected Intent: ${classification.intent || mode}\nDetected Mode: ${mode}`;

    // Dynamic fallback generator tailored to any domain
    const fallbackGenerator = () => {
      const text = message.toLowerCase();

      // 1. Explicit Plan Request (MODE B - Autonomous LifeOps Workflow)
      if (isWorkflow) {
        const dest = extractDestination(message);
        const days = classification.targetDays || 5;

        return {
          mode: 'PLAN',
          intent: classification.intent || 'GOAL_PLANNING',
          title: `Autonomous Multi-Agent Planning: ${classification.category}`,
          message: `I will launch the **Autonomous Multi-Agent Fleet** (Memory $\\rightarrow$ Orchestrator $\\rightarrow$ Research $\\rightarrow$ Planner $\\rightarrow$ Decision $\\rightarrow$ Execution $\\rightarrow$ Verification) to synthesize your verified **${days}-Day ${dest !== 'your chosen destination' ? dest : ''} Plan**, schedule daily activities, and generate downloadable physical artifacts (.pdf itinerary blueprint, checklists, and budget trackers).`,
          suggestedActions: [],
          workflowRequired: true,
          metadata: {
            category: classification.category || 'PERSONAL',
            targetDays: days,
            dailyHours: 3
          }
        };
      }

      // 2. TEXT_GENERATION (Writing emails, introductions, letters)
      if (/write (an?|the)?\s*(email|introduction|intro|cover letter|essay|message|letter)|draft an email|compose an email|asking my professor/i.test(text)) {
        if (/professor|extension|assignment/i.test(text)) {
          return {
            mode: 'TEXT_GENERATION',
            intent: 'TEXT_GENERATION',
            title: 'Professional Email Draft: Assignment Extension Request',
            message: `Subject: Request for Brief Extension on [Course Name / Assignment Name] - [Your Full Name]\n\nDear Professor [Professor's Last Name],\n\nI hope this email finds you well.\n\nI am writing to respectfully request a short extension of [number of days, e.g., 2 days] on the upcoming [Assignment Title], currently due on [Original Due Date]. \n\n[Briefly state your legitimate reason: e.g., Due to an unexpected illness / personal circumstance / overlapping technical commitments], I want to ensure that my submitted work meets the rigorous academic standards expected in your course.\n\nI have already made substantial progress on [mention 1-2 completed sections], and this short extension will allow me to finalize and thoroughly review the remaining deliverables. Would it be possible to submit the completed assignment by [Proposed New Due Date and Time]?\n\nThank you very much for your time, consideration, and understanding.\n\nSincerely,\n\n[Your Full Name]  \n[Student ID Number]  \n[Course Name & Section]  \n[Your Contact Email]`,
            suggestedActions: [
              {
                type: 'GENERATE_DOC',
                label: '📄 Export as Word (.docx) Document',
                prompt: 'Generate a formatted DOCX document for this email extension request'
              },
              {
                type: 'EXPLAIN_MORE',
                label: '🔄 Shorter / Casual Version',
                prompt: 'Write a shorter and slightly more direct version of this email to my professor'
              }
            ],
            workflowRequired: false
          };
        }

        return {
          mode: 'TEXT_GENERATION',
          intent: 'TEXT_GENERATION',
          title: 'Generated Content',
          message: `Here is the requested draft tailored to your specifications:\n\n### Draft:\n\nIn modern database management and software engineering, structured data modeling serves as the backbone for reliable, performant, and ACID-compliant architectures. This assignment explores the foundational principles of relational schema design, normal forms, and transaction isolation levels.\n\n*Feel free to let me know if you would like me to adjust the tone, expand specific sections, or export this as a document.*`,
          suggestedActions: [
            {
              type: 'GENERATE_DOC',
              label: '📝 Export as Word Document',
              prompt: `Export this text as a DOCX document: ${message}`
            }
          ],
          workflowRequired: false
        };
      }

      // 3. Travel & Vacation Guidance (Informational queries without multi-day plans)
      if (/travel|trip|flight|vacation|tour|visit|mumbai|goa|america|usa|japan|kyoto|bali|paris|kerala/i.test(text)) {
        if (/mumbai/i.test(text)) {
          return {
            mode: 'STUDY_GUIDANCE',
            intent: 'TRAVEL_QUERY',
            title: 'Mumbai City Travel & Exploration Guide',
            message: `**Mumbai**, the City of Dreams, offers an incredible blend of colonial heritage, vibrant street culture, coastal promenades, and world-class dining. Here is an overview for planning your visit:\n\n### 1. Key Districts & Neighborhoods\n- **South Mumbai (Colaba, Fort, Marine Drive)**: Victorian Gothic & Art Deco architecture, Gateway of India, museums (CSMVS), and scenic evening walks.\n- **Western Suburbs (Bandra, Juhu)**: Trendy cafes, boutique shopping, Bandra Bandstand, nightlife, and beachfront strolls.\n\n### 2. Best Time to Visit\n- **November to February**: Pleasant, dry winter weather with temperatures between 20°C–30°C.\n- **June to September**: Heavy monsoon rains, dramatic coastal sea views, and lush regional greenery.\n\n### 3. Iconic Experiences & Cuisine\n- **Heritage & Sightseeing**: Gateway of India, ferry to Elephanta Caves, Marine Drive (Queen's Necklace), and Chhatrapati Shivaji Maharaj Terminus (CSMT).\n- **Local Cuisine**: Authentic Vada Pav (Ashok Vada Pav), Pav Bhaji (Cannon / Sardar), Bombay Sandwich, coastal seafood (Mahesh Lunch Home), and vintage Irani cafes (Britannia & Co).\n- **Transit**: Use the local Western/Central train lines during non-peak hours, the modern Mumbai Metro, or ride-share apps (Uber/Ola/Kaali-Peeli cabs).\n\n*Would you like me to build a customized 3-day or 5-day Mumbai itinerary blueprint with daily time-blocks?*`,
            suggestedActions: [
              {
                type: 'CREATE_PLAN',
                label: '✈️ Create 5-Day Mumbai Itinerary Blueprint',
                prompt: 'Plan my trip to Mumbai for 5 days with itinerary and budget',
                category: 'TRAVEL',
                targetDays: 5,
                dailyHours: 3
              },
              {
                type: 'EXPLAIN_MORE',
                label: '🏛️ Top 7 Heritage Landmarks in Mumbai',
                prompt: 'What are the top 7 must-visit heritage landmarks and museums in Mumbai?'
              },
              {
                type: 'EXPLAIN_MORE',
                label: '🍲 Mumbai Street Food Walking Guide',
                prompt: 'Give me a curated food walking guide for street food in South Mumbai'
              }
            ],
            workflowRequired: false
          };
        }

        if (/goa/i.test(text)) {
          return {
            mode: 'STUDY_GUIDANCE',
            intent: 'TRAVEL_QUERY',
            title: 'Goa Travel & Itinerary Guide',
            message: `Planning a trip to **Goa** is fantastic! Here is a breakdown of what to consider:\n\n### 1. North Goa vs South Goa\n- **North Goa (Calangute, Baga, Anjuna, Vagator)**: Vibrant nightlife, bustling beach shacks, water sports, and beach clubs.\n- **South Goa (Palolem, Agonda, Colva, Cavelossim)**: Serene beaches, luxury heritage resorts, pristine nature, and quiet relaxation.\n\n### 2. Best Time to Visit\n- **November to February**: Pleasant beach weather, parties, and water sports.\n- **June to September**: Lush monsoon greenery, waterfalls (Dudhsagar), and fewer crowds.\n\n### 3. Key Experiences\n- **Water Sports**: Scuba diving at Grande Island, parasailing, and jet skiing.\n- **Heritage & Culture**: Basilica of Bom Jesus, Fort Aguada, and Latin Quarter (Fontainhas).\n- **Cuisine**: Goan Fish Curry, Prawn Balchão, Bebinca, and fresh seafood.\n\n*Would you like me to generate a 4-day or 5-day custom itinerary blueprint with budget calculations?*`,
            suggestedActions: [
              {
                type: 'CREATE_PLAN',
                label: '✈️ Create 5-Day Goa Itinerary Blueprint',
                prompt: 'Plan my trip to Goa for 5 days with itinerary and budget',
                category: 'TRAVEL',
                targetDays: 5,
                dailyHours: 2
              },
              {
                type: 'EXPLAIN_MORE',
                label: '🏖️ North vs South Goa Breakdown',
                prompt: 'What is the detailed difference between North Goa and South Goa for travelers?'
              }
            ],
            workflowRequired: false
          };
        }

        if (isUSATravel(text)) {
          return {
            mode: 'STUDY_GUIDANCE',
            intent: 'TRAVEL_QUERY',
            title: 'United States Travel Overview & Preparation Checklist',
            message: `Planning a trip to the United States requires checking entry requirements and transit logistics:\n\n### 1. Visas & Documentation\n- **ESTA (Visa Waiver Program)**: For citizens of participating nations ($21 fee, valid 2 years, 90-day stays).\n- **B1/B2 Tourist Visa**: For other passport holders (requires DS-160 submission and consular interview).\n- **Passport**: Must have minimum 6 months validity from entry.\n\n### 2. Major Travel Regions\n- **East Coast (NYC, Washington D.C., Boston)**: Historic landmarks, subways, and walking-friendly.\n- **West Coast (California, San Francisco, LA, Grand Canyon)**: Scenic coastlines, National Parks, and road trips.`,
            suggestedActions: [
              {
                type: 'CREATE_PLAN',
                label: '✈️ Create 14-Day US Travel Blueprint',
                prompt: 'Plan my trip to America for 14 days with 3 hours daily organization',
                category: 'TRAVEL',
                targetDays: 14,
                dailyHours: 3
              }
            ],
            workflowRequired: false
          };
        }

        const dest = extractDestination(message);
        return {
          mode: 'STUDY_GUIDANCE',
          intent: 'TRAVEL_QUERY',
          title: `${dest} Travel Overview & Preparation Blueprint`,
          message: `Planning a trip to **${dest}** requires balancing logistics, timings, and experiences. Here are the core areas to focus on:\n\n### 1. Logistics & Documentation\n- **Passports & Visas**: Check entry requirements and identification rules early.\n- **Flights & Transport**: Book round-trip tickets and reserve local transit / car rentals in advance.\n- **Accommodation**: Select central hubs in ${dest} to minimize daily commute times.\n\n### 2. Budget Allocation\n- **Flights/Transit**: ~40% of total budget.\n- **Lodging**: ~30%.\n- **Food & Activities**: ~25%.\n- **Emergency buffer**: ~5%.\n\n*Would you like me to build a customized multi-day travel blueprint with daily time-blocks?*`,
          suggestedActions: [
            {
              type: 'CREATE_PLAN',
              label: `✈️ Create 5-Day ${dest} Travel Blueprint`,
              prompt: `Plan my trip to ${dest} for 5 days with itinerary and budget`,
              category: 'TRAVEL',
              targetDays: 5,
              dailyHours: 2
            },
            {
              type: 'EXPLAIN_MORE',
              label: '📋 Travel Packing Checklist',
              prompt: `Generate an essential travel packing checklist for ${dest}`
            }
          ],
          workflowRequired: false
        };
      }

      // 4. Generative AI / Tech Learning Guidance
      if (/generative ai|genai/i.test(text)) {
        if (/how (can|do|should) i learn|how to learn|learning path/i.test(text)) {
          return {
            mode: 'STUDY_GUIDANCE',
            intent: 'STUDY_QUERY',
            title: 'Generative AI Learning Pathway',
            message: `To master **Generative AI**, I recommend following a structured progression from fundamentals to autonomous agent architectures:\n\n1. **Python & Math Foundations**: Linear algebra, matrix multiplication, calculus, and PyTorch essentials.\n2. **Machine Learning Fundamentals**: Gradient descent, loss functions, overfitting, and validation.\n3. **Neural Networks**: Feedforward nets, backpropagation, activation functions, and embeddings.\n4. **Transformers Architecture**: Self-attention, multi-head attention, positional encoding, encoders, and decoders.\n5. **Large Language Model (LLM) Concepts**: Tokenization, causal masking, pre-training, fine-tuning (LoRA), and RLHF/DPO.\n6. **Prompt Engineering**: Zero-shot, few-shot, Chain-of-Thought, ReAct, and structured JSON schemas.\n7. **Embeddings & Vector Databases**: Semantic similarity, chunking strategies, Pinecone, Chroma, and Qdrant.\n8. **Retrieval-Augmented Generation (RAG)**: Dense retrieval, hybrid search, reranking, and self-correcting RAG.\n9. **Autonomous AI Agents & Tool Calling**: ReAct loops, function calling, memory persistence, and multi-agent DAGs.\n10. **Fine-Tuning & Model Adaptation**: SFT with LoRA/QLoRA on custom datasets.\n11. **Build End-to-End Projects**: Multi-agent research assistants, code review bots, and domain-specific RAG.\n\n*If you would like, I can turn this into a structured 30-day daily learning plan.*`,
            suggestedActions: [
              {
                type: 'CREATE_PLAN',
                label: '📅 Create 30-Day Learning Plan',
                prompt: 'Create a 30 day plan to learn Generative AI',
                category: 'STUDY',
                targetDays: 30,
                dailyHours: 2
              },
              {
                type: 'EXPLAIN_MORE',
                label: '🔍 Explain Transformers Architecture',
                prompt: 'Explain the Transformer architecture and self-attention mechanism'
              },
              {
                type: 'EXPLAIN_MORE',
                label: '⚡ Deep Dive into RAG',
                prompt: 'Explain Retrieval-Augmented Generation (RAG) in simple terms'
              }
            ],
            workflowRequired: false
          };
        }

        return {
          mode: 'EXPLANATION',
          intent: 'EXPLANATION',
          title: 'Understanding Generative AI',
          message: `**Generative AI (GenAI)** refers to artificial intelligence models capable of creating new, realistic content—such as text, images, audio, synthetic data, and code—based on patterns learned from training data.\n\n### Core Model Architectures\n- **Transformers (e.g. Gemini, GPT, Claude)**: Process sequences in parallel using self-attention mechanisms to generate coherent natural language and code.\n- **Diffusion Models (e.g. Imagen, Stable Diffusion)**: Generate high-fidelity images by iteratively removing Gaussian noise from random latents.\n- **Variational Autoencoders (VAEs) & GANs**: Useful for synthetic tabular data, voice synthesis, and image augmentation.\n\n### Practical Applications\n- **Autonomous Agent Workflows**: Planning, tool calling, and multi-agent problem decomposition.\n- **Software Engineering**: Automated code completion, refactoring, and test generation.\n- **Knowledge Retrieval**: Semantic search and enterprise RAG systems.`,
          suggestedActions: [
            {
              type: 'CREATE_PLAN',
              label: '📅 Create 30-Day Learning Plan',
              prompt: 'Create a 30 day plan to learn Generative AI',
              category: 'STUDY',
              targetDays: 30,
              dailyHours: 2
            },
            {
              type: 'EXPLAIN_MORE',
              label: '🧠 How do LLMs work?',
              prompt: 'How do Large Language Models work under the hood?'
            }
          ],
          workflowRequired: false
        };
      }

      // 5. DBMS / Database Normalization
      if (/normalization|1nf|2nf|3nf|bcnf|dbms/i.test(text)) {
        return {
          mode: 'EXPLANATION',
          intent: 'EXPLANATION',
          title: 'Database Normalization Explained',
          message: `**Database Normalization** is a systematic technique in relational database design that organizes tables to minimize data redundancy and prevent insert, update, and delete anomalies.\n\n### The Core Normal Forms:\n\n1. **First Normal Form (1NF)**:\n   - Each column must contain atomic (indivisible) values.\n   - No repeating groups or arrays in columns.\n   - Every row must have a unique identifier (Primary Key).\n\n2. **Second Normal Form (2NF)**:\n   - Must be in 1NF.\n   - Eliminates **partial dependencies** (every non-prime attribute must depend on the *entire* candidate key, not a subset of a composite key).\n\n3. **Third Normal Form (3NF)**:\n   - Must be in 2NF.\n   - Eliminates **transitive dependencies** (if $A \\rightarrow B$ and $B \\rightarrow C$, then non-prime attribute $C$ cannot depend on non-prime attribute $B$).\n\n4. **Boyce-Codd Normal Form (BCNF)**:\n   - A stricter version of 3NF.\n   - For every functional dependency $X \\rightarrow Y$, $X$ must be a **Super Key**.\n\n### Summary Rule of Thumb\n*"Every non-key attribute must depend on the key (1NF), the whole key (2NF), and nothing but the key (3NF), so help me Codd."*`,
          suggestedActions: [
            {
              type: 'GENERATE_DOC',
              label: '📝 Generate DBMS Study Notes',
              prompt: 'Generate comprehensive notes about DBMS Normalization'
            },
            {
              type: 'CREATE_PLAN',
              label: '📅 Create 10-Day DBMS Study Plan',
              prompt: 'Create a 10 day DBMS study schedule for 3 hours a day',
              category: 'STUDY',
              targetDays: 10,
              dailyHours: 3
            }
          ],
          workflowRequired: false
        };
      }

      // 6. Coding & Algorithms (Language-Aware Dynamic Fallback)
      if (/python/i.test(text)) {
        const pythonCode = `# 1. Variables & Data Types
name = "LifeOps AI"
version = 2.0
is_active = True
skills = ["Agents", "Workflows", "Automation"]
user_info = {"role": "Engineer", "level": "Senior"}

# 2. Functions & Control Flow
def execute_task(task_name: str, priority: int = 1) -> dict:
    if priority > 5:
        status = "CRITICAL"
    else:
        status = "STANDARD"
    return {"task": task_name, "status": status, "completed": True}

# 3. List Comprehension & Iteration
results = [execute_task(skill) for skill in skills]
print(f"Executed {len(results)} tasks successfully!")`;

        return {
          mode: 'CODE',
          intent: 'CODING',
          title: 'Python Fundamentals & Syntax Guide',
          message: `### Python Fundamentals Overview\n\nPython is a versatile, readable, high-level language. Here is a breakdown of the core building blocks:\n\n1. **Variables & Data Types**: Strings (\`str\`), Integers (\`int\`), Floats (\`float\`), Booleans (\`bool\`).\n2. **Collections**: Lists (\`[]\`), Dictionaries (\`{}\`), Tuples (\`()\`), Sets (\`set()\`).\n3. **Functions**: Defined with \`def\`, supports default parameters and type annotations.\n4. **Control Flow**: Indentation-based \`if/elif/else\` and \`for/while\` loops.\n\n\`\`\`python\n${pythonCode}\n\`\`\`\n\n### Next Steps\nWould you like to explore Object-Oriented Programming (Classes), Fast API web servers, or data analysis with Pandas?`,
          code: {
            language: 'python',
            snippet: pythonCode,
            explanation: 'Clean Python syntax covering data types, functions, and list comprehensions.'
          },
          suggestedActions: [
            {
              type: 'CODE_DEMO',
              label: '🐍 Python Data Structures Deep Dive',
              prompt: 'Explain Python Lists vs Dictionaries with examples'
            },
            {
              type: 'CREATE_PLAN',
              label: '📅 Create 30-Day Python Mastery Plan',
              prompt: 'Create a 30-day Python learning plan for beginners',
              category: 'STUDY',
              targetDays: 30,
              dailyHours: 2
            }
          ],
          workflowRequired: false
        };
      }

      if (/binary search|c\+\+|cpp|algorithm/i.test(text)) {
        const cppCode = `#include <iostream>
#include <vector>

int binarySearch(const std::vector<int>& arr, int target) {
    int left = 0, right = arr.size() - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}

int main() {
    std::vector<int> data = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};
    int target = 23;
    int idx = binarySearch(data, target);
    std::cout << (idx != -1 ? "Found at index " + std::to_string(idx) : "Not found") << std::endl;
    return 0;
}`;
        return {
          mode: 'CODE',
          intent: 'CODING',
          title: 'Binary Search Implementation',
          message: `Here is the clean implementation with $O(\\log n)$ complexity:\n\n\`\`\`cpp\n${cppCode}\n\`\`\`\n\n### Complexity Analysis\n- **Time**: $O(\\log n)$ in average and worst case.\n- **Space**: $O(1)$ auxiliary space.\n- **Pre-condition**: Array MUST be sorted.`,
          code: {
            language: 'cpp',
            snippet: cppCode,
            explanation: 'Iterative binary search with overflow-safe midpoint calculation.'
          },
          suggestedActions: [
            {
              type: 'CODE_DEMO',
              label: '🔄 Python Implementation',
              prompt: 'Write binary search in Python with type hints'
            }
          ],
          workflowRequired: false
        };
      }

      // 7. Generic Intelligent Conversational Assistant (for ANY other query)
      return {
        mode: 'EXPLANATION',
        intent: classification.intent || 'GENERAL_QA',
        title: `LifeOps AI: ${message.slice(0, 40)}`,
        message: `### Overview: ${message}\n\nHere is a comprehensive breakdown to address your request:\n\n1. **Core Concept & Analysis**: Understanding the essential elements and context of "${message}".\n2. **Actionable Recommendations**: Clear, practical steps you can take immediately.\n3. **Long-Term Optimization**: How to structure and optimize this workflow for the best outcomes.\n\n*Would you like me to elaborate on any specific detail, generate a structured document, or build a multi-day execution plan?*`,
        suggestedActions: [
          {
            type: 'CREATE_PLAN',
            label: '📅 Create a Structured Execution Plan',
            prompt: `Create a 7-day milestone plan for: ${message}`,
            category: 'PERSONAL',
            targetDays: 7,
            dailyHours: 2
          },
          {
            type: 'EXPLAIN_MORE',
            label: '🔍 Dig Deeper into Details',
            prompt: `Explain more details and step-by-step guidance for: ${message}`
          }
        ],
        workflowRequired: false
      };
    };

    // If Gemini model is active, generate dynamic structured JSON
    return geminiService.generateStructuredOutput({
      prompt,
      systemInstruction,
      schema: generalChatResponseSchema,
      schemaName: 'GeneralChatResponse',
      fallbackGenerator
    });
  }
}

module.exports = new ChatService();
