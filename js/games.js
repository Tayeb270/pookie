/**
 * POOKIE AI 🎀 - MINI GAMES ENGINE
 * Games: Pookie Match, Catch The Sparkles, Magic Fortune Bow
 */

class PookieGamesManager {
  constructor(app) {
    this.app = app;
    this.matchState = {
      cards: [],
      flippedCards: [],
      matchedPairs: 0,
      moves: 0,
      timer: 0,
      timerInterval: null,
      isPlaying: false
    };

    this.arcadeState = {
      canvas: null,
      ctx: null,
      animationFrame: null,
      playerX: 200,
      playerWidth: 64,
      playerHeight: 28,
      score: 0,
      lives: 3,
      items: [],
      spawnTimer: 0,
      isPlaying: false,
      highScore: parseInt(localStorage.getItem('pookie_arcade_high') || '0', 10)
    };

    this.fortunes = [
      { text: "A sparkling surprise is coming your way before the week ends! ✨", lucky: "Rose Quartz 💎", time: "3:33 PM" },
      { text: "Someone you secretly admire is thinking about how sweet you are right now! 🥺💕", lucky: "Strawberry Milk 🍓", time: "5:15 PM" },
      { text: "Your hard work will suddenly pay off in the most unexpected, magical way! 🌟", lucky: "Golden Bow 🎀", time: "11:11 AM" },
      { text: "A gentle breeze of calm and clarity is washing over your busy mind! 🌿", lucky: "Matcha Latte 🍵", time: "2:00 PM" },
      { text: "You are about to have a breakthrough in whatever has been confusing you! 💡", lucky: "Lavender Charm 💜", time: "8:08 PM" },
      { text: "Treat yourself to your favorite dessert today—the stars strictly demand it! 🍰", lucky: "Pink Cupcake 🧁", time: "4:20 PM" }
    ];
  }

  init() {
    this.bindGameTabs();
    this.initPookieMatch();
    this.initArcadeGame();
    this.initFortuneBow();
  }

