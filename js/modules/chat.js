// Módulo de Chat (Lógica de Lecciones y Quizzes Avanzados)
import { callGemini } from '../services/gemini.js';
import { speakText, startListening, stopListening } from '../services/voice.js';
import { showToast, triggerConfetti, createAudioButton, showConfirmModal } from '../utils/ui.js';
import { getState, updateState, getTopicProgress, updateTopicProgress, addToVocabulary } from '../state.js';
import { SYLLABUS, CONFIG } from '../config.js';

const MAX_HISTORY = 10;

// Estado interno para navegación
let currentQuizData = null;
let lessonState = {
    currentPart: 1,
    totalParts: 3
};
let quizState = {
    currentQuestion: 1,
    totalQuestions: 5,
    selectedPair: null,     // Para Matching
    constructedSentence: [], // Para Ordenar
    correctMatches: 0       // Para Matching
};

export function initChat() {
    console.log("Inicializando Chat Avanzado...");
    
    const sendBtn = document.getElementById('send-btn');
    if(sendBtn) sendBtn.addEventListener('click', sendTextMsg);
    
    const chatInput = document.getElementById('chat-input');
    if(chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendTextMsg();
        });
    }
    
    const micBtn = document.getElementById('mic-btn');
    if(micBtn) micBtn.addEventListener('click', toggleMicrophone);
    
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (action) handleAction(action);
        });
    });

    const state = getState();
    if (state.chatHistory && state.chatHistory.length > 0) {
        state.chatHistory.forEach(msg => addMessageToUI(msg.content, msg.role, false));
    }
    
    checkRoleplayLock();
}

function checkRoleplayLock() {
    const state = getState();
    const progress = getTopicProgress(state.levelIdx, state.topicIdx);
    const roleplayBtn = document.querySelector('[data-action="roleplay"]');
    
    if (roleplayBtn) {
        if (progress.isRoleplayUnlocked) {
            roleplayBtn.disabled = false;
            roleplayBtn.style.opacity = '1';
            roleplayBtn.innerHTML = '<span>🎭</span> Roleplay';
        } else {
            roleplayBtn.disabled = true;
            roleplayBtn.style.opacity = '0.5';
            roleplayBtn.innerHTML = '<span>🔒</span> Roleplay';
        }
    }
}

function toggleMicrophone() {
    const micBtn = document.getElementById('mic-btn');
    const micStatus = document.getElementById('mic-status');
    const isActive = micBtn.classList.contains('mic-active');
    
    if (isActive) {
        stopListening();
        micBtn.classList.remove('mic-active');
        micStatus.textContent = 'Toca para hablar';
    } else {
        micBtn.classList.add('mic-active');
        micStatus.textContent = 'Escuchando...';
        startListening((text) => {
            const input = document.getElementById('chat-input');
            if (input) input.value = text;
            sendTextMsg();
        }, () => {
            micBtn.classList.remove('mic-active');
            micStatus.textContent = 'Toca para hablar';
        });
    }
}

async function sendTextMsg() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    addMessageToUI(text, 'user');
    input.value = '';
    
    const state = getState();
    const newHistory = [...state.chatHistory, { role: 'user', content: text }];
    updateState({ chatHistory: newHistory.slice(-MAX_HISTORY) });

    const loadingId = addMessageToUI('Thinking...', 'bot');

    try {
        const currentLevel = SYLLABUS[state.levelIdx];
        const currentTopic = currentLevel.topics[state.topicIdx];
        
        const prompt = `
            Act as an English Teacher for a Spanish speaker. 
            Level: ${currentLevel.name}. Topic: ${currentTopic}.
            User said: "${text}".
            Respond in JSON format: 
            { "type": "chat", "reply": "English response (Traducción al español)", "feedback": "Correction/Tip in Spanish" }
        `;
        
        const data = await callGemini(prompt);
        document.getElementById(loadingId)?.remove();
        
        if(data.reply) {
            const updatedHistory = [...getState().chatHistory, { role: 'bot', content: data.reply }];
            updateState({ chatHistory: updatedHistory.slice(-MAX_HISTORY) });
            
            let html = `<div class="text-primary font-bold mb-1">${data.reply}</div>`;
            if(data.feedback) html += `<div class="text-secondary text-sm">${data.feedback}</div>`;
            
            const msgId = addMessageToUI(html, 'bot');
            
            const englishText = data.reply.split('(')[0].trim();
            const audioBtn = createAudioButton(englishText);
            const msgEl = document.getElementById(msgId).querySelector('.message-bubble');
            if(msgEl) msgEl.appendChild(audioBtn);
        }

    } catch (e) {
        document.getElementById(loadingId)?.remove();
        addMessageToUI(`<span class="text-error">Error: ${e.message}</span>`, 'bot');
    }
}

