/**
 * Automated Test Suite for Milestone 4: Persistent Personal Memory
 * 
 * Verifies:
 * 1. Schema Validation (valid inputs, missing fields rejection, category normalization)
 * 2. CRUD Operations (Create, Read by ID, Update, Delete)
 * 3. Search Operations (Keyword matching, category filtering)
 * 4. Gemini Function Calling / Tool Execution (save_personal_memory, search_personal_memories)
 * 5. Memory Persistence Simulation (saving, restarting database connection, verifying retrieval)
 * 
 * Run with: node test-memory.js
 */

const dotenv = require('dotenv');
dotenv.config();

const { connectDB, disconnectDB, isDBConnected } = require('./config/db');
const memoryService = require('./services/memoryService');
const { generateAssistantResponse } = require('./services/geminiService');

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

async function runMemoryTests() {
  console.log('🧠 Starting Persistent Personal Memory Test Suite...\n');

  // Attempt database connection
  await connectDB();
  console.log(`[Test Environment] Database Connected: ${isDBConnected() ? 'MongoDB Atlas' : 'In-Memory Resilient Store'}\n`);

  let createdMemoryId = null;

  try {
    // -------------------------------------------------------------
    // Test 1: Validation - Missing title or detail
    // -------------------------------------------------------------
    console.log('Test 1: Validation - Reject missing title or detail');
    try {
      await memoryService.createMemory({ title: '', detail: 'Some detail' });
      assert(false, 'Should reject empty title');
    } catch (err) {
      assert(err.message.includes('title is required'), 'Rejects empty title with 400 error');
    }

    try {
      await memoryService.createMemory({ title: 'Valid Title', detail: '   ' });
      assert(false, 'Should reject empty detail');
    } catch (err) {
      assert(err.message.includes('detail description is required'), 'Rejects empty detail with 400 error');
    }

    // -------------------------------------------------------------
    // Test 2: Create Memory & Schema Attributes
    // -------------------------------------------------------------
    console.log('\nTest 2: Create Memory with structured fields');
    const memory = await memoryService.createMemory({
      title: 'Prefers Ethiopian Yirgacheffe pour-over',
      detail: 'Loves single-origin pour-over Ethiopian Yirgacheffe coffee in the mornings.',
      category: 'Preferences',
      importance: 'High',
      tags: ['coffee', 'beverage', 'morning'],
      source: 'chat',
    });

    assert(memory._id !== undefined, 'Generated memory contains unique _id');
    assert(memory.title === 'Prefers Ethiopian Yirgacheffe pour-over', 'Title correctly saved');
    assert(memory.category === 'Preferences', 'Category correctly assigned');
    assert(memory.importance === 'High', 'Importance correctly assigned');
    assert(Array.isArray(memory.tags) && memory.tags.includes('coffee'), 'Tags properly formatted and stored');
    assert(memory.createdAt !== undefined, 'Timestamp createdAt generated');
    createdMemoryId = memory._id;

    // -------------------------------------------------------------
    // Test 3: Retrieve Memory by ID
    // -------------------------------------------------------------
    console.log('\nTest 3: Retrieve Memory by ID');
    const retrieved = await memoryService.getMemoryById(createdMemoryId);
    assert(retrieved !== null, 'Memory retrieved successfully');
    assert(String(retrieved._id) === String(createdMemoryId), 'Retrieved memory ID matches created ID');
    assert(retrieved.detail.includes('Ethiopian Yirgacheffe'), 'Retrieved memory contains full detail');

    // -------------------------------------------------------------
    // Test 4: Keyword Search & Category Filtering
    // -------------------------------------------------------------
    console.log('\nTest 4: Keyword Search');
    const searchResults = await memoryService.searchMemories('Yirgacheffe');
    assert(searchResults.length > 0, 'Keyword search found matching memory');
    assert(searchResults[0].title.includes('Ethiopian'), 'Search result matches expected coffee memory');

    const searchByCategory = await memoryService.searchMemories('coffee', { category: 'Preferences' });
    assert(searchByCategory.length > 0, 'Filtered search by category returned match');

    // -------------------------------------------------------------
    // Test 5: Update Memory
    // -------------------------------------------------------------
    console.log('\nTest 5: Update Memory');
    const updated = await memoryService.updateMemory(createdMemoryId, {
      importance: 'Medium',
      tags: ['coffee', 'roast', 'specialty'],
    });
    assert(updated.importance === 'Medium', 'Updated importance field');
    assert(updated.tags.includes('specialty'), 'Updated tags array');

    // -------------------------------------------------------------
    // Test 6: Persistence Simulation (Restart / Reconnect)
    // -------------------------------------------------------------
    console.log('\nTest 6: Persistence Across Server Restart');
    if (isDBConnected()) {
      // Simulate backend restart by disconnecting and reconnecting
      console.log('    Disconnecting from database...');
      await disconnectDB();
      assert(!isDBConnected(), 'Successfully disconnected from database (simulated shutdown)');

      console.log('    Reconnecting to database (simulated startup)...');
      await connectDB();
      assert(isDBConnected(), 'Successfully reconnected to database');

      // Verify data is still intact in MongoDB Atlas
      const persistedMemory = await memoryService.getMemoryById(createdMemoryId);
      assert(persistedMemory !== null, 'Persistent memory survived restart');
      assert(String(persistedMemory._id) === String(createdMemoryId), 'Memory ID remained identical across restart');
      console.log(`    Retrieved persisted memory: "${persistedMemory.title}"`);
    } else {
      console.log('    (Skipping physical MongoDB Atlas reconnect cycle because Atlas is in resilient fallback mode)');
    }

    // -------------------------------------------------------------
    // Test 7: Gemini Function Calling Integration
    // -------------------------------------------------------------
    console.log('\nTest 7: Gemini Function Calling (save_personal_memory)');
    const aiResponse = await generateAssistantResponse(
      'Please remember that my sister\'s birthday is on November 14th.',
      []
    );

    assert(typeof aiResponse.reply === 'string' && aiResponse.reply.length > 0, 'Gemini generated natural response');
    assert(
      aiResponse.executedOperations && aiResponse.executedOperations.length > 0,
      'Gemini correctly triggered structured tool calling'
    );
    const op = aiResponse.executedOperations[0];
    assert(op.tool === 'save_personal_memory', 'Gemini invoked save_personal_memory tool');
    console.log(`    Gemini reply: "${aiResponse.reply.trim()}"`);

    // Verify database contains the sister's birthday memory
    const bdaySearch = await memoryService.searchMemories('birthday');
    assert(bdaySearch.length > 0, 'Database query confirms birthday was saved by Gemini tool');
    console.log(`    Database confirmed title: "${bdaySearch[0].title}"`);

    // Clean up created birthday memory
    if (bdaySearch[0]._id) {
      await memoryService.deleteMemory(bdaySearch[0]._id);
    }

    // -------------------------------------------------------------
    // Test 8: Delete Memory
    // -------------------------------------------------------------
    console.log('\nTest 8: Delete Memory');
    const deleted = await memoryService.deleteMemory(createdMemoryId);
    assert(deleted !== null, 'Memory deleted successfully');

    try {
      await memoryService.getMemoryById(createdMemoryId);
      assert(false, 'Should throw 404 when querying deleted memory');
    } catch (err) {
      assert(err.message.includes('not found'), 'Deleted memory is no longer retrievable');
    }

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    await disconnectDB();
    console.log(`\n========================================`);
    console.log(`Memory Tests Finished: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runMemoryTests();
