// Gestión del Estado (State Management)
const STATE_KEY = 'profesor_ia_state_v2';

let state = {
    score: 0,
    levelIdx: 0,
    topicIdx: 0,
    collection: [], 
    speechRate: 0.9,
    hasSeenTutorial: false,
    darkMode: false,
    lessonHistory: [],
    achievements: [],
    chatHistory: []
};

export function initState() {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
        } catch (e) {
            console.error("Error cargando estado, usando default");
        }
    }
}

export function getState() {
    return state;
}

export function updateState(updates) {
    state = { ...state, ...updates };
    saveState();
    // Aquí podríamos despachar eventos para actualizar UI
    document.dispatchEvent(new CustomEvent('stateChanged', { detail: state }));
}

function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
}
