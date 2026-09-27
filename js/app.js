/**
 * POOKIE AI 🎀 - CORE APPLICATION MANAGER
 * Coordinates Views, XP/Leveling, Audio Synthesizer, Speech Recognition, Themes & Gamification.
 */

class SoundManager {
  constructor() {
    this.muted = localStorage.getItem('pookie_sound_muted') === 'true';
    this.audioCtx = null;
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('pookie_sound_muted', this.muted);
    return this.muted;
  }

  playPop() {
    if (this.muted) return;
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch (e) {}
  }

  playChime() {
    if (this.muted) return;
    try {
      const ctx = this.getAudioContext();
      const notes = [587.33, 739.99, 880.00]; // D, F#, A chord
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.36);
      });
    } catch (e) {}
  }

  playFanfare() {
    if (this.muted) return;
    try {
      const ctx = this.getAudioContext();
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.46);
      });
    } catch (e) {}
  }

  playRingtone() {
    if (this.muted) return;
    try {
      const ctx = this.getAudioContext();
      [0, 0.4].forEach(offset => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime + offset);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.31);
      });
    } catch (e) {}
  }

  playCallEnd() {
    if (this.muted) return;
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch (e) {}
  }
}

class PookieApp {
  constructor() {
    this.soundManager = new SoundManager();
    this.aiEngine = new PookieAIEngine();
    this.gamesManager = new PookieGamesManager(this);
    this.studyManager = new PookieStudyManager(this);
    this.notesManager = new PookieNotesManager(this);
    this.voiceManager = new PookieVoiceManager(this);

    // Load gamification state
    this.xp = parseInt(localStorage.getItem('pookie_xp') || '780', 10);
    this.mascot = localStorage.getItem('pookie_mascot') || '🐰';
    this.theme = localStorage.getItem('pookie_theme') || 'strawberry';
    this.particleType = localStorage.getItem('pookie_particles') || 'hearts';
    this.voiceEnabled = localStorage.getItem('pookie_voice_tts') === 'true';

    // Daily streak logic
    this.initStreak();

    // Badges inventory
    this.badges = [
      { id: 'first_chat', name: 'First Words', icon: '💬', unlocked: true },
      { id: 'streak_3', name: 'Bestie Bond', icon: '🔥', unlocked: true },
      { id: 'gamer', name: 'Arcade Star', icon: '🎮', unlocked: true },
      { id: 'study_pro', name: 'Deep Focus', icon: '📚', unlocked: false },
      { id: 'vibe_master', name: 'Vibe Queen', icon: '✨', unlocked: true },
      { id: 'level_10', name: 'Level 10 Club', icon: '👑', unlocked: false }
    ];

    // Daily Challenges
    this.challenges = [
      { id: 'emoji_day', text: "Describe your day using only <b>3 emojis!</b>", xp: 20, done: false },
      { id: 'drink_water', text: "Drink a tall glass of fresh water 💧", xp: 15, done: false },
      { id: 'compliment', text: "Send Pookie a sweet compliment in chat 💕", xp: 15, done: false },
      { id: 'study_session', text: "Finish 1 Pomodoro session in Study Mode 📚", xp: 30, done: false }
    ];

    this.isRecording = false;
    this.recognition = null;
  }

  init() {
    this.applyTheme(this.theme);
    this.applyMascot(this.mascot);
    this.renderParticles(this.particleType);
    this.updateXPUI();
    this.initNavigation();
    this.initChat();
    this.initRightPanel();
    this.initVibeCheck();
    this.initChallengesView();
    this.initThemesView();
    this.initSettingsModal();
    this.initSpeech();
    this.voiceManager.init();
    this.initPWA();
    this.initPhoneCall();
    this.initShakeDetector();

    // Submodules
    this.gamesManager.init();
    this.studyManager.init();
    this.notesManager.init();

    // Mascot pet easter egg
    const mascotEl = document.getElementById('mascot');
    if (mascotEl) {
      mascotEl.addEventListener('click', () => {
        this.addXP(5, 'Petting Pookie! ♡');
        this.triggerHaptic('light');
        this.soundManager.playPop();
        this.showFloatingXP('+5 XP ♡', mascotEl);
        this.setMood('🥰', 'Feeling So Loved!');
      });
    }

    // Mobile & iOS Audio Unlock on first user touch/tap
    const unlockMobileAudio = () => {
      if (this.soundManager) this.soundManager.getAudioContext();
      window.removeEventListener('touchstart', unlockMobileAudio);
      window.removeEventListener('touchend', unlockMobileAudio);
      window.removeEventListener('click', unlockMobileAudio);
    };
    window.addEventListener('touchstart', unlockMobileAudio, { passive: true });
    window.addEventListener('touchend', unlockMobileAudio, { passive: true });
    window.addEventListener('click', unlockMobileAudio, { passive: true });
  }

  /* ========================================================================
     XP & LEVELING SYSTEM
     ======================================================================== */

  getLevel() {
    return Math.floor(this.xp / 100) + 1;
  }

  getLevelProgress() {
    return this.xp % 100;
  }

  addXP(amount, reason = '') {
    const prevLevel = this.getLevel();
    this.xp += amount;
    localStorage.setItem('pookie_xp', this.xp.toString());

    this.updateXPUI();

    if (reason) {
      this.showToast(`⭐ +${amount} XP: ${reason}`);
    }

    const newLevel = this.getLevel();
    if (newLevel > prevLevel) {
      this.celebrateLevelUp(newLevel);
    }
  }

  updateXPUI() {
    const headerXp = document.getElementById('headerXP');
    const levelText = document.getElementById('levelText');
    const levelBar = document.getElementById('levelBar');
    const levelSub = document.getElementById('levelSub');

    const level = this.getLevel();
    const progress = this.getLevelProgress();

    if (headerXp) headerXp.textContent = `⭐ ${this.xp} XP`;
    if (levelText) levelText.textContent = `Level ${level < 10 ? '0' + level : level} 🎀`;
    if (levelBar) levelBar.style.width = `${progress}%`;
    if (levelSub) levelSub.textContent = `${progress} / 100 XP to next level`;
  }

  celebrateLevelUp(level) {
    this.soundManager.playFanfare();
    this.celebrate();
    alert(`🎊 LEVEL UP! 🎀\n\nYou just reached Level ${level}! Pookie is so proud of you! ✨`);
  }

  initStreak() {
    const lastActive = localStorage.getItem('pookie_last_active');
    let streak = parseInt(localStorage.getItem('pookie_streak') || '3', 10);
    const today = new Date().toDateString();

    if (lastActive !== today) {
      localStorage.setItem('pookie_last_active', today);
    }
    const streakEl = document.getElementById('streakCount');
    if (streakEl) streakEl.textContent = `${streak} Days`;
  }

  /* ========================================================================
     NAVIGATION (VIEW ROUTER)
     ======================================================================== */

