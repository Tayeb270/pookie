/**
 * POOKIE AI 🎀 - STUDY MODE ENGINE
 * Pomodoro Focus Timer, Procedural Web Audio Ambient Sounds, Study Tasks & Flashcards
 */

class PookieStudyManager {
  constructor(app) {
    this.app = app;
    this.timer = {
      duration: 25 * 60,
      remaining: 25 * 60,
      interval: null,
      isRunning: false,
      mode: 'focus', // 'focus' | 'short' | 'long'
      completedSessions: 0
    };

    this.audioContext = null;
    this.ambientGenerators = {};

    this.tasks = JSON.parse(localStorage.getItem('pookie_study_tasks') || '[]');
    if (this.tasks.length === 0) {
      this.tasks = [
        { id: 1, text: "Review lecture notes & highlight key ideas 🌸", done: false },
        { id: 2, text: "Complete 1 full 25-minute Pomodoro session ⏰", done: false },
        { id: 3, text: "Hydrate with a tall glass of cold water 💧", done: false }
      ];
    }

    this.flashcards = [
      { q: "What is Active Recall? 🧠", a: "Testing yourself on information rather than passively reading it!" },
      { q: "What is the Feynman Technique? 💡", a: "Explaining a concept in simple, plain words as if teaching a child." },
      { q: "How long is a classic Pomodoro block? ⏱️", a: "25 minutes of focused work followed by a 5-minute break!" }
    ];
    this.currentCardIndex = 0;
  }

  init() {
    this.initTimer();
    this.initAmbientAudio();
    this.initTasks();
    this.initFlashcards();
  }

  /* ========================================================================
     POMODORO TIMER
     ======================================================================== */

  initTimer() {
    const playBtn = document.getElementById('timerPlayBtn');
    const resetBtn = document.getElementById('timerResetBtn');
    const modeBtns = document.querySelectorAll('.timer-mode-btn');

    if (playBtn) playBtn.addEventListener('click', () => this.toggleTimer());
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetTimer());

    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const mode = btn.dataset.mode;
        this.timer.mode = mode;
        if (mode === 'focus') this.timer.duration = 25 * 60;
        else if (mode === 'short') this.timer.duration = 5 * 60;
        else if (mode === 'long') this.timer.duration = 15 * 60;

