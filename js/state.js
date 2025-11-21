// Gestión de Estado Global
import { CONFIG } from './config.js';

const defaultState = {
    score: 0,
    levelIdx: 0,
    topicIdx: 0,
    chatHistory: [],
    lastVisit: Date.now(),
    darkMode: false,
    completedTopics: [],
    dailyStreak: 0,
    lastStudyDate: null,
    studyTimeToday: 0
};

export function getState() {
    try {
        const stored = localStorage.getItem(CONFIG.STATE_KEY);
        if (!stored) return { ...defaultState };
        return { ...defaultState, ...JSON.parse(stored) };
    } catch (e) {
        console.error('Error loading state:', e);
        return { ...defaultState };
    }
}

export function updateState(updates) {
    const current = getState();
    const newState = { ...current, ...updates };
    try {
        localStorage.setItem(CONFIG.STATE_KEY, JSON.stringify(newState));
        // Disparar evento para que los módulos se actualicen
        window.dispatchEvent(new CustomEvent('stateChanged', { detail: newState }));
    } catch (e) {
        console.error('Error saving state:', e);
    }
}

export function resetState() {
    localStorage.removeItem(CONFIG.STATE_KEY);
    window.dispatchEvent(new CustomEvent('stateChanged', { detail: defaultState }));
}

// Vocabulario
export function getVocabulary() {
    try {
        const stored = localStorage.getItem(CONFIG.VOCAB_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error loading vocabulary:', e);
        return [];
    }
}

export function addToVocabulary(word) {
    const vocab = getVocabulary();
    // Evitar duplicados
    if (vocab.find(v => v.object === word.object)) return;
    
    const state = getState();
    const currentLevel = CONFIG.SYLLABUS ? CONFIG.SYLLABUS[state.levelIdx]?.id : 'A1';
    
    vocab.push({
        object: word.object,
        translation: word.translation,
        ipa: word.ipa,
        timestamp: Date.now(),
        level: currentLevel
    });
    try {
        localStorage.setItem(CONFIG.VOCAB_KEY, JSON.stringify(vocab));
        window.dispatchEvent(new CustomEvent('vocabularyChanged'));
    } catch (e) {
        console.error('Error saving vocabulary:', e);
    }
}

export function exportVocabulary() {
    const vocab = getVocabulary();
    const csv = ['Word,Translation,IPA,Level,Date\n'];
    vocab.forEach(word => {
        const date = new Date(word.timestamp).toLocaleDateString();
        csv.push(`${word.object},${word.translation},${word.ipa || ''},${word.level || 'A1'},${date}\n`);
    });
    return csv.join('');
}

export function markTopicCompleted(levelIdx, topicIdx) {
    const state = getState();
    const key = `${levelIdx}-${topicIdx}`;
    
    if (!state.completedTopics.includes(key)) {
        state.completedTopics.push(key);
        updateState({ completedTopics: state.completedTopics });
    }
}

export function isTopicCompleted(levelIdx, topicIdx) {
    const state = getState();
    const key = `${levelIdx}-${topicIdx}`;
    return state.completedTopics.includes(key);
}

export function updateDailyStreak() {
    const state = getState();
    const today = new Date().toDateString();
    const lastStudy = state.lastStudyDate ? new Date(state.lastStudyDate).toDateString() : null;
    
    if (lastStudy === today) {
        // Ya estudió hoy, no hacer nada
        return state.dailyStreak;
    }
    
    // Si es un nuevo día, resetear tiempo de estudio
    if (lastStudy !== today) {
        updateState({ studyTimeToday: 0 });
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    let newStreak = state.dailyStreak;
    
    if (lastStudy === yesterdayStr) {
        // Estudió ayer, incrementar racha
        newStreak = state.dailyStreak + 1;
    } else if (lastStudy === null) {
        // Primera vez
        newStreak = 1;
    } else {
        // Rompió la racha
        newStreak = 1;
    }
    
    updateState({ 
        dailyStreak: newStreak, 
        lastStudyDate: new Date().toISOString() 
    });
    
    return newStreak;
}
