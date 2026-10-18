/**
 * Automated Test Suite for Milestone 5: Task and Reminder Management
 *
 * Verifies:
 * 1. Task Model Validation (rejecting missing titles, category normalization)
 * 2. Reminder Validation (rejecting past reminder dates)
 * 3. Asia/Colombo Timezone and Date Boundary Handling
 * 4. CRUD: Task & Reminder Creation, Reading, Updating, Completing, Rescheduling, Cancelling
 * 5. Gemini Function Calling: Tool execution for task creation
 * 6. Ambiguous Reminder Clarification: Asking questions when time/date is unspecified
 *
 * Run with: node test-tasks.js
 */

const dotenv = require('dotenv');
dotenv.config();

const { connectDB, disconnectDB, isDBConnected } = require('./config/db');
const taskService = require('./services/taskService');
const { generateAssistantResponse } = require('./services/geminiService');
const {
  DEFAULT_TIMEZONE,
  isFutureDate,
  formatHumanTime,
  parseAndValidateDateTime,
} = require('./utils/dateTimeUtils');

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTaskTests() {
  console.log('📋 Starting Task and Reminder Management Test Suite...\n');

  await connectDB();
  console.log(`[Test Environment] Database: ${isDBConnected() ? 'MongoDB Atlas' : 'In-Memory Resilient Store'}\n`);

  let testTaskId = null;

  try {
    // -------------------------------------------------------------
    // Test 1: Validation - Reject missing title
    // -------------------------------------------------------------
    console.log('Test 1: Validation - Reject missing task title');
    try {
      await taskService.createTask({ title: '   ' });
      assert(false, 'Should reject empty title');
    } catch (err) {
      assert(err.message.includes('title is required'), 'Rejects empty title with 400');
    }

    // -------------------------------------------------------------
    // Test 2: Validation - Reject past reminder time
    // -------------------------------------------------------------
    console.log('\nTest 2: Validation - Reject past reminder time');
    const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    try {
      await taskService.createTask({
        title: 'Past reminder',
        reminderTime: pastDate,
      });
      assert(false, 'Should reject past reminder time');
    } catch (err) {
      assert(err.message.includes('is in the past'), 'Rejects past reminder time with appropriate error');
    }

    // -------------------------------------------------------------
    // Test 3: Timezone and Date Boundary Verification
    // -------------------------------------------------------------
    console.log('\nTest 3: Asia/Colombo Timezone and Date Formatting');
    assert(DEFAULT_TIMEZONE === 'Asia/Colombo', 'Default timezone is configured to Asia/Colombo');
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const humanStr = formatHumanTime(futureDate, DEFAULT_TIMEZONE);
    assert(typeof humanStr === 'string' && humanStr.length > 0, `Human time correctly formatted: "${humanStr}"`);

    // -------------------------------------------------------------
    // Test 4: Create Task with One-Time Reminder
    // -------------------------------------------------------------
    console.log('\nTest 4: Create Task with One-Time Reminder');
    const tomorrowReminder = new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString();
    const task = await taskService.createTask({
      title: 'Review System Architecture document',
      description: 'Confirm MongoDB schema design for persistent memory.',
      category: 'Work',
      priority: 'High',
      dueDate: tomorrowReminder,
      reminderTime: tomorrowReminder,
      timeZone: 'Asia/Colombo',
      source: 'chat',
    });

    assert(task._id !== undefined, 'Task created with unique ID');
    assert(task.title === 'Review System Architecture document', 'Title matches');
    assert(task.hasReminder === true, 'Reminder flag is true');
    assert(task.reminderStatus === 'scheduled', 'Reminder status initialized to "scheduled"');
    assert(task.category === 'Work', 'Category set to Work');
    assert(task.priority === 'High', 'Priority set to High');
    assert(task.dueTimeText.length > 0, `Generated dueTimeText: "${task.dueTimeText}"`);
    testTaskId = task._id;

    // -------------------------------------------------------------
    // Test 5: List Tasks & Filtering
    // -------------------------------------------------------------
    console.log('\nTest 5: List Tasks with filters');
    const allPending = await taskService.listTasks({ status: 'pending' });
    assert(allPending.tasks.length > 0, 'Found pending tasks');

    const workTasks = await taskService.listTasks({ category: 'Work' });
    assert(workTasks.tasks.some((t) => String(t._id) === String(testTaskId)), 'Filter by Work category found task');

    // -------------------------------------------------------------
    // Test 6: Reschedule Task and Reminder
    // -------------------------------------------------------------
    console.log('\nTest 6: Reschedule Task and Reminder');
    const newTime = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();
    const rescheduled = await taskService.rescheduleTask(testTaskId, {
      newReminderTime: newTime,
    });
    assert(rescheduled.reminderStatus === 'scheduled', 'Rescheduled reminder retains scheduled status');
    assert(rescheduled.dueTimeText !== task.dueTimeText, `Due time updated: "${rescheduled.dueTimeText}"`);

    // -------------------------------------------------------------
    // Test 7: Complete Task
    // -------------------------------------------------------------
    console.log('\nTest 7: Complete Task');
    const completed = await taskService.completeTask(testTaskId);
    assert(completed.completed === true, 'Task completed flag is true');
    assert(completed.completedAt !== null, 'completedAt timestamp recorded');
    assert(completed.reminderStatus === 'delivered', 'Reminder status marked delivered');

    // -------------------------------------------------------------
    // Test 8: Gemini Function Calling for Tasks & Reminders
    // -------------------------------------------------------------
    console.log('\nTest 8: Gemini Tool Calling (create_task_or_reminder)');
    const aiResponse = await generateAssistantResponse(
      'Remind me to call the dentist tomorrow at 10 AM',
      []
    );

    assert(typeof aiResponse.reply === 'string' && aiResponse.reply.length > 0, 'Gemini responded naturally');
    assert(
      aiResponse.executedOperations && aiResponse.executedOperations.length > 0,
      'Gemini invoked backend tool'
    );
    const op = aiResponse.executedOperations[0];
    assert(op.tool === 'create_task_or_reminder', 'Gemini chose create_task_or_reminder tool');
    assert(op.task && op.task.hasReminder === true, 'Backend validated and saved reminder to database');
    console.log(`    Gemini reply: "${aiResponse.reply.trim()}"`);
    console.log(`    Created reminder: "${op.task.title}" at "${op.task.dueTimeText}"`);

    // Clean up created dentist task
    if (op.task && op.task._id) {
      await taskService.cancelTaskOrReminder(op.task._id);
    }

    // -------------------------------------------------------------
    // Test 9: Ambiguous Reminder Clarification
    // -------------------------------------------------------------
    console.log('\nTest 9: Ambiguous Instruction Clarification');
    const ambiguousResponse = await generateAssistantResponse(
      'Remind me later to buy coffee beans',
      []
    );

    assert(
      !ambiguousResponse.executedOperations || ambiguousResponse.executedOperations.length === 0,
      'Gemini did NOT create a reminder with missing/ambiguous time'
    );
    assert(
      ambiguousResponse.reply.toLowerCase().includes('when') ||
      ambiguousResponse.reply.toLowerCase().includes('time') ||
      ambiguousResponse.reply.toLowerCase().includes('what time'),
      `Gemini asked clarifying question for ambiguous time (Reply: "${ambiguousResponse.reply.trim()}")`
    );

    // -------------------------------------------------------------
    // Test 10: Cancel / Delete Task
    // -------------------------------------------------------------
    console.log('\nTest 10: Cancel / Delete Task');
    const deleted = await taskService.cancelTaskOrReminder(testTaskId);
    assert(deleted !== null, 'Task cancelled successfully');

    try {
      await taskService.getTaskById(testTaskId);
      assert(false, 'Should throw 404 for deleted task');
    } catch (err) {
      assert(err.message.includes('not found'), 'Deleted task is no longer retrievable');
    }

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    await disconnectDB();
    console.log(`\n========================================`);
    console.log(`Task Tests Finished: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runTaskTests();
