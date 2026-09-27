/**
 * Scalable Character Registry & Dynamic Configuration Loader
 */

const fs = require('fs');
const path = require('path');

const CHARACTERS_DIR = __dirname;

// Voice Allowlist - Legally and technically authorized ElevenLabs Voice Library & Voice Design IDs
const ALLOWED_VOICES = {
  '21m00Tcm4TlvDq8ikWAM': {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    label: 'Rachel (Sweet & Calming)',
    category: 'Original ElevenLabs Voice Library',
    gender: 'Female',
    description: 'Calm, gentle, friendly conversational voice.'
  },
  'pNInz6obpgDQGcFmaJgB': {
    id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    label: 'Adam (Deep & Analytical)',
    category: 'Original ElevenLabs Voice Library',
    gender: 'Male',
    description: 'Deep, crisp, investigative narrative voice.'
  },
  'ErXwobaYiN019PkySvjV': {
    id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    label: 'Antoni (Calm & Grounded)',
    category: 'Original ElevenLabs Voice Library',
    gender: 'Male',
    description: 'Soothing, balanced, meditative mentor tone.'
  },
  'EXAVITQu4vr4xnSDxMaL': {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    label: 'Bella (Crisp & High-Tech)',
    category: 'Original ElevenLabs Voice Library',
    gender: 'Female',
    description: 'Bright, articulate, modern expressive voice.'
  },
  'VR6AewLTigWG4xSOukaG': {
    id: 'VR6AewLTigWG4xSOukaG',
    name: 'Arnold',
    label: 'Arnold (Warm & Expressive)',
    category: 'Original ElevenLabs Voice Library',
    gender: 'Male',
    description: 'Rich, theatrical, warm European cadence.'
  },
  'MF3mGyEYCl7XYWbV9V6O': {
    id: 'MF3mGyEYCl7XYWbV9V6O',
    name: 'Elli',
    label: 'Elli (Youthful & Cheerful)',
    category: 'Original ElevenLabs Voice Library',
    gender: 'Female',
    description: 'Playful, cheerful youthful voice.'
  },
  'TxGEqnHWrfWFTfGW9XjX': {
    id: 'TxGEqnHWrfWFTfGW9XjX',
    name: 'Josh',
    label: 'Josh (Warm & Natural)',
    category: 'Original ElevenLabs Voice Library',
    gender: 'Male',
    description: 'Warm, natural conversational voice.'
  }
};

function loadCharacters() {
  const characters = [];
  const files = fs.readdirSync(CHARACTERS_DIR);

  for (const file of files) {
    if (file.endsWith('.json')) {
      const fullPath = path.join(CHARACTERS_DIR, file);
      try {
        const raw = fs.readFileSync(fullPath, 'utf8');
        const character = JSON.parse(raw);
        if (character && character.id && character.name) {
          // Fallback to allowed voice if needed
          if (!ALLOWED_VOICES[character.voiceId]) {
            character.voiceId = '21m00Tcm4TlvDq8ikWAM';
            character.voiceName = ALLOWED_VOICES[character.voiceId].label;
          }
          characters.push(character);
        }
      } catch (err) {
        console.error(`Failed to load character from ${file}:`, err.message);
      }
    }
  }

  // Ensure default fallback character exists
  if (characters.length === 0) {
    characters.push({
      id: 'pookie',
      name: 'Pookie Bestie',
      avatar: '🐰',
      voiceId: '21m00Tcm4TlvDq8ikWAM',
      voiceName: 'Rachel (Sweet & Calming)',
      systemPrompt: 'You are Pookie Bestie 🎀, the user\'s sweet AI digital friend.'
    });
  }

  return characters;
}

function getCharacterById(id) {
  const characters = loadCharacters();
  return characters.find(c => c.id === id) || characters[0];
}

module.exports = {
  loadCharacters,
  getCharacterById,
  ALLOWED_VOICES
};
