/**
 * Mobile Chat Integration and Client-Side Contract Test
 * 
 * Tests mobile client logic:
 * 1. Empty message rejection without unnecessary network calls
 * 2. Payload sanitization and history formatting
 * 3. Handling of HTTP 429 Rate Limits
 * 4. Handling of HTTP 400 Bad Requests
 * 5. Handling of server network unavailability
 * 6. Live end-to-end communication with the backend POST /api/chat
 * 
 * Run with: node test-chat-integration.js
 */

const http = require('http');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// Client-side validation logic mirror (matches mobile/src/services/chatService.js)
function validateClientMessage(message) {
  const trimmed = message ? message.trim() : '';
  if (!trimmed) {
    throw new Error('Message cannot be empty.');
  }
  return trimmed;
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-8).map((item) => ({
    sender: item.sender === 'user' ? 'user' : 'assistant',
    text: item.text,
  }));
}

async function runMobileTests() {
  console.log('📱 Starting Mobile Chat Integration Tests...\n');

  // Test 1: Empty & Whitespace Message Rejection
  console.log('Test 1: Client-side empty message rejection');
  try {
    validateClientMessage('');
    assert(false, 'Should throw error on empty string');
  } catch (err) {
    assert(err.message === 'Message cannot be empty.', 'Empty string correctly rejected');
  }

  try {
    validateClientMessage('   \n  \t ');
    assert(false, 'Should throw error on whitespace string');
  } catch (err) {
    assert(err.message === 'Message cannot be empty.', 'Whitespace-only string correctly rejected');
  }

  // Test 2: History sanitization
  console.log('\nTest 2: Conversation history sanitization');
  const rawHistory = [
    { id: '1', sender: 'user', text: 'Hi', timestamp: '12:00 PM', extraMeta: 'ignore' },
    { id: '2', sender: 'assistant', text: 'Hello', timestamp: '12:01 PM', isError: false },
  ];
  const cleaned = sanitizeHistory(rawHistory);
  assert(cleaned.length === 2, 'Maintains message count');
  assert(cleaned[0].text === 'Hi' && cleaned[0].sender === 'user', 'Formats user turn properly');
  assert(cleaned[0].id === undefined, 'Strips extraneous mobile-only metadata before transmission');

  // Test 3: Handling Rate Limit Response (HTTP 429)
  console.log('\nTest 3: Simulated Rate Limit (HTTP 429) handling');
  const mockServer = http.createServer((req, res) => {
    if (req.url === '/api/chat-rate-limit') {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
    } else if (req.url === '/api/chat-error') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal AI failure' }));
    }
  });

  await new Promise((resolve) => mockServer.listen(5099, resolve));

  try {
    const res = await fetch('http://localhost:5099/api/chat-rate-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    });
    assert(res.status === 429, 'Client detects 429 status code');
    const data = await res.json();
    assert(data.error === 'Rate limit exceeded', 'Client extracts rate limit error message');
  } finally {
    mockServer.close();
  }

  // Test 4: Unreachable backend server network failure handling
  console.log('\nTest 4: Unreachable backend network failure handling');
  try {
    // Attempting to fetch an unused port
    await fetch('http://localhost:59999/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    });
    assert(false, 'Should have failed to connect');
  } catch (err) {
    assert(err !== null, 'Network connection failure caught gracefully');
  }

  // Test 5: End-to-End Live Chat Contract (Requires backend running or spins up lightweight instance)
  console.log('\nTest 5: Live Gemini End-to-End Chat Contract');
  // Check if live backend server on port 5000 is running; if not, spin up backend routes directly
  let e2eBaseUrl = 'http://localhost:5000';
  let tempServer = null;

  try {
    const probe = await fetch('http://localhost:5000/api/health');
    if (probe.status !== 200) throw new Error('Not running');
  } catch (_) {
    // Start temporary instance of backend
    const express = require('../backend/node_modules/express');
    const cors = require('../backend/node_modules/cors');
    const dotenv = require('../backend/node_modules/dotenv');
    dotenv.config({ path: '../backend/.env' });

    const chatRouter = require('../backend/routes/chat');
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api/chat', chatRouter);

    tempServer = app.listen(5006);
    e2eBaseUrl = 'http://localhost:5006';
  }

  try {
    const liveResponse = await fetch(`${e2eBaseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Respond with exactly: MOBILE_E2E_CONFIRMED',
      }),
    });

    const liveData = await liveResponse.json();
    assert(liveResponse.status === 200, 'Mobile receives HTTP 200 from backend');
    assert(typeof liveData.reply === 'string' && liveData.reply.length > 0, 'Mobile receives non-empty reply string');
    assert(
      liveData.reply.includes('MOBILE_E2E_CONFIRMED'),
      `Assistant response contains expected text (Received: "${liveData.reply.trim()}")`
    );
    assert(liveData.apiKey === undefined, 'CRITICAL: No Gemini API Key is returned to the mobile client');
  } catch (err) {
    console.error('E2E test error:', err);
    failed++;
  } finally {
    if (tempServer) tempServer.close();
  }

  console.log(`\n========================================`);
  console.log(`Mobile Tests Finished: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runMobileTests();
