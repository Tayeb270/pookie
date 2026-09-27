/**
 * POOKIE AI 🎀 - ADVANCED MULTI-CHARACTER CONVERSATIONAL ENGINE
 * Connects seamlessly to the secure backend Dual LLM API (/api/chat)
 * supporting Google Gemini, OpenAI ChatGPT, and deep offline reasoning fallback.
 */

class PookieAIEngine {
  constructor() {
    const hasStorage = typeof localStorage !== 'undefined';
    this.userName = hasStorage ? (localStorage.getItem('pookie_username') || '') : '';
    this.activeCharacterId = hasStorage ? (localStorage.getItem('pookie_active_character') || 'pookie') : 'pookie';
    this.characters = [];
    this.activeCharacter = null;
    this.knowledgeBase = this.initKnowledgeBase();

    // Default fallback character if offline or before fetch
    this.defaultCharacter = {
      id: 'pookie',
      name: 'Pookie Bestie',
      title: 'Your Tiny Digital Bestie ♡',
      avatar: '🐰',
      voiceId: '21m00Tcm4TlvDq8ikWAM',
      voiceName: 'Rachel (Sweet & Calming)',
      greeting: "Hiiii bestie! 🥺💕 I'm so happy you're here! What's on your mind today, bestie? We can chat, play games, study, or check your daily vibe! ✨"
    };
    this.activeCharacter = this.defaultCharacter;
  }

