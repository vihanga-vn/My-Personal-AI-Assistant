const assert = require('assert');

/**
 * End-to-End Integration Test for Task 1:
 * Real Persistent Chat Conversations in MongoDB Atlas
 */

const BASE_URL = 'http://localhost:5000';

async function runConversationIntegrationTests() {
  console.log('💬 Starting Task 1: Persistent Chat Conversations Integration Tests...\n');

  let testConversationId = null;
  let autoCreatedConvId = null;

  try {
    // Test 1: Create a conversation via POST /api/conversations
    console.log('Test 1: Create a conversation in MongoDB Atlas (POST /api/conversations)');
    const createRes = await fetch(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Project Roadmap Discussion',
        userId: 'default_user',
        initialMessages: [
          { sender: 'user', text: 'Hello Vox, let us plan the roadmap.' },
          { sender: 'assistant', text: 'I am ready. What are the key milestones?' },
        ],
      }),
    });
    assert.strictEqual(createRes.status, 201, 'POST /api/conversations should return HTTP 201');
    const createData = await createRes.json();
    assert(createData.conversation && createData.conversation._id, 'Created conversation must have _id');
    testConversationId = createData.conversation._id;
    console.log(`  ✅ PASS: Created conversation ID: ${testConversationId} with title: "${createData.conversation.title}"`);

    // Test 2: Verify GET /api/conversations includes the conversation
    console.log('\nTest 2: Verify GET /api/conversations lists the saved conversation');
    const listRes = await fetch(`${BASE_URL}/api/conversations`);
    assert.strictEqual(listRes.status, 200, 'GET /api/conversations should return HTTP 200');
    const listData = await listRes.json();
    assert(Array.isArray(listData.conversations), 'Must return conversations array');
    const foundInList = listData.conversations.find((c) => c._id === testConversationId);
    assert(foundInList, 'Created conversation must exist in history list');
    assert.strictEqual(foundInList.title, 'Project Roadmap Discussion');
    assert.strictEqual(foundInList.messageCount, 2);
    console.log(`  ✅ PASS: Found in history with messageCount=${foundInList.messageCount}, lastMessage="${foundInList.lastMessage}"`);

    // Test 3: Continue chatting in the existing conversation via POST /api/chat with conversationId
    console.log('\nTest 3: Continue chatting in existing conversation (POST /api/chat with conversationId)');
    const chatRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Milestone 1 is due next week.',
        conversationId: testConversationId,
        history: [
          { sender: 'user', text: 'Hello Vox, let us plan the roadmap.' },
          { sender: 'assistant', text: 'I am ready. What are the key milestones?' },
        ],
      }),
    });
    assert.strictEqual(chatRes.status, 200, 'POST /api/chat should return HTTP 200');
    const chatData = await chatRes.json();
    assert.strictEqual(chatData.conversationId, testConversationId, 'Must return the same conversationId without creating a new one');
    assert(typeof chatData.reply === 'string' && chatData.reply.length > 0, 'Must return non-empty reply');
    console.log(`  ✅ PASS: Appended message to same conversation. Assistant reply: "${chatData.reply.slice(0, 60)}..."`);

    // Test 4: Restore conversation by ID and verify exact chronological order and no duplicates
    console.log('\nTest 4: Restore conversation (GET /api/conversations/:id) & verify order and count');
    const getRes = await fetch(`${BASE_URL}/api/conversations/${testConversationId}`);
    assert.strictEqual(getRes.status, 200, 'GET /api/conversations/:id should return HTTP 200');
    const fullConv = await getRes.json();
    assert.strictEqual(fullConv.messages.length, 4, 'Must have exactly 4 messages (no duplicates)');
    assert.strictEqual(fullConv.messages[0].sender, 'user');
    assert.strictEqual(fullConv.messages[0].text, 'Hello Vox, let us plan the roadmap.');
    assert.strictEqual(fullConv.messages[1].sender, 'assistant');
    assert.strictEqual(fullConv.messages[2].sender, 'user');
    assert.strictEqual(fullConv.messages[2].text, 'Milestone 1 is due next week.');
    assert.strictEqual(fullConv.messages[3].sender, 'assistant');
    console.log('  ✅ PASS: All 4 messages restored in exact chronological order with no duplicates.');

    // Test 5: Rename / Update conversation title (PATCH /api/conversations/:id)
    console.log('\nTest 5: Update conversation title (PATCH /api/conversations/:id)');
    const patchRes = await fetch(`${BASE_URL}/api/conversations/${testConversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Sprint & Milestone 1 Planning' }),
    });
    assert.strictEqual(patchRes.status, 200, 'PATCH should return HTTP 200');
    const patchData = await patchRes.json();
    assert.strictEqual(patchData.conversation.title, 'Sprint & Milestone 1 Planning');
    console.log(`  ✅ PASS: Title updated to "${patchData.conversation.title}"`);

    // Test 6: Auto-creating new conversation when conversationId is omitted
    console.log('\nTest 6: Auto-create conversation with sensible title on first prompt');
    const autoRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Can you recommend high protein breakfasts for gym mornings?',
      }),
    });
    assert.strictEqual(autoRes.status, 200, 'POST /api/chat should return HTTP 200');
    const autoData = await autoRes.json();
    assert(autoData.conversationId, 'Should return generated conversationId');
    autoCreatedConvId = autoData.conversationId;
    assert(autoData.conversationTitle, 'Should return generated title');
    console.log(`  ✅ PASS: Auto-created conversation ID: ${autoCreatedConvId} with Title: "${autoData.conversationTitle}"`);
  } finally {
    // Cleanup
    console.log('\nCleaning up test conversations from MongoDB Atlas...');
    if (testConversationId) {
      await fetch(`${BASE_URL}/api/conversations/${testConversationId}`, { method: 'DELETE' });
    }
    if (autoCreatedConvId) {
      await fetch(`${BASE_URL}/api/conversations/${autoCreatedConvId}`, { method: 'DELETE' });
    }
    console.log('  ✅ Test conversations cleaned up.');
  }

  console.log('\n========================================');
  console.log('All Task 1 Conversation Tests Passed Successfully!');
  console.log('========================================\n');
}

runConversationIntegrationTests().catch((err) => {
  console.error('\n❌ Conversation Integration Test Failed:', err);
  process.exit(1);
});
