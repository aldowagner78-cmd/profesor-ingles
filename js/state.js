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
    // NUEVO: Estructura detallada de progreso por tema
    // Formato clave "nivel-tema": { lessonsRead: 0, highestQuizScore: 0, isRoleplayUnlocked: false }
    topicProgress: {}, 
    dailyStreak: 0,
    lastStudyDate: null,
    studyTimeToday: 0,
    roleplayState: null // Estado persistente del roleplay
};

export function getState() {
    try {
        const stored = localStorage.getItem(CONFIG.STATE_KEY);
        if (!stored) return { ...defaultState };
        
        // Merge con defaultState para asegurar que existen los nuevos campos (topicProgress)
        const parsed = JSON.parse(stored);
        return { ...defaultState, ...parsed };
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

// --- NUEVAS FUNCIONES DE PROGRESO DETALLADO ---

// Obtener progreso de un tema específico
export function getTopicProgress(levelIdx, topicIdx) {
    const state = getState();
    const key = `${levelIdx}-${topicIdx}`;
    return state.topicProgress[key] || { lessonsRead: 0, highestQuizScore: 0, isRoleplayUnlocked: false };
}

// Actualizar progreso (ej: completó lección o hizo quiz)
export function updateTopicProgress(levelIdx, topicIdx, data) {
    const state = getState();
    const key = `${levelIdx}-${topicIdx}`;
    const current = state.topicProgress[key] || { lessonsRead: 0, highestQuizScore: 0, isRoleplayUnlocked: false };
    
    // Mezclar datos nuevos con los existentes
    const updated = { ...current, ...data };
    
    // Verificar si desbloquea Roleplay
    // Condición: Mínimo de lecciones leídas Y nota mínima en Quiz
    if (updated.lessonsRead >= CONFIG.MIN_LESSONS && updated.highestQuizScore >= CONFIG.PASSING_SCORE) {
        updated.isRoleplayUnlocked = true;
    }

    const newTopicProgress = { ...state.topicProgress, [key]: updated };
    updateState({ topicProgress: newTopicProgress });
    
    return updated;
}

// --- GESTIÓN DE VOCABULARIO ---

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

// Mantener compatibilidad con código viejo, pero conectarlo a la nueva lógica si es necesario
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

export function updateTopicProgress(levelIdx, topicIdx, data) {
    const state = getState();
    const key = `${levelIdx}-${topicIdx}`;
    const progress = state.topicProgress || {};
    
    if (!progress[key]) {
        progress[key] = { lessonsRead: 0, highestQuizScore: 0, isRoleplayUnlocked: false };
    }
    
    if (data.lessonRead) {
        progress[key].lessonsRead = (progress[key].lessonsRead || 0) + 1;
    }
    
    if (data.quizScore !== undefined) {
        progress[key].highestQuizScore = Math.max(progress[key].highestQuizScore || 0, data.quizScore);
    }
    
    // Desbloquear roleplay si cumple requisitos
    const MIN_LESSONS = 1;
    const PASSING_SCORE = 75;
    if (progress[key].lessonsRead >= MIN_LESSONS && progress[key].highestQuizScore >= PASSING_SCORE) {
        progress[key].isRoleplayUnlocked = true;
    }
    
    updateState({ topicProgress: progress });
    return progress[key];
}

export function getTopicProgress(levelIdx, topicIdx) {
    const state = getState();
    const key = `${levelIdx}-${topicIdx}`;
    return state.topicProgress?.[key] || { lessonsRead: 0, highestQuizScore: 0, isRoleplayUnlocked: false };
}