// --- LÓGICA PRINCIPAL DE ACCIONES ---

async function handleAction(action, param = null) {
    const state = getState();
    const currentLevel = SYLLABUS[state.levelIdx];
    const currentTopic = currentLevel.topics[state.topicIdx];
    
    // Gestión de navegación interna
    let loadingMsg = 'Iniciando...';
    
    if (action === 'lesson') {
        if (typeof param === 'number') {
            lessonState.currentPart = param;
            loadingMsg = `Cargando parte ${lessonState.currentPart}...`;
        } else {
            lessonState.currentPart = 1; // Reset
            loadingMsg = 'Generando lección...';
        }
    } else if (action === 'quiz') {
        if (param === 'next') {
            quizState.currentQuestion++;
            loadingMsg = `Cargando pregunta ${quizState.currentQuestion}...`;
        } else if (param === 'prev') {
            quizState.currentQuestion--;
            loadingMsg = `Cargando pregunta anterior...`;
        } else {
            quizState.currentQuestion = 1; // Reset
            loadingMsg = 'Preparando quiz...';
        }
    }

    const loadingId = addMessageToUI(loadingMsg, 'bot');

    try {
        let prompt = "";
        
        if (action === 'lesson') {
            prompt = `
                Generate part ${lessonState.currentPart} of ${lessonState.totalParts} of a SHORT English lesson about "${currentTopic}" (${currentLevel.name}).
                Target audience: Spanish speaker.
                JSON Format:
                {
                    "type": "lesson",
                    "title": "Título en Español (Parte ${lessonState.currentPart})",
                    "content_markdown": "Explicación en Español. Use Markdown.",
                    "examples": [
                        {"en": "English Example 1", "es": "Traducción 1"},
                        {"en": "English Example 2", "es": "Traducción 2"}
                    ],
                    "part": ${lessonState.currentPart},
                    "total_parts": ${lessonState.totalParts}
                }
            `;
        } else if (action === 'quiz') {
            prompt = `
                Generate Question ${quizState.currentQuestion} of ${quizState.totalQuestions} for an English quiz about "${currentTopic}" (${currentLevel.name}).
                Randomly choose ONE type: 'multiple_choice', 'true_false', 'fill_blank', 'order_sentence', 'matching'.
                
                JSON:
                {
                    "type": "quiz",
                    "question_number": ${quizState.currentQuestion},
                    "total_questions": ${quizState.totalQuestions},
                    "quiz_type": "multiple_choice", 
                    "question": "How do you say 'Casa' in English?", 
                    "options": ["House", "Mouse", "Car"], 
                    "answer_index": 0 
                }
                (Adjust fields based on quiz type as defined previously)
            `;
        } else if (action === 'roleplay') {
            prompt = `Start roleplay about ${currentTopic}. JSON: { "type": "roleplay_start", "scene": "Descripción ES", "start_line": "Line (Traducción)" }`;
        } else if (action === 'next') {
            handleNextTopic();
            document.getElementById(loadingId)?.remove();
            return;
        }

        const data = await callGemini(prompt);
        document.getElementById(loadingId)?.remove();

        if (data.type === 'lesson') handleLesson(data);
        else if (data.type === 'quiz') handleQuiz(data);
        else if (data.type === 'roleplay_start') handleRoleplay(data);

    } catch (e) {
        document.getElementById(loadingId)?.remove();
        addMessageToUI(`<span class="text-error">Error: ${e.message}</span>`, 'bot');
    }
}

// --- MANEJADORES DE RESPUESTA ---

