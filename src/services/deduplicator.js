const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
// Retención: 30 días (un mes)
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; 

let history = {};

function init() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (e) {
      console.error('[Deduplicator] Error reading history.json', e);
      history = {};
    }
  }
  cleanup();
}

function save() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history));
  } catch (e) {
    console.error('[Deduplicator] Error saving history.json', e);
  }
}

function cleanup() {
  const now = Date.now();
  let changed = false;
  for (const key in history) {
    if (now - history[key] > RETENTION_MS) {
      delete history[key];
      changed = true;
    }
  }
  if (changed) save();
}

/**
 * Checks if this exact event fingerprint was already processed recently.
 * If not, it saves it and returns false.
 */
function isDuplicate(fingerprint) {
  if (!fingerprint) return false;
  
  const now = Date.now();
  if (history[fingerprint]) {
    // Si queremos extender el tiempo al verlo de nuevo, podemos actualizar el now.
    // history[fingerprint] = now; 
    // save();
    return true; 
  }
  
  history[fingerprint] = now;
  save();
  return false;
}

init();

module.exports = {
  isDuplicate
};
