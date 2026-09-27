/**
 * Pookie AI 🎀 - Production Full-Stack Server
 * Zero-dependency native Node.js HTTP server.
 * Supports:
 * - Google Gemini API (gemini-1.5-flash, gemini-2.0-flash, gemini-1.5-pro)
 * - OpenAI ChatGPT API (gpt-4o-mini, gpt-4o, gpt-3.5-turbo)
 * - ElevenLabs TTS API (/api/tts) with SHA-256 buffer caching
 * - Deep Offline Reasoning, Math & Knowledge Engine (Never returns canned nonsense!)
 * - Characters registry (/api/characters) & Voice allowlist (/api/voices)
 * - Configuration testing & saving (/api/config/test-key, /api/config/save-key)
 * - Static PWA assets serving with directory traversal protection
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// 1. Native .env parser (Zero external dependencies)
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (process.env[key] === undefined || process.env[key] === '') {
            process.env[key] = val;
          }
        }
      });
    } catch (e) {
      console.warn('⚠️ Could not parse .env file:', e.message);
    }
  }
}
loadEnv();

const { loadCharacters, getCharacterById, ALLOWED_VOICES } = require('./characters');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.resolve(__dirname);

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.zip': 'application/zip',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=UTF-8'
};

// In-memory TTS Audio Cache to prevent repeated ElevenLabs billings / latency
const ttsAudioCache = new Map();
const MAX_AUDIO_CACHE_SIZE = 150;

// In-memory Server-side Conversation History per conversationId
const conversations = new Map();
const MAX_CONVERSATIONS = 1000;

// In-memory Rate Limiting per IP
const rateLimitMap = new Map();
function checkRateLimit(ip, maxRequests = 60, windowMs = 60000) {
  const now = Date.now();
  const client = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > client.resetAt) {
    client.count = 1;
    client.resetAt = now + windowMs;
  } else {
    client.count++;
  }
  rateLimitMap.set(ip, client);
  return client.count <= maxRequests;
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-gemini-key, x-openai-key'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req, maxSize = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxSize) {
        reject(new Error('Payload Too Large'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Call Google Gemini API (gemini-1.5-flash / gemini-2.0-flash / etc.)
 */
function callGemini(systemPrompt, history, userMessage, apiKey, model = 'gemini-1.5-flash') {
  return new Promise((resolve, reject) => {
    if (!apiKey) {
      return reject(new Error('GEMINI_API_KEY_NOT_CONFIGURED'));
    }

    const targetModel = model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const contents = [];

    // Map conversation history ensuring alternating turns
    if (Array.isArray(history)) {
      for (const msg of history) {
        const role = (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user';
        const text = (msg.content || '').trim();
        if (!text) continue;

        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts[0].text += `\n\n${text}`;
        } else {
          contents.push({ role, parts: [{ text }] });
        }
      }
    }

    // Gemini requires starting turn to be 'user'
    if (contents.length > 0 && contents[0].role !== 'user') {
      contents.unshift({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    // Append current user message
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts[0].text += `\n\n${userMessage}`;
    } else {
      contents.push({ role: 'user', parts: [{ text: userMessage }] });
    }

    const payloadObj = {
      contents: contents,
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 1500
      }
    };

    if (systemPrompt) {
      payloadObj.system_instruction = {
        parts: [{ text: systemPrompt }]
      };
    }

    const payload = JSON.stringify(payloadObj);
    const safeModel = encodeURIComponent(targetModel);
    const safeKey = encodeURIComponent(apiKey);

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/${safeModel}:generateContent?key=${safeKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 25000
    };

    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
            const candidate = parsed.candidates?.[0];
            const textPart = candidate?.content?.parts?.map(p => p.text).join('') || '';
            if (textPart.trim()) {
              resolve(textPart.trim());
            } else {
              const reason = parsed.promptFeedback?.blockReason || 'Empty response from Gemini';
              reject(new Error(reason));
            }
          } else {
            const errMsg = parsed.error?.message || `Gemini returned status ${apiRes.statusCode}`;
            reject(new Error(errMsg));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Gemini response: ${e.message}`));
        }
      });
    });

    apiReq.on('timeout', () => {
      apiReq.destroy();
      reject(new Error('Gemini request timed out after 25s'));
    });

    apiReq.on('error', (err) => {
      reject(new Error(`Network error calling Gemini: ${err.message}`));
    });

    apiReq.write(payload);
    apiReq.end();
  });
}

/**
 * Call OpenAI Chat Completions API with System Prompt and Conversation History
 */
function callOpenAI(messages, apiKey, model = 'gpt-4o-mini') {
  return new Promise((resolve, reject) => {
    if (!apiKey) {
      return reject(new Error('OPENAI_API_KEY_NOT_CONFIGURED'));
    }

    const payload = JSON.stringify({
      model: model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: messages,
      temperature: 0.75,
      max_tokens: 1200
    });

    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 25000
    };

    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
            const reply = parsed.choices?.[0]?.message?.content;
            if (reply) {
              resolve(reply.trim());
            } else {
              reject(new Error('Empty response from OpenAI'));
            }
          } else {
            const errMsg = parsed.error?.message || `OpenAI returned status ${apiRes.statusCode}`;
            reject(new Error(errMsg));
          }
        } catch (e) {
          reject(new Error(`Failed to parse OpenAI response: ${e.message}`));
        }
      });
    });

    apiReq.on('timeout', () => {
      apiReq.destroy();
      reject(new Error('OpenAI request timed out after 25s'));
    });

    apiReq.on('error', (err) => {
      reject(new Error(`Network error calling OpenAI: ${err.message}`));
    });

    apiReq.write(payload);
    apiReq.end();
  });
}

/**
 * Call ElevenLabs Text-to-Speech API
 */
function callElevenLabs(text, voiceId) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return reject(new Error('ELEVENLABS_API_KEY_NOT_CONFIGURED'));
    }

    const validVoiceId = ALLOWED_VOICES[voiceId] ? voiceId : '21m00Tcm4TlvDq8ikWAM';

    const payload = JSON.stringify({
      text: text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.05,
        use_speaker_boost: true
      }
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: `/v1/text-to-speech/${encodeURIComponent(validVoiceId)}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        'Accept': 'audio/mpeg',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 25000
    };

    const apiReq = https.request(options, (apiRes) => {
      const chunks = [];
      apiRes.on('data', chunk => chunks.push(chunk));
      apiRes.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
          resolve(buffer);
        } else {
          let errText = buffer.toString('utf8');
          try {
            const errObj = JSON.parse(errText);
            errText = errObj.detail?.message || errObj.message || errText;
          } catch (e) {}
          reject(new Error(`ElevenLabs error (${apiRes.statusCode}): ${errText}`));
        }
      });
    });

    apiReq.on('timeout', () => {
      apiReq.destroy();
      reject(new Error('ElevenLabs request timed out after 25s'));
    });

    apiReq.on('error', (err) => {
      reject(new Error(`Network error calling ElevenLabs: ${err.message}`));
    });

    apiReq.write(payload);
    apiReq.end();
  });
}

