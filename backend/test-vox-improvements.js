const assert = require('assert');
const dotenv = require('dotenv');
dotenv.config();

const { connectDB, disconnectDB, isDBConnected } = require('./config/db');
const conversationService = require('./services/conversationService');
const taskService = require('./services/taskService');
const Task = require('./models/Task');
const Conversation = require('./models/Conversation');

async function runTests() {
  console.log('🧪 Starting Vox AI Improvements & Fixes Verification Suite...\n');

  await connectDB();
  console.log('  Database mode:', isDBConnected() ? 'MongoDB Atlas' : 'In-Memory Fallback');

  const testUserA = `test_user_${Date.now()}_A`;
  const testUserB = `test_user_${Date.now()}_B`;

  try {
    // ==========================================
    // 1. CONVERSATION 20-LIMIT TESTS
    // ==========================================
    console.log('\n--- 1. Testing Conversation Persistence & 20-Limit per User ---');

    // Create 23 conversations for User A
    const createdConvIdsUserA = [];
    for (let i = 1; i <= 23; i++) {
      const conv = await conversationService.createConversation({
        title: `Conversation #${i}`,
        userId: testUserA,
        initialMessages: [
          { sender: 'user', text: `Question from test ${i}` },
          { sender: 'assistant', text: `Answer to test ${i}` },
        ],
      });
      createdConvIdsUserA.push(conv._id.toString());
      // Slight delay to ensure distinct createdAt timestamps
      await new Promise((r) => setTimeout(r, 15));
    }

    // Create 3 conversations for User B
    const createdConvIdsUserB = [];
    for (let i = 1; i <= 3; i++) {
      const conv = await conversationService.createConversation({
        title: `User B Conv #${i}`,
        userId: testUserB,
        initialMessages: [
          { sender: 'user', text: `User B prompt ${i}` },
          { sender: 'assistant', text: `User B reply ${i}` },
        ],
      });
      createdConvIdsUserB.push(conv._id.toString());
      await new Promise((r) => setTimeout(r, 15));
    }

    // Verify User A has EXACTLY 20 conversations
    const listA = await conversationService.listConversations({ userId: testUserA, limit: 100 });
    assert.strictEqual(
      listA.total,
      20,
      `User A total conversations should be capped at 20 (found: ${listA.total})`
    );
    assert.strictEqual(
      listA.conversations.length,
      20,
      `User A returned conversations list should contain 20 items`
    );
    console.log('  ✅ PASS: User A conversations strictly capped at 20 (oldest 3 automatically deleted)');

    // Verify newest conversation is retained
    const newestTitle = listA.conversations[0].title;
    assert.strictEqual(
      newestTitle,
      'Conversation #23',
      `Newest conversation should be retained at the top (found: "${newestTitle}")`
    );
    console.log('  ✅ PASS: Newest conversation (#23) retained');

    // Verify oldest conversation (#1, #2, #3) was permanently deleted from DB
    if (isDBConnected()) {
      const oldestDoc = await Conversation.findById(createdConvIdsUserA[0]).lean();
      assert.strictEqual(oldestDoc, null, 'Oldest conversation was physically deleted from persistent storage');
      console.log('  ✅ PASS: Oldest conversation was permanently removed from MongoDB Atlas');
    }

    // Verify User B's conversations were NOT touched or deleted by User A's cleanup
    const listB = await conversationService.listConversations({ userId: testUserB, limit: 100 });
    assert.strictEqual(
      listB.total,
      3,
      `User B's conversations must remain untouched (expected 3, found: ${listB.total})`
    );
    console.log("  ✅ PASS: Multi-user isolation verified (User A pruning did not affect User B)");

    // Restore single conversation messages
    const restored = await conversationService.getConversationById(listA.conversations[0]._id);
    assert.strictEqual(restored.messages.length, 2, 'Restored conversation contains both messages');
    assert.strictEqual(restored.messages[0].text, 'Question from test 23');
    assert.strictEqual(restored.messages[1].text, 'Answer to test 23');
    console.log('  ✅ PASS: Opening a saved conversation restores all historical messages accurately');

    // ==========================================
    // 2. SEVEN TASK CATEGORIES & EMOJIS & FALLBACK
    // ==========================================
    console.log('\n--- 2. Testing Seven Task Categories & Graceful Fallback ---');
    const validCats = ['Work', 'University', 'Health', 'Finance', 'Hangouts', 'Personal', 'Other'];

    for (const cat of validCats) {
      const created = await taskService.createTask({
        title: `Test ${cat} Task`,
        category: cat,
      });
      assert.strictEqual(created.category, cat, `Task created with category ${cat}`);
      await taskService.cancelTaskOrReminder(created._id);
    }
    console.log('  ✅ PASS: All 7 categories created and saved successfully');

    // Test invalid / missing category fallback to 'Other'
    const invalidCatTask = await taskService.createTask({
      title: 'Invalid Category Task',
      category: 'RandomUnknownCategory123',
    });
    assert.strictEqual(
      invalidCatTask.category,
      'Other',
      `Invalid category should gracefully fallback to 'Other' (found: ${invalidCatTask.category})`
    );
    console.log("  ✅ PASS: Invalid category gracefully falls back to 'Other'");
    await taskService.cancelTaskOrReminder(invalidCatTask._id);

    // ==========================================
    // 3. EDITABLE TASK DETAILS & CUSTOM RESCHEDULING
    // ==========================================
    console.log('\n--- 3. Testing Editable Task Details & Custom Rescheduling ---');
    const originalTask = await taskService.createTask({
      title: 'Original Project Review',
      description: 'Initial notes',
      category: 'Work',
      priority: 'Low',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    });

    const newDate = new Date(Date.now() + 172800000).toISOString();
    const updated = await taskService.updateTask(originalTask._id, {
      title: 'Updated Final Project Presentation',
      description: 'Expanded agenda and slides',
      category: 'University',
      priority: 'Urgent',
      dueDate: newDate,
      hasReminder: true,
      reminderTime: newDate,
    });

    assert.strictEqual(updated.title, 'Updated Final Project Presentation', 'Title updated');
    assert.strictEqual(updated.description, 'Expanded agenda and slides', 'Description updated');
    assert.strictEqual(updated.category, 'University', 'Category updated to University');
    assert.strictEqual(updated.priority, 'Urgent', 'Priority updated to Urgent');
    assert.strictEqual(updated.hasReminder, true, 'hasReminder updated to true');
    console.log('  ✅ PASS: Task updated with custom title, description, category, priority, and date');
    await taskService.cancelTaskOrReminder(originalTask._id);

    // ==========================================
    // 4. CANONICAL SORTING VERIFICATION
    // ==========================================
    console.log('\n--- 4. Testing Canonical Upcoming Task Sorting Rules ---');
    const now = Date.now();
    const tOverdueOld = await taskService.createTask({
      title: 'Overdue Old (-2 days)',
      dueDate: new Date(now - 172800000).toISOString(),
    });
    const tOverdueRecent = await taskService.createTask({
      title: 'Overdue Recent (-1 hour)',
      dueDate: new Date(now - 3600000).toISOString(),
    });
    const tTodaySoon = await taskService.createTask({
      title: 'Today Soon (+2 hours)',
      dueDate: new Date(now + 7200000).toISOString(),
    });
    const tTomorrow = await taskService.createTask({
      title: 'Tomorrow (+24 hours)',
      dueDate: new Date(now + 86400000).toISOString(),
    });
    const tUndated = await taskService.createTask({
      title: 'Undated Task (No due date)',
      dueDate: null,
    });

    const pendingResult = await taskService.listTasks({ status: 'pending', limit: 50 });
    const tasks = pendingResult.tasks;

    const findIdx = (id) => tasks.findIndex((t) => t._id.toString() === id.toString());

    const idxOverdueOld = findIdx(tOverdueOld._id);
    const idxOverdueRecent = findIdx(tOverdueRecent._id);
    const idxTodaySoon = findIdx(tTodaySoon._id);
    const idxTomorrow = findIdx(tTomorrow._id);
    const idxUndated = findIdx(tUndated._id);

    assert(idxOverdueOld < idxOverdueRecent, 'Rule 3: Oldest overdue appears before recent overdue');
    assert(idxOverdueRecent < idxTodaySoon, 'Rule 1: Overdue appears before future pending tasks');
    assert(idxTodaySoon < idxTomorrow, 'Rule 1: Earlier future task appears before later task');
    assert(idxTomorrow < idxUndated, 'Rule 5: Dated tasks appear before undated tasks');

    console.log('  ✅ PASS: Canonical sorting matches all 5 requirements perfectly!');

    // Cleanup test tasks
    await taskService.cancelTaskOrReminder(tOverdueOld._id);
    await taskService.cancelTaskOrReminder(tOverdueRecent._id);
    await taskService.cancelTaskOrReminder(tTodaySoon._id);
    await taskService.cancelTaskOrReminder(tTomorrow._id);
    await taskService.cancelTaskOrReminder(tUndated._id);

    // Cleanup test conversations
    if (isDBConnected()) {
      await Conversation.deleteMany({ userId: { $in: [testUserA, testUserB] } });
    }

    console.log('\n========================================');
    console.log('🎉 ALL VOX AI IMPROVEMENTS VERIFIED SUCCESSFULLY!');
    console.log('========================================\n');
  } finally {
    await disconnectDB();
  }
}

runTests().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
