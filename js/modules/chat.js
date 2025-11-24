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
// CORRECCIÓN: Agregado historial de preguntas usadas
let quizState = {
    currentQuestion: 1,
    totalQuestions: 5,
    selectedPair: null,     // Para Matching
    constructedSentence: [], // Para Ordenar
    correctMatches: 0,       // Para Matching
    usedQuestions: []        // Historial anti-repetición
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
            Eres un Profesor de Inglés para hispanohablantes. 
            Nivel: ${currentLevel.name}. Tema: ${currentTopic}.
            Usuario dice: "${text}".
            Responde en JSON: 
            { "type": "chat", "reply": "Respuesta en INGLÉS (Traducción entre paréntesis)", "feedback": "Corrección o consejo en ESPAÑOL" }
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
    
    let loadingMsg = 'Iniciando...';
    
    if (action === 'lesson') {
        if (typeof param === 'number') {
            lessonState.currentPart = param;
            loadingMsg = `Cargando parte ${lessonState.currentPart}...`;
        } else {
            lessonState.currentPart = 1;
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
            quizState.currentQuestion = 1;
            quizState.usedQuestions = []; // CORRECCIÓN: Resetear historial al empezar
            loadingMsg = 'Preparando quiz...';
        }
    }

    const loadingId = addMessageToUI(loadingMsg, 'bot');

    try {
        let prompt = "";
        
        if (action === 'lesson') {
            prompt = `
                Genera la parte ${lessonState.currentPart} de ${lessonState.totalParts} de una lección CORTA de inglés sobre "${currentTopic}" (${currentLevel.name}).
                Para hablantes de español.
                JSON Format:
                {
                    "type": "lesson",
                    "title": "Título en Español (Parte ${lessonState.currentPart})",
                    "content_markdown": "Explicación en Español. Usa Markdown.",
                    "examples": [
                        {"en": "English Sentence 1", "es": "Traducción 1"},
                        {"en": "English Sentence 2", "es": "Traducción 2"}
                    ],
                    "part": ${lessonState.currentPart},
                    "total_parts": ${lessonState.totalParts}
                }
            `;
        } else if (action === 'quiz') {
            // CORRECCIÓN: Incluir historial en el prompt para evitar repeticiones
            const avoidedQuestions = quizState.usedQuestions.join(" | ");
            
            prompt = `
                Eres un profesor de Inglés. Genera una pregunta de quiz sobre "${currentTopic}" (${currentLevel.name}).
                Pregunta ${quizState.currentQuestion} de ${quizState.totalQuestions}.
                
                OBJETIVO: Evaluar inglés.
                REGLA 1: Pregunta en ESPAÑOL. Opciones en INGLÉS.
                REGLA 2: ¡IMPORTANTE! NO REPITAS estas preguntas anteriores: "${avoidedQuestions}".
                REGLA 3: Elige aleatoriamente UNO de estos tipos:
                
                1. multiple_choice:
                { "type": "quiz", "question_number": ${quizState.currentQuestion}, "total_questions": ${quizState.totalQuestions}, "quiz_type": "multiple_choice", "question": "¿Cómo se dice '[Palabra Español]' en inglés?", "options": ["Correct (EN)", "Wrong1 (EN)", "Wrong2 (EN)"], "answer_index": 0 }
                
                2. true_false:
                { "type": "quiz", "question_number": ${quizState.currentQuestion}, "total_questions": ${quizState.totalQuestions}, "quiz_type": "true_false", "statement": "La palabra 'House' significa 'Casa'.", "is_true": true, "explanation": "Explicación en Español." }
                
                3. fill_blank:
                { "type": "quiz", "question_number": ${quizState.currentQuestion}, "total_questions": ${quizState.totalQuestions}, "quiz_type": "fill_blank", "sentence_start": "I want to", "hidden_word": "play", "sentence_end": "soccer.", "translation_hint": "(Quiero jugar al fútbol)", "options": ["play", "house", "apple"] }
                
                4. order_sentence:
                { "type": "quiz", "question_number": ${quizState.currentQuestion}, "total_questions": ${quizState.totalQuestions}, "quiz_type": "order_sentence", "sentence": "I am happy", "words": ["I", "am", "happy", "sad"], "translation": "Yo soy feliz" }
                
                5. matching:
                { "type": "quiz", "question_number": ${quizState.currentQuestion}, "total_questions": ${quizState.totalQuestions}, "quiz_type": "matching", "pairs": [{"en": "Dog", "es": "Perro"}, {"en": "Cat", "es": "Gato"}] }
            `;
        } else if (action === 'roleplay') {
            prompt = `Inicia un Roleplay sobre ${currentTopic}. JSON: { "type": "roleplay_start", "scene": "Descripción ES", "start_line": "English line (Traducción)" }`;
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

    const state = getState();
    const progress = getTopicProgress(state.levelIdx, state.topicIdx);
    updateTopicProgress(state.levelIdx, state.topicIdx, { lessonsRead: Math.max(progress.lessonsRead || 0, data.part) });
    checkRoleplayLock();
}

function handleQuiz(data) {
    currentQuizData = data;
    if (data.total_questions) quizState.totalQuestions = data.total_questions;
    if (data.question_number) quizState.currentQuestion = data.question_number;
    
    // CORRECCIÓN: Guardar pregunta en historial
    const questionId = data.question || data.statement || data.sentence_start;
    if (questionId) quizState.usedQuestions.push(questionId);
    
    let html = `<div class="quiz-container bg-white p-2 rounded-lg border border-gray-100">`;
    
    html += `<div class="flex items-center gap-2 mb-3"><span class="bg-accent text-white px-2 py-1 rounded text-xs font-bold uppercase">Quiz</span></div>`;

    const btnStyle = "display: block; width: 100%; text-align: left; padding: 12px 16px; margin-bottom: 8px; background: white; border: 1px solid #E2E8F0; border-radius: 12px; color: #1E293B; font-weight: 600; font-size: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: all 0.2s; cursor: pointer;";

    if (data.quiz_type === 'true_false') {
        html += `
            <p class="font-bold text-lg mb-2 text-center text-primary">"${data.statement}"</p>
            <div class="grid grid-cols-2 gap-3">
                <button onclick="window.submitQuiz('true')" style="${btnStyle} text-align: center; background: #DCFCE7; color: #166534; border-color: #86EFAC;">VERDADERO</button>
                <button onclick="window.submitQuiz('false')" style="${btnStyle} text-align: center; background: #FEE2E2; color: #991B1B; border-color: #FCA5A5;">FALSO</button>
            </div>`;
    } else if (data.quiz_type === 'fill_blank') {
        html += `
            <p class="text-center mb-2 text-lg text-primary">
                ${data.sentence_start} 
                <span id="blank-space" class="inline-block px-2 border-b-2 border-primary font-bold text-blue-600 min-w-[50px]">____</span> 
                ${data.sentence_end}
            </p>
            <p class="text-center text-sm text-gray-400 italic mb-4">${data.translation_hint || ''}</p>
            <div class="flex flex-wrap gap-2 justify-center">
                ${data.options.map(opt => `<button onclick="window.submitQuiz('${opt}')" class="px-4 py-2 bg-gray-100 hover:bg-blue-100 text-primary font-bold rounded-full border border-gray-200 transition-colors">${opt}</button>`).join('')}
            </div>`;
    } else if (data.quiz_type === 'order_sentence') {
        quizState.constructedSentence = [];
        const shuffled = [...data.words].sort(() => Math.random() - 0.5);
        html += `
            <p class="text-xs text-gray-400 text-center mb-2 uppercase font-bold">Ordena la frase:</p>
            <p class="text-center text-sm italic text-gray-500 mb-4">"${data.translation}"</p>
            <div id="sentence-builder" class="min-h-[3rem] bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 mb-4 flex flex-wrap gap-2 p-3 justify-center items-center transition-colors"></div>
            <div id="word-bank" class="flex flex-wrap gap-2 justify-center">
                ${shuffled.map((word, idx) => `<button id="word-${idx}" onclick="window.addToSentence('${word}', 'word-${idx}')" class="px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm font-bold text-primary active:scale-95 transition-transform">${word}</button>`).join('')}
            </div>
            <div class="flex gap-2 mt-4">
                <button onclick="window.resetSentence()" class="flex-1 py-2 text-gray-400 text-xs font-bold hover:text-gray-600">Reiniciar</button>
                <button onclick="window.checkOrder()" class="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-md active:scale-95 transition-transform">Comprobar</button>
            </div>`;
    } else if (data.quiz_type === 'matching') {
        quizState.selectedPair = null; quizState.correctMatches = 0;
        const left = data.pairs.map((p,i)=>({v:p.en,id:i})).sort(()=>Math.random()-0.5);
        const right = data.pairs.map((p,i)=>({v:p.es,id:i})).sort(()=>Math.random()-0.5);
        html += `<p class="text-xs text-center text-gray-400 mb-3 uppercase font-bold">Empareja las palabras</p>
        <div class="grid grid-cols-2 gap-2">${left.map(l=>`<button onclick="window.selectMatch('${l.v}',${l.id},this)" class="match-btn w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-primary text-sm shadow-sm" data-side="left">${l.v}</button>`).join('')} ${right.map(r=>`<button onclick="window.selectMatch('${r.v}',${r.id},this)" class="match-btn w-full p-3 bg-white border border-gray-200 rounded-xl text-gray-600 text-sm shadow-sm" data-side="right">${r.v}</button>`).join('')}</div>`;
    } else {
        html += `<p class="font-bold mb-4 text-lg text-primary leading-snug">${data.question || "Question?"}</p>
        <div class="flex flex-col gap-2">${(data.options||[]).map((opt, idx) => `<button onclick="window.submitQuiz(${idx})" style="${btnStyle}">${opt}</button>`).join('')}</div>`;
    }
    
    html += `
        <div class="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
            <button onclick="window.navQuiz('prev')" class="text-primary font-bold text-sm ${quizState.currentQuestion <= 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${quizState.currentQuestion <= 1 ? 'disabled' : ''}>⬅️ Anterior</button>
            <span class="text-xs font-bold text-gray-400">Pregunta ${quizState.currentQuestion} / ${quizState.totalQuestions}</span>
            <button onclick="window.navQuiz('next')" class="text-primary font-bold text-sm ${quizState.currentQuestion >= quizState.totalQuestions ? 'opacity-50 cursor-not-allowed' : ''}" ${quizState.currentQuestion >= quizState.totalQuestions ? 'disabled' : ''}>Siguiente ➡️</button>
        </div>
    </div>`;
    
    addMessageToUI(html, 'bot');
}

// --- FUNCIONES GLOBALES ---

window.navLesson = (part) => {
    handleAction('lesson', part);
};

window.navQuiz = (direction) => {
    handleAction('quiz', direction);
};

window.submitQuiz = (answer) => {
    const data = currentQuizData;
    let isCorrect = false;
    if (data.quiz_type === 'true_false') isCorrect = (answer === 'true') === data.is_true;
    else if (data.quiz_type === 'fill_blank') {
        isCorrect = answer === data.hidden_word;
        if(isCorrect) document.getElementById('blank-space').innerText = answer;
    }
    else isCorrect = answer === data.answer_index;

    showResult(isCorrect);
};

window.addToSentence = (word, btnId) => {
    quizState.constructedSentence.push(word);
    const btn = document.getElementById(btnId);
    btn.style.display = 'none';
    
    const builder = document.getElementById('sentence-builder');
    const wordSpan = document.createElement('span');
    wordSpan.className = "px-2 py-1 bg-blue-100 text-blue-800 rounded-lg font-bold text-sm animate-pop border border-blue-200";
    wordSpan.innerText = word;
    builder.appendChild(wordSpan);
    builder.classList.add('border-blue-300', 'bg-blue-50');
};

window.resetSentence = () => {
    quizState.constructedSentence = [];
    const builder = document.getElementById('sentence-builder');
    builder.innerHTML = '';
    builder.classList.remove('border-blue-300', 'bg-blue-50');
    document.querySelectorAll('#word-bank button').forEach(b => b.style.display = 'inline-block');
};

window.checkOrder = () => {
    const userSentence = quizState.constructedSentence.join(' ').trim();
    const targetSentence = currentQuizData.sentence.trim();
    const isCorrect = userSentence.replace(/[.,?!]/g, '') === targetSentence.replace(/[.,?!]/g, '');
    showResult(isCorrect);
};

window.selectMatch = (text, id, btn) => {
    if (btn.disabled) return;
    if (!quizState.selectedPair) {
        quizState.selectedPair = { id, btn };
        btn.style.borderColor = '#3B82F6';
        btn.style.backgroundColor = '#EFF6FF';
        btn.style.transform = 'scale(0.98)';
    } else {
        const first = quizState.selectedPair;
        if (first.btn === btn) {
            btn.style.borderColor = '#E2E8F0';
            btn.style.backgroundColor = 'white';
            btn.style.transform = 'scale(1)';
            quizState.selectedPair = null;
            return;
        }
        if (first.id === id) { // Match
            const successStyle = "background: #DCFCE7; color: #166534; border-color: #86EFAC; opacity: 0.6;";
            first.btn.style.cssText = successStyle;
            btn.style.cssText = successStyle;
            first.btn.disabled = true;
            btn.disabled = true;
            quizState.correctMatches++;
            quizState.selectedPair = null;
            if(quizState.correctMatches >= 2) showResult(true);
        } else { // Error
            first.btn.classList.add('bg-red-100', 'border-red-200');
            btn.classList.add('bg-red-100', 'border-red-200');
            setTimeout(() => {
                first.btn.classList.remove('bg-red-100', 'border-red-200');
                btn.classList.remove('bg-red-100', 'border-red-200');
                first.btn.style.borderColor = '#E2E8F0';
                first.btn.style.backgroundColor = 'white';
                first.btn.style.transform = 'scale(1)';
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
        addMessageToUI(`<div class="text-green-600 font-black text-center text-xl p-2">¡Correcto! 🎉 <br><span class="text-sm font-medium text-gray-400">+15 Puntos</span></div>`, 'bot');
        updateTopicProgress(state.levelIdx, state.topicIdx, { highestQuizScore: 100 });
        checkRoleplayLock();
    } else {
        addMessageToUI(`<div class="text-red-500 font-bold text-center p-2">Incorrecto 😅</div>`, 'bot');
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
    updateState({ topicIdx: state.topicIdx + 1 });
    showToast("Siguiente tema desbloqueado");
    document.dispatchEvent(new CustomEvent('stateChanged'));
    checkRoleplayLock();
}

function handleRoleplay(data) {
    const html = `
        <div class="bg-neutral p-4 rounded-xl border border-gray-200">
            <h3 class="font-bold text-primary mb-2">🎭 Roleplay</h3>
            <p class="text-sm mb-3 text-gray-700">${data.scene}</p>
            <div class="bg-white p-3 rounded-xl border flex justify-between">
                <span class="font-bold">${data.start_line}</span>
            </div>
        </div>`;
    addMessageToUI(html, 'bot');
}