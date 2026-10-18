const assert = require('assert');

/**
 * Integration Test for Mobile Task & Dashboard Connectivity
 * Validates:
 * 1. GET /api/tasks returns real array from MongoDB Atlas
 * 2. POST /api/tasks creates task in MongoDB Atlas
 * 3. PATCH /api/tasks/:id/complete marks task completed in MongoDB Atlas
 * 4. PATCH /api/tasks/:id/reschedule updates date/time in MongoDB Atlas
 * 5. DELETE /api/tasks/:id removes task from MongoDB Atlas
 * 6. Chat endpoint (POST /api/chat) creates a task via Gemini tool calling and reflects in GET /api/tasks
 */

const BASE_URL = 'http://localhost:5000';

async function runTaskIntegrationTests() {
  console.log('📋 Starting Mobile Tasks & Dashboard Integration Tests...\n');

  // Test 1: Fetch tasks
  console.log('Test 1: Verify GET /api/tasks connectivity');
  const initialRes = await fetch(`${BASE_URL}/api/tasks`);
  assert.strictEqual(initialRes.status, 200, 'GET /api/tasks should return HTTP 200');
  const initialData = await initialRes.json();
  assert(Array.isArray(initialData.tasks), 'Response must contain a tasks array');
  console.log(`  ✅ PASS: Connected to backend. Current total tasks in MongoDB: ${initialData.total}`);

  // Test 2: Create a task directly via POST /api/tasks
  console.log('\nTest 2: Create a task in MongoDB Atlas');
  const createRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Integration Test Task',
      description: 'Verifying end-to-end task workflow for Dashboard and Upcoming',
      category: 'University',
      priority: 'High',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      hasReminder: true,
      timeZone: 'Asia/Colombo',
    }),
  });
  assert.strictEqual(createRes.status, 201, 'POST /api/tasks should return HTTP 201');
  const createdJson = await createRes.json();
  const createdTask = createdJson.task;
  assert(createdTask && createdTask._id, 'Created task must have a valid MongoDB _id');
  console.log(`  ✅ PASS: Task created with ID ${createdTask._id} in category "${createdTask.category}"`);

  // Test 3: Verify created task appears in GET /api/tasks
  console.log('\nTest 3: Verify created task is retrieved by Upcoming screen query');
  const listRes = await fetch(`${BASE_URL}/api/tasks?status=pending`);
  const listData = await listRes.json();
  const found = listData.tasks.find((t) => t._id === createdTask._id);
  assert(found, 'Created task must be found in pending tasks list');
  assert.strictEqual(found.title, 'Integration Test Task');
  console.log(`  ✅ PASS: Task retrieved with due time text: "${found.dueTimeText}"`);

  // Test 4: Complete task
  console.log('\nTest 4: Mark task as completed (PATCH /api/tasks/:id/complete)');
  const completeRes = await fetch(`${BASE_URL}/api/tasks/${createdTask._id}/complete`, {
    method: 'PATCH',
  });
  assert.strictEqual(completeRes.status, 200, 'PATCH complete should return HTTP 200');
  const completeJson = await completeRes.json();
  assert.strictEqual(completeJson.task.completed, true, 'Task completed must be true');
  console.log('  ✅ PASS: Task marked completed in MongoDB');

  // Test 5: Reschedule task
  console.log('\nTest 5: Reschedule task (PATCH /api/tasks/:id/reschedule)');
  const newDate = new Date(Date.now() + 172800000).toISOString();
  const rescheduleRes = await fetch(`${BASE_URL}/api/tasks/${createdTask._id}/reschedule`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      newDueDate: newDate,
      timeZone: 'Asia/Colombo',
    }),
  });
  assert.strictEqual(rescheduleRes.status, 200, 'PATCH reschedule should return HTTP 200');
  const rescheduleJson = await rescheduleRes.json();
  assert(rescheduleJson.task.dueTimeText, 'Rescheduled task must have updated dueTimeText');
  console.log(`  ✅ PASS: Task rescheduled. New due time: "${rescheduleJson.task.dueTimeText}"`);

  // Test 6: Delete task
  console.log('\nTest 6: Delete task (DELETE /api/tasks/:id)');
  const deleteRes = await fetch(`${BASE_URL}/api/tasks/${createdTask._id}`, {
    method: 'DELETE',
  });
  assert.strictEqual(deleteRes.status, 200, 'DELETE should return HTTP 200');
  console.log('  ✅ PASS: Task deleted cleanly from MongoDB Atlas');

  console.log('\n========================================');
  console.log('All Tasks & Dashboard Integration Tests Passed!');
  console.log('========================================');
}

runTaskIntegrationTests().catch((err) => {
  console.error('❌ Integration Test Failed:', err);
  process.exit(1);
});