  bindGameTabs() {
    const tabs = document.querySelectorAll('.game-tab-btn');
    const screens = document.querySelectorAll('.game-screen');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        screens.forEach(s => s.classList.remove('active'));

        tab.classList.add('active');
        const targetScreen = document.getElementById(tab.dataset.game);
        if (targetScreen) {
          targetScreen.classList.add('active');
          if (tab.dataset.game === 'game-arcade' && !this.arcadeState.isPlaying) {
            this.drawArcadeInitial();
          }
        }
      });
    });
  }

  /* ========================================================================
     GAME 1: POOKIE MATCH (CARD MEMORY)
     ======================================================================== */

  initPookieMatch() {
    const restartBtn = document.getElementById('matchRestartBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.startNewMatchGame());
    }
    this.startNewMatchGame();
  }

  startNewMatchGame() {
    const grid = document.getElementById('matchGrid');
    if (!grid) return;

    clearInterval(this.matchState.timerInterval);
    this.matchState.flippedCards = [];
    this.matchState.matchedPairs = 0;
    this.matchState.moves = 0;
    this.matchState.timer = 0;
    this.matchState.isPlaying = true;

    this.updateMatchStats();
    this.matchState.timerInterval = setInterval(() => {
      this.matchState.timer++;
      this.updateMatchStats();
    }, 1000);

    const icons = ['🐰', '🎀', '🍓', '🍰', '🌸', '💖', '🧁', '🧸'];
    const deck = [...icons, ...icons].sort(() => Math.random() - 0.5);

    grid.innerHTML = '';
    deck.forEach((icon, index) => {
      const card = document.createElement('div');
      card.className = 'card-item';
      card.dataset.index = index;
      card.dataset.icon = icon;

      card.innerHTML = `
        <div class="card-back">♡</div>
        <div class="card-front">${icon}</div>
      `;

      card.addEventListener('click', () => this.handleCardClick(card));
      grid.appendChild(card);
    });
  }

  handleCardClick(card) {
    if (!this.matchState.isPlaying) return;
    if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
    if (this.matchState.flippedCards.length >= 2) return;

    card.classList.add('flipped');
    this.matchState.flippedCards.push(card);
    if (this.app?.soundManager) this.app.soundManager.playPop();

    if (this.matchState.flippedCards.length === 2) {
      this.matchState.moves++;
      this.updateMatchStats();
      this.checkMatch();
    }
  }

  checkMatch() {
    const [card1, card2] = this.matchState.flippedCards;
    const isMatch = card1.dataset.icon === card2.dataset.icon;

    if (isMatch) {
      card1.classList.add('matched');
      card2.classList.add('matched');
      this.matchState.matchedPairs++;
      this.matchState.flippedCards = [];

      if (this.app?.soundManager) this.app.soundManager.playChime();

      if (this.matchState.matchedPairs === 8) {
        this.winMatchGame();
      }
    } else {
      setTimeout(() => {
        card1.classList.remove('flipped');
        card2.classList.remove('flipped');
        this.matchState.flippedCards = [];
      }, 850);
    }
  }

  updateMatchStats() {
    const movesEl = document.getElementById('matchMoves');
    const timerEl = document.getElementById('matchTimer');
    if (movesEl) movesEl.textContent = `Moves: ${this.matchState.moves}`;
    if (timerEl) {
      const mins = Math.floor(this.matchState.timer / 60).toString().padStart(2, '0');
      const secs = (this.matchState.timer % 60).toString().padStart(2, '0');
      timerEl.textContent = `Time: ${mins}:${secs}`;
    }
  }

  winMatchGame() {
    clearInterval(this.matchState.timerInterval);
    this.matchState.isPlaying = false;

    const earnedXP = Math.max(30, 60 - this.matchState.moves);
    if (this.app) {
      this.app.addXP(earnedXP, `Pookie Match Victory! 🎮`);
      this.app.celebrate();
    }

    setTimeout(() => {
      alert(`🎉 YAAAY BESTIE! You matched all pairs in ${this.matchState.moves} moves!\n\n⭐ +${earnedXP} XP Earned!`);
    }, 400);
  }

  /* ========================================================================
     GAME 2: CATCH THE SPARKLES (CANVAS ARCADE)
     ======================================================================== */

  initArcadeGame() {
    this.arcadeState.canvas = document.getElementById('arcadeCanvas');
    if (!this.arcadeState.canvas) return;
    this.arcadeState.ctx = this.arcadeState.canvas.getContext('2d');

    const startBtn = document.getElementById('arcadeStartBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.toggleArcadeGame());
    }

    const highScoreEl = document.getElementById('arcadeHighScore');
    if (highScoreEl) highScoreEl.textContent = `Best: ${this.arcadeState.highScore}`;

    // Mouse / Touch Controls
    const canvas = this.arcadeState.canvas;
    const moveBasket = (clientX) => {
      const rect = canvas.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      this.arcadeState.playerX = Math.max(0, Math.min(canvas.width - this.arcadeState.playerWidth, relativeX - this.arcadeState.playerWidth / 2));
    };

    canvas.addEventListener('mousemove', (e) => {
      if (this.arcadeState.isPlaying) moveBasket(e.clientX);
    });

    canvas.addEventListener('touchmove', (e) => {
      if (this.arcadeState.isPlaying && e.touches[0]) {
        e.preventDefault();
        moveBasket(e.touches[0].clientX);
      }
    }, { passive: false });

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (!this.arcadeState.isPlaying) return;
      const step = 24;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.arcadeState.playerX = Math.max(0, this.arcadeState.playerX - step);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.arcadeState.playerX = Math.min(canvas.width - this.arcadeState.playerWidth, this.arcadeState.playerX + step);
      }
    });

    this.drawArcadeInitial();
  }

  drawArcadeInitial() {
    const { canvas, ctx } = this.arcadeState;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ee82ad';
    ctx.font = 'bold 16px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎀 Catch the falling goodies! ♡', canvas.width / 2, canvas.height / 2 - 15);
    ctx.fillStyle = '#9d7c89';
    ctx.font = '12px Poppins, sans-serif';
    ctx.fillText('Avoid rainy clouds 🌧️! Click "Start Game" below', canvas.width / 2, canvas.height / 2 + 15);
  }

  toggleArcadeGame() {
    const btn = document.getElementById('arcadeStartBtn');
    if (this.arcadeState.isPlaying) {
      this.arcadeState.isPlaying = false;
      cancelAnimationFrame(this.arcadeState.animationFrame);
      if (btn) btn.textContent = 'Play Again 🎮';
    } else {
      this.startArcade();
      if (btn) btn.textContent = 'Pause Game ⏸️';
    }
  }

  startArcade() {
    this.arcadeState.isPlaying = true;
    this.arcadeState.score = 0;
    this.arcadeState.lives = 3;
    this.arcadeState.items = [];
    this.arcadeState.spawnTimer = 0;
    this.updateArcadeUI();
    this.runArcadeLoop();
  }

  runArcadeLoop() {
    if (!this.arcadeState.isPlaying) return;

    this.updateArcadeState();
    this.renderArcade();

    this.arcadeState.animationFrame = requestAnimationFrame(() => this.runArcadeLoop());
  }

  updateArcadeState() {
    const { canvas } = this.arcadeState;
    this.arcadeState.spawnTimer++;

    // Spawn falling items
    if (this.arcadeState.spawnTimer % 35 === 0) {
      const types = [
        { emoji: '💖', points: 10, isBad: false },
        { emoji: '🍓', points: 15, isBad: false },
        { emoji: '⭐', points: 20, isBad: false },
        { emoji: '🎀', points: 30, isBad: false },
        { emoji: '🌧️', points: 0, isBad: true }
      ];
      const selected = types[Math.floor(Math.random() * types.length)];
      this.arcadeState.items.push({
        x: Math.random() * (canvas.width - 30) + 15,
        y: -20,
        speed: 2.5 + Math.random() * 2,
        ...selected
      });
    }

    // Move items & check collisions
    const playerY = canvas.height - 40;
    const basketLeft = this.arcadeState.playerX;
    const basketRight = this.arcadeState.playerX + this.arcadeState.playerWidth;

    for (let i = this.arcadeState.items.length - 1; i >= 0; i--) {
      const item = this.arcadeState.items[i];
      item.y += item.speed;

      // Check collision with basket
      if (item.y >= playerY - 10 && item.y <= playerY + 25 && item.x >= basketLeft - 10 && item.x <= basketRight + 10) {
        if (item.isBad) {
          this.arcadeState.lives--;
          if (this.app?.soundManager) this.app.soundManager.playPop();
          if (this.arcadeState.lives <= 0) {
            this.endArcadeGame();
            return;
          }
        } else {
          this.arcadeState.score += item.points;
          if (this.app?.soundManager) this.app.soundManager.playPop();
        }
        this.arcadeState.items.splice(i, 1);
        this.updateArcadeUI();
        continue;
      }

      // Remove offscreen items
      if (item.y > canvas.height + 20) {
        this.arcadeState.items.splice(i, 1);
      }
    }
  }

  renderArcade() {
    const { canvas, ctx } = this.arcadeState;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw basket (Pookie's cute Ribbon Bowl)
    const bx = this.arcadeState.playerX;
    const by = canvas.height - 40;
    const bw = this.arcadeState.playerWidth;
    const bh = this.arcadeState.playerHeight;

    ctx.fillStyle = '#ffd0e3';
    ctx.strokeStyle = '#ee82ad';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, [10, 10, 16, 16]);
    ctx.fill();
    ctx.stroke();

    // Basket Mascot Face
    ctx.font = '20px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🐰', bx + bw / 2, by + 21);

    // Draw falling items
    this.arcadeState.items.forEach(item => {
      ctx.font = '22px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.emoji, item.x, item.y);
    });
  }

  updateArcadeUI() {
    const scoreEl = document.getElementById('arcadeScore');
    const livesEl = document.getElementById('arcadeLives');
    if (scoreEl) scoreEl.textContent = `Score: ${this.arcadeState.score}`;
    if (livesEl) {
      livesEl.textContent = '❤️'.repeat(Math.max(0, this.arcadeState.lives));
    }
  }

  endArcadeGame() {
    this.arcadeState.isPlaying = false;
    cancelAnimationFrame(this.arcadeState.animationFrame);

    const btn = document.getElementById('arcadeStartBtn');
    if (btn) btn.textContent = 'Play Again 🎮';

    if (this.arcadeState.score > this.arcadeState.highScore) {
      this.arcadeState.highScore = this.arcadeState.score;
      localStorage.setItem('pookie_arcade_high', this.arcadeState.highScore.toString());
      const highScoreEl = document.getElementById('arcadeHighScore');
      if (highScoreEl) highScoreEl.textContent = `Best: ${this.arcadeState.highScore}`;
    }

    const earnedXP = Math.min(50, Math.floor(this.arcadeState.score / 6));
    if (this.app) {
      this.app.addXP(earnedXP, `Arcade High Score: ${this.arcadeState.score}! ⭐`);
    }

    alert(`Game Over! 🌧️\nYou scored ${this.arcadeState.score} points and earned +${earnedXP} XP! ⭐`);
  }

  /* ========================================================================
     GAME 3: MAGIC FORTUNE BOW
     ======================================================================== */

  initFortuneBow() {
    const bow = document.getElementById('fortuneBow');
    if (!bow) return;

    bow.addEventListener('click', () => {
      bow.classList.add('shaking');
      if (this.app?.soundManager) this.app.soundManager.playPop();

      setTimeout(() => {
        bow.classList.remove('shaking');
        const fortune = this.fortunes[Math.floor(Math.random() * this.fortunes.length)];
        const resultCard = document.getElementById('fortuneResult');
        if (resultCard) {
          resultCard.style.display = 'block';
          resultCard.innerHTML = `
            <h4 style="color:var(--primary-dark); margin-bottom:8px;">🎀 Pookie's Daily Prediction:</h4>
            <p style="font-size:14px; font-weight:600; color:var(--text-main); margin-bottom:12px;">"${fortune.text}"</p>
            <div style="display:flex; justify-content:space-around; font-size:12px; color:var(--text-muted);">
              <span>🍀 Lucky Charm: <b>${fortune.lucky}</b></span>
              <span>⏰ Golden Hour: <b>${fortune.time}</b></span>
            </div>
          `;
          if (this.app?.soundManager) this.app.soundManager.playChime();
          if (this.app) this.app.addXP(15, `Magic Fortune Read 🎀`);
        }
      }, 700);
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PookieGamesManager;
}