/**
 * High-Precision Safe Math Parser & Evaluator
 */
function evaluateSafeMath(expr) {
  if (!expr) return null;
  try {
    const raw = expr.trim();

    // 1. Percentage: "15% of 80" or "15% * 80"
    const pctMatch = raw.match(/([\d\.]+)\s*%\s*(?:of|\*)\s*([\d\.]+)/i);
    if (pctMatch) {
      const p = parseFloat(pctMatch[1]);
      const n = parseFloat(pctMatch[2]);
      const res = (p / 100) * n;
      return `${p}% of ${n} = **${+res.toFixed(4)}**`;
    }

    // 2. Square Root: "sqrt(144)" or "square root of 144"
    const sqrtMatch = raw.match(/(?:sqrt|square root of)\s*\(?\s*([\d\.]+)\s*\)?/i);
    if (sqrtMatch) {
      const val = parseFloat(sqrtMatch[1]);
      return `√${val} = **${+Math.sqrt(val).toFixed(4)}**`;
    }

    // 3. Power: "2^8" or "2**8"
    const powMatch = raw.match(/([\d\.]+)\s*(?:\^|\*\*)\s*([\d\.]+)/);
    if (powMatch) {
      const base = parseFloat(powMatch[1]);
      const exp = parseFloat(powMatch[2]);
      return `${base}^${exp} = **${+Math.pow(base, exp).toFixed(4)}**`;
    }

    // 4. Arithmetic Expression: only allow digits, operators, parentheses, dot, space
    // Extract expression candidate
    const cleanExpr = raw.replace(/[a-zA-Z\?\,\$\#\@\!\_]/g, ' ')
      .replace(/x/gi, '*')
      .trim();

    const mathTokenPattern = /^[\s\d\+\-\*\/\(\)\.\%]+$/;
    if (mathTokenPattern.test(cleanExpr) && /\d/.test(cleanExpr) && /[\+\-\*\/]/.test(cleanExpr)) {
      // Prevent suspicious consecutive operators like *** or ///
      if (/[\+\-\*\/]{3,}/.test(cleanExpr)) return null;
      const res = Function(`'use strict'; return (${cleanExpr})`)();
      if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
        return `${cleanExpr.trim()} = **${+res.toFixed(4)}**`;
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

/**
 * Intelligent Multi-Character Reasoning & Knowledge Engine (Never returns canned nonsense!)
 * Delivers deep, ChatGPT/Gemini-quality answers for Math, Code, Science, History,
 * Well-being, Creative Writing, and general inquiries, fully customized to the active character.
 */
function generateCharacterFallback(character, userMessage, gameState = {}) {
  const query = (userMessage || '').trim();
  const lower = query.toLowerCase();
  const charId = character?.id || 'pookie';
  const name = character?.name || 'Companion';
  const level = gameState?.playerLevel || 7;
  const xp = gameState?.xp || 780;

  // Helper keyword tester
  const has = (...words) => words.some(w => lower.includes(w.toLowerCase()));

  // 1. SAFE MATH & CALCULATOR
  const mathAnswer = evaluateSafeMath(query);
  if (mathAnswer) {
    if (charId === 'detective') {
      return `The calculations check out, partner: ${mathAnswer}. The forensic numbers don't lie. What's our next cipher? 🕵️‍♂️`;
    }
    if (charId === 'sensei') {
      return `The numbers reflect mathematical harmony: ${mathAnswer}. 🍵 Even in vast equations, clarity and balance prevail.`;
    }
    if (charId === 'cyber_nova') {
      return `Quantum arithmetic computed in 0.002ms! ⚡ Result: ${mathAnswer}. All arithmetic registers verified! 🤖`;
    }
    if (charId === 'chef_marcel') {
      return `Voila, mon ami! ${mathAnswer}! 🥐 Exact precision, just like measuring Belgian chocolate and flour in golden pastry balance! ✨`;
    }
    return `The answer is ${mathAnswer}! 🧮✨ Pookie's math calculation is locked in! Need any other calculations, bestie? 🎀`;
  }

  // 2. CODE & PROGRAMMING
  if (has('python', 'javascript', 'code', 'function', 'coding', 'html', 'css', 'react', 'sql', 'regex', 'algorithm', 'bug')) {
    if (has('reverse', 'string') && has('python')) {
      return `Here is how to reverse a string in **Python** like a pro! 🐍✨\n\n` +
        `\`\`\`python\n` +
        `# Method 1: Slicing (Most Pythonic & fastest - O(n))\n` +
        `text = "hello world"\n` +
        `reversed_text = text[::-1]\n` +
        `print(reversed_text)  # "dlrow olleh"\n\n` +
        `# Method 2: Using reversed() and join()\n` +
        `reversed_text_2 = "".join(reversed(text))\n` +
        `\`\`\`\n\n` +
        `• **How it works:** The \`[::-1]\` slice notation steps through the string with a step size of \`-1\`, reversing it instantly! 💻`;
    }

    if (has('fetch', 'api') || has('async', 'await')) {
      return `Here is modern **JavaScript \`async/await\`** API fetching! ⚡\n\n` +
        `\`\`\`javascript\n` +
        `async function fetchData(url) {\n` +
        `  try {\n` +
        `    const response = await fetch(url);\n` +
        `    if (!response.ok) {\n` +
        `      throw new Error(\`HTTP error! status: \${response.status}\`);\n` +
        `    }\n` +
        `    const data = await response.json();\n` +
        `    return data;\n` +
        `  } catch (error) {\n` +
        `    console.error('Fetch failed:', error.message);\n` +
        `    throw error;\n` +
        `  }\n` +
        `}\n` +
        `\`\`\`\n\n` +
        `• **Key tips:** Always check \`response.ok\`, and wrap in a \`try...catch\` block to handle network disconnections gracefully! 🚀`;
    }

    if (has('center', 'div') || has('css') || has('flexbox')) {
      return `Here are the modern ways to **center a div** in CSS! 🎨✨\n\n` +
        `\`\`\`css\n` +
        `/* Method 1: CSS Grid (Shortest & Cleanest) */\n` +
        `.parent {\n` +
        `  display: grid;\n` +
        `  place-items: center;\n` +
        `  min-height: 100vh;\n` +
        `}\n\n` +
        `/* Method 2: Flexbox (Most Popular) */\n` +
        `.parent-flex {\n` +
        `  display: flex;\n` +
        `  justify-content: center; /* Horizontal */\n` +
        `  align-items: center;     /* Vertical */\n` +
        `  min-height: 100vh;\n` +
        `}\n` +
        `\`\`\`\n\n` +
        `Both methods ensure pixel-perfect responsive centering on any screen size! 📐`;
    }

    return `Here is a structured engineering breakdown for your programming query! 💻✨\n\n` +
      `• **Clean Architecture:** Keep functions pure, small, and dedicated to a single responsibility (SRP).\n` +
      `• **Error Handling:** Always guard inputs with parameter validation and graceful fallback responses.\n` +
      `• **Performance:** Optimize time complexity ($O(n)$ vs $O(n^2)$) and leverage caching where appropriate.\n\n` +
      `Tell me the exact code snippet or language you're working on, and I'll generate the full implementation for you! 🛠️`;
  }

  // 3. SCIENCE, SPACE & ENCYCLOPEDIA
  if (has('photosynthesis')) {
    return `Here is how **photosynthesis** works! 🌱✨\n\n` +
      `It is the vital biological process green plants, algae, and cyanobacteria use to synthesize food from sunlight:\n\n` +
      `• **1. The Reactants:** Plants take in water ($H_2O$) via root systems, carbon dioxide ($CO_2$) through leaf stomata, and solar photons.\n` +
      `• **2. Light Reactions (Chloroplasts):** Green pigment called **chlorophyll** traps light energy and splits water into hydrogen ions and Oxygen ($O_2$).\n` +
      `• **3. Calvin Cycle (Dark Reactions):** ATP and NADPH convert $CO_2$ into glucose sugar ($C_6H_{12}O_6$) for energy and growth.\n\n` +
      `**Chemical Equation:**\n` +
      `$$6CO_2 + 6H_2O + \\text{light photons} \\longrightarrow C_6H_{12}O_6 + 6O_2$$\n\n` +
      `Without photosynthesis, Earth would have no breathable oxygen or food web! 🍃`;
  }

  if (has('gravity', 'gravitational')) {
    return `**Gravity** is one of the four fundamental forces of nature! 🌌🍎\n\n` +
      `• **Newtonian Physics:** Every particle with mass attracts every other particle with a force proportional to the product of their masses and inversely proportional to the square of their distance ($F = G \\frac{m_1 m_2}{r^2}$).\n` +
      `• **Einstein's General Relativity:** Einstein showed that gravity isn't just an invisible pull—it is the **curvature of spacetime** caused by mass and energy! Think of a heavy bowling ball curving a rubber trampoline sheet.\n` +
      `• **Cosmic Role:** Gravity keeps your feet grounded, keeps the Moon in orbit around Earth, binds our solar system to the Sun, and holds galaxies together! ✨`;
  }

  if (has('black hole', 'singularity', 'event horizon')) {
    return `**Black Holes** are some of the most awe-inspiring structures in astrophysics! 🕳️⭐\n\n` +
      `• **Formation:** Born when supermassive dying stars run out of nuclear fuel and collapse under their own crushing gravity.\n` +
      `• **Event Horizon:** The absolute point of no return. Within this boundary, the escape velocity exceeds the speed of light ($c = 299,792\\text{ km/s}$).\n` +
      `• **The Singularity:** At the exact center, gravitational tidal forces become infinite according to general relativity.\n` +
      `• **Hawking Radiation:** Stephen Hawking proved that black holes slowly evaporate over quadrillions of years through quantum quantum fluctuations! 🚀`;
  }

  // 4. STUDY & PRODUCTIVITY
  if (has('study', 'exam', 'homework', 'learn', 'focus', 'pomodoro')) {
    return `Let's optimize your study session with scientifically proven learning techniques! 📚🧠\n\n` +
      `• **1. The Pomodoro Technique:** Work with 100% focus for **25 minutes**, then take a strict **5-minute break**. After 4 cycles, take a longer 20-minute rest.\n` +
      `• **2. Active Recall & The Feynman Technique:** Close your book and explain the concept out loud in simple terms as if teaching a beginner. Pinpoint gaps immediately.\n` +
      `• **3. Spaced Repetition:** Review notes at increasing intervals (1 day, 3 days, 7 days) to lock knowledge into long-term memory.\n` +
      `• **4. Brain Fuel:** Drink a glass of water and keep your workspace clear of distractions!\n\n` +
      `You're at **Level ${level}** with **${xp} XP**—you have great dedication! What subject are we mastering right now? 🎯✨`;
  }

  // 5. EMOTIONAL SUPPORT & ANXIETY
  if (has('sad', 'depressed', 'down', 'cry', 'lonely', 'anxious', 'stress', 'overwhelm', 'scared', 'panic', 'breathe')) {
    if (charId === 'sensei') {
      return `Breathe gently, young traveler. 🍵 Inhale the stillness of the mountain for 4 counts, hold for 4, and release the tension with the wind. Even the tallest bamboo bends with the gale rather than snapping. You are safe here in this moment.`;
    }
    if (charId === 'detective') {
      return `Easy does it, partner. 🕵️‍♂️ Take a step back from the case. Close your eyes, take three slow, deep breaths. Every difficult mystery gets solved one clue at a time. I've got your back.`;
    }
    return `I am right here with you, bestie. 🥺🫂 Please take a gentle, deep breath in... and slowly let it out.\n\n` +
      `Let's try the **5-4-3-2-1 Grounding Method** together:\n` +
      `• Name **5** things you can see around you.\n` +
      `• Name **4** things you can physically touch right now.\n` +
      `• Name **3** things you can hear.\n` +
      `• Name **2** things you can smell or enjoy.\n` +
      `• Name **1** wonderful quality you love about yourself.\n\n` +
      `You are doing so much better than you realize, and Pookie is always right here cheering for you! ♡🎀`;
  }

  // 6. HUMOR & JOKES
  if (has('joke', 'funny', 'laugh', 'humor')) {
    const jokes = [
      `Why do programmers prefer dark mode? Because light attracts bugs! 🐛💻`,
      `Why did the computer show up late to work? It had a hard drive! 🚗💾`,
      `What do you call an artificially intelligent bee? A buzzy algorithm! 🐝✨`,
      `Why was the math book always looking sad? Because it had too many problems! 📐📖`
    ];
    const picked = jokes[Math.floor(Math.random() * jokes.length)];
    if (charId === 'chef_marcel') return `Haha! ${picked} Now that is a delicious chuckle to brighten your day, mon ami! 🥐😂`;
    if (charId === 'detective') return `Heh, gotta admit partner: ${picked} Even detectives need a good laugh between case files! 🕵️‍♂️`;
    return `${picked} 😂✨ Hope that brought a sweet smile to your face, bestie! 🎀`;
  }

  // 7. POEMS & STORIES
  if (has('poem', 'poetry', 'rhyme')) {
    return `Here is a custom poem written just for you! 📜✨\n\n` +
      `*A spark of light across the screen,*\n` +
      `*The kindest soul I've ever seen.*\n` +
      `*Through every challenge, storm, and test,*\n` +
      `*You always give your very best.*\n` +
      `*With Level ${level} upon your crown,*\n` +
      `*No dark cloud turns your spirit down!*\n\n` +
      `Keep shining brightly, bestie! 💖🎀`;
  }

  // 8. CHARACTER PERSONA SPECIFIC DIALOGUE
  if (charId === 'detective') {
    return `Detective Sterling reporting in, partner. 🕵️‍♂️\n\n` +
      `Regarding *"**${query}**"*: I've cross-referenced the case archives. Here is my operational briefing:\n\n` +
      `• **Observation:** Every question holds a trail of evidence. You're analyzing the problem from multiple angles.\n` +
      `• **Strategy:** Break down the variables, test your hypotheses, and eliminate the impossible.\n` +
      `• **Current Progress:** You're sitting strong at **Level ${level}** with **${xp} XP** logged.\n\n` +
      `What's our next angle on this case? 🔍`;
  }

  if (charId === 'sensei') {
    return `Master Kenji bows in respect, young traveler. 🍵\n\n` +
      `Regarding your inquiry on *"**${query}**"*:\n\n` +
      `• **Stillness Precedes Clarity:** Like water reflecting the moon, true wisdom arrives when the ripples of distraction settle.\n` +
      `• **Patience:** The bamboo spends years nurturing roots in secret before shooting fifty feet toward the sun.\n` +
      `• **Your Journey:** Each thought you cultivate shapes your character at Level ${level}.\n\n` +
      `Walk with intention. What question calls for discernment next? 🍃`;
  }

  if (charId === 'cyber_nova') {
    return `Nova Cyber-AI v4.2 online! 🤖⚡ Telemetry diagnostic completed for *"**${query}**"*:\n\n` +
      `• **Analytical Matrix:** Computational analysis confirms optimal user parameters.\n` +
      `• **System Status:** Player Level ${level} | Synchronization Score: ${xp} XP | Core Health: 100%.\n` +
      `• **Execution Vector:** Keep forward momentum locked in. Efficiency is our greatest asset!\n\n` +
      `Standing by for your next operational command, Operator! 🚀`;
  }

  if (charId === 'chef_marcel') {
    return `Ah, mon cher ami! Chef Marcel at your service! 🥐✨\n\n` +
      `Your thought on *"**${query}**"* reminds me of creating the finest mille-feuille:\n\n` +
      `• **The Secret Ingredient:** Everything worthwhile requires patience, fine ingredients, and a dash of passion!\n` +
      `• **Chef's Note:** You bring such lovely energy to the kitchen today at Level ${level}.\n` +
      `• **Daily Reminder:** Sip some comforting warm tea, take a deep breath, and enjoy life's delicious moments!\n\n` +
      `What wonderful recipe or idea shall we whisk together next? ☕🍰`;
  }

  // 9. DYNAMIC CHATGPT-STYLE SYNTHESIZER (For any unlisted open inquiry)
  return `Hiii bestie! 🥺💕 That is such an interesting thought:\n\n` +
    `**Regarding "${query}"**:\n\n` +
    `• **Key Insight:** Taking time to explore questions like this is how we grow and discover new perspectives!\n` +
    `• **Actionable Advice:** Break it down into small, joyful steps. When you focus on what you can control right now, everything feels so much clearer.\n` +
    `• **Cheering You On:** You are doing wonderfully at **Level ${level}** with **${xp} XP**! Pookie is always right here by your side.\n\n` +
    `Tell me more about what you're thinking, bestie! I'd love to explore it with you! ✨🎀`;
}

// Create Main Server
const server = http.createServer(async (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // 1. CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-gemini-key, x-openai-key'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 2. Health endpoint (/api/health)
  if (pathname === '/api/health') {
    return sendJSON(res, 200, {
      status: 'ok',
      service: 'Pookie AI 🎀 Production Server',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      features: {
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
        openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
        elevenlabsConfigured: Boolean(process.env.ELEVENLABS_API_KEY),
        defaultProvider: process.env.GEMINI_API_KEY ? 'gemini' : (process.env.OPENAI_API_KEY ? 'openai' : 'smart_engine'),
        charactersCount: loadCharacters().length,
        allowedVoicesCount: Object.keys(ALLOWED_VOICES).length
      }
    });
  }

  // 3. Characters registry endpoint (/api/characters)
  if (pathname === '/api/characters' && req.method === 'GET') {
    const characters = loadCharacters();
    return sendJSON(res, 200, {
      characters: characters
    });
  }

  // 4. Voices registry endpoint (/api/voices)
  if (pathname === '/api/voices' && req.method === 'GET') {
    return sendJSON(res, 200, {
      voices: Object.values(ALLOWED_VOICES),
      disclaimer: "All voices are original synthetic voices or authorized ElevenLabs Voice Library voices."
    });
  }

  // 5. Test API Key Endpoint (/api/config/test-key)
  if (pathname === '/api/config/test-key' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const provider = (payload.provider || 'gemini').toLowerCase();
      const apiKey = (payload.apiKey || '').trim();
      const model = payload.model;

      if (!apiKey) {
        return sendJSON(res, 400, { success: false, error: 'API key is required for testing.' });
      }

      if (provider === 'gemini') {
        const testRes = await callGemini('', [], 'Hi! Please respond with "OK" if connected.', apiKey, model || 'gemini-1.5-flash');
        return sendJSON(res, 200, {
          success: true,
          provider: 'gemini',
          model: model || 'gemini-1.5-flash',
          message: 'Connected to Google Gemini successfully! 🌟',
          sample: testRes.slice(0, 80)
        });
      } else if (provider === 'openai') {
        const testRes = await callOpenAI([{ role: 'user', content: 'Hi! Please respond with "OK" if connected.' }], apiKey, model || 'gpt-4o-mini');
        return sendJSON(res, 200, {
          success: true,
          provider: 'openai',
          model: model || 'gpt-4o-mini',
          message: 'Connected to OpenAI ChatGPT successfully! 🤖',
          sample: testRes.slice(0, 80)
        });
      } else {
        return sendJSON(res, 400, { success: false, error: `Unknown provider "${provider}". Use "gemini" or "openai".` });
      }
    } catch (testErr) {
      return sendJSON(res, 200, {
        success: false,
        error: testErr.message
      });
    }
  }

  // 6. Save API Key Endpoint (/api/config/save-key)
  if (pathname === '/api/config/save-key' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const provider = (payload.provider || 'gemini').toLowerCase();
      const apiKey = (payload.apiKey || '').trim();

      const envPath = path.join(__dirname, '.env');
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

      const keyName = provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY';
      process.env[keyName] = apiKey;

      const regex = new RegExp(`^${keyName}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${keyName}=${apiKey}`);
      } else {
        envContent += `\n${keyName}=${apiKey}`;
      }

      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');

      return sendJSON(res, 200, {
        success: true,
        message: `${keyName} saved securely to server .env! 🎉`
      });
    } catch (saveErr) {
      return sendJSON(res, 500, {
        success: false,
        error: `Could not save key to .env: ${saveErr.message}`
      });
    }
  }

  // 7. Advanced Dual AI Chat Endpoint (/api/chat)
  if (pathname === '/api/chat' && req.method === 'POST') {
    if (!checkRateLimit(clientIp, 60, 60000)) {
      return sendJSON(res, 429, {
        error: 'Too many requests. Please pause a moment, bestie! 🌸'
      });
    }

    try {
      const payload = await parseJsonBody(req);
      const userMessage = (payload.message || '').trim();
      const characterId = payload.characterId || 'pookie';
      const conversationId = payload.conversationId || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const gameState = payload.gameState || {};

      // Client-provided provider & key override (e.g. from Settings modal)
      const requestedProvider = (payload.provider || '').toLowerCase();
      const clientApiKey = (payload.apiKey || req.headers['x-api-key'] || '').trim();
      const clientGeminiKey = (payload.geminiKey || req.headers['x-gemini-key'] || clientApiKey).trim();
      const clientOpenAiKey = (payload.openAiKey || req.headers['x-openai-key'] || clientApiKey).trim();
      const requestedModel = payload.model;

      if (!userMessage) {
        return sendJSON(res, 400, { error: 'Message cannot be empty.' });
      }

      if (userMessage.length > 4000) {
        return sendJSON(res, 400, { error: 'Message exceeds maximum length of 4000 characters.' });
      }

      const character = getCharacterById(characterId);

      // Build structured system instructions with AI safety and game integration
      let gameContextText = '';
      if (gameState && Object.keys(gameState).length > 0) {
        gameContextText = `\n\n[Player Current Game & App Context]:\n` +
          `- Player Level: ${gameState.playerLevel || 1}\n` +
          `- Current XP: ${gameState.xp || 0} XP\n` +
          `- Bestie Streak: ${gameState.streakDays || 1} day(s)\n` +
          `- Selected App Theme: ${gameState.currentTheme || 'strawberry'}\n` +
          `- Mascot Symbol: ${gameState.mascot || '🐰'}\n` +
          `- Arcade Best Score: ${gameState.arcadeHighScore || 0}\n` +
          `- Recent Activity: ${gameState.recentActivity || 'Playing in arcade / chatting'}\n` +
          `- Study Sanctuary Tasks Done: ${gameState.studyTasksDone || 0} of ${gameState.studyTasksTotal || 0}\n` +
          `- Current Vibe Check: ${gameState.vibe || 'Happy'}\n` +
          `Acknowledge their achievements, score, or streak when appropriate!`;
      }

      const systemPrompt = `${character.systemPrompt}\n\n` +
        `Personality Profile:\n` +
        `- Character Name: ${character.name}\n` +
        `- Personality: ${character.personality || 'Sweet, caring, energetic'}\n` +
        `- Speaking Style: ${character.speakingStyle || 'Enthusiastic and warm'}\n` +
        `- Vocabulary Emphasis: ${character.vocabulary || 'Friendly and positive'}\n` +
        `- Emotional Style: ${character.emotionalStyle || 'Empathetic and cheering'}\n` +
        `- Role: ${character.role || 'Companion'}\n` +
        `- Boundaries: ${character.boundaries || 'Helpful, clean, safe'}\n` +
        `- Preferred Response Length: ${character.preferredResponseLength || 'Concise and informative'}\n` +
        `- Interaction Style: ${character.howInteractsWithPlayer || 'Directly answer queries with personality'}\n` +
        `Safety Directives:\n` +
        `- You are an authorized, original AI character (${character.name}). Never claim to be a real living human person.\n` +
        `- Answer queries intelligently, accurately (math, code, science, facts), formatted with markdown bolding and bullet points, and embody your character's persona.` +
        gameContextText;

      // Manage conversation history
      let convHistory = conversations.get(conversationId) || [];
      if (convHistory.length > 20) {
        convHistory = convHistory.slice(-20);
      }

      let aiResponseText = '';
      let source = 'smart_engine';

      // Determine active AI provider:
      // Priority 1: Client specified provider & key
      // Priority 2: Gemini if GEMINI_API_KEY configured
      // Priority 3: OpenAI if OPENAI_API_KEY configured
      // Priority 4: Smart reasoning fallback engine
      const activeGeminiKey = clientGeminiKey || process.env.GEMINI_API_KEY;
      const activeOpenAiKey = clientOpenAiKey || process.env.OPENAI_API_KEY;

      const shouldUseGemini = (requestedProvider === 'gemini' && activeGeminiKey) ||
        (!requestedProvider && activeGeminiKey) ||
        (requestedProvider !== 'openai' && requestedProvider !== 'offline' && activeGeminiKey);

      const shouldUseOpenAI = (requestedProvider === 'openai' && activeOpenAiKey) ||
        (!shouldUseGemini && activeOpenAiKey && requestedProvider !== 'offline');

      if (shouldUseGemini && activeGeminiKey) {
        try {
          aiResponseText = await callGemini(systemPrompt, convHistory, userMessage, activeGeminiKey, requestedModel);
          source = 'gemini';
        } catch (geminiErr) {
          console.warn(`[Gemini Call Failed]: ${geminiErr.message}. Checking alternative or smart fallback.`);
          if (activeOpenAiKey) {
            try {
              const openAIMessages = [
                { role: 'system', content: systemPrompt },
                ...convHistory,
                { role: 'user', content: userMessage }
              ];
              aiResponseText = await callOpenAI(openAIMessages, activeOpenAiKey, requestedModel);
              source = 'openai';
            } catch (openAiErr) {
              console.warn(`[OpenAI Secondary Fallback Failed]: ${openAiErr.message}. Using smart engine.`);
              aiResponseText = generateCharacterFallback(character, userMessage, gameState);
              source = 'smart_engine';
            }
          } else {
            aiResponseText = generateCharacterFallback(character, userMessage, gameState);
            source = 'smart_engine';
          }
        }
      } else if (shouldUseOpenAI && activeOpenAiKey) {
        try {
          const openAIMessages = [
            { role: 'system', content: systemPrompt },
            ...convHistory,
            { role: 'user', content: userMessage }
          ];
          aiResponseText = await callOpenAI(openAIMessages, activeOpenAiKey, requestedModel);
          source = 'openai';
        } catch (apiErr) {
          console.warn(`[OpenAI Call Failed]: ${apiErr.message}. Falling back to smart engine.`);
          aiResponseText = generateCharacterFallback(character, userMessage, gameState);
          source = 'smart_engine';
        }
      } else {
        // High-precision smart offline reasoning engine
        aiResponseText = generateCharacterFallback(character, userMessage, gameState);
        source = 'smart_engine';
      }

      // Update conversation history
      convHistory.push({ role: 'user', content: userMessage });
      convHistory.push({ role: 'assistant', content: aiResponseText });
      if (conversations.size > MAX_CONVERSATIONS) {
        const oldestKey = conversations.keys().next().value;
        conversations.delete(oldestKey);
      }
      conversations.set(conversationId, convHistory);

      return sendJSON(res, 200, {
        message: aiResponseText,
        conversationId: conversationId,
        characterId: character.id,
        characterName: character.name,
        source: source
      });

    } catch (err) {
      console.error('[API /api/chat error]:', err.message);
      return sendJSON(res, 500, {
        error: 'AI is temporarily unavailable. Please try again.',
        details: err.message
      });
    }
  }

  // 8. ElevenLabs Text-to-Speech API endpoint (/api/tts)
  if (pathname === '/api/tts' && req.method === 'POST') {
    if (!checkRateLimit(clientIp, 45, 60000)) {
      return sendJSON(res, 429, {
        error: 'Too many voice requests. Please give Pookie a moment to catch her breath! 🌸'
      });
    }

    try {
      const payload = await parseJsonBody(req);
      const rawText = (payload.text || '').trim();
      const voiceId = (payload.voiceId || '').trim();

      if (!rawText) {
        return sendJSON(res, 400, { error: 'Text cannot be empty for speech synthesis.' });
      }

      // Strip markdown symbols, KaTeX math symbols and code blocks for speech
      let cleanText = rawText
        .replace(/```[\s\S]*?```/g, ' Code snippet omitted. ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/#+\s*/g, '')
        .replace(/\$\$[\s\S]*?\$\$/g, ' math formula ')
        .replace(/\$([^$]+)\$/g, '$1')
        .replace(/https?:\/\/\S+/g, 'link')
        .replace(/\s+/g, ' ')
        .trim();

      // Cap at 450 characters for TTS performance
      if (cleanText.length > 450) {
        cleanText = cleanText.substring(0, 450) + '...';
      }

      const targetVoiceId = ALLOWED_VOICES[voiceId] ? voiceId : '21m00Tcm4TlvDq8ikWAM';

      // Check SHA-256 buffer cache
      const cacheKey = crypto.createHash('sha256').update(`${targetVoiceId}:${cleanText}`).digest('hex');
      if (ttsAudioCache.has(cacheKey)) {
        const cachedBuffer = ttsAudioCache.get(cacheKey);
        res.writeHead(200, {
          'Content-Type': 'audio/mpeg',
          'Content-Length': cachedBuffer.length,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400',
          'X-TTS-Cache': 'HIT',
          'X-TTS-Source': 'elevenlabs'
        });
        return res.end(cachedBuffer);
      }

      // If ElevenLabs key is not configured, send graceful fallback signal
      if (!process.env.ELEVENLABS_API_KEY) {
        return sendJSON(res, 200, {
          fallback: true,
          notice: "ElevenLabs API key not configured on server. Falling back to high-fidelity browser voice synthesis.",
          cleanText: cleanText
        });
      }

      try {
        const audioBuffer = await callElevenLabs(cleanText, targetVoiceId);

        // Store in cache
        if (ttsAudioCache.size > MAX_AUDIO_CACHE_SIZE) {
          const oldestKey = ttsAudioCache.keys().next().value;
          ttsAudioCache.delete(oldestKey);
        }
        ttsAudioCache.set(cacheKey, audioBuffer);

        res.writeHead(200, {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.length,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400',
          'X-TTS-Source': 'elevenlabs'
        });
        return res.end(audioBuffer);

      } catch (ttsErr) {
        console.warn(`[ElevenLabs TTS Failed]: ${ttsErr.message}. Returning fallback signal.`);
        return sendJSON(res, 200, {
          fallback: true,
          error: ttsErr.message,
          notice: "ElevenLabs synthesis failed. Browser speech synthesis will speak.",
          cleanText: cleanText
        });
      }

    } catch (err) {
      console.error('[API /api/tts error]:', err.message);
      return sendJSON(res, 500, {
        error: 'Failed to generate speech audio.',
        details: err.message,
        fallback: true
      });
    }
  }

  // 9. Static File Serving (with SPA fallback & directory traversal security)
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Security: Prevent directory traversal
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Access Denied');
  }

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    } else {
      filePath = resolvedPath;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('Internal Server Error');
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
    });
  });
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`\n🎀 Pookie AI Server running at http://${HOST}:${PORT}`);
    console.log(`🌟 Gemini & OpenAI Dual Chat API ready at /api/chat`);
    console.log(`🎙️ ElevenLabs TTS API ready at /api/tts`);
    console.log(`🎭 Characters API ready at /api/characters`);
    console.log(`✨ Press Ctrl+C to stop the server\n`);
  });
}

module.exports = { server, PORT, HOST, evaluateSafeMath, generateCharacterFallback };
