// Módulo de Chat (Lógica de Lecciones y Quizzes Avanzados)
import { callGemini } from '../services/gemini.js';
import { speakText, startListening, stopListening } from '../services/voice.js';
import { showToast, triggerConfetti, createAudioButton, showConfirmModal } from '../utils/ui.js';
import { getState, updateState, getTopicProgress, updateTopicProgress, addToVocabulary } from '../state.js';
import { SYLLABUS, CONFIG } from '../config.js';

const MAX_HISTORY = 30;

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
    usedQuestions: [],      // Historial anti-repetición
    correctAnswers: 0       // Contador de respuestas correctas
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

    // Botones de control
    const clearBtn = document.getElementById('clear-chat-btn');
    if(clearBtn) clearBtn.addEventListener('click', clearChat);
    
    const restartBtn = document.getElementById('restart-lesson-btn');
    if(restartBtn) restartBtn.addEventListener('click', restartLesson);
    
    const prevBtn = document.getElementById('prev-lesson-btn');
    if(prevBtn) prevBtn.addEventListener('click', handlePrevTopic);
    
    // EVENT DELEGATION: Escuchar clicks en todo el chat-area
    const chatArea = document.getElementById('chat-area');
    if(chatArea) {
        chatArea.addEventListener('click', handleChatClick);
    }

    const state = getState();
    if (state.chatHistory && state.chatHistory.length > 0) {
        state.chatHistory.forEach(msg => addMessageToUI(msg.content, msg.role, false));
    }
    
    checkRoleplayLock();
}

