/**
 * POOKIE AI 🎀 - ADVANCED VOICE & SPEECH SYNTHESIS ENGINE
 * Supports ElevenLabs Text-to-Speech (/api/tts) with intelligent caching,
 * allowed voice profiles, live audio streaming, and high-fidelity browser TTS fallback.
 */

class PookieVoiceManager {
  constructor(app) {
    this.app = app;
    this.synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    this.voices = [];
    this.isSpeaking = false;
    this.currentAudio = null;
    this.currentObjectUrl = null;

    // Load saved voice settings
    const hasStorage = typeof localStorage !== 'undefined';
    this.activeVoiceId = hasStorage ? (localStorage.getItem('pookie_active_voice_id') || '21m00Tcm4TlvDq8ikWAM') : '21m00Tcm4TlvDq8ikWAM';
    this.autoSpeak = hasStorage ? (localStorage.getItem('pookie_auto_speak') === 'true') : false;
    this.selectedSystemVoiceURI = hasStorage ? (localStorage.getItem('pookie_voice_uri') || '') : '';
    this.customPitch = hasStorage ? parseFloat(localStorage.getItem('pookie_voice_pitch') || '1.25') : 1.25;
    this.customRate = hasStorage ? parseFloat(localStorage.getItem('pookie_voice_rate') || '1.05') : 1.05;

    // Allowlisted ElevenLabs Voices with descriptions and legal/safety categories
    this.allowedVoices = {
      '21m00Tcm4TlvDq8ikWAM': {
        id: '21m00Tcm4TlvDq8ikWAM',
        name: 'Rachel',
        label: 'Rachel (Sweet & Calming)',
        provider: 'ElevenLabs Voice Library',
        category: 'Original Voice Design',
        description: 'Warm, pleasant, conversational female voice.'
      },
      'pNInz6obpgDQGcFmaJgB': {
        id: 'pNInz6obpgDQGcFmaJgB',
        name: 'Adam',
        label: 'Adam (Deep & Analytical)',
        provider: 'ElevenLabs Voice Library',
        category: 'Original Voice Design',
        description: 'Deep, crisp, investigative narrative male voice.'
      },
      'ErXwobaYiN019PkySvjV': {
        id: 'ErXwobaYiN019PkySvjV',
        name: 'Antoni',
        label: 'Antoni (Calm & Grounded)',
        provider: 'ElevenLabs Voice Library',
        category: 'Original Voice Design',
        description: 'Tranquil, meditative, wise mentor voice.'
      },
      'EXAVITQu4vr4xnSDxMaL': {
        id: 'EXAVITQu4vr4xnSDxMaL',
        name: 'Bella',
        label: 'Bella (Crisp & High-Tech)',
        provider: 'ElevenLabs Voice Library',
        category: 'Original Voice Design',
        description: 'Bright, articulate, expressive sci-fi voice.'
      },
      'VR6AewLTigWG4xSOukaG': {
        id: 'VR6AewLTigWG4xSOukaG',
        name: 'Arnold',
        label: 'Arnold (Warm & Expressive)',
        provider: 'ElevenLabs Voice Library',
        category: 'Original Voice Design',
        description: 'Rich, theatrical, warm European cadence.'
      },
      'MF3mGyEYCl7XYWbV9V6O': {
        id: 'MF3mGyEYCl7XYWbV9V6O',
        name: 'Elli',
        label: 'Elli (Youthful & Cheerful)',
        provider: 'ElevenLabs Voice Library',
        category: 'Original Voice Design',
        description: 'Playful, vibrant, energetic youthful voice.'
      },
      'TxGEqnHWrfWFTfGW9XjX': {
        id: 'TxGEqnHWrfWFTfGW9XjX',
        name: 'Josh',
        label: 'Josh (Warm & Natural)',
        provider: 'ElevenLabs Voice Library',
        category: 'Original Voice Design',
        description: 'Warm, natural everyday voice.'
      }
    };
  }