        this.resetTimer();
      });
    });

    this.updateTimerDisplay();
  }

  toggleTimer() {
    const playBtn = document.getElementById('timerPlayBtn');
    if (this.timer.isRunning) {
      clearInterval(this.timer.interval);
      this.timer.isRunning = false;
      if (playBtn) playBtn.textContent = 'Resume ▶️';
    } else {
      this.timer.isRunning = true;
      if (playBtn) playBtn.textContent = 'Pause ⏸️';
      this.timer.interval = setInterval(() => {
        if (this.timer.remaining > 0) {
          this.timer.remaining--;
          this.updateTimerDisplay();
        } else {
          this.completeSession();
        }
      }, 1000);
    }
  }

  resetTimer() {
    clearInterval(this.timer.interval);
    this.timer.isRunning = false;
    this.timer.remaining = this.timer.duration;
    const playBtn = document.getElementById('timerPlayBtn');
    if (playBtn) playBtn.textContent = 'Start Focus ▶️';
    this.updateTimerDisplay();
  }

  updateTimerDisplay() {
    const timeText = document.getElementById('timerTimeText');
    const progressCircle = document.getElementById('timerProgressCircle');

    const mins = Math.floor(this.timer.remaining / 60).toString().padStart(2, '0');
    const secs = (this.timer.remaining % 60).toString().padStart(2, '0');

    if (timeText) timeText.textContent = `${mins}:${secs}`;

    if (progressCircle) {
      const circumference = 628;
      const progress = 1 - (this.timer.remaining / this.timer.duration);
      progressCircle.style.strokeDashoffset = circumference * progress;
    }
  }

  completeSession() {
    clearInterval(this.timer.interval);
    this.timer.isRunning = false;
    this.timer.completedSessions++;

    const playBtn = document.getElementById('timerPlayBtn');
    if (playBtn) playBtn.textContent = 'Start Focus ▶️';

    if (this.app?.soundManager) this.app.soundManager.playChime();
    if (this.app) {
      this.app.addXP(30, 'Pomodoro Session Finished! 📚');
      this.app.celebrate();
    }

    alert('🎉 FOCUS TIME COMPLETE!\n\nTake a deep breath and stretch! You earned +30 XP! ⭐');
    this.timer.remaining = this.timer.duration;
    this.updateTimerDisplay();
  }

  /* ========================================================================
     PROCEDURAL AMBIENT SOUND GENERATOR (WEB AUDIO API)
     Zero external audio file dependencies!
     ======================================================================== */

  getAudioContext() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  initAmbientAudio() {
    const ambientCards = document.querySelectorAll('.ambient-card');
    ambientCards.forEach(card => {
      const soundType = card.dataset.sound;
      const playBtn = card.querySelector('.ambient-toggle-btn');
      const volumeSlider = card.querySelector('.ambient-slider');

      if (playBtn) {
        playBtn.addEventListener('click', () => {
          this.toggleAmbientSound(soundType, card, volumeSlider);
        });
      }

      if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
          const sound = this.ambientGenerators[soundType];
          if (sound && sound.gainNode) {
            sound.gainNode.gain.setValueAtTime(parseFloat(e.target.value), this.getAudioContext().currentTime);
          }
        });
      }
    });
  }

  toggleAmbientSound(type, cardEl, sliderEl) {
    const isPlaying = this.ambientGenerators[type] && this.ambientGenerators[type].active;

    if (isPlaying) {
      this.stopAmbient(type);
      cardEl.classList.remove('playing');
      const btn = cardEl.querySelector('.ambient-toggle-btn');
      if (btn) btn.textContent = 'Play ▶️';
    } else {
      this.startAmbient(type, sliderEl ? parseFloat(sliderEl.value) : 0.5);
      cardEl.classList.add('playing');
      const btn = cardEl.querySelector('.ambient-toggle-btn');
      if (btn) btn.textContent = 'Stop ⏹️';
    }
  }

  startAmbient(type, volume) {
    const ctx = this.getAudioContext();
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.connect(ctx.destination);

    if (type === 'rain') {
      // Pink/Brown noise generator for gentle rain
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, ctx.currentTime);

      noise.connect(filter);
      filter.connect(gainNode);
      noise.start();
      this.ambientGenerators[type] = { active: true, source: noise, gainNode };
    }
    else if (type === 'purr') {
      // Gentle rhythmic cat purr oscillator
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(32, ctx.currentTime);

      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(22, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.3, ctx.currentTime);
      lfo.connect(lfoGain.gain);

      osc.connect(gainNode);
      osc.start();
      lfo.start();
      this.ambientGenerators[type] = { active: true, source: osc, lfo, gainNode };
    }
    else if (type === 'chimes') {
      // Zen Chimes: periodic randomized harmonic bell tones
      let chimeInterval = setInterval(() => {
        if (!this.ambientGenerators['chimes']?.active) return;
        const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C Major pentatonic
        const note = notes[Math.floor(Math.random() * notes.length)];
        const bell = ctx.createOscillator();
        const bellGain = ctx.createGain();
        bell.type = 'sine';
        bell.frequency.setValueAtTime(note, ctx.currentTime);
        bellGain.gain.setValueAtTime(0.12 * volume, ctx.currentTime);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.0);
        bell.connect(bellGain);
        bellGain.connect(ctx.destination);
        bell.start();
        bell.stop(ctx.currentTime + 3.1);
      }, 2500);

      this.ambientGenerators[type] = { active: true, interval: chimeInterval, gainNode };
    }
    else {
      // Cafe ambient warm drone
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.connect(gainNode);
      osc.start();
      this.ambientGenerators[type] = { active: true, source: osc, gainNode };
    }
  }

  stopAmbient(type) {
    const item = this.ambientGenerators[type];
    if (!item) return;
    item.active = false;
    if (item.source) {
      try { item.source.stop(); } catch (e) {}
    }
    if (item.lfo) {
      try { item.lfo.stop(); } catch (e) {}
    }
    if (item.interval) {
      clearInterval(item.interval);
    }
    delete this.ambientGenerators[type];
  }

  /* ========================================================================
     STUDY TASKS
     ======================================================================== */

  initTasks() {
    const addBtn = document.getElementById('addTaskBtn');
    const taskInput = document.getElementById('taskInput');

    if (addBtn && taskInput) {
      addBtn.addEventListener('click', () => {
        const text = taskInput.value.trim();
        if (text) {
          this.tasks.push({ id: Date.now(), text, done: false });
          taskInput.value = '';
          this.saveTasks();
          this.renderTasks();
          if (this.app?.soundManager) this.app.soundManager.playPop();
        }
      });
      taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addBtn.click();
      });
    }

    this.renderTasks();
  }

  renderTasks() {
    const listEl = document.getElementById('studyTasksList');
    if (!listEl) return;
    listEl.innerHTML = '';

    this.tasks.forEach(task => {
      const item = document.createElement('div');
      item.className = `task-item ${task.done ? 'done' : ''}`;
      item.innerHTML = `
        <input type="checkbox" ${task.done ? 'checked' : ''} style="cursor:pointer; accent-color:var(--primary);">
        <span style="flex:1;">${task.text}</span>
        <button style="border:none; background:none; cursor:pointer; color:var(--text-muted); font-size:14px;">🗑️</button>
      `;

      const checkbox = item.querySelector('input');
      checkbox.addEventListener('change', () => {
        task.done = checkbox.checked;
        if (task.done && this.app) {
          this.app.addXP(10, 'Task Completed! 🌸');
          if (this.app.soundManager) this.app.soundManager.playChime();
        }
        this.saveTasks();
        this.renderTasks();
      });

      const delBtn = item.querySelector('button');
      delBtn.addEventListener('click', () => {
        this.tasks = this.tasks.filter(t => t.id !== task.id);
        this.saveTasks();
        this.renderTasks();
      });

      listEl.appendChild(item);
    });
  }

  saveTasks() {
    localStorage.setItem('pookie_study_tasks', JSON.stringify(this.tasks));
  }

  /* ========================================================================
     FLASHCARDS
     ======================================================================== */

  initFlashcards() {
    const cardEl = document.getElementById('studyFlashcard');
    const nextBtn = document.getElementById('flashcardNextBtn');
    const masterBtn = document.getElementById('flashcardMasterBtn');

    if (cardEl) {
      cardEl.addEventListener('click', () => {
        cardEl.classList.toggle('flipped');
        if (this.app?.soundManager) this.app.soundManager.playPop();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (cardEl) cardEl.classList.remove('flipped');
        this.currentCardIndex = (this.currentCardIndex + 1) % this.flashcards.length;
        this.updateFlashcardView();
      });
    }

    if (masterBtn) {
      masterBtn.addEventListener('click', () => {
        if (this.app) this.app.addXP(5, 'Flashcard Mastered! 💡');
        if (this.app?.soundManager) this.app.soundManager.playChime();
        if (nextBtn) nextBtn.click();
      });
    }

    this.updateFlashcardView();
  }

  updateFlashcardView() {
    const card = this.flashcards[this.currentCardIndex];
    const qEl = document.getElementById('flashcardQ');
    const aEl = document.getElementById('flashcardA');
    if (qEl) qEl.textContent = card.q;
    if (aEl) aEl.textContent = card.a;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PookieStudyManager;
}