function handleLesson(data) {
    // Actualizar total si viene de la IA
    if (data.total_parts) lessonState.totalParts = data.total_parts;

    const html = `
        <h3 class="text-xl font-bold text-primary mb-2">${data.title}</h3>
        <div class="text-sm text-secondary mb-4">${window.marked ? marked.parse(data.content_markdown) : data.content_markdown}</div>
        <div class="bg-neutral p-3 rounded-lg mb-4">
            <p class="font-bold text-xs uppercase text-muted mb-2">Ejemplos:</p>
            ${data.examples.map(ex => `
                <div class="flex items-center justify-between mb-2 bg-white p-2 rounded border border-gray-100">
                    <div>
                        <span class="font-bold text-primary">${ex.en}</span>
                        <span class="text-xs text-gray-500 block">${ex.es}</span>
                    </div>
                    <div id="audio-${ex.en.replace(/[^a-zA-Z]/g,'')}" class="ml-2"></div>
                </div>
            `).join('')}
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-gray-200">
            <button onclick="window.navLesson(${data.part - 1})" class="text-primary font-bold text-sm ${data.part <= 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${data.part <= 1 ? 'disabled' : ''}>
                ⬅️ Anterior
            </button>
            <span class="text-xs font-bold text-gray-400">Parte ${data.part} / ${lessonState.totalParts}</span>
            <button onclick="window.navLesson(${data.part + 1})" class="text-primary font-bold text-sm ${data.part >= lessonState.totalParts ? 'opacity-50 cursor-not-allowed' : ''}" ${data.part >= lessonState.totalParts ? 'disabled' : ''}>
                Siguiente ➡️
            </button>
        </div>
        
        ${data.part >= lessonState.totalParts ? 
            `<button onclick="document.querySelector('[data-action=\\'quiz\\']').click()" class="mt-4 w-full py-3 bg-success text-white rounded-lg font-bold text-sm shadow-md animate-pulse">¡Lección Completada! Ir al Quiz 📝</button>` 
            : ''}
    `;
    
    addMessageToUI(html, 'bot');
    
    setTimeout(() => {
        data.examples.forEach(ex => {
            const container = document.getElementById(`audio-${ex.en.replace(/[^a-zA-Z]/g,'')}`);
            if(container) container.appendChild(createAudioButton(ex.en));
        });
    }, 100);

    // Registrar progreso
    const state = getState();
    const progress = getTopicProgress(state.levelIdx, state.topicIdx);
    updateTopicProgress(state.levelIdx, state.topicIdx, { lessonsRead: Math.max(progress.lessonsRead || 0, data.part) });
    checkRoleplayLock();
}

function handleQuiz(data) {
    currentQuizData = data;
    // Actualizar estado total
    if (data.total_questions) quizState.totalQuestions = data.total_questions;
    
    let html = `<div class="quiz-container bg-white p-2 rounded-lg border border-gray-100">`;
    
    html += `<div class="flex items-center gap-2 mb-3"><span class="bg-accent text-white px-2 py-1 rounded text-xs font-bold uppercase">Quiz</span></div>`;

    const btnStyle = "display: block; width: 100%; text-align: left; padding: 12px 16px; margin-bottom: 8px; background: white; border: 1px solid #E2E8F0; border-radius: 12px; color: #1E293B; font-weight: 600; font-size: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: all 0.2s;";

    // Renderizado según tipo (simplificado para brevedad, usa la lógica visual del paso anterior)
    if (data.quiz_type === 'true_false') {
        html += `
            <p class="font-bold text-lg mb-2 text-center text-primary">"${data.statement}"</p>
            <div class="grid grid-cols-2 gap-3">
                <button onclick="window.submitQuiz('true')" style="${btnStyle} text-align: center; background: #DCFCE7; color: #166534;">VERDADERO</button>
                <button onclick="window.submitQuiz('false')" style="${btnStyle} text-align: center; background: #FEE2E2; color: #991B1B;">FALSO</button>
            </div>`;
    } else if (data.quiz_type === 'fill_blank') {
        html += `
            <p class="text-center mb-4 text-lg text-primary">${data.sentence_start} <span id="blank-space" class="border-b-2 border-primary font-bold">____</span> ${data.sentence_end}</p>
            <div class="flex flex-wrap gap-2 justify-center">${data.options.map(opt => `<button onclick="window.submitQuiz('${opt}')" class="px-3 py-2 bg-gray-100 rounded-full text-sm font-bold">${opt}</button>`).join('')}</div>`;
    } else if (data.quiz_type === 'matching') {
        quizState.selectedPair = null; quizState.correctMatches = 0;
        const left = data.pairs.map((p,i)=>({v:p.en,id:i})).sort(()=>Math.random()-0.5);
        const right = data.pairs.map((p,i)=>({v:p.es,id:i})).sort(()=>Math.random()-0.5);
        html += `<div class="grid grid-cols-2 gap-2">${left.map(l=>`<button onclick="window.selectMatch('${l.v}',${l.id},this)" class="p-2 border rounded text-sm font-bold">${l.v}</button>`).join('')} ${right.map(r=>`<button onclick="window.selectMatch('${r.v}',${r.id},this)" class="p-2 border rounded text-sm text-gray-600">${r.v}</button>`).join('')}</div>`;
    } else {
        // Multiple choice fallback
        html += `<p class="font-bold mb-4 text-lg text-primary">${data.question || "Question?"}</p>
        <div class="flex flex-col gap-2">${(data.options||[]).map((opt, idx) => `<button onclick="window.submitQuiz(${idx})" style="${btnStyle}">${opt}</button>`).join('')}</div>`;
    }
    
    // NAVEGACIÓN QUIZ
    html += `
        <div class="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
            <button onclick="window.navQuiz('prev')" class="text-primary font-bold text-sm ${data.question_number <= 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${data.question_number <= 1 ? 'disabled' : ''}>⬅️ Anterior</button>
            <span class="text-xs font-bold text-gray-400">Pregunta ${data.question_number} / ${quizState.totalQuestions}</span>
            <button onclick="window.navQuiz('next')" class="text-primary font-bold text-sm ${data.question_number >= quizState.totalQuestions ? 'opacity-50 cursor-not-allowed' : ''}" ${data.question_number >= quizState.totalQuestions ? 'disabled' : ''}>Siguiente ➡️</button>
        </div>
    </div>`;
    
    addMessageToUI(html, 'bot');
}

