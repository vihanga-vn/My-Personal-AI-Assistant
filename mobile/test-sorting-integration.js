const assert = require('assert');

/**
 * Integration Test for Task 2: Sorting Upcoming tasks by due date and time
 * Validates:
 * 1. Pending tasks are sorted by due date in ascending order (soonest first).
 * 2. Overdue unfinished tasks appear at the top, ordered from oldest to newest.
 * 3. Completed tasks are excluded from status=pending queries.
 * 4. Tasks without a valid due date appear after tasks with deadlines.
 * 5. Insertion order / createdAt does NOT dictate the sort order.
 */

const BASE_URL = 'http://localhost:5000';

async function runSortingTests() {
  console.log('🧪 Starting Task 2: Upcoming Task Due Date Sorting Integration Tests...\n');

  const createdIds = [];

  try {
    const now = Date.now();
    // 1. Task Overdue Oldest (due 3 days ago)
    const overdueOldest = new Date(now - 3 * 86400000).toISOString();
    // 2. Task Overdue Newer (due 1 day ago)
    const overdueNewer = new Date(now - 1 * 86400000).toISOString();
    // 3. Task Soon (due in 2 hours)
    const dueSoon = new Date(now + 2 * 3600000).toISOString();
    // 4. Task Tomorrow (due in 24 hours)
    const dueTomorrow = new Date(now + 24 * 3600000).toISOString();
    // 5. Task Next Week (due in 7 days)
    const dueNextWeek = new Date(now + 7 * 86400000).toISOString();

    // Create tasks in JUMBLED insertion order to prove createdAt/insertion order is ignored!
    const testItems = [
      { title: 'SORT_TEST: Undated Task', dueDate: null, category: 'Personal' },
      { title: 'SORT_TEST: Due Next Week', dueDate: dueNextWeek, category: 'Work' },
      { title: 'SORT_TEST: Overdue Newer', dueDate: overdueNewer, category: 'Finance' },
      { title: 'SORT_TEST: Due Soon', dueDate: dueSoon, category: 'Health' },
      { title: 'SORT_TEST: Overdue Oldest', dueDate: overdueOldest, category: 'University' },
      { title: 'SORT_TEST: Due Tomorrow', dueDate: dueTomorrow, category: 'Work' },
      { title: 'SORT_TEST: Completed Task', dueDate: dueSoon, category: 'Personal', completed: true },
    ];

    console.log('Step 1: Creating 7 test tasks in randomized/jumbled order...');
    for (const item of testItems) {
      const res = await fetch(`${BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      assert.strictEqual(res.status, 201, `Failed creating task: ${item.title}`);
      const data = await res.json();
      createdIds.push(data.task._id);

      if (item.completed) {
        // Mark it complete
        await fetch(`${BASE_URL}/api/tasks/${data.task._id}/complete`, { method: 'PATCH' });
      }
    }
    console.log('  ✅ Created all test tasks.');

    // Step 2: Query GET /api/tasks?status=pending
    console.log('\nStep 2: Query GET /api/tasks?status=pending & verify ordering');
    const queryRes = await fetch(`${BASE_URL}/api/tasks?status=pending&limit=100`);
    assert.strictEqual(queryRes.status, 200, 'GET /api/tasks should return 200');
    const queryData = await queryRes.json();

    // Filter to only our test tasks
    const testTasks = queryData.tasks.filter((t) => t.title.startsWith('SORT_TEST:'));
    console.log(`  Found ${testTasks.length} pending test tasks:`);
    testTasks.forEach((t, i) => {
      console.log(`    [${i + 1}] ${t.title} -> Due: ${t.dueDate || 'NONE'} (${t.dueTimeText})`);
    });

    // Validations
    assert.strictEqual(testTasks.length, 6, 'Completed task must be excluded from pending list (expected 6)');

    // 1st: Overdue Oldest
    assert.strictEqual(testTasks[0].title, 'SORT_TEST: Overdue Oldest', '1st task must be oldest overdue task');
    // 2nd: Overdue Newer
    assert.strictEqual(testTasks[1].title, 'SORT_TEST: Overdue Newer', '2nd task must be newer overdue task');
    // 3rd: Due Soon
    assert.strictEqual(testTasks[2].title, 'SORT_TEST: Due Soon', '3rd task must be soonest upcoming task');
    // 4th: Due Tomorrow
    assert.strictEqual(testTasks[3].title, 'SORT_TEST: Due Tomorrow', '4th task must be tomorrow task');
    // 5th: Due Next Week
    assert.strictEqual(testTasks[4].title, 'SORT_TEST: Due Next Week', '5th task must be next week task');
    // 6th: Undated
    assert.strictEqual(testTasks[5].title, 'SORT_TEST: Undated Task', '6th task must be the undated task at the bottom');

    console.log('\n  ✅ PASS: Exact ascending order verified!');
    console.log('  ✅ PASS: Overdue tasks properly kept at the top from oldest to newest!');
    console.log('  ✅ PASS: Completed tasks excluded from pending list!');
    console.log('  ✅ PASS: Undated task placed at bottom after all deadline tasks!');
  } finally {
    // Cleanup created test tasks
    console.log('\nStep 3: Cleaning up test tasks from MongoDB Atlas...');
    for (const id of createdIds) {
      try {
        await fetch(`${BASE_URL}/api/tasks/${id}`, { method: 'DELETE' });
      } catch (_) {}
    }
    console.log('  ✅ Cleanup complete.');
  }

  console.log('\n========================================');
  console.log('All Task 2 Sorting Tests Passed Successfully!');
  console.log('========================================\n');
}

runSortingTests().catch((err) => {
  console.error('\n❌ Sorting Integration Test Failed:', err);
  process.exit(1);
});
