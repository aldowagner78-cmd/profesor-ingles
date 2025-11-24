// Módulo de Chat (Lógica de Lecciones y Quizzes Avanzados)
import { callGemini } from '../services/gemini.js';
import { speakText, startListening, stopListening } from '../services/voice.js';
import { showToast, triggerConfetti, createAudioButton, showConfirmModal } from '../utils/ui.js';
import { getState, updateState, getTopicProgress, updateTopicProgress, addToVocabulary } from '../state.js';
import { SYLLABUS, CONFIG } from '../config.js';

const MAX_HISTORY = 10;

// Estado temporal para los quizzes complejos
let currentQuizData = null;
let quizState = {
    selectedPair: null, // Para Matching
    constructedSentence: [], // Para Ordenar
    correctMatches: 0 // Para Matching
};

export function initChat() {
    console.log("Inicializando Chat Avanzado...");
    
    // Event Listeners Básicos
    const sendBtn = document.getElementById('send-btn');
    if(sendBtn) sendBtn.addEventListener('click', sendTextMsg);
    
    const chatInput = document.getElementById('chat-input');
    if(chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendTextMsg();
        });
    }
    
    // Micrófono
    const micBtn = document.getElementById('mic-btn');
    if(micBtn) micBtn.addEventListener('click', toggleMicrophone);
    
    // Botones de Acción (Menú inferior)
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (action) handleAction(action);
        });
    });

    // Renderizar historial previo
    const state = getState();
    if (state.chatHistory && state.chatHistory.length > 0) {
        state.chatHistory.forEach(msg => addMessageToUI(msg.content, msg.role, false));
    }
    
    // Verificar estado del botón Roleplay al iniciar
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

