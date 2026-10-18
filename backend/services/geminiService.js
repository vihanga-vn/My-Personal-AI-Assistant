const { GoogleGenAI, Type } = require('@google/genai');
const memoryService = require('./memoryService');
const taskService = require('./taskService');
const { DEFAULT_TIMEZONE, formatHumanTime } = require('../utils/dateTimeUtils');

/**
 * Service to interact with the Google Gemini API using the official @google/genai SDK.
 * Features:
 * - Reads GEMINI_API_KEY from backend environment variables.
 * - Persistent Personal Memory via Function Calling / Tools.
 * - Task and Reminder Management via Function Calling / Tools.
 * - Asia/Colombo Timezone awareness with date validation.
 * - Ambiguous date clarification.
 * - Database operation confirmation before user feedback.
 */

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    const error = new Error('GEMINI_API_KEY is not configured in backend environment variables.');
    error.statusCode = 500;
    error.code = 'CONFIG_ERROR';
    throw error;
  }
  return new GoogleGenAI({ apiKey });
}

// Function declarations for Gemini Tool Calling
const assistantToolDeclarations = {
  functionDeclarations: [
    // Memory Tools
    {
      name: 'save_personal_memory',
      description:
        'Save an important durable personal fact, preference, habit, or routine about the user to persistent storage. ' +
        'CRITICAL: Only call when user shares a personal preference or says "remember that...". DO NOT call for tasks/reminders or casual chat.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'Concise summary of the memory (e.g., "Prefers Ethiopian Yirgacheffe").',
          },
          detail: {
            type: Type.STRING,
            description: 'Full descriptive text of the personal fact or preference.',
          },
          category: {
            type: Type.STRING,
            description: 'Category: Preferences, Personal, Work, Health, Finance, or General.',
          },
          importance: {
            type: Type.STRING,
            description: 'Priority level: Low, Medium, or High.',
          },
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Optional tags or keywords.',
          },
        },
        required: ['title', 'detail', 'category'],
      },
    },
    {
      name: 'search_personal_memories',
      description: 'Search the user\'s persistent personal memories in MongoDB to look up preferences, past notes, or facts.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: 'Keywords to search in saved personal memories.',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'delete_personal_memory',
      description: 'Delete or remove a saved personal memory when the user explicitly requests to forget or delete it.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: 'Title or keywords identifying the memory to forget or delete.',
          },
        },
        required: ['query'],
      },
    },

    // Task and Reminder Tools
    {
      name: 'create_task_or_reminder',
      description:
        'Create a new task, deadline, or one-time notification reminder in the user\'s schedule. ' +
        'Compute exact ISO 8601 strings (e.g. 2026-10-18T10:00:00+05:30) using the user\'s current local time in Asia/Colombo. ' +
        'If the time or date is ambiguous (e.g. "remind me later", "call mom at 5" without AM/PM or date), DO NOT call this tool; ask for clarification.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'The title or task description (e.g., "Review System Architecture", "Call dentist").',
          },
          description: {
            type: Type.STRING,
            description: 'Optional additional notes or details.',
          },
          category: {
            type: Type.STRING,
            description: 'Work, University, Health, Finance, Hangouts, Personal, or Other.',
          },
          priority: {
            type: Type.STRING,
            description: 'Priority: Low, Medium, High, or Urgent.',
          },
          dueDate: {
            type: Type.STRING,
            description: 'Target due date/time formatted as an ISO 8601 string (e.g. "2026-10-18T15:30:00+05:30").',
          },
          hasReminder: {
            type: Type.BOOLEAN,
            description: 'True if a notification alarm or reminder was requested.',
          },
          reminderTime: {
            type: Type.STRING,
            description: 'Exact ISO 8601 timestamp when local phone reminder should fire.',
          },
        },
        required: ['title'],
      },
    },
    {
      name: 'list_tasks_and_reminders',
      description: 'List the user\'s tasks and reminders from the database (e.g., tasks for today, upcoming deadlines).',
      parameters: {
        type: Type.OBJECT,
        properties: {
          status: {
            type: Type.STRING,
            description: 'Filter: "pending", "completed", or "all".',
          },
          dateFilter: {
            type: Type.STRING,
            description: 'Date filter: "today", "upcoming", or "all".',
          },
          category: {
            type: Type.STRING,
            description: 'Optional category filter.',
          },
        },
      },
    },
    {
      name: 'complete_task',
      description: 'Mark a task or reminder as completed when the user finishes it or asks to mark it done.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          taskIdentifier: {
            type: Type.STRING,
            description: 'Title, keyword, or ID of the task to complete.',
          },
        },
        required: ['taskIdentifier'],
      },
    },
    {
      name: 'reschedule_task',
      description: 'Reschedule an existing task or reminder to a new date or time.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          taskIdentifier: {
            type: Type.STRING,
            description: 'Title or ID of the task to reschedule.',
          },
          newDueDate: {
            type: Type.STRING,
            description: 'New ISO 8601 due date/time.',
          },
          newReminderTime: {
            type: Type.STRING,
            description: 'New ISO 8601 reminder time.',
          },
        },
        required: ['taskIdentifier'],
      },
    },
    {
      name: 'cancel_task_or_reminder',
      description: 'Cancel, remove, or delete a task or scheduled reminder from the database.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          taskIdentifier: {
            type: Type.STRING,
            description: 'Title or ID of the task to cancel.',
          },
        },
        required: ['taskIdentifier'],
      },
    },
  ],
};