  init() {
    if (this.synth) {
      this.loadSystemVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadSystemVoices();
      }
    }
    this.bindVoiceUI();
  }

  loadSystemVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();

    const voiceSelect = document.getElementById('systemVoiceSelect');
    if (voiceSelect && this.voices.length > 0) {
      voiceSelect.innerHTML = '<option value="">Default Browser Voice</option>';
      this.voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.voiceURI;
        option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' — System Default' : ''}`;
        if (voice.voiceURI === this.selectedSystemVoiceURI) {
          option.selected = true;
        }
        voiceSelect.appendChild(option);
      });
    }
  }

  setVoiceId(voiceId) {
    if (this.allowedVoices[voiceId]) {
      this.activeVoiceId = voiceId;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('pookie_active_voice_id', voiceId);
      }
      this.updateVoiceUI();
    }
  }

  getVoiceInfo(voiceId = this.activeVoiceId) {
    return this.allowedVoices[voiceId] || this.allowedVoices['21m00Tcm4TlvDq8ikWAM'];
  }

  /**
   * Main speech output method: tries ElevenLabs /api/tts first,
   * gracefully falls back to browser SpeechSynthesis.
   */
  async speak(text, voiceId = null) {
    this.stop(); // Stop any currently playing audio

    const targetVoiceId = voiceId || this.activeVoiceId;

    // Check mute state
    if (this.app?.soundManager?.muted) {
      return;
    }

    // Clean text for speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, ' code block ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#~]/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/•/g, '')
      .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
      .trim();

    if (!cleanText) return;

    this.isSpeaking = true;
    this.updateSpeakingState(true);

    // 1. Try ElevenLabs API via backend endpoint
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voiceId: targetVoiceId
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('audio/mpeg')) {
        const blob = await response.blob();
        if (this.currentObjectUrl) {
          URL.revokeObjectURL(this.currentObjectUrl);
        }
        this.currentObjectUrl = URL.createObjectURL(blob);
        const audio = new Audio(this.currentObjectUrl);
        this.currentAudio = audio;

        audio.onended = () => {
          this.isSpeaking = false;
          this.updateSpeakingState(false);
          this.currentAudio = null;
        };

        audio.onerror = () => {
          console.warn('ElevenLabs audio playback failed, falling back to browser speech.');
          this.currentAudio = null;
          this.speakWithBrowserSynth(cleanText);
        };

        await audio.play();
        return;
      }
    } catch (err) {
      console.warn('TTS request error, using browser speech fallback:', err.message);
    }

    // 2. Fallback to Browser Speech Synthesis
    this.speakWithBrowserSynth(cleanText);
  }

  speakWithBrowserSynth(cleanText) {
    if (!this.synth) {
      this.isSpeaking = false;
      this.updateSpeakingState(false);
      return;
    }

    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.pitch = this.customPitch;
    utterance.rate = this.customRate;

    if (this.selectedSystemVoiceURI && this.voices.length > 0) {
      const found = this.voices.find(v => v.voiceURI === this.selectedSystemVoiceURI);
      if (found) utterance.voice = found;
    } else if (this.voices.length > 0) {
      const preferred = this.voices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Google US English')));
      if (preferred) utterance.voice = preferred;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.updateSpeakingState(true);
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.updateSpeakingState(false);
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.updateSpeakingState(false);
    };

    this.synth.speak(utterance);
  }

  stop() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
    if (this.currentObjectUrl) {
      try {
        URL.revokeObjectURL(this.currentObjectUrl);
      } catch (e) {}
      this.currentObjectUrl = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }
    this.isSpeaking = false;
    this.updateSpeakingState(false);
  }

  previewVoice(voiceId = this.activeVoiceId) {
    const previewTexts = {
      '21m00Tcm4TlvDq8ikWAM': "Hiii bestie! 🥺💕 Rachel here! Ready to chat, study, and play games together?",
      'pNInz6obpgDQGcFmaJgB': "Evening partner. Adam speaking. The case files are ready whenever you are. 🕵️‍♂️",
      'ErXwobaYiN019PkySvjV': "Peace be with you, traveler. 🍵 Antoni here. Let the mind become calm and steady.",
      'EXAVITQu4vr4xnSDxMaL': "Diagnostics optimal! ⚡ Bella online. Quantum telemetry ready for command! 🤖",
      'VR6AewLTigWG4xSOukaG': "Ah, bienvenue! 🥐 Arnold here. Everything is simmering with golden perfection! ✨"
    };

    const quote = previewTexts[voiceId] || "Hello! This is a preview of this character's voice. Ready to chat!";
    this.speak(quote, voiceId);
  }

  updateSpeakingState(isSpeaking) {
    const mascot = document.getElementById('mascot');
    const speakIndicator = document.getElementById('speakingIndicator');
    const stopBtn = document.getElementById('stopSpeakingBtn');

    if (mascot) {
      if (isSpeaking) mascot.classList.add('mascot-speaking');
      else mascot.classList.remove('mascot-speaking');
    }

    if (speakIndicator) {
      speakIndicator.style.display = isSpeaking ? 'flex' : 'none';
    }

    if (stopBtn) {
      stopBtn.style.display = isSpeaking ? 'inline-block' : 'none';
    }
  }

  bindVoiceUI() {
    // 1. ElevenLabs Voice Selection Cards in Voice Modal
    const voiceContainer = document.getElementById('elevenlabsVoiceList');
    if (voiceContainer) {
      voiceContainer.innerHTML = '';
      Object.values(this.allowedVoices).forEach(voice => {
        const card = document.createElement('div');
        card.className = `voice-profile-card ${voice.id === this.activeVoiceId ? 'active' : ''}`;
        card.dataset.voiceId = voice.id;
        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-weight:700; font-size:13.5px; color:var(--primary-dark);">${voice.label}</div>
            <span style="font-size:10px; background:var(--primary-light); color:var(--primary-dark); padding:2px 8px; border-radius:10px; font-weight:700;">${voice.category}</span>
          </div>
          <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">${voice.description}</div>
        `;
        card.addEventListener('click', () => {
          document.querySelectorAll('.voice-profile-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          this.setVoiceId(voice.id);
          this.previewVoice(voice.id);
        });
        voiceContainer.appendChild(card);
      });
    }

    // 2. Pitch & Rate Sliders (for Browser TTS fallback)
    const pitchSlider = document.getElementById('voicePitchSlider');
    const rateSlider = document.getElementById('voiceRateSlider');
    const pitchVal = document.getElementById('voicePitchValue');
    const rateVal = document.getElementById('voiceRateValue');

    if (pitchSlider) {
      pitchSlider.value = this.customPitch;
      pitchSlider.addEventListener('input', (e) => {
        this.customPitch = parseFloat(e.target.value);
        if (pitchVal) pitchVal.textContent = this.customPitch.toFixed(2);
        localStorage.setItem('pookie_voice_pitch', this.customPitch.toString());
      });
    }

    if (rateSlider) {
      rateSlider.value = this.customRate;
      rateSlider.addEventListener('input', (e) => {
        this.customRate = parseFloat(e.target.value);
        if (rateVal) rateVal.textContent = this.customRate.toFixed(2);
        localStorage.setItem('pookie_voice_rate', this.customRate.toString());
      });
    }

    // 3. System Voice Select
    const voiceSelect = document.getElementById('systemVoiceSelect');
    if (voiceSelect) {
      voiceSelect.addEventListener('change', (e) => {
        this.selectedSystemVoiceURI = e.target.value;
        localStorage.setItem('pookie_voice_uri', this.selectedSystemVoiceURI);
      });
    }

    // 4. Test Preview Button
    const previewBtn = document.getElementById('testVoiceBtn');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.previewVoice(this.activeVoiceId));
    }

    // 5. Auto-Speak Toggle
    const autoSpeakToggle = document.getElementById('autoSpeakToggle');
    if (autoSpeakToggle) {
      autoSpeakToggle.checked = this.autoSpeak;
      autoSpeakToggle.addEventListener('change', (e) => {
        this.autoSpeak = e.target.checked;
        localStorage.setItem('pookie_auto_speak', this.autoSpeak);
        if (this.app) {
          this.app.showToast(this.autoSpeak ? '🔊 Auto-Speak Enabled: AI will speak replies aloud!' : '🔇 Auto-Speak Disabled');
        }
      });
    }

    // 6. Stop Speaking Buttons
    const stopSpeakBtn = document.getElementById('stopSpeakingBtn');
    if (stopSpeakBtn) {
      stopSpeakBtn.addEventListener('click', () => this.stop());
    }

    // 7. Voice Modal Triggers
    const openVoiceModalBtn = document.getElementById('openVoiceModalBtn');
    const switchVoiceModalBtn = document.getElementById('switchVoiceModalBtn');
    const voiceModal = document.getElementById('voiceModal');
    const closeVoiceModalBtn = document.getElementById('closeVoiceModal');

    const openModal = () => {
      if (voiceModal) {
        voiceModal.classList.add('active');
        this.updateVoiceUI();
      }
    };

    if (openVoiceModalBtn) openVoiceModalBtn.addEventListener('click', openModal);
    if (switchVoiceModalBtn) switchVoiceModalBtn.addEventListener('click', openModal);
    if (closeVoiceModalBtn && voiceModal) {
      closeVoiceModalBtn.addEventListener('click', () => voiceModal.classList.remove('active'));
    }
    if (voiceModal) {
      voiceModal.addEventListener('click', (e) => {
        if (e.target === voiceModal) voiceModal.classList.remove('active');
      });
    }

    this.updateVoiceUI();
  }

  updateVoiceUI() {
    const voice = this.getVoiceInfo(this.activeVoiceId);
    const activeCharVoice = document.getElementById('activeCharVoice');
    if (activeCharVoice && voice) {
      activeCharVoice.textContent = `🎙️ Voice: ${voice.label}`;
    }

    document.querySelectorAll('.voice-profile-card').forEach(card => {
      card.classList.toggle('active', card.dataset.voiceId === this.activeVoiceId);
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PookieVoiceManager;
}