  initNavigation() {
    const desktopButtons = document.querySelectorAll('.sidebar .menu button[data-view]');
    const mobileButtons = document.querySelectorAll('.mobile-bottom-nav .mobile-nav-btn[data-view]');
    const allNavButtons = [...desktopButtons, ...mobileButtons];
    const views = document.querySelectorAll('.view-panel');
    const mobileToggle = document.getElementById('mobileNavToggle');
    const sidebar = document.querySelector('.sidebar');

    const switchView = (viewId) => {
      // Highlight matching buttons in both desktop sidebar & mobile bottom bar
      desktopButtons.forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
      mobileButtons.forEach(b => b.classList.toggle('active', b.dataset.view === viewId));

      views.forEach(v => {
        v.classList.toggle('active', v.id === viewId);
      });

      // Close mobile drawer on item tap
      if (sidebar && sidebar.classList.contains('mobile-open')) {
        sidebar.classList.remove('mobile-open');
      }

      this.soundManager.playPop();
    };

    allNavButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        switchView(btn.dataset.view);
      });
    });

    if (mobileToggle && sidebar) {
      mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }

    // Logo click goes to Home / Chat
    const logo = document.querySelector('.logo');
    if (logo) {
      logo.addEventListener('click', () => {
        const homeBtn = document.querySelector('button[data-view="view-chat"]');
        if (homeBtn) homeBtn.click();
      });
    }
  }

  /* ========================================================================
     CHAT SYSTEM & MULTI-CHARACTER EXPERIENCE
     ======================================================================== */

  async initChat() {
    const input = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const stopGenBtn = document.getElementById('stopGenBtn');
    const emojiBtn = document.getElementById('emojiBtn');
    const emojiDrawer = document.getElementById('emojiDrawer');
    const previewVoiceBtn = document.getElementById('previewActiveVoiceBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');

    this.isGenerating = false;
    this.abortGeneration = false;
    this.lastUserMessage = '';

    // 1. Fetch & render characters from backend
    await this.aiEngine.fetchCharacters();
    this.renderCharacterChips();

    // 2. Sync active character and initial voice
    const activeChar = this.aiEngine.activeCharacter;
    if (activeChar) {
      this.voiceManager.setVoiceId(activeChar.voiceId);
      this.updateActiveCharacterBanner(activeChar);
      this.loadCharacterChat(activeChar.id);
    }

    // 3. Clear Chat Button
    if (clearChatBtn) {
      clearChatBtn.addEventListener('click', () => {
        const char = this.aiEngine.activeCharacter;
        if (confirm(`Clear conversation history with ${char?.name || 'this character'}? ♡`)) {
          this.aiEngine.clearConversation(char?.id);
          this.loadCharacterChat(char?.id);
          this.showToast('Conversation history cleared! 📋');
        }
      });
    }

    // 4. Test Voice Preview Button in header banner
    if (previewVoiceBtn) {
      previewVoiceBtn.addEventListener('click', () => {
        const char = this.aiEngine.activeCharacter;
        this.voiceManager.previewVoice(char?.voiceId);
      });
    }

    // 5. Send & Stop Generation Buttons
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.handleSendMessage());
    }

    if (stopGenBtn) {
      stopGenBtn.addEventListener('click', () => {
        this.abortGeneration = true;
        this.voiceManager.stop();
        this.isGenerating = false;
        if (stopGenBtn) stopGenBtn.style.display = 'none';
        if (sendBtn) sendBtn.style.display = 'inline-flex';
        this.showToast('Generation / audio stopped ⏹️');
      });
    }

    // 6. Textarea Input: Enter sends, Shift+Enter newlines, auto-grow
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });

      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      });
    }

    // 7. Emoji Drawer Toggle
    if (emojiBtn && emojiDrawer) {
      emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiDrawer.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!emojiDrawer.contains(e.target) && e.target !== emojiBtn) {
          emojiDrawer.classList.remove('active');
        }
      });

      this.initEmojiPicker();
    }
  }

  renderCharacterChips() {
    const container = document.getElementById('characterChips');
    if (!container) return;
    container.innerHTML = '';

    const characters = this.aiEngine.characters;
    characters.forEach(char => {
      const chip = document.createElement('button');
      chip.className = `char-chip ${char.id === this.aiEngine.activeCharacterId ? 'active' : ''}`;
      chip.dataset.charId = char.id;
      chip.innerHTML = `
        <span class="char-chip-avatar">${char.avatar}</span>
        <span>${char.name}</span>
      `;

      chip.addEventListener('click', () => {
        this.switchCharacter(char.id);
      });

      container.appendChild(chip);
    });
  }

  switchCharacter(characterId) {
    const char = this.aiEngine.setActiveCharacter(characterId);
    if (!char) return;

    // Update active chip highlight
    document.querySelectorAll('.char-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.charId === characterId);
    });

    // Update Voice Manager active voice
    this.voiceManager.setVoiceId(char.voiceId);

    // Update active banner & mascot
    this.updateActiveCharacterBanner(char);

    // Load saved conversation history
    this.loadCharacterChat(characterId);

    this.soundManager.playPop();
    this.showToast(`Switched companion to ${char.name}! ✨`);
  }

  updateActiveCharacterBanner(char) {
    const avatarEl = document.getElementById('activeCharAvatar');
    const nameEl = document.getElementById('activeCharName');
    const voiceEl = document.getElementById('activeCharVoice');
    const mascotDisplay = document.getElementById('mascot');
    const welcomeTitle = document.getElementById('welcomeTitle');
    const welcomeSubtitle = document.getElementById('welcomeSubtitle');
    const aiProviderBadge = document.getElementById('aiProviderBadge');

    if (avatarEl) avatarEl.textContent = char.avatar;
    if (nameEl) nameEl.textContent = char.name;
    if (voiceEl) voiceEl.textContent = `🎙️ Voice: ${char.voiceName || 'ElevenLabs Voice'}`;
    if (mascotDisplay) mascotDisplay.textContent = char.avatar;
    if (welcomeTitle) welcomeTitle.textContent = `${char.name} is listening...`;
    if (welcomeSubtitle) welcomeSubtitle.textContent = char.title || 'Your AI companion ♡';

    if (aiProviderBadge) {
      const provider = localStorage.getItem('pookie_ai_provider') || 'gemini';
      aiProviderBadge.textContent = provider === 'gemini' ? '🌟 Gemini 1.5' :
                                    (provider === 'openai' ? '🤖 ChatGPT' : '💡 Smart Engine');
    }
  }

  loadCharacterChat(characterId) {
    const chat = document.getElementById('chat');
    if (!chat) return;

    // Keep the welcome section
    const welcome = chat.querySelector('.welcome');
    chat.innerHTML = '';
    if (welcome) chat.appendChild(welcome);

    const history = this.aiEngine.getHistory(characterId);
    const char = this.aiEngine.activeCharacter;

    if (history && history.length > 0) {
      history.forEach(msg => {
        this.addChatMessage(msg.content, msg.role === 'user' ? 'user' : 'bot', char, false);
      });
    } else {
      // Show character's initial greeting
      const greeting = char?.greeting || "Hiiii! 🥺💕 I'm so happy you're here! What's on your mind today?";
      this.addChatMessage(greeting, 'bot', char, false);
    }
  }

  initEmojiPicker() {
    const emojiList = ['🎀', '💖', '🥺', '🌸', '🍓', '✨', '🐰', '🍰', '☕', '🧸', '🧁', '⭐', '🥰', '🤭', '💤', '💭', '🧋', '🌷', '🦋', '💌', '🕵️‍♂️', '🍵', '🤖', '🥐'];
    const grid = document.getElementById('emojiGrid');
    const input = document.getElementById('messageInput');

    if (!grid || !input) return;
    grid.innerHTML = '';
    emojiList.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'emoji-cell';
      btn.textContent = emoji;
      btn.addEventListener('click', () => {
        input.value += emoji;
        input.focus();
        this.soundManager.playPop();
      });
      grid.appendChild(btn);
    });
  }

  async handleSendMessage(overrideText = null) {
    const input = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const stopGenBtn = document.getElementById('stopGenBtn');

    const message = overrideText || input.value.trim();
    if (!message || this.isGenerating) return;

    this.lastUserMessage = message;
    this.soundManager.playPop();
    const char = this.aiEngine.activeCharacter;

    // Render user message bubble
    this.addChatMessage(message, 'user');
    if (!overrideText) {
      input.value = '';
      input.style.height = 'auto';
    }

    // Gamification XP
    this.addXP(2);
    this.setMood('🧠', `${char?.name || 'AI'} is thinking...`);

    // Toggle Send / Stop generation buttons
    this.isGenerating = true;
    this.abortGeneration = false;
    if (sendBtn) sendBtn.style.display = 'none';
    if (stopGenBtn) stopGenBtn.style.display = 'inline-flex';

    // Show typing indicator
    const typingIndicator = this.showTypingIndicator();

    // Prepare rich game context
    const gameState = {
      playerLevel: this.getLevel(),
      xp: this.xp,
      streakDays: parseInt(localStorage.getItem('pookie_streak') || '3', 10),
      currentTheme: this.theme,
      mascot: this.mascot,
      arcadeHighScore: parseInt(localStorage.getItem('pookie_arcade_high') || '0', 10),
      studyTasksTotal: this.studyManager?.tasks?.length || 3,
      studyTasksDone: this.studyManager?.tasks?.filter(t => t.done)?.length || 0,
      vibe: localStorage.getItem('pookie_last_vibe') || 'Peaceful'
    };

    try {
      const result = await this.aiEngine.generateResponse(message, gameState);
      this.removeTypingIndicator(typingIndicator);

      if (this.abortGeneration) {
        return;
      }

      // Render bot message with ChatGPT-style streaming typewriter animation
      await this.addChatMessage(result.text, 'bot', char, true);
      this.soundManager.playPop();
      this.randomizeMood();

      // Save messages in persistent history
      const currentHistory = this.aiEngine.getHistory(char.id);
      currentHistory.push({ role: 'user', content: message });
      currentHistory.push({ role: 'bot', content: result.text });
      this.aiEngine.saveHistory(char.id, currentHistory);

      // Auto-speak in character's ElevenLabs voice if enabled
      if (this.voiceManager && this.voiceManager.autoSpeak && !this.abortGeneration) {
        this.voiceManager.speak(result.text, char.voiceId);
      }

    } catch (e) {
      this.removeTypingIndicator(typingIndicator);
      this.addChatMessage(`Aww bestie, my thoughts got a tiny bit tangled (${e.message})! Let's try again! 🥺💕`, 'bot', char, false);
    } finally {
      this.isGenerating = false;
      if (sendBtn) sendBtn.style.display = 'inline-flex';
      if (stopGenBtn) stopGenBtn.style.display = 'none';
    }
  }

  async addChatMessage(text, sender, character = null, shouldStream = false) {
    const chat = document.getElementById('chat');
    if (!chat) return;

    const char = character || this.aiEngine.activeCharacter || { name: 'Pookie', avatar: '🐰', voiceId: '21m00Tcm4TlvDq8ikWAM' };
    const wrapper = document.createElement('div');
    wrapper.className = `message ${sender}`;

    if (sender === 'bot') {
      wrapper.innerHTML = `
        <div class="message-content">
          <div class="sender-bar">
            <span>${char.avatar} ${char.name}</span>
          </div>
          <div class="message-bubble">
            ${shouldStream ? '' : this.formatMarkdown(text)}
          </div>
          <div class="message-actions" style="${shouldStream ? 'opacity:0;' : ''}">
            <button class="msg-btn speak-btn" title="Read Aloud in ${char.name}'s Voice">🔊</button>
            <button class="msg-btn copy-btn" title="Copy Text">📋</button>
            <button class="msg-btn share-btn" title="Share via Phone">↗️</button>
            <button class="msg-btn retry-btn" title="Retry / Regenerate Response">🔄</button>
            <div class="reactions-list">
              <span class="reaction-chip">💖</span>
              <span class="reaction-chip">🥺</span>
              <span class="reaction-chip">✨</span>
            </div>
          </div>
        </div>
      `;

      chat.appendChild(wrapper);
      chat.scrollTop = chat.scrollHeight;

      const bubble = wrapper.querySelector('.message-bubble');
      const actions = wrapper.querySelector('.message-actions');

      // Streaming typewriter effect (Optimized for 60fps mobile smoothness)
      if (shouldStream) {
        const words = text.split(/(?<=\s+)/);
        let accumulated = '';
        const chunkSize = words.length > 50 ? 3 : 2;
        for (let i = 0; i < words.length; i += chunkSize) {
          if (this.abortGeneration) break;
          accumulated += words.slice(i, i + chunkSize).join('');
          bubble.innerHTML = this.formatMarkdown(accumulated);

          // Only auto-scroll if user is near bottom (eliminates layout thrashing)
          if (chat.scrollHeight - chat.scrollTop - chat.clientHeight < 160) {
            chat.scrollTop = chat.scrollHeight;
          }
          await new Promise(r => setTimeout(r, 24));
        }
        bubble.innerHTML = this.formatMarkdown(text);
        if (actions) actions.style.opacity = '1';
        chat.scrollTop = chat.scrollHeight;
      }

      // Read aloud button
      wrapper.querySelector('.speak-btn')?.addEventListener('click', () => {
        if (this.voiceManager) this.voiceManager.speak(text, char.voiceId);
      });

      // Copy text button
      wrapper.querySelector('.copy-btn')?.addEventListener('click', () => {
        navigator.clipboard.writeText(text);
        this.showToast('Copied to clipboard! 📋');
      });

      // Share button (Phone Native Share Sheet)
      wrapper.querySelector('.share-btn')?.addEventListener('click', () => {
        this.shareContent(`${char.name} on Pookie AI`, text);
      });

      // Retry button
      wrapper.querySelector('.retry-btn')?.addEventListener('click', () => {
        if (this.lastUserMessage) {
          wrapper.remove();
          this.handleSendMessage(this.lastUserMessage);
        }
      });

      // Reaction chips
      wrapper.querySelectorAll('.reaction-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          chip.style.transform = 'scale(1.3)';
          this.soundManager.playPop();
          setTimeout(() => chip.style.transform = 'scale(1)', 200);
        });
      });

    } else {
      wrapper.innerHTML = `
        <div class="message-content">
          <div class="message-bubble">
            ${this.escapeHTML(text)}
          </div>
        </div>
      `;
      chat.appendChild(wrapper);
      chat.scrollTop = chat.scrollHeight;
    }

    return wrapper;
  }

  showTypingIndicator() {
    const chat = document.getElementById('chat');
    const char = this.aiEngine.activeCharacter;
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <span class="typing-text">${char?.name || 'AI'} is typing... 💭</span>
    `;
    chat.appendChild(indicator);
    chat.scrollTop = chat.scrollHeight;
    return indicator;
  }

  removeTypingIndicator(el) {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  formatMarkdown(text) {
    let clean = this.escapeHTML(text);
    // Bold **text**
    clean = clean.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Code blocks `code`
    clean = clean.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bullet points
    clean = clean.replace(/^\s*•\s+(.*$)/gim, '<li>$1</li>');
    clean = clean.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
    // Line breaks
    clean = clean.replace(/\n/g, '<br>');
    return clean;
  }

  /* ========================================================================
     SPEECH TO TEXT & TEXT TO SPEECH
     ======================================================================== */

  initSpeech() {
    const micBtn = document.getElementById('micBtn');
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRec && micBtn) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isRecording = true;
        micBtn.classList.add('recording');
        this.showToast('Listening to your sweet voice... 🎙️');
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById('messageInput');
        if (input) {
          input.value = transcript;
          this.handleSendMessage();
        }
      };

      this.recognition.onerror = () => {
        this.isRecording = false;
        micBtn.classList.remove('recording');
      };

      this.recognition.onend = () => {
        this.isRecording = false;
        micBtn.classList.remove('recording');
      };

      micBtn.addEventListener('click', () => {
        if (this.isRecording) {
          this.recognition.stop();
        } else {
          try {
            this.recognition.start();
          } catch (e) {}
        }
      });
    } else if (micBtn) {
      micBtn.addEventListener('click', () => {
        alert('Speech recognition is not supported in this browser! Try Chrome or Edge ♡');
      });
    }
  }

  speakText(text) {
    if (this.voiceManager) {
      this.voiceManager.speak(text);
    }
  }

  /* ========================================================================
     RIGHT PANEL: MOOD & CHALLENGE
     ======================================================================== */

  initRightPanel() {
    const faceEl = document.getElementById('moodFace');
    if (faceEl) {
      faceEl.addEventListener('click', () => {
        this.randomizeMood();
        this.soundManager.playPop();
      });
    }

    const challengeBtn = document.getElementById('dailyChallengeBtn');
    if (challengeBtn) {
      challengeBtn.addEventListener('click', () => {
        this.completeDailyChallenge();
      });
    }
  }

  setMood(face, name, percent = 85) {
    const faceEl = document.getElementById('moodFace');
    const nameEl = document.getElementById('moodName');
    const barEl = document.getElementById('moodBar');

    if (faceEl) faceEl.textContent = face;
    if (nameEl) nameEl.textContent = name;
    if (barEl) barEl.style.width = `${percent}%`;
  }

  randomizeMood() {
    const moods = [
      { face: '🥰', name: 'Feeling Lovely', percent: 90 },
      { face: '✨', name: 'Sparkly & Excited!', percent: 95 },
      { face: '🥺', name: 'Super Caring', percent: 85 },
      { face: '🌸', name: 'Peaceful & Cozy', percent: 80 },
      { face: '🤭', name: 'Playful & Sassy', percent: 88 }
    ];
    const selected = moods[Math.floor(Math.random() * moods.length)];
    this.setMood(selected.face, selected.name, selected.percent);
  }

  completeDailyChallenge() {
    this.addXP(20, 'Daily Emoji Challenge Completed! ⭐');
    this.soundManager.playChime();
    this.celebrate();

    const descEl = document.getElementById('dailyChallengeDesc');
    const btn = document.getElementById('dailyChallengeBtn');
    if (descEl) descEl.innerHTML = "Challenge finished for today! Come back tomorrow for more XP! 🌟";
    if (btn) {
      btn.textContent = "Completed ⭐";
      btn.disabled = true;
      btn.style.opacity = '0.6';
    }
  }

  /* ========================================================================
     VIBE CHECK
     ======================================================================== */

  initVibeCheck() {
    const chips = document.querySelectorAll('.vibe-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chip.parentElement.querySelectorAll('.vibe-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        this.soundManager.playPop();
      });
    });

    const submitBtn = document.getElementById('vibeSubmitBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this.generateVibeResult();
      });
    }
  }

  generateVibeResult() {
    const energy = document.getElementById('vibeEnergySlider')?.value || 3;
    const moodChip = document.querySelector('#vibeMoodChips .vibe-chip.selected')?.textContent || '🌸 Peaceful';
    const goalChip = document.querySelector('#vibeGoalChips .vibe-chip.selected')?.textContent || '💖 Self-Care';

    const resultBox = document.getElementById('vibeResultCard');
    if (!resultBox) return;

    const diagnoses = [
      { title: "✨ Cosmic Pastel Girl Energy", advice: "You are glowing today! Channel this gentle momentum into something creative or express gratitude to someone who made you smile." },
      { title: "🧸 Cozy Soft-Blanket Mode", advice: "Your battery is resting. Do not force productivity today—snuggle up, drink warm chamomile tea, and let Pookie tell you silly stories." },
      { title: "⚡ Unstoppable Main Character Energy", advice: "You have that focused fire in your eyes! Put on our 25-minute Pomodoro timer and conquer that goal you've been putting off!" }
    ];

    const diag = diagnoses[Math.floor(Math.random() * diagnoses.length)];

    resultBox.style.display = 'block';
    resultBox.innerHTML = `
      <div style="font-size:42px; margin-bottom:10px;">🌸</div>
      <h3 style="color:var(--primary-dark); font-size:20px; margin-bottom:8px;">${diag.title}</h3>
      <p style="font-size:13.5px; color:var(--text-main); margin-bottom:14px; line-height:1.5;">${diag.advice}</p>
      <div style="background:var(--card-bg); border:1px solid var(--border-sub); border-radius:14px; padding:12px; font-size:12.5px; text-align:left; margin-bottom:14px;">
        <p>• <b>Energy Level:</b> ${energy}/5 ⚡</p>
        <p>• <b>Current Mood:</b> ${moodChip}</p>
        <p>• <b>Focus Area:</b> ${goalChip}</p>
      </div>
      <button id="pinVibeBtn" class="btn-timer" style="font-size:13px; padding:8px 18px;">Pin to Notes 💌</button>
    `;

    document.getElementById('pinVibeBtn').addEventListener('click', () => {
      this.notesManager.notes.unshift({
        id: Date.now(),
        title: `Vibe Check: ${diag.title}`,
        content: `Energy: ${energy}/5 | Mood: ${moodChip} | Focus: ${goalChip}\n\n"${diag.advice}"`,
        mood: moodChip,
        sticker: "🌸",
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        reflection: "Your vibe check was saved! Keep shining your lovely light bestie ♡"
      });
      this.notesManager.saveNotes();
      this.notesManager.renderNotes();
      this.showToast('Pinned vibe to Pookie Notes! 💌');
    });

    this.addXP(30, 'Completed Daily Vibe Check! 🎀');
    this.soundManager.playChime();
    this.celebrate();
  }

  /* ========================================================================
     CHALLENGES VIEW
     ======================================================================== */

  initChallengesView() {
    const listEl = document.getElementById('challengesList');
    if (!listEl) return;
    listEl.innerHTML = '';

    this.challenges.forEach(ch => {
      const card = document.createElement('div');
      card.className = 'challenge-card';
      card.innerHTML = `
        <div class="challenge-info">
          <div class="challenge-icon">⭐</div>
          <div class="challenge-details">
            <h4>${ch.text}</h4>
            <p>Reward: +${ch.xp} XP to level up your bestie bond!</p>
          </div>
        </div>
        <div class="challenge-action">
          <span class="xp-tag">+${ch.xp} XP</span>
          <button class="btn-claim ${ch.done ? 'completed' : ''}">${ch.done ? 'Claimed ✓' : 'Complete ⭐'}</button>
        </div>
      `;

      const btn = card.querySelector('.btn-claim');
      btn.addEventListener('click', () => {
        if (!ch.done) {
          ch.done = true;
          btn.classList.add('completed');
          btn.textContent = 'Claimed ✓';
          this.addXP(ch.xp, `Quest Completed! ⭐`);
          this.soundManager.playChime();
          this.celebrate();
        }
      });

      listEl.appendChild(card);
    });

    this.renderBadges();
  }

  renderBadges() {
    const grid = document.getElementById('badgesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    this.badges.forEach(b => {
      const card = document.createElement('div');
      card.className = `badge-card ${b.unlocked ? 'unlocked' : 'locked'}`;
      card.innerHTML = `
        <div class="badge-icon">${b.icon}</div>
        <div class="badge-name">${b.name}</div>
        <div style="font-size:9px; color:var(--text-muted); margin-top:2px;">${b.unlocked ? 'Unlocked 🎀' : 'Locked 🔒'}</div>
      `;
      grid.appendChild(card);
    });
  }

  /* ========================================================================
     THEMES & MASCOT CUSTOMIZATION
     ======================================================================== */

  initThemesView() {
    const themeCards = document.querySelectorAll('.theme-selector-card');
    themeCards.forEach(card => {
      card.addEventListener('click', () => {
        themeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const selectedTheme = card.dataset.themeName;
        this.applyTheme(selectedTheme);
        this.soundManager.playPop();
      });
    });

    const mascotBtns = document.querySelectorAll('.mascot-select-btn');
    mascotBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        mascotBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyMascot(btn.dataset.mascot);
        this.soundManager.playPop();
      });
    });

    const particleSelect = document.getElementById('particleSelect');
    if (particleSelect) {
      particleSelect.value = this.particleType;
      particleSelect.addEventListener('change', (e) => {
        this.particleType = e.target.value;
        localStorage.setItem('pookie_particles', this.particleType);
        this.renderParticles(this.particleType);
      });
    }
  }

  applyTheme(themeName) {
    this.theme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('pookie_theme', themeName);

    // Update active highlight in themes view
    document.querySelectorAll('.theme-selector-card').forEach(c => {
      c.classList.toggle('active', c.dataset.themeName === themeName);
    });
  }

  applyMascot(mascotIcon) {
    this.mascot = mascotIcon;
    localStorage.setItem('pookie_mascot', mascotIcon);

    // Update DOM mascot elements
    const mascotDisplay = document.getElementById('mascot');
    const headerAvatar = document.getElementById('headerAvatar');

    if (mascotDisplay) mascotDisplay.textContent = mascotIcon;
    if (headerAvatar) headerAvatar.textContent = mascotIcon;

    document.querySelectorAll('.mascot-select-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mascot === mascotIcon);
    });
  }

  renderParticles(type) {
    const container = document.getElementById('particlesContainer');
    if (!container) return;
    container.innerHTML = '';

    if (type === 'none') return;

    let symbol = '♡';
    if (type === 'stars') symbol = '⭐';
    if (type === 'petals') symbol = '🌸';
    if (type === 'sparkles') symbol = '✨';

    const count = 10;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.textContent = symbol;
      p.style.left = `${Math.random() * 95}%`;
      p.style.animationDelay = `${Math.random() * 6}s`;
      p.style.animationDuration = `${6 + Math.random() * 6}s`;
      p.style.fontSize = `${16 + Math.random() * 12}px`;
      container.appendChild(p);
    }
  }

  /* ========================================================================
     SETTINGS MODAL & SYSTEM CONFIGURATION
     ======================================================================== */

  initSettingsModal() {
    const openBtn = document.getElementById('openSettingsBtn');
    const modalBackdrop = document.getElementById('settingsModal');
    const closeBtn = document.getElementById('closeSettingsModal');
    const muteSoundToggle = document.getElementById('muteSoundToggle');
    const ttsToggle = document.getElementById('ttsToggle');
    const resetDataBtn = document.getElementById('resetDataBtn');
    const aiProviderBadge = document.getElementById('aiProviderBadge');

    // AI Brain & Key Configuration Elements
    const providerRadios = document.querySelectorAll('input[name="aiProviderChoice"]');
    const apiKeySection = document.getElementById('apiKeySection');
    const apiKeyLabel = document.getElementById('apiKeyLabel');
    const userApiKeyInput = document.getElementById('userApiKeyInput');
    const toggleApiKeyVisibility = document.getElementById('toggleApiKeyVisibility');
    const apiKeyHelpText = document.getElementById('apiKeyHelpText');
    const testApiKeyBtn = document.getElementById('testApiKeyBtn');
    const saveToServerEnv = document.getElementById('saveToServerEnv');
    const apiKeyStatus = document.getElementById('apiKeyStatus');
    const activeEngineTag = document.getElementById('activeEngineTag');

    let currentProvider = localStorage.getItem('pookie_ai_provider') || 'gemini';

    const updateProviderUI = (provider) => {
      currentProvider = provider;
      localStorage.setItem('pookie_ai_provider', provider);

      if (activeEngineTag) {
        activeEngineTag.textContent = provider === 'gemini' ? 'Active: Gemini' :
                                      (provider === 'openai' ? 'Active: ChatGPT' : 'Active: Smart Offline');
      }

      if (aiProviderBadge) {
        aiProviderBadge.textContent = provider === 'gemini' ? '🌟 Gemini 1.5' :
                                      (provider === 'openai' ? '🤖 ChatGPT' : '💡 Smart Engine');
      }

      if (apiKeySection) {
        if (provider === 'smart_engine') {
          apiKeySection.style.display = 'none';
        } else {
          apiKeySection.style.display = 'block';
          if (provider === 'gemini') {
            if (apiKeyLabel) apiKeyLabel.innerHTML = '🔑 Gemini API Key:';
            if (userApiKeyInput) {
              userApiKeyInput.placeholder = 'Paste your Google Gemini API key...';
              userApiKeyInput.value = localStorage.getItem('pookie_gemini_key') || localStorage.getItem('pookie_api_key') || '';
            }
            if (apiKeyHelpText) {
              apiKeyHelpText.innerHTML = 'Get a free key in 1 click at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" style="color:var(--primary); font-weight:700; text-decoration:underline;">Google AI Studio</a>.';
            }
          } else {
            if (apiKeyLabel) apiKeyLabel.innerHTML = '🔑 OpenAI API Key:';
            if (userApiKeyInput) {
              userApiKeyInput.placeholder = 'sk-... (paste your OpenAI API key)';
              userApiKeyInput.value = localStorage.getItem('pookie_openai_key') || '';
            }
            if (apiKeyHelpText) {
              apiKeyHelpText.innerHTML = 'Get an API key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" style="color:var(--primary); font-weight:700; text-decoration:underline;">OpenAI Platform</a>.';
            }
          }
        }
      }
    };

    // Check server health to detect configured keys
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data && data.features) {
          if (data.features.geminiConfigured && !localStorage.getItem('pookie_ai_provider')) {
            currentProvider = 'gemini';
          } else if (data.features.openaiConfigured && !localStorage.getItem('pookie_ai_provider')) {
            currentProvider = 'openai';
          }
        }
        const targetRadio = document.querySelector(`input[name="aiProviderChoice"][value="${currentProvider}"]`);
        if (targetRadio) targetRadio.checked = true;
        updateProviderUI(currentProvider);
      })
      .catch(() => {
        const targetRadio = document.querySelector(`input[name="aiProviderChoice"][value="${currentProvider}"]`);
        if (targetRadio) targetRadio.checked = true;
        updateProviderUI(currentProvider);
      });

    // Provider radio listener
    providerRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          updateProviderUI(radio.value);
          this.soundManager.playPop();
          this.showToast(`Switched AI Brain to ${radio.value === 'gemini' ? 'Google Gemini' : (radio.value === 'openai' ? 'OpenAI ChatGPT' : 'Smart Offline Engine')}! 🧠`);
        }
      });
    });

    // Toggle API Key visibility
    if (toggleApiKeyVisibility && userApiKeyInput) {
      toggleApiKeyVisibility.addEventListener('click', () => {
        const isPassword = userApiKeyInput.type === 'password';
        userApiKeyInput.type = isPassword ? 'text' : 'password';
        toggleApiKeyVisibility.textContent = isPassword ? '🙈' : '👁️';
      });
    }

    // Test & Connect API Key
    if (testApiKeyBtn && userApiKeyInput) {
      testApiKeyBtn.addEventListener('click', async () => {
        const key = userApiKeyInput.value.trim();
        if (!key) {
          if (apiKeyStatus) {
            apiKeyStatus.style.color = '#e74c3c';
            apiKeyStatus.textContent = '⚠️ Please enter an API key first!';
          }
          return;
        }

        testApiKeyBtn.disabled = true;
        testApiKeyBtn.textContent = '⏳ Testing...';
        if (apiKeyStatus) {
          apiKeyStatus.style.color = 'var(--text-muted)';
          apiKeyStatus.textContent = 'Connecting to AI provider...';
        }

        try {
          const res = await fetch('/api/config/test-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: currentProvider,
              apiKey: key
            })
          });

          const data = await res.json();
          if (data.success) {
            if (apiKeyStatus) {
              apiKeyStatus.style.color = '#27ae60';
              apiKeyStatus.textContent = `✅ Connected successfully! ${data.message || ''}`;
            }

            // Save key to localStorage
            if (currentProvider === 'gemini') {
              localStorage.setItem('pookie_gemini_key', key);
            } else {
              localStorage.setItem('pookie_openai_key', key);
            }
            localStorage.setItem('pookie_api_key', key);

            // Optionally save to server .env
            if (saveToServerEnv && saveToServerEnv.checked) {
              await fetch('/api/config/save-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  provider: currentProvider,
                  apiKey: key
                })
              });
            }

            this.showToast(`AI Brain configured successfully! 🌟`);
            updateProviderUI(currentProvider);
          } else {
            if (apiKeyStatus) {
              apiKeyStatus.style.color = '#e74c3c';
              apiKeyStatus.textContent = `❌ Error: ${data.error || 'Connection failed'}`;
            }
          }
        } catch (e) {
          if (apiKeyStatus) {
            apiKeyStatus.style.color = '#e74c3c';
            apiKeyStatus.textContent = `❌ Network Error: ${e.message}`;
          }
        } finally {
          testApiKeyBtn.disabled = false;
          testApiKeyBtn.textContent = '⚡ Test & Connect';
        }
      });
    }

    if (openBtn && modalBackdrop) {
      openBtn.addEventListener('click', () => {
        if (muteSoundToggle) muteSoundToggle.checked = this.soundManager.muted;
        if (ttsToggle) ttsToggle.checked = this.voiceManager.autoSpeak;
        modalBackdrop.classList.add('active');
      });
    }

    if (aiProviderBadge && modalBackdrop) {
      aiProviderBadge.addEventListener('click', () => {
        modalBackdrop.classList.add('active');
      });
    }

    if (closeBtn && modalBackdrop) {
      closeBtn.addEventListener('click', () => modalBackdrop.classList.remove('active'));
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) modalBackdrop.classList.remove('active');
      });
    }

    if (muteSoundToggle) {
      muteSoundToggle.addEventListener('change', () => {
        this.soundManager.muted = muteSoundToggle.checked;
        localStorage.setItem('pookie_sound_muted', this.soundManager.muted);
        const soundToggleBtn = document.getElementById('soundToggleBtn');
        if (soundToggleBtn) soundToggleBtn.textContent = this.soundManager.muted ? '🔇' : '🔊';
        this.showToast(this.soundManager.muted ? 'Sound effects muted 🔇' : 'Sound effects unmuted 🔊');
      });
    }

    if (ttsToggle) {
      ttsToggle.addEventListener('change', () => {
        this.voiceManager.autoSpeak = ttsToggle.checked;
        localStorage.setItem('pookie_auto_speak', this.voiceManager.autoSpeak);
        const autoSpeakToggle = document.getElementById('autoSpeakToggle');
        if (autoSpeakToggle) autoSpeakToggle.checked = this.voiceManager.autoSpeak;
        this.showToast(this.voiceManager.autoSpeak ? '🔊 Auto-Speak Enabled: AI will speak replies!' : '🔇 Auto-Speak Disabled');
      });
    }

    if (resetDataBtn) {
      resetDataBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all Pookie data and start fresh? ♡')) {
          localStorage.clear();
          location.reload();
        }
      });
    }

    // Header Sound button toggle
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    if (soundToggleBtn) {
      soundToggleBtn.addEventListener('click', () => {
        const muted = this.soundManager.toggleMute();
        soundToggleBtn.textContent = muted ? '🔇' : '🔊';
        if (muteSoundToggle) muteSoundToggle.checked = muted;
        this.showToast(muted ? 'Sound effects muted 🔇' : 'Sound effects unmuted 🔊');
      });
    }
  }

  /* ========================================================================
     PROGRESSIVE WEB APP (PWA) & APP INSTALLATION
     ======================================================================== */

  initPWA() {
    // 1. Register Service Worker for offline capability & native installation
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('🎀 [Pookie PWA] Service Worker registered with scope:', reg.scope))
          .catch(err => console.warn('🎀 [Pookie PWA] Service Worker registration failed:', err));
      });
    }

    // 2. Handle native beforeinstallprompt (Android / Chrome / Edge)
    let deferredPrompt = null;
    const installBtn = document.getElementById('installAppBtn');
    const installModal = document.getElementById('installModal');
    const closeBtn = document.getElementById('closeInstallModal');
    const dismissBtn = document.getElementById('dismissInstallModal');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) {
        installBtn.style.background = 'var(--primary-light)';
        installBtn.style.borderColor = 'var(--primary)';
      }
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            this.showToast('🎉 YAY! Installing Pookie on your home screen! 🎀');
            this.addXP(50, 'Installed Pookie App! 📲');
            this.celebrate();
          }
          deferredPrompt = null;
        } else {
          if (installModal) installModal.classList.add('active');
        }
      });
    }

    if (closeBtn && installModal) {
      closeBtn.addEventListener('click', () => installModal.classList.remove('active'));
    }
    if (dismissBtn && installModal) {
      dismissBtn.addEventListener('click', () => installModal.classList.remove('active'));
    }
    if (installModal) {
      installModal.addEventListener('click', (e) => {
        if (e.target === installModal) installModal.classList.remove('active');
      });
    }

    // 3. Dynamic QR Code & Share link setup
    const openQrBtn = document.getElementById('openQrModalBtn');
    const qrModal = document.getElementById('qrModal');
    const closeQrBtn = document.getElementById('closeQrModal');

    const updateShareLinks = () => {
      const liveUrl = window.location.href;
      const qrImg = document.getElementById('qrCodeImg');
      if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&color=d65389&bgcolor=ffffff&data=${encodeURIComponent(liveUrl)}`;
      }
    };

    if (openQrBtn && qrModal) {
      openQrBtn.addEventListener('click', () => {
        updateShareLinks();
        qrModal.classList.add('active');
      });
    }
    if (closeQrBtn && qrModal) {
      closeQrBtn.addEventListener('click', () => qrModal.classList.remove('active'));
    }
    if (qrModal) {
      qrModal.addEventListener('click', (e) => {
        if (e.target === qrModal) qrModal.classList.remove('active');
      });
    }
    updateShareLinks();
  }

  /* ========================================================================
     TOASTS & VISUAL FX
     ======================================================================== */

  showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  showFloatingXP(text, targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const xpBadge = document.createElement('div');
    xpBadge.className = 'floating-xp';
    xpBadge.textContent = text;
    xpBadge.style.left = `${rect.left + rect.width / 2}px`;
    xpBadge.style.top = `${rect.top}px`;
    document.body.appendChild(xpBadge);

    setTimeout(() => xpBadge.remove(), 1200);
  }

  celebrate() {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#ee82ad', '#ffd0e3', '#fff0a8', '#a88bf0', '#77b28c', '#ff9fc5'];

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.7) * 14,
        size: 5 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1
      });
    }

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // Gravity
        p.alpha -= 0.015;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      frame++;
      if (frame < 75) {
        requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    };

    requestAnimationFrame(animate);
  }

  /* ========================================================================
     PHONE RELEVANT FEATURES: HAPTICS, CALL MODE, SHAKE & SHARE
     ======================================================================== */

  triggerHaptic(style = 'light') {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (style === 'light') navigator.vibrate(12);
        else if (style === 'medium') navigator.vibrate(28);
        else if (style === 'heavy') navigator.vibrate(45);
        else if (style === 'success') navigator.vibrate([15, 35, 25]);
        else if (style === 'call') navigator.vibrate([180, 80, 180]);
      } catch (e) {}
    }
  }

  async shareContent(title, text) {
    this.triggerHaptic('light');
    const shareData = {
      title: title || 'Pookie AI 🎀',
      text: `${text}\n\n— Shared from Pookie AI 🎀`,
      url: window.location.href
    };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        this.showToast('Shared successfully! ✨');
      } catch (err) {
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(shareData.text + ' ' + shareData.url);
          this.showToast('Copied to clipboard! 📋');
        }
      }
    } else {
      navigator.clipboard.writeText(shareData.text + ' ' + shareData.url);
      this.showToast('Copied to clipboard! 📋');
    }
  }

  initPhoneCall() {
    const startCallBtn = document.getElementById('startCallBtn');
    const callModal = document.getElementById('callModal');
    const endCallBtn = document.getElementById('endCallBtn');
    const callDuration = document.getElementById('callDuration');
    const callAvatar = document.getElementById('callAvatar');
    const callCallerName = document.getElementById('callCallerName');
    const callStatus = document.getElementById('callStatus');
    const callCaptionText = document.getElementById('callCaptionText');
    const callMuteBtn = document.getElementById('callMuteBtn');
    const callMuteIcon = document.getElementById('callMuteIcon');
    const callMuteLabel = document.getElementById('callMuteLabel');
    const callSpeakerBtn = document.getElementById('callSpeakerBtn');
    const callSpeakerIcon = document.getElementById('callSpeakerIcon');

    this.isCallActive = false;
    this.callSeconds = 0;
    this.callTimer = null;
    this.callMuted = false;
    this.callSpeakerOn = true;

    if (!callModal) return;

    if (startCallBtn) {
      startCallBtn.addEventListener('click', () => {
        const char = this.aiEngine.activeCharacter || { name: 'Pookie Bestie', avatar: '🐰', voiceId: '21m00Tcm4TlvDq8ikWAM' };
        this.triggerHaptic('call');
        this.soundManager.playRingtone();

        if (callAvatar) callAvatar.textContent = char.avatar;
        if (callCallerName) callCallerName.textContent = char.name;
        if (callStatus) callStatus.textContent = 'Calling...';
        if (callCaptionText) callCaptionText.textContent = '"Connecting satellite voice line... ♡"';
        if (callDuration) callDuration.textContent = '00:00';

        callModal.classList.add('active');
        this.isCallActive = true;
        this.callSeconds = 0;

        // Simulate pickup after 1.5 seconds
        setTimeout(() => {
          if (!this.isCallActive) return;
          this.triggerHaptic('success');
          if (callStatus) callStatus.textContent = 'Connected (HD Voice)';
          if (callAvatar) callAvatar.classList.add('speaking');

          const greeting = char.greeting || `Hiii! I am so happy you called! What's on your mind? ♡`;
          if (callCaptionText) callCaptionText.textContent = `"${greeting}"`;

          // Speak aloud
          if (this.voiceManager && this.callSpeakerOn) {
            this.voiceManager.speak(greeting, char.voiceId);
          }

          // Start Call timer
          clearInterval(this.callTimer);
          this.callTimer = setInterval(() => {
            if (!this.isCallActive) {
              clearInterval(this.callTimer);
              return;
            }
            this.callSeconds++;
            const m = Math.floor(this.callSeconds / 60).toString().padStart(2, '0');
            const s = (this.callSeconds % 60).toString().padStart(2, '0');
            if (callDuration) callDuration.textContent = `${m}:${s}`;

            if (this.voiceManager && !this.voiceManager.isSpeaking) {
              if (callAvatar) callAvatar.classList.remove('speaking');
            }
          }, 1000);
        }, 1500);
      });
    }

    if (endCallBtn) {
      endCallBtn.addEventListener('click', () => {
        this.endCall();
      });
    }

    if (callMuteBtn) {
      callMuteBtn.addEventListener('click', () => {
        this.callMuted = !this.callMuted;
        this.triggerHaptic('light');
        if (callMuteIcon) callMuteIcon.textContent = this.callMuted ? '🔇' : '🎙️';
        if (callMuteLabel) callMuteLabel.textContent = this.callMuted ? 'Muted' : 'Mic On';
        this.showToast(this.callMuted ? 'Microphone muted 🔇' : 'Microphone unmuted 🎙️');
      });
    }

    if (callSpeakerBtn) {
      callSpeakerBtn.addEventListener('click', () => {
        this.callSpeakerOn = !this.callSpeakerOn;
        this.triggerHaptic('light');
        if (callSpeakerIcon) callSpeakerIcon.textContent = this.callSpeakerOn ? '🔊' : '🔈';
        this.showToast(this.callSpeakerOn ? 'Speaker On 🔊' : 'Speaker Off 🔈');
        if (!this.callSpeakerOn && this.voiceManager) {
          this.voiceManager.stop();
        }
      });
    }
  }

  endCall() {
    const callModal = document.getElementById('callModal');
    const callAvatar = document.getElementById('callAvatar');
    const callStatus = document.getElementById('callStatus');

    if (!this.isCallActive) return;

    this.isCallActive = false;
    clearInterval(this.callTimer);
    if (this.voiceManager) this.voiceManager.stop();
    if (callAvatar) callAvatar.classList.remove('speaking');

    this.triggerHaptic('medium');
    this.soundManager.playCallEnd();

    if (callStatus) callStatus.textContent = 'Call Ended';
    const totalSecs = this.callSeconds;

    setTimeout(() => {
      if (callModal) callModal.classList.remove('active');
      if (totalSecs >= 3) {
        this.addXP(20, `Phone Call with ${this.aiEngine.activeCharacter?.name || 'Companion'}! 📞`);
        this.soundManager.playChime();
        this.celebrate();
      }
    }, 450);
  }

  async speakInCall(query) {
    if (!this.isCallActive) return;
    this.triggerHaptic('light');
    const callCaptionText = document.getElementById('callCaptionText');
    const callAvatar = document.getElementById('callAvatar');
    const char = this.aiEngine.activeCharacter;

    if (callCaptionText) callCaptionText.textContent = `You: "${query}"`;
    if (callAvatar) callAvatar.classList.add('speaking');

    try {
      const result = await this.aiEngine.generateResponse(query, {
        playerLevel: this.getLevel(),
        xp: this.xp
      });
      if (this.isCallActive) {
        const snippet = result.text.replace(/[*_#`~]/g, '');
        if (callCaptionText) callCaptionText.textContent = `"${snippet.slice(0, 160)}${snippet.length > 160 ? '...' : ''}"`;
        if (this.voiceManager && this.callSpeakerOn) {
          this.voiceManager.speak(result.text, char.voiceId);
        }
      }
    } catch (e) {
      if (callCaptionText) callCaptionText.textContent = `"I hear you clearly, bestie! ♡"`;
    }
  }

  initShakeDetector() {
    if (typeof window === 'undefined') return;
    let lastX, lastY, lastZ;
    let lastUpdate = 0;
    const SHAKE_THRESHOLD = 800;

    window.addEventListener('devicemotion', (e) => {
      const curTime = Date.now();
      if ((curTime - lastUpdate) > 120) {
        const diffTime = curTime - lastUpdate;
        lastUpdate = curTime;

        const acc = e.accelerationIncludingGravity;
        if (!acc) return;
        const x = acc.x || 0;
        const y = acc.y || 0;
        const z = acc.z || 0;

        if (lastX !== undefined) {
          const speed = Math.abs(x + y + z - lastX - lastY - lastZ) / diffTime * 10000;
          if (speed > SHAKE_THRESHOLD) {
            this.handleDeviceShake();
          }
        }
        lastX = x;
        lastY = y;
        lastZ = z;
      }
    }, { passive: true });
  }

  handleDeviceShake() {
    if (this._shakeCooldown && Date.now() - this._shakeCooldown < 4000) return;
    this._shakeCooldown = Date.now();

    this.triggerHaptic('success');
    this.soundManager.playFanfare();
    this.celebrate();
    this.addXP(10, '📱 Phone Shake Easter Egg! ⭐');

    const phrases = [
      "📱 Lucky Phone Shake! Pookie sends you extra sparkle & love! ✨💖",
      "📱 Phone shaken! Master Kenji reminds you: Keep your center of calm! 🍵",
      "📱 Case lead found! Detective Sterling logs a new clue! 🕵️‍♂️✨",
      "📱 High-speed accelerometer burst! Nova confirms 100% telemetry alignment! ⚡🤖",
      "📱 Oh la la! Chef Marcel whisks together a sweet burst of joy for you! 🥐✨"
    ];
    const charId = this.aiEngine.activeCharacter?.id;
    let phrase = phrases[0];
    if (charId === 'sensei') phrase = phrases[1];
    else if (charId === 'detective') phrase = phrases[2];
    else if (charId === 'cyber_nova') phrase = phrases[3];
    else if (charId === 'chef_marcel') phrase = phrases[4];

    this.showToast(phrase);
  }

  escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }
}

// Global quickMessage helper for quick action buttons
function quickMessage(text) {
  const input = document.getElementById('messageInput');
  if (input && window.pookieApp) {
    input.value = text;
    window.pookieApp.handleSendMessage();
  }
}

// Boot application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.pookieApp = new PookieApp();
  window.pookieApp.init();
});