/**
 * Executes tool calls against backend services and databases.
 */
async function executeAssistantTool(toolCall) {
  const { name, args, id } = toolCall;
  console.log(`[Assistant Tool Execution]: ${name}`, JSON.stringify(args));

  try {
    // 1. Memory: Save
    if (name === 'save_personal_memory') {
      const { title, detail, category, importance, tags } = args;
      if (!title || !detail) {
        return {
          id,
          name,
          response: { output: { success: false, error: 'Both title and detail are required.' } },
        };
      }
      const saved = await memoryService.createMemory({
        title,
        detail,
        category: category || 'General',
        importance: importance || 'Medium',
        tags: tags || [],
        source: 'chat',
      });
      return {
        id,
        name,
        operation: 'save_memory',
        memory: saved,
        response: {
          output: {
            success: true,
            confirmedInDatabase: true,
            id: String(saved._id),
            title: saved.title,
            message: `Memory "${saved.title}" saved successfully.`,
          },
        },
      };
    }

    // 2. Memory: Search
    if (name === 'search_personal_memories') {
      const { query } = args;
      const results = await memoryService.searchMemories(query, { limit: 5 });
      return {
        id,
        name,
        operation: 'search_memories',
        response: {
          output: {
            success: true,
            count: results.length,
            matches: results.map((m) => ({
              id: String(m._id),
              title: m.title,
              detail: m.detail,
              category: m.category,
            })),
          },
        },
      };
    }

    // 3. Memory: Delete
    if (name === 'delete_personal_memory') {
      const { query } = args;
      const deleted = await memoryService.deleteMemory(query);
      return {
        id,
        name,
        operation: 'delete_memory',
        response: {
          output: {
            success: true,
            confirmedDeleted: true,
            title: deleted.title,
          },
        },
      };
    }

    // 4. Task: Create
    if (name === 'create_task_or_reminder') {
      const { title, description, category, priority, dueDate, hasReminder, reminderTime } = args;
      const saved = await taskService.createTask({
        title,
        description,
        category: category || 'Personal',
        priority: priority || 'Medium',
        dueDate,
        reminderTime: hasReminder || reminderTime ? (reminderTime || dueDate) : null,
        timeZone: DEFAULT_TIMEZONE,
        source: 'chat',
      });

      return {
        id,
        name,
        operation: 'create_task',
        task: saved,
        response: {
          output: {
            success: true,
            confirmedInDatabase: true,
            id: String(saved._id),
            title: saved.title,
            category: saved.category,
            priority: saved.priority,
            dueTimeText: saved.dueTimeText,
            hasReminder: saved.hasReminder,
            reminderTime: saved.reminderTime,
            message: `Task "${saved.title}" saved to database. ${saved.hasReminder ? `Reminder set for ${saved.dueTimeText}.` : ''}`,
          },
        },
      };
    }

    // 5. Task: List
    if (name === 'list_tasks_and_reminders') {
      const { status, dateFilter, category } = args;
      const data = await taskService.listTasks({
        status: status || 'pending',
        dateFilter: dateFilter || 'all',
        category,
        limit: 10,
      });

      return {
        id,
        name,
        operation: 'list_tasks',
        response: {
          output: {
            success: true,
            total: data.total,
            tasks: data.tasks.map((t) => ({
              id: String(t._id),
              title: t.title,
              dueTimeText: t.dueTimeText,
              category: t.category,
              priority: t.priority,
              completed: t.completed,
              hasReminder: t.hasReminder,
            })),
          },
        },
      };
    }

    // 6. Task: Complete
    if (name === 'complete_task') {
      const { taskIdentifier } = args;
      const completed = await taskService.completeTask(taskIdentifier);
      return {
        id,
        name,
        operation: 'complete_task',
        task: completed,
        response: {
          output: {
            success: true,
            confirmedInDatabase: true,
            id: String(completed._id),
            title: completed.title,
            message: `Task "${completed.title}" has been marked as completed.`,
          },
        },
      };
    }

    // 7. Task: Reschedule
    if (name === 'reschedule_task') {
      const { taskIdentifier, newDueDate, newReminderTime } = args;
      const rescheduled = await taskService.rescheduleTask(taskIdentifier, {
        newDueDate,
        newReminderTime,
        timeZone: DEFAULT_TIMEZONE,
      });
      return {
        id,
        name,
        operation: 'reschedule_task',
        task: rescheduled,
        response: {
          output: {
            success: true,
            confirmedInDatabase: true,
            id: String(rescheduled._id),
            title: rescheduled.title,
            dueTimeText: rescheduled.dueTimeText,
            message: `Task "${rescheduled.title}" rescheduled to ${rescheduled.dueTimeText}.`,
          },
        },
      };
    }

    // 8. Task: Cancel / Delete
    if (name === 'cancel_task_or_reminder') {
      const { taskIdentifier } = args;
      const cancelled = await taskService.cancelTaskOrReminder(taskIdentifier);
      return {
        id,
        name,
        operation: 'cancel_task',
        task: cancelled,
        response: {
          output: {
            success: true,
            confirmedDeleted: true,
            title: cancelled.title,
            message: `Task/reminder "${cancelled.title}" was cancelled and removed.`,
          },
        },
      };
    }

    return {
      id,
      name,
      response: { output: { success: false, error: `Unknown tool: ${name}` } },
    };
  } catch (err) {
    console.error(`[Tool Execution Error] ${name}:`, err.message);
    return {
      id,
      name,
      response: {
        output: {
          success: false,
          error: `Operation failed: ${err.message}`,
        },
      },
    };
  }
}

