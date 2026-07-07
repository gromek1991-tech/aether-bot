import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../database/sqlite.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Available languages
const LANGUAGES = ['pl', 'en', 'ru', 'es', 'de'];

// Language names
const LANGUAGE_NAMES = {
  pl: '🇵🇱 Polski',
  en: '🇬🇧 English',
  ru: '🇷🇺 Русский',
  es: '🇪🇸 Español',
  de: '🇩🇪 Deutsch'
};

// Cache translations
const translations = {};

// Load translations
function loadTranslation(lang) {
  if (!translations[lang]) {
    try {
      const filePath = join(__dirname, `${lang}.json`);
      translations[lang] = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (error) {
      console.error(`Failed to load translation: ${lang}`, error);
      translations[lang] = {};
    }
  }
  return translations[lang];
}

// Get user language
export function getUserLanguage(telegramId) {
  const user = db.findUser(telegramId);
  return user?.language || 'pl';
}

// Set user language
export function setUserLanguage(telegramId, lang) {
  if (!LANGUAGES.includes(lang)) {
    return false;
  }
  db.updateUser(db.findUser(telegramId)?.id, { language: lang });
  return true;
}

// Get translated text
export function t(telegramId, key, params = {}) {
  const lang = getUserLanguage(telegramId);
  const trans = loadTranslation(lang);
  
  // Navigate nested keys (e.g., "mining.started")
  const keys = key.split('.');
  let value = trans;
  for (const k of keys) {
    value = value?.[k];
  }
  
  // Fallback to Polish if key not found
  if (value === undefined) {
    const plTrans = loadTranslation('pl');
    value = plTrans;
    for (const k of keys) {
      value = value?.[k];
    }
  }
  
  // Fallback to key if still not found
  if (value === undefined) {
    return key;
  }
  
  // Replace parameters
  return Object.entries(params).reduce(
    (text, [param, val]) => text.replace(`{${param}}`, val),
    value
  );
}

// Get language selection keyboard
export function getLanguageKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: LANGUAGES.map(lang => [{
        text: LANGUAGE_NAMES[lang],
        callback_data: `lang_${lang}`
      }])
    }
  };
}

// Get language name
export function getLanguageName(lang) {
  return LANGUAGE_NAMES[lang] || lang;
}

// Check if language is valid
export function isValidLanguage(lang) {
  return LANGUAGES.includes(lang);
}

// Get all available languages
export function getAvailableLanguages() {
  return LANGUAGES;
}

export default {
  getUserLanguage,
  setUserLanguage,
  t,
  getLanguageKeyboard,
  getLanguageName,
  isValidLanguage,
  getAvailableLanguages,
  LANGUAGES,
  LANGUAGE_NAMES
};