// Manejador centralizado de clicks en el chat (Event Delegation)
function handleChatClick(e) {
    const target = e.target;
    const button = target.closest('button[data-quiz-action]');
    
    if (!button) return;
    
    const action = button.dataset.quizAction;
    const value = button.dataset.quizValue;
    
    switch(action) {
        case 'submitQuiz':
            submitQuizInternal(value);
            break;
        case 'navLesson':
            handleAction('lesson', parseInt(value));
            break;
        case 'navQuiz':
            handleAction('quiz', value);
            break;
        case 'addWord':
            addToSentenceInternal(value, button.id);
            break;
        case 'resetSentence':
            resetSentenceInternal();
            break;
        case 'checkOrder':
            checkOrderInternal();
            break;
        case 'selectMatch':
            selectMatchInternal(value, parseInt(button.dataset.matchId), button);
            break;
    }
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

function sanitizeMarkdown(text) {
    if (!text) return '';
    // Remover tags HTML peligrosos
    const dangerous = ['<script', '<iframe', '<object', '<embed', '<link', '<style', 'javascript:', 'onerror=', 'onclick='];
    let clean = text;
    dangerous.forEach(tag => {
        const regex = new RegExp(tag, 'gi');
        clean = clean.replace(regex, '');
    });
    return clean;
}

function toggleMicrophone() {
    const micBtn = document.getElementById('mic-btn');
    const micStatus = document.getElementById('mic-status');
    const isActive = micBtn.classList.contains('mic-active');
    
    if (isActive) {
        stopListening();
        micBtn.classList.remove('mic-active');
        micStatus.textContent = 'Toca para hablar';
        removeVoiceIndicator();
    } else {
        micBtn.classList.add('mic-active');
        micStatus.textContent = 'Escuchando...';
        showVoiceIndicator();
        startListening((text) => {
            const input = document.getElementById('chat-input');
            if (input) input.value = text;
            sendTextMsg();
        }, () => {
            micBtn.classList.remove('mic-active');
            micStatus.textContent = 'Toca para hablar';
            removeVoiceIndicator();
        });
    }
}

function showVoiceIndicator() {
    // Agregar indicador visual de voz
    const micBtn = document.getElementById('mic-btn');
    if (!micBtn) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'voice-wave-indicator';
    indicator.className = 'voice-indicator';
    indicator.style.cssText = `
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(74, 144, 226, 0.1);
        border-radius: 8px;
        padding: 4px 8px;
    `;
    
    for (let i = 0; i < 5; i++) {
        const bar = document.createElement('div');
        bar.className = 'voice-wave-bar';
        indicator.appendChild(bar);
    }
    
    const parent = micBtn.parentElement;
    if (parent) {
        parent.style.position = 'relative';
        parent.appendChild(indicator);
    }
}

function removeVoiceIndicator() {
    const indicator = document.getElementById('voice-wave-indicator');
    if (indicator) indicator.remove();
}

async function sendTextMsg() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    // Validación de longitud
    if (text.length > 500) {
        showToast('El mensaje es demasiado largo (máximo 500 caracteres)', 'warning');
        return;
    }
    
    addMessageToUI(text, 'user');
    input.value = '';
    
    const state = getState();
    const newHistory = [...state.chatHistory, { role: 'user', content: text }];
    updateState({ chatHistory: newHistory.slice(-MAX_HISTORY) });

    const loadingId = addMessageToUI('Thinking...', 'bot');

    try {
        const currentLevel = SYLLABUS[state.levelIdx];
        const currentTopic = currentLevel.topics[state.topicIdx];
        
        // Detectar idioma del usuario (simple: contar palabras en español vs inglés)
        const isSpanish = detectLanguage(text);
        
        let prompt = '';
        if (isSpanish) {
            // Usuario escribe en español → Lección/Respuesta en inglés
            prompt = `
                Eres un Profesor de Inglés para hispanohablantes. 
                Nivel: ${currentLevel.name}. Tema: ${currentTopic}.
                Usuario dice (en ESPAÑOL): "${text}".
                
                Responde en JSON: 
                { 
                    "type": "chat", 
                    "reply": "Respuesta en INGLÉS relevante al tema (con traducción en español entre paréntesis)", 
                    "feedback": "Consejo o explicación en ESPAÑOL"
                }
            `;
        } else {
            // Usuario escribe en inglés → Corrección/Feedback
            prompt = `
                Eres un Tutor de Inglés. El usuario está practicando.
                Nivel: ${currentLevel.name}. Tema: ${currentTopic}.
                Usuario escribe (en INGLÉS): "${text}".
                
                Analiza gramática, ortografía y naturalidad. Responde en JSON:
                {
                    "type": "correction",
                    "is_correct": true/false,
                    "corrected_sentence": "Versión corregida si hay error, o 'Perfect!' si está bien",
                    "explanation": "Explicación del error o felicitación en ESPAÑOL",
                    "example": "Ejemplo adicional en INGLÉS (traducción)"
                }
            `;
        }
        
        const data = await callGemini(prompt);
        document.getElementById(loadingId)?.remove();
        
        if (data.type === 'chat' && data.reply) {
            const updatedHistory = [...getState().chatHistory, { role: 'bot', content: data.reply }];
            updateState({ chatHistory: updatedHistory.slice(-MAX_HISTORY) });
            
            let html = `<div class="text-primary font-bold mb-1">${data.reply}</div>`;
            if(data.feedback) html += `<div class="text-secondary text-sm">${data.feedback}</div>`;
            
            const msgId = addMessageToUI(html, 'bot');
            
            const englishText = data.reply.split('(')[0].trim();
            const audioBtn = createAudioButton(englishText);
            const msgEl = document.getElementById(msgId).querySelector('.message-bubble');
            if(msgEl) msgEl.appendChild(audioBtn);
            
        } else if (data.type === 'correction') {
            let html = '';
            if (data.is_correct) {
                html = `<div class="text-green-600 font-bold mb-1">✅ ${data.corrected_sentence}</div>`;
            } else {
                html = `<div class="text-yellow-600 font-bold mb-1">💡 Corrección: ${data.corrected_sentence}</div>`;
            }
            if (data.explanation) html += `<div class="text-secondary text-sm">${data.explanation}</div>`;
            if (data.example) html += `<div class="text-primary text-sm italic mt-1">Ejemplo: ${data.example}</div>`;
            
            const msgId = addMessageToUI(html, 'bot');
            
            if (!data.is_correct && data.corrected_sentence) {
                const audioBtn = createAudioButton(data.corrected_sentence.split('(')[0].trim());
                const msgEl = document.getElementById(msgId).querySelector('.message-bubble');
                if(msgEl) msgEl.appendChild(audioBtn);
            }
        }

    } catch (e) {
        document.getElementById(loadingId)?.remove();
        addMessageToUI(`<span class="text-error">Error: ${e.message}</span>`, 'bot');
    }
}