/**
 * Generate a response from Gemini with full Tool Calling (memories, tasks, reminders).
 */
async function generateAssistantResponse(message, history = []) {
  const ai = getGeminiClient();
  const preferredModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const defaultCandidates = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
  ];
  const candidateModels = Array.from(new Set([preferredModel, ...defaultCandidates]));

  // 1. Compute current time reference in Asia/Colombo
  const now = new Date();
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: DEFAULT_TIMEZONE,
    dateStyle: 'full',
    timeStyle: 'long',
  });
  const isoFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const colomboNowString = timeFormatter.format(now);
  const colomboDateString = isoFormatter.format(now); // YYYY-MM-DD

  // 2. Pre-search relevant personal memories
  let contextAdditions = '';
  try {
    const relevantMemories = await memoryService.searchMemories(message, { limit: 3 });
    if (relevantMemories.length > 0) {
      const memoryLines = relevantMemories
        .map((m) => `• [${m.category}] ${m.title}: ${m.detail}`)
        .join('\n');
      contextAdditions += `\n[RELEVANT SAVED MEMORIES]:\n${memoryLines}\n`;
    }
  } catch (_) {}

  // 3. Pre-fetch upcoming tasks for context
  try {
    const activeTasks = await taskService.listTasks({ status: 'pending', limit: 4 });
    if (activeTasks.tasks.length > 0) {
      const taskLines = activeTasks.tasks
        .map((t) => `• [${t.category}] ${t.title} (${t.dueTimeText || 'No time set'})`)
        .join('\n');
      contextAdditions += `\n[UPCOMING ACTIVE TASKS]:\n${taskLines}\n`;
    }
  } catch (_) {}

  const systemInstruction =
    'You are Vox, a friendly, concise, and proactive personal AI assistant.\n' +
    `REFERENCE USER LOCAL TIME: ${colomboNowString} (Date: ${colomboDateString}, TimeZone: ${DEFAULT_TIMEZONE}, UTC+05:30).\n\n` +
    'RULES FOR TASKS & REMINDERS:\n' +
    '1. When the user asks to create a task, set a reminder, or schedule a deadline, call create_task_or_reminder with exact ISO 8601 strings in Asia/Colombo (+05:30).\n' +
    '2. AMBIGUOUS DATE/TIME RULE: If the user says "remind me later", "call mom at 5" without AM/PM or date, or mentions a reminder without a specific time or date, DO NOT guess or call the tool. Ask a polite clarifying question to confirm the exact time and date.\n' +
    '3. If the user asks what tasks or deadlines they have, use list_tasks_and_reminders.\n' +
    '4. If the user marks a task done, call complete_task. If they reschedule, call reschedule_task. If they cancel, call cancel_task_or_reminder.\n' +
    '5. Never claim a task or reminder was scheduled unless confirmed by the tool response.\n\n' +
    'RULES FOR PERSONAL MEMORY:\n' +
    '1. Call save_personal_memory only when the user shares durable personal preferences or explicitly says "remember that...".\n' +
    '2. Never save general chat or transient banter.\n' +
    contextAdditions;

  // 4. Format ephemeral chat history
  const formattedHistory = [];
  if (Array.isArray(history) && history.length > 0) {
    for (const item of history) {
      if (!item || !item.text) continue;
      formattedHistory.push({
        role: item.sender === 'user' ? 'user' : 'model',
        parts: [{ text: item.text }],
      });
    }
  }

  let lastError;

  for (let i = 0; i < candidateModels.length; i++) {
    const modelToTry = candidateModels[i];
    try {
      const chat = ai.chats.create({
        model: modelToTry,
        history: formattedHistory,
        config: {
          systemInstruction,
          tools: [assistantToolDeclarations],
        },
      });

      // Helper to gracefully retry transient 503 / high-demand server spikes
      const sendWithRetry = async (msgPayload, maxRetries = 2) => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            return await chat.sendMessage(msgPayload);
          } catch (err) {
            const errText = err.message || '';
            const isTransient =
              errText.includes('503') ||
              errText.includes('UNAVAILABLE') ||
              errText.includes('high demand');
            if (isTransient && attempt < maxRetries) {
              console.warn(`[GeminiService] Transient model spike, retrying in 2s (attempt ${attempt + 1}/${maxRetries})...`);
              await new Promise((r) => setTimeout(r, 2000));
              continue;
            }
            throw err;
          }
        }
      };

      let response = await sendWithRetry({ message });
      const executedOperations = [];

      // Tool execution loop
      if (response.functionCalls && response.functionCalls.length > 0) {
        const toolResponses = [];

        for (const call of response.functionCalls) {
          const executionResult = await executeAssistantTool(call);
          executedOperations.push({
            tool: call.name,
            operation: executionResult.operation,
            memory: executionResult.memory,
            task: executionResult.task,
          });

          toolResponses.push({
            functionResponse: {
              name: executionResult.name,
              response: executionResult.response,
              id: executionResult.id,
            },
          });
        }

        response = await sendWithRetry({ message: toolResponses });
      }

      const reply = response.text || 'I processed your request, but did not generate a text response.';

      return {
        reply,
        model: modelToTry,
        executedOperations: executedOperations.length > 0 ? executedOperations : undefined,
      };
    } catch (error) {
      lastError = error;
      const isQuota =
        (error.message || '').includes('429') ||
        (error.message || '').includes('quota') ||
        (error.message || '').includes('RESOURCE_EXHAUSTED');
      if (isQuota && i < candidateModels.length - 1) {
        console.warn(
          `[GeminiService] Model ${modelToTry} quota hit, attempting fallback to ${candidateModels[i + 1]}...`
        );
        continue;
      }
      break;
    }
  }

  // Handle final error if all models failed
  const error = lastError;
  console.error('[GeminiService Error]:', error ? (error.message || error) : 'All candidate models failed');

  const errorMessage = error ? (error.message || '') : '';
  const err = new Error();

  if (
    errorMessage.includes('429') ||
    errorMessage.includes('RESOURCE_EXHAUSTED') ||
    errorMessage.toLowerCase().includes('quota')
  ) {
    err.statusCode = 429;
    err.message = 'Free tier rate limit reached. Please wait a moment and try again.';
  } else if (
    errorMessage.includes('API_KEY_INVALID') ||
    errorMessage.includes('401') ||
    errorMessage.includes('403')
  ) {
    err.statusCode = 401;
    err.message = 'Invalid Gemini API key or unauthorized access.';
  } else if (
    errorMessage.includes('ENOTFOUND') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('fetch failed')
  ) {
    err.statusCode = 503;
    err.message = 'Network error: Unable to reach Google Gemini API servers.';
  } else {
    err.statusCode = (error && (error.status || error.statusCode)) || 500;
    err.message = (error && error.message) || 'An error occurred while communicating with Gemini API.';
  }

  throw err;
}

module.exports = {
  generateAssistantResponse,
};
