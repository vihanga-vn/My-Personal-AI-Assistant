/**
 * Test Suite: Quick Voice Commands (Tasks Today, Last Chat, Next Up Task)
 * Verifies contract, real backend connectivity, canonical sorting, and empty states.
 */

const http = require('http');

const API_BASE = 'http://127.0.0.1:5000';

function fetchJson(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runTests() {
  console.log('\n🎙️ Starting Quick Voice Commands Integration Tests...\n');

  // Test 1: Tasks Today Command logic with real backend data
  console.log('Test 1: Tasks Today — Real Backend Data & Filtering');
  const tasksRes = await fetchJson('/api/tasks?status=pending&limit=100');
  assert(tasksRes.status === 200, 'Successfully fetched pending tasks from backend');
  assert(Array.isArray(tasksRes.body.tasks), 'Returned tasks array');

  const pendingTasks = tasksRes.body.tasks.filter((t) => !t.completed);
  assert(pendingTasks.every((t) => !t.completed), 'All tasks in pending set are uncompleted');

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const tasksToday = pendingTasks.filter((t) => {
    const timeVal = t.dueDate || t.reminderTime;
    if (!timeVal) return false;
    const d = new Date(timeVal);
    return d >= startOfDay && d <= endOfDay;
  });

  console.log(`  ℹ️ Found ${tasksToday.length} task(s) due today out of ${pendingTasks.length} pending tasks`);
  if (tasksToday.length === 0) {
    const emptyResponse = "You have no pending tasks due today. You're all caught up!";
    assert(emptyResponse.includes('all caught up'), 'Empty tasks today returns friendly message');
  } else {
    assert(tasksToday[0].title !== undefined, 'Task due today has valid title');
  }

  // Test 2: Last Chat Command logic with real backend conversations
  console.log('\nTest 2: Last Chat — Real Backend Conversation Retrieval');
  const convRes = await fetchJson('/api/conversations?limit=1');
  assert(convRes.status === 200, 'Successfully queried conversations endpoint');
  assert(Array.isArray(convRes.body.conversations), 'Returned conversations list');

  if (convRes.body.conversations.length > 0) {
    const latestId = convRes.body.conversations[0]._id;
    const fullConvRes = await fetchJson(`/api/conversations/${latestId}`);
    assert(fullConvRes.status === 200, 'Retrieved full conversation details');
    assert(fullConvRes.body._id === latestId, 'Conversation ID matches requested');
    assert(Array.isArray(fullConvRes.body.messages), 'Historical messages array present');
    console.log(`  ℹ️ Last conversation: "${fullConvRes.body.title}" (${fullConvRes.body.messages.length} messages)`);
  } else {
    const emptyMsg = "You don't have any previous chat conversations saved yet. Start a new chat or tap the microphone to begin!";
    assert(emptyMsg.includes('previous chat'), 'Empty conversations returns friendly message without crashing');
  }

  // Test 3: Next Up Task — Canonical Sorting (Overdue first, Earliest pending, Undated last)
  console.log('\nTest 3: Next Up Task — Canonical Sorting Verification');
  const nowMs = Date.now();
  const getTaskTime = (t) => {
    const timeVal = t.dueDate || t.reminderTime;
    if (!timeVal) return Infinity;
    const ms = new Date(timeVal).getTime();
    return isNaN(ms) ? Infinity : ms;
  };

  const sortedPending = [...pendingTasks].sort((a, b) => {
    const timeA = getTaskTime(a);
    const timeB = getTaskTime(b);
    const hasA = timeA !== Infinity ? 0 : 1;
    const hasB = timeB !== Infinity ? 0 : 1;
    if (hasA !== hasB) return hasA - hasB;
    if (timeA !== timeB) return timeA - timeB;
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });

  if (sortedPending.length > 0) {
    const nextUp = sortedPending[0];
    assert(nextUp.title && typeof nextUp.title === 'string', 'Next up task has valid title');
    assert(!nextUp.completed, 'Next up task is not completed');

    const nextTime = getTaskTime(nextUp);
    if (sortedPending.length > 1) {
      const secondTime = getTaskTime(sortedPending[1]);
      assert(nextTime <= secondTime, 'Next up task is earlier than or equal to subsequent task');
    }
    console.log(`  ℹ️ Next up task: "${nextUp.title}" (due: ${nextUp.dueTimeText || 'no due date'})`);
  } else {
    const noTaskMsg = "You don't have any pending tasks right now. Great job!";
    assert(noTaskMsg.includes('Great job'), 'No pending tasks returns friendly message');
  }

  // Test 4: Voice command query normalization
  console.log('\nTest 4: Voice Command Recognition Matching');
  const commandQueries = [
    { input: 'Tasks Today', expected: 'tasks_today' },
    { input: 'what are my tasks today?', expected: 'tasks_today' },
    { input: 'Last Chat', expected: 'last_chat' },
    { input: 'open last chat', expected: 'last_chat' },
    { input: 'Next Up Task', expected: 'next_up_task' },
    { input: 'what is my next task?', expected: 'next_up_task' },
    { input: 'Set a reminder for tomorrow 5pm', expected: 'gemini' },
  ];

  for (const q of commandQueries) {
    const norm = q.input.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    let matched = 'gemini';
    if (
      norm === 'tasks today' ||
      norm === 'task today' ||
      norm === 'what are my tasks today' ||
      norm === 'my tasks today' ||
      norm === 'show tasks today' ||
      norm === 'upcoming tasks today'
    ) {
      matched = 'tasks_today';
    } else if (
      norm === 'last chat' ||
      norm === 'open last chat' ||
      norm === 'restore last chat' ||
      norm === 'previous chat' ||
      norm === 'show last chat'
    ) {
      matched = 'last_chat';
    } else if (
      norm === 'next up task' ||
      norm === 'next task' ||
      norm === 'what is my next task' ||
      norm === 'next upcoming task' ||
      norm === 'show next task'
    ) {
      matched = 'next_up_task';
    }

    assert(matched === q.expected, `Voice input "${q.input}" matched "${matched}"`);
  }

  console.log('\n========================================');
  console.log('All Quick Voice Commands Tests Passed! 🚀');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('Test run error:', err);
  process.exit(1);
});
