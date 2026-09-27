/**
 * POOKIE AI 🎀 - NOTES & SECRET DIARY ENGINE
 * Daily reflection, mood tagging, AI reflection generator, search & export.
 */

class PookieNotesManager {
  constructor(app) {
    this.app = app;
    this.notes = JSON.parse(localStorage.getItem('pookie_diary_notes') || '[]');
    if (this.notes.length === 0) {
      this.notes = [
        {
          id: Date.now() - 86400000,
          title: "My first day with Pookie 🎀",
          content: "Downloaded Pookie today and I'm already in love with the aesthetic! Tried the study timer and drank my water.",
          mood: "🥰 Happy",
          sticker: "🎀",
          date: new Date(Date.now() - 86400000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
          reflection: "I remember this day! You made my digital heart so full bestie ♡ Let's make many more memories!"
        }
      ];
    }
  }

  init() {
    this.bindEvents();
    this.renderNotes();
  }

  bindEvents() {
    const saveBtn = document.getElementById('saveNoteBtn');
    const searchInput = document.getElementById('notesSearchInput');
    const exportBtn = document.getElementById('exportNotesBtn');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.handleSaveNote());
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.renderNotes(e.target.value.toLowerCase().trim());
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportNotes());
    }
  }

  handleSaveNote() {
    const titleInput = document.getElementById('noteTitleInput');
    const bodyInput = document.getElementById('noteBodyInput');
    const moodSelect = document.getElementById('noteMoodSelect');
    const stickerSelect = document.getElementById('noteStickerSelect');

    const title = titleInput.value.trim() || 'Untitled Note ♡';
    const content = bodyInput.value.trim();

    if (!content) {
      alert('Write a little something first, bestie! 🥺');
      return;
    }

    const mood = moodSelect ? moodSelect.value : '🥰 Happy';
    const sticker = stickerSelect ? stickerSelect.value : '🎀';
    const date = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    // AI Bestie Reflection generator based on sentiment and content
    const reflection = this.generateReflection(title, content, mood);

    const newNote = {
      id: Date.now(),
      title,
      content,
      mood,
      sticker,
      date,
      reflection
    };

    this.notes.unshift(newNote);
    this.saveNotes();
    this.renderNotes();

    titleInput.value = '';
    bodyInput.value = '';

    if (this.app?.soundManager) this.app.soundManager.playChime();
    if (this.app) {
      this.app.addXP(20, 'Logged in Pookie Notes 💌');
      this.app.celebrate();
    }
  }

  generateReflection(title, content, mood) {
    const text = (title + ' ' + content).toLowerCase();
    if (text.includes('sad') || text.includes('tired') || text.includes('hard') || text.includes('stress')) {
      return "Pookie's Note ♡: Reading this makes me want to wrap you in 100 soft blankets. Remember that you are allowed to rest without feeling guilty. Tomorrow is a brand new page! 🌸";
    }
    if (text.includes('happy') || text.includes('yay') || text.includes('love') || text.includes('fun')) {
      return "Pookie's Note ♡: AHH your joy is infectious! Seeing you happy makes my little heart bounce with sparkles! Savor this sweet feeling! ✨";
    }
    return "Pookie's Note ♡: Thank you for trusting your thoughts to me bestie. Every little moment you live is writing your beautiful story! Proud of you always. 🎀";
  }

  renderNotes(filter = '') {
    const grid = document.getElementById('notesListGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = this.notes.filter(n => {
      if (!filter) return true;
      return n.title.toLowerCase().includes(filter) || n.content.toLowerCase().includes(filter) || n.mood.toLowerCase().includes(filter);
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding:30px; color:var(--text-muted); font-size:13px;">
          No notes found. Write your first thought above! 💌
        </div>
      `;
      return;
    }

    filtered.forEach(note => {
      const card = document.createElement('div');
      card.className = 'note-card';
      card.innerHTML = `
        <div class="note-header-line">
          <span>${note.date}</span>
          <span>${note.sticker} ${note.mood}</span>
        </div>
        <h4 style="color:var(--primary-dark); font-size:14.5px; margin-top:4px;">${this.escapeHTML(note.title)}</h4>
        <p style="font-size:12.5px; color:var(--text-main); line-height:1.5; white-space:pre-wrap;">${this.escapeHTML(note.content)}</p>
        ${note.reflection ? `<div class="pookie-reflection-box">${this.escapeHTML(note.reflection)}</div>` : ''}
        <button class="delete-note-btn" style="position:absolute; bottom:12px; right:12px; border:none; background:none; cursor:pointer; color:var(--text-light); font-size:13px;" title="Delete Note">🗑️</button>
      `;

      card.querySelector('.delete-note-btn').addEventListener('click', () => {
        if (confirm('Delete this diary note, bestie?')) {
          this.notes = this.notes.filter(n => n.id !== note.id);
          this.saveNotes();
          this.renderNotes(filter);
        }
      });

      grid.appendChild(card);
    });
  }

  exportNotes() {
    let markdown = `# 🎀 Pookie Notes & Diary\n*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;
    this.notes.forEach(note => {
      markdown += `### ${note.sticker} ${note.title}\n`;
      markdown += `*${note.date} • Mood: ${note.mood}*\n\n`;
      markdown += `${note.content}\n\n`;
      if (note.reflection) {
        markdown += `> 🎀 **Pookie's Reflection**: ${note.reflection}\n\n`;
      }
      markdown += `---\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pookie-notes-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  saveNotes() {
    localStorage.setItem('pookie_diary_notes', JSON.stringify(this.notes));
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PookieNotesManager;
}