// --- FUNCIONES GLOBALES (Window) ---

window.navLesson = (part) => {
    handleAction('lesson', part);
};

window.navQuiz = (direction) => {
    handleAction('quiz', direction);
};

window.submitQuiz = (answer) => {
    const data = currentQuizData;
    let isCorrect = false;
    // Lógica simple de validación
    if (data.quiz_type === 'true_false') isCorrect = (answer === 'true') === data.is_true;
    else if (data.quiz_type === 'fill_blank') {
        isCorrect = answer === data.hidden_word;
        if(isCorrect) document.getElementById('blank-space').innerText = answer;
    }
    else isCorrect = answer === data.answer_index;

    showResult(isCorrect);
};

window.selectMatch = (text, id, btn) => {
    if (btn.disabled) return;
    if (!quizState.selectedPair) {
        quizState.selectedPair = { id, btn };
        btn.style.background = '#DBEAFE'; // Azul claro
    } else {
        const first = quizState.selectedPair;
        if (first.btn === btn) {
            btn.style.background = 'white';
            quizState.selectedPair = null;
            return;
        }
        if (first.id === id) { // Match
            first.btn.style.background = '#DCFCE7'; first.btn.disabled = true;
            btn.style.background = '#DCFCE7'; btn.disabled = true;
            quizState.selectedPair = null;
            quizState.correctMatches++;
            if(quizState.correctMatches >= 3) showResult(true);
        } else { // Error
            first.btn.style.background = '#FEE2E2';
            btn.style.background = '#FEE2E2';
            setTimeout(() => {
                first.btn.style.background = 'white';
                btn.style.background = 'white';
            }, 500);
            quizState.selectedPair = null;
        }
    }
};

function showResult(isCorrect) {
    const state = getState();
    if (isCorrect) {
        updateState({ score: state.score + 15 });
        triggerConfetti();
        addMessageToUI(`<div class="text-green-600 font-black text-center">¡Correcto! 🎉 +15</div>`, 'bot');
        updateTopicProgress(state.levelIdx, state.topicIdx, { highestQuizScore: 100 });
        checkRoleplayLock();
        // Auto-avanzar (opcional)
        // setTimeout(() => window.navQuiz('next'), 1500);
    } else {
        addMessageToUI(`<div class="text-red-500 font-bold text-center">Incorrecto 😅</div>`, 'bot');
    }
}

function addMessageToUI(html, role, animate = true) {
    const div = document.createElement('div');
    div.className = `flex gap-3 ${animate ? 'fade-in-up' : ''} mb-4`;
    div.id = 'msg-' + Date.now();
    
    const content = `
        <div class="${role === 'bot' ? 'w-8 h-8 bg-primary' : 'hidden'} rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md">
            ${role === 'bot' ? '🤖' : ''}
        </div>
        <div class="${role === 'user' ? 'bg-primary-light text-primary ml-auto rounded-br-none' : 'bg-white border border-gray-100 mr-auto rounded-bl-none'} p-3 rounded-2xl max-w-[90%] shadow-sm text-sm">
            ${html}
        </div>
    `;
    div.innerHTML = content;
    const area = document.getElementById('chat-area');
    if(area) {
        area.appendChild(div);
        area.scrollTop = area.scrollHeight;
    }
    return div.id;
}

function handleNextTopic() {
    const state = getState();
    // Lógica simple de avance
    updateState({ topicIdx: state.topicIdx + 1 });
    showToast("Siguiente tema desbloqueado");
    document.dispatchEvent(new CustomEvent('stateChanged'));
    checkRoleplayLock();
}

function handleRoleplay(data) {
    const html = `
        <div class="bg-neutral p-4 rounded-xl border border-gray-200">
            <h3 class="font-bold text-primary mb-2">🎭 Roleplay</h3>
            <p class="text-sm text-gray-700 mb-3">${data.scene}</p>
            <div class="bg-white p-3 rounded-xl border flex justify-between">
                <span class="font-bold">${data.start_line}</span>
            </div>
        </div>`;
    addMessageToUI(html, 'bot');
}