// --- MANEJO DEL CHAT Y MICROFONO ---

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
    
    // Guardar historial
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
            { 
                "type": "chat", 
                "reply": "English response (Traducción al español)", 
                "feedback": "Correction/Tip in Spanish" 
            }
        `;
        
        const data = await callGemini(prompt);
        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.remove();
        
        if(data.reply) {
            // Guardar respuesta del bot
            const updatedHistory = [...getState().chatHistory, { role: 'bot', content: data.reply }];
            updateState({ chatHistory: updatedHistory.slice(-MAX_HISTORY) });
            
            // Mostrar respuesta
            let html = `<div class="text-primary font-bold mb-1">${data.reply}</div>`;
            if(data.feedback) html += `<div class="text-secondary text-sm">${data.feedback}</div>`;
            
            const msgId = addMessageToUI(html, 'bot');
            
            // Agregar audio (SOLO INGLÉS)
            const englishText = data.reply.split('(')[0].trim();
            const audioBtn = createAudioButton(englishText);
            const msgEl = document.getElementById(msgId).querySelector('.message-bubble');
            if(msgEl) msgEl.appendChild(audioBtn);
        }

    } catch (e) {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            loadingEl.innerHTML = `<span class="text-error">Error: ${e.message}</span>`;
        }
    }
}

// --- LÓGICA PRINCIPAL DE ACCIONES ---

async function handleAction(action) {
    const state = getState();
    const currentLevel = SYLLABUS[state.levelIdx];
    const currentTopic = currentLevel.topics[state.topicIdx];
    
    const loadingId = addMessageToUI(
        action === 'lesson' ? 'Generando lección...' : 
        action === 'quiz' ? 'Preparando quiz...' : 'Iniciando...', 
        'bot'
    );

    try {
        let prompt = "";
        
        if (action === 'lesson') {
            prompt = `
                Generate a SHORT English lesson about "${currentTopic}" (${currentLevel.name}) for a Spanish speaker.
                JSON Format:
                {
                    "type": "lesson",
                    "title": "Título en Español",
                    "content_markdown": "Explicación en Español usando Markdown. Sé claro y conciso.",
                    "examples": [
                        {"en": "English Sentence 1", "es": "Traducción 1"},
                        {"en": "English Sentence 2", "es": "Traducción 2"}
                    ]
                }
            `;
        } else if (action === 'quiz') {
            // PROMPT CORREGIDO: DIRECCIÓN ESPAÑOL -> INGLÉS
            prompt = `
                Generate an English quiz about "${currentTopic}" (${currentLevel.name}) for a Spanish speaker.
                Randomly choose ONE type: 'multiple_choice', 'true_false', 'fill_blank', 'order_sentence', 'matching'.
                
                IMPORTANT: The goal is to test ENGLISH knowledge.
                - Questions must ask "How do you say X in English?" or "What does X mean?".
                - Options must be in English (except for matching).
                
                JSON Formats by type:
                
                1. multiple_choice:
                { "type": "quiz", "quiz_type": "multiple_choice", "question": "¿Cómo se dice '[Spanish Word]' en inglés?", "options": ["English A", "English B", "English C"], "answer_index": 0 }
                
                2. true_false:
                { "type": "quiz", "quiz_type": "true_false", "statement": "La palabra 'House' significa 'Casa'.", "is_true": true, "explanation": "Explicación en Español." }
                
                3. fill_blank:
                { "type": "quiz", "quiz_type": "fill_blank", "sentence_start": "I want to", "hidden_word": "play", "sentence_end": "soccer.", "translation_hint": "(Quiero jugar al fútbol)", "options": ["play", "house", "apple"] }
                
                4. order_sentence:
                { "type": "quiz", "quiz_type": "order_sentence", "sentence": "I am happy", "words": ["I", "am", "happy", "sad", "is"], "translation": "Yo soy feliz" }
                
                5. matching:
                { "type": "quiz", "quiz_type": "matching", "pairs": [{"en": "Dog", "es": "Perro"}, {"en": "Cat", "es": "Gato"}, {"en": "Bird", "es": "Pájaro"}] }
            `;
        } else if (action === 'roleplay') {
            prompt = `Start a roleplay about ${currentTopic}. JSON: { "type": "roleplay_start", "scene": "Descripción de la escena en Español", "start_line": "English line to start (Traducción)" }`;
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
        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.innerHTML = `<span class="text-error">Error: ${e.message}</span>`;
    }
}

// --- MANEJADORES DE RESPUESTA ---

function handleLesson(data) {
    const html = `
        <h3 class="text-xl font-bold text-primary mb-2">${data.title}</h3>
        <div class="text-sm text-secondary mb-4">${window.marked ? marked.parse(data.content_markdown) : data.content_markdown}</div>
        <div class="bg-neutral p-3 rounded-lg">
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
        <button onclick="document.querySelector('[data-action=\\'quiz\\']').click()" class="mt-4 w-full py-3 bg-primary text-white rounded-lg font-bold text-sm shadow-md hover:bg-blue-600 transition-colors">Hacer un Quiz</button>
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
    updateTopicProgress(state.levelIdx, state.topicIdx, { lessonsRead: (progress.lessonsRead || 0) + 1 });
    checkRoleplayLock();
}

