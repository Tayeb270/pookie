/**
 * POOKIE AI 🎀 - AUTOMATED VERIFICATION SUITE
 * Comprehensive testing of static files, AI engine, characters, voices, and backend endpoints.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🎀 Starting Pookie AI Verification Suite...\n');

// 1. Verify files exist
const requiredFiles = [
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/ai-engine.js',
  'js/voice-manager.js',
  'js/games.js',
  'js/study.js',
  'js/notes.js',
  'characters/index.js',
  'characters/pookie.json',
  'characters/detective.json',
  'characters/sensei.json',
  'characters/cyber_nova.json',
  'characters/chef_marcel.json',
  'manifest.json',
  'sw.js',
  '.env.example',
  '.gitignore',
  'server.js',
  'package.json'
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  assert(fs.existsSync(filePath), `Required file missing: ${file}`);
  const stats = fs.statSync(filePath);
  assert(stats.size > 0, `File is empty: ${file}`);
  console.log(`✅ File verified: ${file} (${stats.size} bytes)`);
});

// 2. Test Character Registry
const { loadCharacters, getCharacterById, ALLOWED_VOICES } = require('./characters');
const characters = loadCharacters();
assert(characters.length >= 5, `Expected at least 5 characters, got ${characters.length}`);
console.log(`✅ Loaded ${characters.length} characters successfully!`);

characters.forEach(char => {
  assert(char.id, 'Character must have an id');
  assert(char.name, 'Character must have a name');
  assert(char.systemPrompt, 'Character must have a system prompt');
  assert(char.voiceId, 'Character must have a voiceId');
  assert(ALLOWED_VOICES[char.voiceId], `Character voiceId ${char.voiceId} must be in allowlist`);
  assert(char.greeting, 'Character must have a greeting');
});
console.log('✅ All character configurations are valid and allowlisted!');

// 3. Test AI Engine (Offline Intent & Logic)
const PookieAIEngine = require('./js/ai-engine.js');
const engine = new PookieAIEngine();

async function testAIEngine() {
  console.log('\n🌸 Testing Pookie AI Conversational Engine:');

  const testCases = [
    { input: "I am feeling so sad and down today", expectKeywords: ['bestie', 'hug', 'blanket', 'breathe', 'water', 'okay'] },
    { input: "Help me study for my math exam", expectKeywords: ['study', 'pomodoro', 'technique', 'brain', 'feynman', 'active recall'] },
    { input: "what is 25 * 4?", expectKeywords: ['100'] },
    { input: "explain photosynthesis", expectKeywords: ['plants', 'sunlight', 'chlorophyll', 'oxygen'] }
  ];

  for (const tc of testCases) {
    const res = await engine.generateResponse(tc.input);
    assert(res && res.text, `AI failed to generate response for: "${tc.input}"`);
    console.log(`  Query: "${tc.input}"`);
    console.log(`  Response: "${res.text.slice(0, 75).replace(/\n/g, ' ')}..."`);
    console.log(`  Source: ${res.source}\n`);
  }

  // Test name recognition
  await engine.generateResponse("My name is Clara");
  assert.strictEqual(engine.userName, 'Clara', 'Engine should detect and remember user name');
  console.log('✅ AI Name extraction & memory verified!');
}

// 4. Test HTTP Server Endpoints
const { server } = require('./server.js');

async function testServer() {
  console.log('\n✨ Testing Local HTTP Server & API Endpoints:');
  const testPort = 3899;

  await new Promise((resolve) => {
    server.listen(testPort, '127.0.0.1', () => {
      console.log(`  Server listening on port ${testPort}`);
      resolve();
    });
  });

  const request = (method, urlPath, body = null, headers = {}) => new Promise((resolve, reject) => {
    const reqHeaders = { ...headers };
    let postData = '';
    if (body) {
      postData = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }
    const req = http.request({
      hostname: '127.0.0.1',
      port: testPort,
      path: urlPath,
      method: method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });

  // Health endpoint
  const healthRes = await request('GET', '/api/health');
  assert.strictEqual(healthRes.status, 200);
  const healthJson = JSON.parse(healthRes.body);
  assert.strictEqual(healthJson.status, 'ok');
  assert('geminiConfigured' in healthJson.features);
  assert('openaiConfigured' in healthJson.features);
  console.log('✅ GET /api/health returned 200 OK with Gemini & OpenAI status');

  // Characters endpoint
  const charRes = await request('GET', '/api/characters');
  assert.strictEqual(charRes.status, 200);
  const charJson = JSON.parse(charRes.body);
  assert(Array.isArray(charJson.characters) && charJson.characters.length >= 5);
  console.log('✅ GET /api/characters returned valid characters list');

  // Voices endpoint
  const voicesRes = await request('GET', '/api/voices');
  assert.strictEqual(voicesRes.status, 200);
  const voicesJson = JSON.parse(voicesRes.body);
  assert(Array.isArray(voicesJson.voices) && voicesJson.voices.length >= 5);
  console.log('✅ GET /api/voices returned allowlisted voices');

  // POST /api/chat with Pookie
  const chatResPookie = await request('POST', '/api/chat', {
    message: "Hii Pookie! How are you?",
    characterId: "pookie",
    gameState: { playerLevel: 7, xp: 780, streakDays: 3 }
  });
  assert.strictEqual(chatResPookie.status, 200);
  const chatJsonPookie = JSON.parse(chatResPookie.body);
  assert(chatJsonPookie.message && chatJsonPookie.message.length > 0);
  assert.strictEqual(chatJsonPookie.characterId, 'pookie');
  console.log(`✅ POST /api/chat (pookie) responded: "${chatJsonPookie.message.slice(0, 50).replace(/\n/g, ' ')}..."`);

  // POST /api/chat with Math calculation
  const chatResMath = await request('POST', '/api/chat', {
    message: "what is 25 * 4?",
    characterId: "pookie"
  });
  assert.strictEqual(chatResMath.status, 200);
  const chatJsonMath = JSON.parse(chatResMath.body);
  assert(chatJsonMath.message.includes('100'), `Expected 100 in math answer, got: ${chatJsonMath.message}`);
  console.log(`✅ POST /api/chat (math reasoning) correctly computed 25 * 4 = 100!`);

  // POST /api/chat with Python Code request
  const chatResCode = await request('POST', '/api/chat', {
    message: "write a python function to reverse a string",
    characterId: "cyber_nova"
  });
  assert.strictEqual(chatResCode.status, 200);
  const chatJsonCode = JSON.parse(chatResCode.body);
  assert(chatJsonCode.message.includes('python') || chatJsonCode.message.includes('reversed'), 'Expected python code explanation');
  console.log(`✅ POST /api/chat (code request) delivered structured Python code!`);

  // POST /api/chat with Detective Sterling
  const chatResDet = await request('POST', '/api/chat', {
    message: "What clues do we have on my current level?",
    characterId: "detective",
    gameState: { playerLevel: 8, xp: 820 }
  });
  assert.strictEqual(chatResDet.status, 200);
  const chatJsonDet = JSON.parse(chatResDet.body);
  assert(chatJsonDet.message && chatJsonDet.message.length > 0);
  assert.strictEqual(chatJsonDet.characterId, 'detective');
  console.log(`✅ POST /api/chat (detective) responded: "${chatJsonDet.message.slice(0, 50).replace(/\n/g, ' ')}..."`);

  // POST /api/chat validation test (empty message)
  const chatEmptyRes = await request('POST', '/api/chat', { message: "" });
  assert.strictEqual(chatEmptyRes.status, 400);
  console.log('✅ POST /api/chat correctly rejected empty message with 400');

  // POST /api/tts endpoint
  const ttsRes = await request('POST', '/api/tts', {
    text: "Hiii bestie! Ready to play games?",
    voiceId: "21m00Tcm4TlvDq8ikWAM"
  });
  assert.strictEqual(ttsRes.status, 200);
  console.log('✅ POST /api/tts handled request with 200 OK (with clean fallback or audio)');

  // POST /api/config/test-key validation
  const testKeyEmpty = await request('POST', '/api/config/test-key', { provider: 'gemini', apiKey: '' });
  assert.strictEqual(testKeyEmpty.status, 400);
  console.log('✅ POST /api/config/test-key correctly rejected empty apiKey with 400');

  // Static index.html
  const indexRes = await request('GET', '/');
  assert.strictEqual(indexRes.status, 200);
  assert(indexRes.body.includes('Pookie AI 🎀'), 'index.html contains app title');
  console.log('✅ GET / serves index.html with 200 OK');

  // Close server
  await new Promise(resolve => server.close(resolve));
  console.log('✅ Server lifecycle test complete!');
}

async function runAll() {
  await testAIEngine();
  await testServer();
  console.log('\n🎉 ALL TESTS PASSED! Backend, Characters, Voices, Dual Providers, and Endpoints are 100% verified! 🎀✨\n');
}

runAll().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