  /**
   * Dynamically fetch all characters from backend registry (/api/characters)
   */
  async fetchCharacters() {
    try {
      const res = await fetch('/api/characters');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.characters) && data.characters.length > 0) {
          this.characters = data.characters;
          const found = this.characters.find(c => c.id === this.activeCharacterId);
          this.activeCharacter = found || this.characters[0];
          this.activeCharacterId = this.activeCharacter.id;
          return this.characters;
        }
      }
    } catch (e) {
      console.warn('Could not fetch characters from server, using local defaults:', e.message);
    }

    // Default character list if server offline
    this.characters = [
      this.defaultCharacter,
      {
        id: 'detective',
        name: 'Detective Sterling',
        title: 'Chief Mystery Investigator 🕵️‍♂️',
        avatar: '🕵️‍♂️',
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        voiceName: 'Adam (Deep & Analytical)',
        greeting: "Evening, partner. Step out of the rain. I've been reviewing your case files and gaming logs. What mystery or challenge are we cracking today?"
      },
      {
        id: 'sensei',
        name: 'Master Kenji',
        title: 'Zen Mentor & Scholar 🍵',
        avatar: '🍵',
        voiceId: 'ErXwobaYiN019PkySvjV',
        voiceName: 'Antoni (Calm & Grounded)',
        greeting: "Peace be with you, young traveler. 🍵 Take a slow, deep breath and let the turbulent waters of your mind settle into glass. How may I guide your practice today?"
      },
      {
        id: 'cyber_nova',
        name: 'Nova Cyber-AI',
        title: 'Quantum Assistant v4.2 🤖',
        avatar: '🤖',
        voiceId: 'EXAVITQu4vr4xnSDxMaL',
        voiceName: 'Bella (Crisp & High-Tech)',
        greeting: "Diagnostics online. Core synchronization at 99.98%! ⚡ Hello Player! Quantum telemetry initialized. What computation, gaming strategy, or objective shall we tackle today?"
      },
      {
        id: 'chef_marcel',
        name: 'Chef Marcel',
        title: 'Grand Patissier & Comfort Chef 🥐',
        avatar: '🥐',
        voiceId: 'VR6AewLTigWG4xSOukaG',
        voiceName: 'Arnold (Warm & Expressive)',
        greeting: "Ah, bienvenue mon ami! 🥐 The ovens are warm, the vanilla is simmering, and the tea is steeping! Come, sit by the counter. What delicious thoughts or challenges are we cooking up today?"
      }
    ];
    return this.characters;
  }

  setActiveCharacter(characterId) {
    this.activeCharacterId = characterId;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pookie_active_character', characterId);
    }
    const found = this.characters.find(c => c.id === characterId);
    if (found) {
      this.activeCharacter = found;
    }
    return this.activeCharacter;
  }

  getConversationId(characterId = this.activeCharacterId) {
    if (typeof localStorage === 'undefined') return 'conv_default';
    const key = `pookie_conv_id_${characterId}`;
    let convId = localStorage.getItem(key);
    if (!convId) {
      convId = `conv_${characterId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem(key, convId);
    }
    return convId;
  }

  clearConversation(characterId = this.activeCharacterId) {
    if (typeof localStorage === 'undefined') return;
    const convKey = `pookie_conv_id_${characterId}`;
    const histKey = `pookie_history_${characterId}`;
    localStorage.removeItem(convKey);
    localStorage.removeItem(histKey);
  }

  getHistory(characterId = this.activeCharacterId) {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(`pookie_history_${characterId}`);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  saveHistory(characterId, messages) {
    if (typeof localStorage === 'undefined') return;
    try {
      const slice = messages.slice(-30);
      localStorage.setItem(`pookie_history_${characterId}`, JSON.stringify(slice));
    } catch (e) {}
  }

  setUserName(name) {
    this.userName = name;
    if (typeof localStorage !== 'undefined') localStorage.setItem('pookie_username', name);
  }

  /**
   * Main generation method: calls backend /api/chat (Gemini / OpenAI intelligence)
   * with automatic, graceful character fallback.
   */
  async generateResponse(userMessage, gameState = {}) {
    // Detect user name if explicitly provided
    const nonNameWords = new Set(['feeling', 'so', 'sad', 'happy', 'tired', 'doing', 'good', 'fine', 'okay', 'bored', 'anxious', 'hungry', 'ready', 'just', 'not', 'here', 'back', 'new', 'confused', 'lost', 'exhausted', 'stressed', 'a', 'the', 'very', 'super', 'always', 'really']);
    const nameMatch = userMessage.match(/(?:my name is|call me)\s+([a-zA-Z]+)/i) || userMessage.match(/(?:i am|i'm)\s+([A-Z][a-z]+)/);
    if (nameMatch && nameMatch[1] && !nonNameWords.has(nameMatch[1].toLowerCase())) {
      this.setUserName(nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase());
    }

    const conversationId = this.getConversationId(this.activeCharacterId);

    // Retrieve active provider & API key from localStorage if configured
    const provider = typeof localStorage !== 'undefined' ? (localStorage.getItem('pookie_ai_provider') || 'gemini') : 'gemini';
    const apiKey = typeof localStorage !== 'undefined' ? (localStorage.getItem(`pookie_${provider}_key`) || localStorage.getItem('pookie_api_key') || '') : '';
    const model = typeof localStorage !== 'undefined' ? (localStorage.getItem('pookie_ai_model') || '') : '';

    // 1. Attempt secure backend chat endpoint in browser environment
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'x-api-key': apiKey } : {})
          },
          body: JSON.stringify({
            message: userMessage,
            characterId: this.activeCharacterId,
            conversationId: conversationId,
            gameState: gameState,
            provider: provider,
            apiKey: apiKey,
            model: model
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.message) {
            return {
              text: data.message,
              source: data.source || provider,
              character: this.activeCharacter
            };
          }
        }
      } catch (err) {
        console.warn('Network call to /api/chat failed, gracefully using offline character engine:', err.message);
      }
    }

    // 2. Intelligent Offline Fallback Engine (Zero disruption)
    await new Promise(res => setTimeout(res, 200 + Math.random() * 200));
    const offlineReply = this.generateOfflineResponse(userMessage, this.activeCharacter, gameState);
    return {
      text: offlineReply,
      source: 'offline_fallback',
      character: this.activeCharacter
    };
  }

  /**
   * Deep Offline Knowledge, Math, and Character-Aware Engine
   */
  generateOfflineResponse(rawInput, character, gameState = {}) {
    const text = rawInput.toLowerCase().trim();
    const charId = character?.id || 'pookie';

    // 1. MATH & ARITHMETIC CALCULATOR
    const mathResult = this.evaluateMath(text);
    if (mathResult !== null) {
      if (charId === 'detective') {
        return `The calculations check out, partner: **${mathResult}**. The numbers don't lie. What's our next cipher? 🕵️‍♂️`;
      }
      if (charId === 'sensei') {
        return `The mathematics reflect perfect harmony: **${mathResult}**. 🍵 Even in vast numbers, order prevails.`;
      }
      if (charId === 'cyber_nova') {
        return `Quantum arithmetic processed in 0.002ms! ⚡ Result: **${mathResult}**. All core registers verified! 🤖`;
      }
      if (charId === 'chef_marcel') {
        return `Voila! **${mathResult}**! 🥐 Exactly like measuring flour and butter in perfect ratio, mon ami! ✨`;
      }
      return `The answer is **${mathResult}**! 🧮✨ Pookie's math calculation is locked in! Need any other numbers calculated, bestie? 🎀`;
    }

    // 2. FACTUAL SCIENCE & ENCYCLOPEDIA TOPICS
    if (this.matchesAny(text, ['photosynthesis'])) {
      return `Here is how **photosynthesis** works! 🌱✨\n\nIt is the magical process green plants use to turn sunlight into food and oxygen:\n\n• **1. Ingredients:** Plants take in sunlight, water ($H_2O$) from their roots, and carbon dioxide ($CO_2$) from the air.\n• **2. The Kitchen (Chloroplasts):** Green pigment called **chlorophyll** absorbs light energy.\n• **3. The Output:** They create glucose (sugar for energy) and release fresh **Oxygen ($O_2$)** for us to breathe!\n\nChemical formula: $6CO_2 + 6H_2O + \\text{light} \\rightarrow C_6H_{12}O_6 + 6O_2$ 🍃`;
    }

    if (this.matchesAny(text, ['gravity', 'gravitational'])) {
      return `**Gravity** is the invisible force that pulls objects toward each other! 🌌🍎\n\n• Anything that has mass has gravity. The more massive an object, the stronger its pull!\n• Earth has strong gravity, which is why your feet stay on the ground and things fall downward.\n• The Moon stays in Earth's orbit, and Earth stays in orbit around the Sun because of gravity!\n• Einstein showed us that gravity is actually the bending of space and time caused by mass! ✨`;
    }

    if (this.matchesAny(text, ['black hole', 'black holes'])) {
      return `**Black Holes** are some of the most fascinating objects in the cosmos! 🕳️⭐\n\n• A black hole is formed when a massive dying star collapses under its own immense gravity.\n• Its gravity is so incredibly strong that **nothing—not even light—can escape** once it crosses the "event horizon" boundary!\n• At the center is a point of near-infinite density called a **singularity**.\n• Don't worry bestie, the nearest black hole is thousands of light-years away from Earth! 🚀✨`;
    }

    // 3. STUDY & FOCUS TIPS
    if (this.matchesAny(text, ['study', 'exam', 'homework', 'focus', 'pomodoro'])) {
      return `Here is Pookie's **Triple Study Sanctuary Strategy** 📚✨:\n\n• **1. The Feynman Technique:** Explain the hardest concept out loud in simple words to train your brain!\n• **2. Active Recall:** Test yourself with questions or flashcards before checking your notes!\n• **3. Pomodoro Technique Power:** 25 minutes of deep focus, then a 5-minute break with cozy lo-fi audio!\n\nYou're going to crush this exam, bestie! 🌸`;
    }

    // 4. EMOTIONAL SUPPORT & ANXIETY
    if (this.matchesAny(text, ['sad', 'depressed', 'down', 'cry', 'lonely', 'anxious', 'panic', 'overwhelmed', 'stress', 'scared'])) {
      if (charId === 'sensei') {
        return `Breathe gently, young traveler. 🍵 Place both hands upon your lap. Inhale the stillness of the mountain for 4 counts, hold for 4, and release the tension with the wind. You are safe here in this moment.`;
      }
      if (charId === 'detective') {
        return `Easy does it, partner. 🕵️‍♂️ Take a step back from the case. Close your eyes, take three deep, slow breaths. We solve problems one clue at a time. You've got backup right here.`;
      }
      return `I am sending you the biggest, warmest virtual hug right now, bestie! 🥺🫂 Wrap yourself in a cozy blanket, drink a sip of warm water, and breathe slowly. It is completely okay to feel down sometimes. You are so loved, and Pookie is right by your side! ♡🎀`;
    }

    // 5. JOKES & HUMOR
    if (this.matchesAny(text, ['joke', 'funny', 'laugh'])) {
      const jokes = [
        "Why do birds fly south for the winter? 🐦\n...Because it's way too far to walk! 😂✨",
        "What do you call a sleeping dinosaur? 🦕\n...A dino-snore! 😴💤",
        "Why did the strawberry cry? 🍓\n...Because its mom was in a jam! 🍞💕",
        "What did one wall say to the other wall? 🧱\n...\"I'll meet you at the corner!\" 🤭"
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }

    // 6. GAME CONTEXT RESPONSE
    if (this.matchesAny(text, ['game', 'arcade', 'xp', 'level', 'score', 'streak'])) {
      const level = gameState?.playerLevel || 7;
      const xp = gameState?.xp || 780;
      if (charId === 'cyber_nova') {
        return `Telemetry Check: Current Status is **Level ${level}** with **${xp} XP**! ⚡ Optimal gaming parameters detected. Launch Catch The Sparkles or Card Match to push our record even higher! 🎮🤖`;
      }
      return `You are currently at **Level ${level}** with **${xp} XP**! 🎮✨ Keep playing Pookie Match and Catch The Sparkles to unlock badges and level up! 🎀`;
    }

    // Generic character response
    if (charId === 'detective') {
      return `I hear you, partner. Every observation gives us another lead on the case. What's our next course of action? 🕵️‍♂️`;
    }
    if (charId === 'sensei') {
      return `Wisdom begins with listening. 🍵 Reflect upon your question, young traveler, and the path forward will reveal itself.`;
    }
    if (charId === 'cyber_nova') {
      return `Data received and analyzed with 100% precision, Operator! ⚡ Ready for your next command! 🤖`;
    }
    if (charId === 'chef_marcel') {
      return `Magnifique, mon ami! 🥐 That brings wonderful flavor to our conversation! What shall we cook up next? 🍰`;
    }

    return `I hear you loud and clear, bestie! 🎀✨ That's a great thought. Pookie is right here with you—ready to chat, play arcade games, study, or check your daily vibe! What shall we do next? 💕`;
  }

  evaluateMath(text) {
    const clean = text.replace(/what is|calculate|solve|equals|\?|=|please/gi, '').trim();
    if (!/^[0-9+\-*/().\s^%]+$/.test(clean)) return null;
    if (!/[+\-*/^%]/.test(clean)) return null;

    try {
      let sanitized = clean.replace(/\^/g, '**');
      const fn = new Function(`return (${sanitized})`);
      const val = fn();
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        return Number(val.toFixed(4));
      }
    } catch (e) {}
    return null;
  }

  matchesAny(text, keywords) {
    return keywords.some(k => text.includes(k));
  }

  initKnowledgeBase() {
    return {
      appName: "Pookie AI 🎀"
    };
  }
}

// Export for browser & node
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PookieAIEngine;
}
