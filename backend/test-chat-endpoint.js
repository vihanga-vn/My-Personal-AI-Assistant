/**
 * Automated test script for Backend /api/chat and /api/health endpoints.
 * Run with: node test-chat-endpoint.js
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const chatRoutes = require('./routes/chat');

async function runTests() {
  console.log('🚀 Starting Backend Endpoint Tests...\n');

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/chat', chatRoutes);

  const TEST_PORT = 5005;
  const server = app.listen(TEST_PORT);
  const BASE_URL = `http://localhost:${TEST_PORT}`;

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

  try {
    // Test 1: Health check
    console.log('Test 1: Health check GET /api/health');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'ok', 'Health endpoint returns 200 and status ok');

    // Test 2: Validation - Empty message
    console.log('\nTest 2: Validation - Empty message POST /api/chat');
    const emptyRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' }),
    });
    const emptyData = await emptyRes.json();
    assert(emptyRes.status === 400, 'Rejects empty message with HTTP 400');
    assert(emptyData.error && emptyData.error.includes('empty'), 'Returns appropriate error description for empty message');

    // Test 3: Validation - Missing message property
    console.log('\nTest 3: Validation - Missing message property POST /api/chat');
    const missingRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(missingRes.status === 400, 'Rejects missing message body with HTTP 400');

    // Test 4: Live Gemini Integration - Valid message
    console.log('\nTest 4: Live Gemini Integration - Valid message POST /api/chat');
    const chatRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Say the single word: Banana' }),
    });
    const chatData = await chatRes.json();
    assert(chatRes.status === 200, 'Returns HTTP 200 status code');
    assert(typeof chatData.reply === 'string' && chatData.reply.length > 0, 'Returns non-empty assistant reply');
    assert(typeof chatData.model === 'string', `Model identified: ${chatData.model}`);
    console.log(`    Gemini reply sample: "${chatData.reply.trim()}"`);

    // Test 5: Multi-turn conversation context
    console.log('\nTest 5: Multi-turn conversation context POST /api/chat');
    const multiRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What fruit did I just mention in the previous question?',
        history: [
          { sender: 'user', text: 'Say the single word: Banana' },
          { sender: 'assistant', text: 'Banana' }
        ]
      }),
    });
    const multiData = await multiRes.json();
    assert(multiRes.status === 200, 'Returns HTTP 200 for multi-turn chat');
    assert(
      multiData.reply.toLowerCase().includes('banana'),
      `Contextually remembers earlier conversation (Reply: "${multiData.reply.trim()}")`
    );

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    server.close();
    console.log(`\n========================================`);
    console.log(`Tests Finished: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runTests();