// Detector de idioma simple (basado en palabras comunes)
function detectLanguage(text) {
    const spanishWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'en', 'que', 'es', 'por', 'para', 'con', 'como', 'está', 'qué', 'cómo', 'dónde', 'cuándo', 'yo', 'tú', 'él', 'ella'];
    const englishWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'of', 'for', 'with', 'this', 'that', 'what', 'how', 'where', 'when', 'I', 'you', 'he', 'she'];
    
    const words = text.toLowerCase().split(/\\s+/);
    let spanishCount = 0;
    let englishCount = 0;
    
    words.forEach(word => {
        if (spanishWords.includes(word)) spanishCount++;
        if (englishWords.includes(word)) englishCount++;
    });
    
    // Si hay acentos o ñ, probablemente es español
    if (/[áéíóúñ¿¡]/i.test(text)) spanishCount += 3;
    
    return spanishCount > englishCount;
}

// --- LÓGICA PRINCIPAL DE ACCIONES ---

async function handleAction(action, param = null) {
    const state = getState();
    const currentLevel = SYLLABUS[state.levelIdx];
    const currentTopic = currentLevel.topics[state.topicIdx];
    
    let loadingMsg = 'Iniciando...';
    
    if (action === 'lesson') {
        if (typeof param === 'number' && param > 0) {
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
            quizState.correctAnswers = 0; // Resetear contador de respuestas correctas
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

    // Sanitización básica del markdown
    const sanitizedMarkdown = sanitizeMarkdown(data.content_markdown);
    const parsedContent = window.marked ? marked.parse(sanitizedMarkdown) : sanitizedMarkdown;

    const html = `
        <h3 class="text-xl font-bold text-primary mb-2">${data.title}</h3>
        <div class="text-sm text-secondary mb-4">${parsedContent}</div>
        <div class="bg-neutral p-3 rounded-lg mb-4">
            <p class="font-bold text-xs uppercase text-muted mb-2">Ejemplos:</p>
            ${data.examples.map(ex => `
                <div class="mb-2 bg-white p-2 rounded border border-gray-100">
                    <div class="flex items-center gap-1">
                        <span class="font-bold text-primary" style="font-size: 0.9375rem;">${ex.en}</span>
                        <span id="audio-${ex.en.replace(/[^a-zA-Z]/g,'')}"></span>
                    </div>
                    <div class="mt-1" style="font-size: 0.6875rem; color: #64748B;">(${ex.es})</div>
                </div>
            `).join('')}
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-gray-200">
            ${data.part > 1 ? `
                <button data-quiz-action="navLesson" data-quiz-value="${data.part - 1}" class="text-primary font-bold text-sm">
                    ⬅️ Anterior
                </button>
            ` : '<div></div>'}
            <span class="text-xs font-bold text-gray-400">Parte ${data.part} / ${lessonState.totalParts}</span>
            ${data.part < lessonState.totalParts ? `
                <button data-quiz-action="navLesson" data-quiz-value="${data.part + 1}" class="text-primary font-bold text-sm">
                    Siguiente ➡️
                </button>
            ` : '<div></div>'}
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
        // Inicializar iconos de Lucide para los botones recién añadidos
        if (window.lucide) window.lucide.createIcons();
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
    
    let html = `<div class="quiz-container">`;
    
    html += `<div class="flex items-center gap-2 mb-3"><span class="bg-accent text-white px-2 py-1 rounded text-xs font-bold uppercase">Quiz</span></div>`;

    if (data.quiz_type === 'true_false') {
        html += `
            <p class="font-bold text-lg mb-2 text-center text-primary">"${data.statement}"</p>
            <div class="grid grid-cols-2 gap-3">
                <button data-quiz-action="submitQuiz" data-quiz-value="true" class="quiz-option-btn text-center" style="background: #DCFCE7; color: #166534; border-color: #86EFAC;">VERDADERO</button>
                <button data-quiz-action="submitQuiz" data-quiz-value="false" class="quiz-option-btn text-center" style="background: #FEE2E2; color: #991B1B; border-color: #FCA5A5;">FALSO</button>
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
                ${data.options.map(opt => `<button data-quiz-action="submitQuiz" data-quiz-value="${opt}" class="quiz-word-chip">${opt}</button>`).join('')}
            </div>`;
    } else if (data.quiz_type === 'order_sentence') {
        quizState.constructedSentence = [];
        const shuffled = [...data.words].sort(() => Math.random() - 0.5);
        html += `
            <p class="text-xs text-gray-400 text-center mb-2 uppercase font-bold">Ordena la frase:</p>
            <p class="text-center text-sm italic text-gray-500 mb-4">"${data.translation}"</p>
            <div id="sentence-builder" class="sentence-builder"></div>
            <div id="word-bank" class="flex flex-wrap gap-2 justify-center mt-3">
                ${shuffled.map((word, idx) => `<button id="word-${idx}" data-quiz-action="addWord" data-quiz-value="${word}" class="quiz-word-chip">${word}</button>`).join('')}
            </div>
            <div class="flex gap-2 mt-4">
                <button data-quiz-action="resetSentence" class="flex-1 py-2 text-gray-400 text-xs font-bold hover:text-gray-600">Reiniciar</button>
                <button data-quiz-action="checkOrder" class="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-md active:scale-95 transition-transform">Comprobar</button>
            </div>`;
    } else if (data.quiz_type === 'matching') {
        quizState.selectedPair = null; quizState.correctMatches = 0;
        const left = data.pairs.map((p,i)=>({v:p.en,id:i})).sort(()=>Math.random()-0.5);
        const right = data.pairs.map((p,i)=>({v:p.es,id:i})).sort(()=>Math.random()-0.5);
        html += `<p class="text-xs text-center text-gray-400 mb-3 uppercase font-bold">Empareja las palabras</p>
        <div class="grid grid-cols-2 gap-2">${left.map(l=>`<button data-quiz-action="selectMatch" data-quiz-value="${l.v}" data-match-id="${l.id}" class="match-btn text-primary text-sm" data-side="left">${l.v}</button>`).join('')} ${right.map(r=>`<button data-quiz-action="selectMatch" data-quiz-value="${r.v}" data-match-id="${r.id}" class="match-btn text-gray-600 text-sm" data-side="right">${r.v}</button>`).join('')}</div>`;
    } else {
        html += `<p class="font-bold mb-4 text-lg text-primary leading-snug">${data.question || "Question?"}</p>
        <div class="flex flex-col gap-2">${(data.options||[]).map((opt, idx) => `<button data-quiz-action="submitQuiz" data-quiz-value="${idx}" class="quiz-option-btn">${opt}</button>`).join('')}</div>`;
    }
    
    html += `
        <div class="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
            <button data-quiz-action="navQuiz" data-quiz-value="prev" class="text-primary font-bold text-sm ${quizState.currentQuestion <= 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${quizState.currentQuestion <= 1 ? 'disabled' : ''}>⬅️ Anterior</button>
            <span class="text-xs font-bold text-gray-400">Pregunta ${quizState.currentQuestion} / ${quizState.totalQuestions}</span>
            <button data-quiz-action="navQuiz" data-quiz-value="next" class="text-primary font-bold text-sm ${quizState.currentQuestion >= quizState.totalQuestions ? 'opacity-50 cursor-not-allowed' : ''}" ${quizState.currentQuestion >= quizState.totalQuestions ? 'disabled' : ''}>Siguiente ➡️</button>
        </div>
    </div>`;
    
    addMessageToUI(html, 'bot');
}

// --- FUNCIONES INTERNAS (Ya no globales) ---

function submitQuizInternal(answer) {
    const data = currentQuizData;
    let isCorrect = false;
    if (data.quiz_type === 'true_false') isCorrect = (answer === 'true') === data.is_true;
    else if (data.quiz_type === 'fill_blank') {
        isCorrect = answer === data.hidden_word;
        if(isCorrect) {
            const blankEl = document.getElementById('blank-space');
            if(blankEl) blankEl.innerText = answer;
        }
    }
    else isCorrect = parseInt(answer) === data.answer_index;

    showResult(isCorrect);
}

function addToSentenceInternal(word, btnId) {
    quizState.constructedSentence.push(word);
    const btn = document.getElementById(btnId);
    if (btn) btn.style.display = 'none';
    
    const builder = document.getElementById('sentence-builder');
    if (builder) {
        const wordSpan = document.createElement('span');
        wordSpan.className = "px-2 py-1 bg-blue-100 text-blue-800 rounded-lg font-bold text-sm animate-pop border border-blue-200";
        wordSpan.innerText = word;
        builder.appendChild(wordSpan);
        builder.classList.add('active');
    }
}

function resetSentenceInternal() {
    quizState.constructedSentence = [];
    const builder = document.getElementById('sentence-builder');
    if (builder) {
        builder.innerHTML = '';
        builder.classList.remove('active');
    }
    document.querySelectorAll('#word-bank button').forEach(b => b.style.display = 'inline-block');
}

function checkOrderInternal() {
    const userSentence = quizState.constructedSentence.join(' ').trim();
    const targetSentence = currentQuizData.sentence.trim();
    const isCorrect = userSentence.replace(/[.,?!]/g, '') === targetSentence.replace(/[.,?!]/g, '');
    showResult(isCorrect);
}

function selectMatchInternal(text, id, btn) {
    if (btn.disabled) return;
    if (!quizState.selectedPair) {
        quizState.selectedPair = { id, btn };
        btn.classList.add('selected');
    } else {
        const first = quizState.selectedPair;
        if (first.btn === btn) {
            btn.classList.remove('selected');
            quizState.selectedPair = null;
            return;
        }
        if (first.id === id) {
            first.btn.classList.add('correct');
            btn.classList.add('correct');
            first.btn.disabled = true;
            btn.disabled = true;
            quizState.correctMatches++;
            quizState.selectedPair = null;
            if(quizState.correctMatches >= 2) showResult(true);
        } else {
            first.btn.classList.add('incorrect');
            btn.classList.add('incorrect');
            setTimeout(() => {
                first.btn.classList.remove('incorrect', 'selected');
                btn.classList.remove('incorrect');
            }, 500);
            quizState.selectedPair = null;
        }
    }
}

function showResult(isCorrect) {
    const state = getState();
    if (isCorrect) {
        quizState.correctAnswers = (quizState.correctAnswers || 0) + 1;
        updateState({ score: state.score + 15 });
        triggerConfetti();
        addMessageToUI(`<div class="text-green-600 font-black text-center text-xl p-2">¡Correcto! 🎉 <br><span class="text-sm font-medium text-gray-400">+15 Puntos</span></div>`, 'bot');
        
        // Calcular porcentaje real basado en respuestas correctas
        const percentage = Math.round((quizState.correctAnswers / quizState.totalQuestions) * 100);
        const progress = getTopicProgress(state.levelIdx, state.topicIdx);
        const newScore = Math.max(progress.highestQuizScore || 0, percentage);
        
        updateTopicProgress(state.levelIdx, state.topicIdx, { quizScore: newScore });
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
        // Auto-scroll suave al final
        setTimeout(() => {
            area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' });
        }, 100);
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

function clearChat() {
    showConfirmModal(
        '¿Limpiar Chat?',
        'Se borrarán todos los mensajes de la conversación actual.',
        () => {
            const chatArea = document.getElementById('chat-area');
            if (chatArea) {
                chatArea.innerHTML = '';
                addMessageToUI('<div class="text-center text-gray-400 text-sm">Chat limpio. ¿En qué puedo ayudarte?</div>', 'bot');
            }
            updateState({ chatHistory: [] });
            showToast('Chat limpiado', 'success');
        }
    );
}

function restartLesson() {
    showConfirmModal(
        '¿Reiniciar Lección?',
        'Volverás a la primera parte de la lección actual.',
        () => {
            lessonState.currentPart = 1;
            handleAction('lesson', 1);
            showToast('Lección reiniciada', 'info');
        }
    );
}

function handlePrevTopic() {
    const state = getState();
    const currentLevel = SYLLABUS[state.levelIdx];
    
    if (state.topicIdx > 0) {
        showConfirmModal(
            '¿Ir al Tema Anterior?',
            `Cambiarás a: ${currentLevel.topics[state.topicIdx - 1]}`,
            () => {
                updateState({ topicIdx: state.topicIdx - 1 });
                showToast(`Tema: ${currentLevel.topics[state.topicIdx - 1]}`, 'success');
                window.dispatchEvent(new CustomEvent('stateChanged'));
                checkRoleplayLock();
            }
        );
    } else if (state.levelIdx > 0) {
        const prevLevel = SYLLABUS[state.levelIdx - 1];
        showConfirmModal(
            '¿Ir al Nivel Anterior?',
            `Cambiarás a: ${prevLevel.name} (último tema)`,
            () => {
                updateState({ 
                    levelIdx: state.levelIdx - 1,
                    topicIdx: prevLevel.topics.length - 1
                });
                showToast(`Nivel: ${prevLevel.name}`, 'success');
                window.dispatchEvent(new CustomEvent('stateChanged'));
                checkRoleplayLock();
            }
        );
    } else {
        showToast('Ya estás en el primer tema', 'info');
    }
}