function handleQuiz(data) {
    currentQuizData = data;
    let html = `<div class="quiz-container bg-white p-2 rounded-lg border border-gray-100">`;
    
    html += `<div class="flex items-center gap-2 mb-3"><span class="bg-accent text-white px-2 py-1 rounded text-xs font-bold uppercase">Quiz</span></div>`;

    // ESTILOS DE BOTONES (INLINE para asegurar que se vean bien)
    const btnStyle = "display: block; width: 100%; text-align: left; padding: 12px 16px; margin-bottom: 8px; background: white; border: 1px solid #E2E8F0; border-radius: 12px; color: #1E293B; font-weight: 600; font-size: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: all 0.2s;";

    switch(data.quiz_type) {
        case 'true_false':
            html += `
                <p class="font-bold text-lg mb-2 text-center text-primary">"${data.statement}"</p>
                <p class="text-center text-gray-400 text-xs mb-4 uppercase font-bold">¿Verdadero o Falso?</p>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="window.submitQuiz('true')" style="${btnStyle} text-align: center; background: #DCFCE7; color: #166534; border-color: #86EFAC;">VERDADERO</button>
                    <button onclick="window.submitQuiz('false')" style="${btnStyle} text-align: center; background: #FEE2E2; color: #991B1B; border-color: #FCA5A5;">FALSO</button>
                </div>
            `;
            break;

        case 'fill_blank':
            html += `
                <p class="text-center mb-2 text-lg text-primary">
                    ${data.sentence_start} 
                    <span id="blank-space" class="inline-block w-24 border-b-4 border-primary text-center font-bold text-primary mx-1">____</span> 
                    ${data.sentence_end}
                </p>
                <p class="text-center text-sm text-gray-400 italic mb-4">${data.translation_hint || ''}</p>
                <div class="flex flex-wrap gap-2 justify-center">
                    ${data.options.map(opt => `
                        <button onclick="window.submitQuiz('${opt}')" class="px-4 py-2 bg-gray-100 hover:bg-blue-100 text-primary font-bold rounded-full border border-gray-200 transition-colors">${opt}</button>
                    `).join('')}
                </div>
            `;
            break;

        case 'order_sentence':
            quizState.constructedSentence = [];
            const shuffled = [...data.words].sort(() => Math.random() - 0.5);
            html += `
                <p class="text-xs text-gray-400 text-center mb-2 uppercase font-bold">Ordena la frase:</p>
                <p class="text-center text-sm italic text-gray-500 mb-4">"${data.translation}"</p>
                
                <div id="sentence-builder" class="min-h-[3rem] bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 mb-4 flex flex-wrap gap-2 p-3 justify-center items-center transition-colors"></div>
                
                <div id="word-bank" class="flex flex-wrap gap-2 justify-center">
                    ${shuffled.map((word, idx) => `
                        <button id="word-${idx}" onclick="window.addToSentence('${word}', 'word-${idx}')" class="px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm font-bold text-primary active:scale-95 transition-transform">${word}</button>
                    `).join('')}
                </div>
                <div class="flex gap-2 mt-4">
                    <button onclick="window.resetSentence()" class="flex-1 py-2 text-gray-400 text-xs font-bold hover:text-gray-600">Reiniciar</button>
                    <button onclick="window.checkOrder()" class="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-md active:scale-95 transition-transform">Comprobar</button>
                </div>
            `;
            break;

        case 'matching':
            quizState.selectedPair = null;
            quizState.correctMatches = 0;
            const leftCol = data.pairs.map((p, i) => ({val: p.en, id: i})).sort(() => Math.random() - 0.5);
            const rightCol = data.pairs.map((p, i) => ({val: p.es, id: i})).sort(() => Math.random() - 0.5);
            
            html += `
                <p class="text-xs text-center text-gray-400 mb-3 uppercase font-bold">Empareja las palabras</p>
                <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col gap-2">
                        ${leftCol.map(item => `<button onclick="window.selectMatch('${item.val}', ${item.id}, this)" class="match-btn w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-primary text-sm shadow-sm transition-all" data-side="left">${item.val}</button>`).join('')}
                    </div>
                    <div class="flex flex-col gap-2">
                        ${rightCol.map(item => `<button onclick="window.selectMatch('${item.val}', ${item.id}, this)" class="match-btn w-full p-3 bg-white border border-gray-200 rounded-xl text-gray-600 text-sm shadow-sm transition-all" data-side="right">${item.val}</button>`).join('')}
                    </div>
                </div>
            `;
            break;

        default: // Multiple Choice
            html += `
                <p class="font-bold mb-4 text-lg text-primary leading-snug">${data.question}</p>
                <div class="flex flex-col gap-2">
                    ${data.options.map((opt, idx) => `
                        <button onclick="window.submitQuiz(${idx})" style="${btnStyle}">${opt}</button>
                    `).join('')}
                </div>
            `;
    }
    
    html += `</div>`;
    addMessageToUI(html, 'bot');
}

// --- VALIDACIÓN DE QUIZZES (Globales para HTML inyectado) ---

window.submitQuiz = (answer) => {
    const data = currentQuizData;
    let isCorrect = false;
    let correctText = "";

    if (data.quiz_type === 'true_false') {
        const boolAns = answer === 'true';
        isCorrect = boolAns === data.is_true;
        correctText = data.is_true ? "Verdadero" : "Falso";
    } 
    else if (data.quiz_type === 'fill_blank') {
        isCorrect = answer === data.hidden_word;
        correctText = data.hidden_word;
        if(isCorrect) document.getElementById('blank-space').innerText = answer;
    }
    else { // Multiple choice
        isCorrect = answer === data.answer_index;
        correctText = data.options[data.answer_index];
    }

    showResult(isCorrect, correctText);
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
    showResult(isCorrect, currentQuizData.sentence);
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

        if (first.id === id) {
            // MATCH
            const successStyle = "background: #DCFCE7; color: #166534; border-color: #86EFAC; opacity: 0.6;";
            first.btn.style.cssText = successStyle;
            btn.style.cssText = successStyle;
            first.btn.disabled = true;
            btn.disabled = true;
            
            quizState.correctMatches++;
            quizState.selectedPair = null;
            
            if (quizState.correctMatches >= currentQuizData.pairs.length) {
                showResult(true, "Todas las parejas");
            }
        } else {
            // ERROR
            first.btn.classList.add('bg-red-100', 'border-red-200');
            btn.classList.add('bg-red-100', 'border-red-200');
            
            setTimeout(() => {
                first.btn.classList.remove('bg-red-100', 'border-red-200');
                btn.classList.remove('bg-red-100', 'border-red-200');
                
                // Reset first button style
                first.btn.style.borderColor = '#E2E8F0';
                first.btn.style.backgroundColor = 'white';
                first.btn.style.transform = 'scale(1)';
            }, 500);
            
            quizState.selectedPair = null;
        }
    }
};

function showResult(isCorrect, correctAnswer) {
    const state = getState();
    
    if (isCorrect) {
        updateState({ score: state.score + 15 });
        triggerConfetti();
        addMessageToUI(`<div class="text-green-600 font-black text-center text-xl p-2">¡Correcto! 🎉 <br><span class="text-sm font-medium text-gray-400">+15 Puntos</span></div>`, 'bot');
        
        updateTopicProgress(state.levelIdx, state.topicIdx, { highestQuizScore: 100 });
        checkRoleplayLock();
        
    } else {
        addMessageToUI(`<div class="text-red-500 font-bold text-center p-2">Incorrecto 😅 <br><div class="mt-2 p-2 bg-red-50 rounded text-sm text-gray-700 border border-red-100">Respuesta correcta:<br><strong>"${correctAnswer}"</strong></div></div>`, 'bot');
    }
}

function addMessageToUI(html, role, animate = true) {
    const div = document.createElement('div');
    div.className = `flex gap-3 ${animate ? 'fade-in-up' : ''} mb-4`;
    div.id = 'msg-' + Date.now();
    
    const content = `
        <div class="${role === 'bot' ? 'w-8 h-8 bg-primary' : 'hidden'} rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md">
            ${role === 'bot' ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>' : ''}
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
    const currentLevel = SYLLABUS[state.levelIdx];
    
    if (state.topicIdx < currentLevel.topics.length - 1) {
        updateState({ topicIdx: state.topicIdx + 1 });
        showToast(`Tema: ${currentLevel.topics[state.topicIdx + 1]}`);
    } else {
        if(state.levelIdx < SYLLABUS.length - 1) {
            updateState({ levelIdx: state.levelIdx + 1, topicIdx: 0 });
            showToast(`¡Nivel ${SYLLABUS[state.levelIdx + 1].name} desbloqueado!`);
            triggerConfetti();
        } else {
            showToast("¡Curso completado! 🎓");
        }
    }
    document.dispatchEvent(new CustomEvent('stateChanged'));
    checkRoleplayLock();
}

function handleRoleplay(data) {
    const html = `
        <div class="bg-neutral p-4 rounded-xl border border-gray-200">
            <div class="flex items-center gap-2 mb-2">
                <span class="text-2xl">🎭</span>
                <h3 class="font-bold text-primary">Roleplay</h3>
            </div>
            <p class="text-sm mb-3 text-gray-700">${data.scene}</p>
            <div class="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
                <span class="font-bold text-primary text-lg">${data.start_line.split('(')[0]}</span>
                <div id="rp-audio-${Date.now()}"></div>
            </div>
            <p class="text-xs text-gray-400 mt-2 italic">${data.start_line.split('(')[1]?.replace(')', '') || ''}</p>
        </div>
        <p class="text-center text-xs text-gray-400 mt-2 font-bold uppercase tracking-wide">Presiona el micrófono para responder</p>
    `;
    
    const msgId = addMessageToUI(html, 'bot');
    
    setTimeout(() => {
        const btnContainer = document.querySelector(`#${msgId} div[id^="rp-audio-"]`);
        if(btnContainer) {
            btnContainer.appendChild(createAudioButton(data.start_line.split('(')[0], 'en-US'));
        }
    }, 100);
}