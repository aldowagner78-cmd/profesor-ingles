// Módulo de Chat
import { callGemini } from '../services/gemini.js';
import { speakText, startListening, stopListening } from '../services/voice.js';
import { showToast, triggerConfetti, createAudioButton } from '../utils/ui.js';
import { isEnglishText, extractEnglishOnly } from '../utils/helpers.js';
import { getState, updateState, markTopicCompleted } from '../state.js';
import { SYLLABUS, CONFIG } from '../config.js';

const MAX_HISTORY = 10;

// ============================================
// ESTADO CONVERSACIONAL Y DETECCIÓN DE INTENCIONES
// ============================================

// Estado del contexto conversacional
let conversationContext = {
    lastAction: null,        // 'lesson', 'quiz', 'roleplay'
    lastTopic: null,         // Ej: "Present Simple"
    quizCount: 0,
    canContinue: false
};

// Sistema de detección de intenciones (NLU básico)
function detectIntent(userMessage) {
    const msg = userMessage.toLowerCase();
    
    // Regex patterns para intenciones
    if (/explica|enseña|lección|leccion|qué es|que es|cómo funciona|como funciona|teoría|teoria/i.test(msg)) {
        return { intent: 'lesson', confidence: 0.9 };
    }
    if (/quiz|ejercicio|pregunta|preguntas|prueba|evalúa|evalua|test|más preguntas|mas preguntas/i.test(msg)) {
        return { intent: 'quiz', confidence: 0.9 };
    }
    if (/roleplay|practica|práctica|conversación|conversacion|simula|actúa|actua/i.test(msg)) {
        return { intent: 'roleplay', confidence: 0.9 };
    }
    if (/continúa|continua|siguiente|otro|otra|más|mas|otra vez/i.test(msg)) {
        return { intent: 'continue', confidence: 0.8 };
    }
    if (/ejemplo|ejemplos|muestra|dame más|dame mas/i.test(msg)) {
        return { intent: 'more_examples', confidence: 0.8 };
    }
    
    return { intent: 'chat', confidence: 0.5 };
}

export function initChat() {
    console.log("Inicializando Chat...");
    
    // Botón Enviar
    document.getElementById('send-btn')?.addEventListener('click', sendTextMsg);
    
    // Enter en input
    const chatInput = document.getElementById('chat-input');
    chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendTextMsg();
    });
    
    // Micrófono (Toggle)
    const micBtn = document.getElementById('mic-btn');
    micBtn?.addEventListener('click', toggleMicrophone);
    
    // Botones de Acción
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (action) handleAction(action);
        });
    });
    
    // Restaurar historial
    renderHistory();
}

function renderHistory() {
    const state = getState();
    if (state.chatHistory && state.chatHistory.length > 0) {
        state.chatHistory.forEach(msg => {
            addMessageToUI(msg.content, msg.role, false);
        });
    }
}

function toggleMicrophone() {
    const micBtn = document.getElementById('mic-btn');
    const micStatus = document.getElementById('mic-status');
    
    if (!micBtn || !micStatus) return;
    
    const isActive = micBtn.classList.contains('mic-active');
    
    if (isActive) {
        stopListening();
        micBtn.classList.remove('mic-active');
        micStatus.textContent = 'Toca para hablar';
    } else {
        micBtn.classList.add('mic-active');
        micStatus.textContent = 'Escuchando...';
        
        startListening(
            (text) => {
                // onResult
                if (roleplayState.active) {
                    // Modo roleplay: evaluar respuesta
                    evaluateRoleplayResponse(text);
                } else {
                    // Modo chat normal
                    const input = document.getElementById('chat-input');
                    if (input) input.value = text;
                    sendTextMsg();
                }
            },
            () => {
                // onEnd
                micBtn.classList.remove('mic-active');
                micStatus.textContent = 'Toca para hablar';
            },
            'en-US' // Escuchar en inglés
        );
    }
}

async function evaluateRoleplayResponse(userSpeech) {
    // Mostrar lo que dijo el usuario
    addMessageToUI(`<p style="font-style: italic;">"${userSpeech}"</p>`, 'user');
    
    const loadingId = addMessageToUI('Evaluando...', 'bot');
    
    try {
        const state = getState();
        const currentLevel = SYLLABUS[state.levelIdx];
        const currentTopic = currentLevel.topics[state.topicIdx];
        
        const prompt = `
            You are an English Teacher API evaluating a roleplay response.
            Topic: ${currentTopic}
            Level: ${currentLevel.name}
            Turn: ${roleplayState.turnNumber}/${roleplayState.totalTurns}
            Last bot speech: "${roleplayState.lastBotSpeech}"
            User response: "${userSpeech}"
            
            Task: Evaluate the user's response and provide feedback.
            
            Respond STRICTLY in JSON format:
            {
                "type": "roleplay_feedback",
                "is_correct": true or false,
                "user_said": "${userSpeech}",
                "feedback_es": "Detailed feedback in Spanish",
                "correct_example": "Correct example in English" (if is_correct is false),
                "suggestion_es": "Helpful tip in Spanish",
                "allow_retry": true or false
            }
            
            If is_correct is true and turn < total_turns, also include:
            {
                "type": "roleplay_continue",
                "bot_speech": "Next phrase to continue the conversation",
                "turn_number": ${roleplayState.turnNumber + 1}
            }
            
            Return roleplay_feedback first, then roleplay_continue if applicable.
        `;
        
        const data = await callGemini(prompt);
        
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        
        // Manejar feedback
        if (data.type === 'roleplay_feedback') {
            handleRoleplayFeedback(data);
            
            // Si fue correcto y hay más turnos, continuar
            if (data.is_correct && roleplayState.turnNumber < roleplayState.totalTurns) {
                setTimeout(async () => {
                    // Pedir siguiente turno
                    const continuePrompt = `
                        Continue roleplay.
                        Topic: ${currentTopic}
                        Turn: ${roleplayState.turnNumber + 1}/${roleplayState.totalTurns}
                        Last user said: "${userSpeech}"
                        
                        JSON type "roleplay_continue", "bot_speech": "Next phrase", "turn_number": ${roleplayState.turnNumber + 1}
                    `;
                    
                    const continueData = await callGemini(continuePrompt);
                    if (continueData.type === 'roleplay_continue') {
                        handleRoleplayContinue(continueData);
                    }
                }, 1500);
            }
        }
        
    } catch (e) {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            loadingEl.querySelector('.message-bubble').innerHTML = `
                <span style="color: #EF4444; font-weight: 700;">Error: ${e.message}</span>
            `;
        }
    }
}

async function sendTextMsg() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    // UI: Mostrar mensaje del usuario
    addMessageToUI(text, 'user');
    input.value = '';
    
    // Detectar intención del usuario
    const detected = detectIntent(text);
    const state = getState();
    
    // Guardar en historial
    let history = state.chatHistory || [];
    history.push({ role: 'user', content: text });
    updateState({ chatHistory: history.slice(-MAX_HISTORY * 2) });
    
    try {
        if (detected.intent === 'lesson') {
            // Usuario quiere una lección
            conversationContext.lastAction = 'lesson';
            conversationContext.canContinue = true;
            await handleAction('lesson', text);
        } 
        else if (detected.intent === 'quiz') {
            // Usuario quiere un quiz
            conversationContext.lastAction = 'quiz';
            conversationContext.quizCount = 1;
            conversationContext.canContinue = true;
            await handleAction('quiz');
        } 
        else if (detected.intent === 'roleplay') {
            // Usuario quiere roleplay
            conversationContext.lastAction = 'roleplay';
            conversationContext.canContinue = false;
            await handleAction('roleplay');
        }
        else if (detected.intent === 'continue') {
            // Usuario quiere continuar con la última acción
            await handleContinuation();
        }
        else if (detected.intent === 'more_examples') {
            // Usuario quiere más ejemplos
            await handleMoreExamples();
        }
        else {
            // Chat conversacional inteligente (fallback)
            await handleSmartChat(text, history);
        }
    } catch (error) {
        console.error("Error en flujo conversacional:", error);
        addMessageToUI(`<span style="color: #EF4444;">Error al procesar tu solicitud: ${error.message}</span>`, 'bot');
    }
}

// Manejar continuación ("otra pregunta", "más", "continúa")
async function handleContinuation() {
    const lastAction = conversationContext.lastAction;
    
    if (!lastAction || !conversationContext.canContinue) {
        addMessageToUI(`<span style="color: #64748B;">No hay actividad previa para continuar. Puedes pedirme:</span>
            <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: #64748B;">
                <li>"Dame una lección sobre verbos"</li>
                <li>"Quiero un quiz de vocabulario"</li>
                <li>"Practica conversación conmigo"</li>
            </ul>`, 'bot');
        return;
    }
    
    if (lastAction === 'quiz') {
        conversationContext.quizCount++;
        await handleAction('quiz');
    } else if (lastAction === 'lesson') {
        await handleAction('lesson', conversationContext.lastTopic || 'topic related');
    } else {
        addMessageToUI(`<span style="color: #64748B;">No puedo continuar con ${lastAction}. Prueba con una nueva actividad.</span>`, 'bot');
    }
}

// Manejar solicitud de más ejemplos
async function handleMoreExamples() {
    const lastTopic = conversationContext.lastTopic;
    
    if (!lastTopic) {
        addMessageToUI(`<span style="color: #64748B;">No tengo tema previo. ¿Sobre qué quieres más ejemplos?</span>`, 'bot');
        return;
    }
    
    conversationContext.lastAction = 'lesson';
    conversationContext.canContinue = true;
    await handleAction('lesson', `More examples about ${lastTopic}`);
}

// Chat conversacional inteligente (fallback)
async function handleSmartChat(text, history) {
    const loadingId = addMessageToUI('...', 'bot');
    
    try {
        const state = getState();
        const currentLevel = SYLLABUS[state.levelIdx];
        const currentTopic = currentLevel.topics[state.topicIdx];
        
        const contextStr = history.slice(-MAX_HISTORY).map(h => `${h.role}: ${h.content}`).join('\n');
        
        const prompt = `
            You are an English Teacher API with conversational capabilities.
            Current Level: ${currentLevel.name}
            Current Topic: ${currentTopic}
            
            Chat History:
            ${contextStr}
            
            Task: Respond naturally to the user's message. Provide helpful English teaching feedback.
            Respond STRICTLY in JSON format:
            {
                "type": "chat",
                "reply": "Your response in English",
                "feedback": "Pedagogical feedback in Spanish (grammar, vocabulary tips)",
                "correction": "Grammar correction if needed, or null"
            }
        `;
        
        const data = await callGemini(prompt);
        
        // Remover loading
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        
        // Guardar respuesta en historial
        if (data.reply) {
            history.push({ role: 'bot', content: data.reply });
            updateState({ chatHistory: history.slice(-MAX_HISTORY * 2) });
        }
        
        handleChatResponse(data);
        
    } catch (e) {
        console.error(e);
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            loadingEl.querySelector('.message-bubble').innerHTML = `
                <span style="color: #EF4444; font-weight: 700;">Error: ${e.message}</span>
            `;
        }
    }
}

function handleChatResponse(data) {
    let html = '';
    
    if (data.correction) {
        html += `<div style="background: #FEE2E2; padding: 0.5rem; border-radius: 0.5rem; margin-bottom: 0.5rem; font-size: 0.75rem; color: #991B1B;">
            <strong>Corrección:</strong> ${data.correction}
        </div>`;
    }
    
    if (data.feedback) {
        html += `<div style="font-size: 0.875rem; color: #64748B; margin-bottom: 0.75rem;">
            ${data.feedback}
        </div>`;
    }
    
    if (data.reply) {
        html += `<div style="font-size: 1rem; font-weight: 600; color: #1E293B; display: flex; align-items: center; gap: 0.5rem;">
            <span>${data.reply}</span>
            <span id="reply-audio-btn"></span>
        </div>`;
    }
    
    const msgId = addMessageToUI(html, 'bot');
    
    // Agregar botón de audio (SIN reproducción automática)
    if (data.reply) {
        const audioContainer = document.querySelector(`#${msgId} #reply-audio-btn`);
        if (audioContainer) {
            const audioBtn = createAudioButton(data.reply, 'en-US');
            audioContainer.appendChild(audioBtn);
            if (window.lucide) window.lucide.createIcons();
        }
    }
}

async function handleAction(action) {
    const state = getState();
    const currentLevel = SYLLABUS[state.levelIdx];
    const currentTopic = currentLevel.topics[state.topicIdx];
    
    const loadingId = addMessageToUI('Generando...', 'bot');
    
    try {
        let prompt = '';
        
        if (action === 'lesson') {
            prompt = `
                You are an English Teacher API.
                Level: ${currentLevel.name}
                Topic: ${currentTopic}
                
                Task: Generate a lesson explanation.
                - Explanation in Spanish
                - Examples in BILINGUAL format: "English (Español)"
                - Use Markdown formatting
                - ALWAYS include Spanish translation in parentheses after English text
                
                Respond STRICTLY in JSON format:
                {
                    "type": "lesson",
                    "title": "Lesson title",
                    "content_markdown": "# Title\\n\\nExplanation in Spanish...\\n\\n## Examples\\n- Good morning (Buenos días)\\n- Good night (Buenas noches)"
                }
            `;
        } else if (action === 'quiz') {
            prompt = `
                You are an English Teacher API.
                Topic: ${currentTopic}
                
                Task: Generate a multiple choice question to test English knowledge.
                - Question must be in SPANISH asking about English usage
                - All options must be objects with English text AND Spanish translation
                - Format: {"en": "English text", "es": "Traducción"}
                - Example: "¿Cómo se dice 'Buenos días' en inglés?" with options [{"en": "Good morning", "es": "Buenos días"}, {"en": "Good night", "es": "Buenas noches"}, ...]
                
                Respond STRICTLY in JSON format:
                {
                    "type": "quiz",
                    "question": "Question in Spanish about English",
                    "options": [
                        {"en": "English Option A", "es": "Traducción A"},
                        {"en": "English Option B", "es": "Traducción B"},
                        {"en": "English Option C", "es": "Traducción C"},
                        {"en": "English Option D", "es": "Traducción D"}
                    ],
                    "answer_index": 0
                }
            `;
        } else if (action === 'roleplay') {
            // Iniciar nueva escena de roleplay
            prompt = `
                You are an English Teacher API.
                Topic: ${currentTopic}
                Level: ${currentLevel.name}
                
                Task: Start an interactive roleplay scenario with step-by-step evaluation.
                Respond STRICTLY in JSON format:
                {
                    "type": "roleplay_start",
                    "scene_description": "Brief scenario description in Spanish (2-3 sentences, text only)",
                    "bot_speech": "Opening phrase in English to start the conversation",
                    "expected_responses": ["Example response 1", "Example response 2"],
                    "turn_number": 1,
                    "total_turns": 5
                }
            `;
        } else if (action === 'next') {
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();
            nextTopic();
            return;
        }
        
        const data = await callGemini(prompt);
        
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        
        if (data.type === 'lesson') {
            handleLessonResponse(data);
        } else if (data.type === 'quiz') {
            handleQuizResponse(data);
        } else if (data.type === 'chat') {
            handleChatResponse(data);
        } else if (data.type === 'roleplay_start') {
            handleRoleplayStart(data);
        } else if (data.type === 'roleplay_feedback') {
            handleRoleplayFeedback(data);
        } else if (data.type === 'roleplay_continue') {
            handleRoleplayContinue(data);
        }
        
    } catch (e) {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            loadingEl.querySelector('.message-bubble').innerHTML = `
                <span style="color: #EF4444; font-weight: 700;">Error: ${e.message}</span>
            `;
        }
    }
}

function handleLessonResponse(data) {
    const content = window.marked ? window.marked.parse(data.content_markdown || '') : data.content_markdown;
    
    // Crear tarjeta de lección que ocupa todo el ancho
    const lessonCard = document.createElement('div');
    lessonCard.className = 'lesson-card-full';
    lessonCard.style.cssText = `
        width: 100vw;
        margin-left: calc(-1 * var(--spacing-lg));
        margin-right: calc(-1 * var(--spacing-lg));
        margin-top: 1rem;
        margin-bottom: 1rem;
        background: linear-gradient(135deg, #FFF1EB 0%, #E8F4FD 100%);
        border-radius: 0;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        border-top: 2px solid rgba(74, 144, 226, 0.3);
        border-bottom: 2px solid rgba(74, 144, 226, 0.3);
    `;
    
    lessonCard.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; border-bottom: 2px solid rgba(74, 144, 226, 0.2); padding-bottom: 0.75rem;">
            <div style="width: 2.5rem; height: 2.5rem; background: #4A90E2; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
            </div>
            <h3 style="font-weight: 900; font-size: 1.25rem; color: #1E293B; margin: 0;">${data.title || 'Lección'}</h3>
        </div>
        <div class="lesson-content" style="font-size: 0.95rem; line-height: 1.8; color: #334155;">
            ${content}
        </div>
    `;
    
    // Agregar directamente al chat area (no como mensaje)
    const chatArea = document.getElementById('chat-area');
    if (chatArea) {
        chatArea.appendChild(lessonCard);
        chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    const msgId = `lesson-${Date.now()}`;
    lessonCard.id = msgId;
    
    // Agregar botones de audio SOLO a texto en inglés puro
    setTimeout(() => {
        const lessonContent = lessonCard.querySelector('.lesson-content');
        if (lessonContent) {
            // Buscar elementos que potencialmente contengan inglés
            const elements = lessonContent.querySelectorAll('li, code, strong, p, em, blockquote');
            
            elements.forEach(element => {
                // Saltar si ya tiene botón
                if (element.querySelector('.audio-btn')) return;
                
                const text = element.textContent.trim();
                
                // Intentar extraer solo la parte en inglés (maneja textos mixtos)
                const englishText = extractEnglishOnly(text);
                
                if (englishText) {
                    // Si el texto original es 100% inglés, agregar botón al final
                    if (isEnglishText(text)) {
                        const audioBtn = createAudioButton(englishText, 'en-US');
                        audioBtn.className = 'audio-btn';
                        audioBtn.style.display = 'inline-flex';
                        audioBtn.style.verticalAlign = 'middle';
                        audioBtn.style.marginLeft = '0.5rem';
                        element.appendChild(audioBtn);
                    } else {
                        // Si es texto mixto (ej: "Hello (Hola)"), crear un wrapper solo para la parte en inglés
                        const textContent = element.innerHTML;
                        const englishEscaped = englishText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        
                        // Buscar la parte en inglés y agregarle el botón
                        const pattern = new RegExp(`(${englishEscaped})(?=\\s*[\\(—–:-])`, 'i');
                        if (pattern.test(textContent)) {
                            const newContent = textContent.replace(pattern, (match) => {
                                const audioBtn = createAudioButton(englishText, 'en-US');
                                audioBtn.className = 'audio-btn';
                                audioBtn.style.display = 'inline-flex';
                                audioBtn.style.verticalAlign = 'middle';
                                audioBtn.style.marginLeft = '0.5rem';
                                
                                const wrapper = document.createElement('span');
                                wrapper.innerHTML = match;
                                wrapper.appendChild(audioBtn);
                                return wrapper.outerHTML;
                            });
                            element.innerHTML = newContent;
                        }
                    }
                }
            });
            
            if (window.lucide) window.lucide.createIcons();
        }
    }, 100);
}

function handleQuizResponse(data) {
    const html = `
        <div style="background: #F5F3FF; padding: 1rem; border-radius: 0.75rem; border: 2px solid #DDD6FE;">
            <p style="font-weight: 700; margin-bottom: 1rem; color: #1E293B;">${data.question}</p>
            <div class="quiz-options" style="display: flex; flex-direction: column; gap: 0.5rem;">
                ${data.options.map((opt, idx) => {
                    // Soporte para formato antiguo (string) y nuevo (objeto {en, es})
                    const isObject = typeof opt === 'object';
                    const englishText = isObject ? opt.en : opt;
                    const spanishText = isObject ? opt.es : '';
                    
                    return `
                    <button class="quiz-option" data-index="${idx}" style="
                        padding: 0.75rem;
                        border: 1px solid #E2E8F0;
                        border-radius: 0.5rem;
                        background: white;
                        text-align: left;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-size: 0.875rem;
                    ">
                        <div style="font-weight: 600; color: #1E293B; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>${englishText}</span>
                            <span class="audio-button-container"></span>
                        </div>
                        ${spanishText ? `<div style="font-size: 0.75rem; color: #64748B;">(${spanishText})</div>` : ''}
                    </button>
                    `;
                }).join('')}
            </div>
            <div id="quiz-feedback" class="hidden" style="margin-top: 1rem; padding: 0.75rem; border-radius: 0.5rem; font-weight: 700;"></div>
        </div>
    `;
    
    const msgId = addMessageToUI(html, 'bot');
    
    // Agregar botones de audio para opciones en inglés
    setTimeout(() => {
        const options = document.querySelectorAll(`#${msgId} .quiz-option`);
        options.forEach((btn, idx) => {
            const opt = data.options[idx];
            const englishText = typeof opt === 'object' ? opt.en : opt;
            
            // Crear botón de audio
            const audioContainer = btn.querySelector('.audio-button-container');
            if (audioContainer) {
                const audioBtn = createAudioButton(englishText, 'en-US');
                audioBtn.style.fontSize = '0.75rem';
                audioContainer.appendChild(audioBtn);
            }
            
            // Event listeners
            btn.addEventListener('mouseenter', (e) => {
                e.currentTarget.style.background = '#F8FAFC';
                e.currentTarget.style.borderColor = '#4A90E2';
            });
            btn.addEventListener('mouseleave', (e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#E2E8F0';
            });
            btn.addEventListener('click', (e) => {
                const selectedIdx = parseInt(e.currentTarget.dataset.index);
                const feedback = document.querySelector(`#${msgId} #quiz-feedback`);
                
                // Deshabilitar todas las opciones
                options.forEach(o => o.style.pointerEvents = 'none');
                
                if (selectedIdx === data.answer_index) {
                    // Correcto
                    e.currentTarget.style.background = '#D1FAE5';
                    e.currentTarget.style.borderColor = '#10B981';
                    feedback.style.background = '#D1FAE5';
                    feedback.style.color = '#065F46';
                    feedback.textContent = '¡Correcto! 🎉 +10 puntos';
                    feedback.classList.remove('hidden');
                    
                    const state = getState();
                    updateState({ score: state.score + 10 });
                    triggerConfetti();
                } else {
                    // Incorrecto
                    e.currentTarget.style.background = '#FEE2E2';
                    e.currentTarget.style.borderColor = '#EF4444';
                    
                    // Mostrar la correcta
                    options[data.answer_index].style.background = '#D1FAE5';
                    options[data.answer_index].style.borderColor = '#10B981';
                    
                    const correctOpt = data.options[data.answer_index];
                    const correctText = typeof correctOpt === 'object' ? correctOpt.en : correctOpt;
                    
                    feedback.style.background = '#FEE2E2';
                    feedback.style.color = '#991B1B';
                    feedback.textContent = `Incorrecto. La respuesta era: ${correctText}`;
                    feedback.classList.remove('hidden');
                }
            });
        });
        
        // Inicializar iconos de Lucide para botones de audio
        if (window.lucide) window.lucide.createIcons();
    }, 100);
}

function nextTopic() {
    const state = getState();
    
    // Marcar tema actual como completado
    markTopicCompleted(state.levelIdx, state.topicIdx);
    
    const currentLevel = SYLLABUS[state.levelIdx];
    
    if (state.topicIdx < currentLevel.topics.length - 1) {
        updateState({ topicIdx: state.topicIdx + 1 });
        showToast(`Nuevo tema: ${currentLevel.topics[state.topicIdx + 1]}`, 'success');
    } else if (state.levelIdx < SYLLABUS.length - 1) {
        // Avanzar de nivel
        updateState({ 
            levelIdx: state.levelIdx + 1,
            topicIdx: 0
        });
        const newLevel = SYLLABUS[state.levelIdx + 1];
        showToast(`¡Nivel completado! Avanzas a: ${newLevel.name}`, 'success');
        triggerConfetti();
    } else {
        showToast('¡Has completado todos los niveles! 🎓', 'success');
    }
}

function addMessageToUI(html, role, animate = true) {
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const wrapper = document.createElement('div');
    wrapper.id = msgId;
    wrapper.className = `message-wrapper ${role}-wrapper`;
    if (animate) wrapper.style.animation = 'fadeInUp 0.3s ease-out';
    
    const isBot = role === 'bot';
    
    wrapper.innerHTML = `
        ${isBot ? `
            <div class="message-avatar">
                <i data-lucide="bot"></i>
            </div>
        ` : ''}
        <div class="message-bubble ${isBot ? 'bot-bubble' : 'user-bubble'}">
            ${html}
        </div>
    `;
    
    const chatArea = document.getElementById('chat-area');
    if (chatArea) {
        chatArea.appendChild(wrapper);
        chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    if (window.lucide) window.lucide.createIcons();
    
    return msgId;
}

// ============================================
// SISTEMA DE ROLEPLAY INTERACTIVO
// ============================================

let roleplayState = {
    active: false,
    turnNumber: 0,
    totalTurns: 0,
    sceneDescription: '',
    lastBotSpeech: ''
};

function handleRoleplayStart(data) {
    roleplayState = {
        active: true,
        turnNumber: data.turn_number || 1,
        totalTurns: data.total_turns || 5,
        sceneDescription: data.scene_description || '',
        lastBotSpeech: data.bot_speech || ''
    };
    
    // Tarjeta de descripción de escena (solo texto en español)
    const sceneCard = document.createElement('div');
    sceneCard.className = 'roleplay-scene-card';
    sceneCard.style.cssText = `
        width: 100vw;
        margin-left: calc(-1 * var(--spacing-lg));
        margin-right: calc(-1 * var(--spacing-lg));
        margin-top: 1rem;
        margin-bottom: 1rem;
        background: linear-gradient(135deg, #F5F3FF 0%, #FFF7ED 100%);
        border-radius: 0;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        border-top: 2px solid rgba(123, 104, 238, 0.3);
        border-bottom: 2px solid rgba(123, 104, 238, 0.3);
    `;
    
    sceneCard.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
            <div style="width: 2.5rem; height: 2.5rem; background: #7B68EE; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <div>
                <h3 style="font-weight: 900; font-size: 1.25rem; color: #1E293B; margin: 0;">🎭 Escena de Roleplay</h3>
                <p style="font-size: 0.75rem; color: #64748B; margin: 0;">Turno ${roleplayState.turnNumber} de ${roleplayState.totalTurns}</p>
            </div>
        </div>
        <p style="font-size: 0.95rem; line-height: 1.7; color: #334155; margin: 0;">
            ${roleplayState.sceneDescription}
        </p>
    `;
    
    const chatArea = document.getElementById('chat-area');
    if (chatArea) {
        chatArea.appendChild(sceneCard);
    }
    
    // Mensaje del bot con botón de audio
    const botCard = document.createElement('div');
    botCard.className = 'roleplay-bot-turn';
    botCard.style.cssText = `
        margin: 1rem 0;
        background: white;
        padding: 1rem;
        border-radius: 0.75rem;
        border: 2px solid #E8F4FD;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    `;
    
    botCard.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
            <div style="width: 2rem; height: 2rem; background: #4A90E2; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg>
            </div>
            <span style="font-size: 0.875rem; font-weight: 700; color: #64748B;">Profesor (presiona 🔊 para escuchar)</span>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
            <p style="font-size: 1.05rem; font-weight: 600; color: #1E293B; margin: 0; flex: 1;">
                ${roleplayState.lastBotSpeech}
            </p>
            <div id="roleplay-audio-btn"></div>
        </div>
    `;
    
    if (chatArea) {
        chatArea.appendChild(botCard);
        chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    // Agregar botón de audio
    setTimeout(() => {
        const audioContainer = botCard.querySelector('#roleplay-audio-btn');
        if (audioContainer) {
            const audioBtn = createAudioButton(roleplayState.lastBotSpeech, 'en-US');
            audioBtn.style.transform = 'scale(1.3)';
            audioContainer.appendChild(audioBtn);
            if (window.lucide) window.lucide.createIcons();
        }
    }, 50);
    
    // Activar botón de micrófono para respuesta del usuario
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) {
        micBtn.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
        micBtn.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.4)';
        micBtn.style.animation = 'pulse 2s infinite';
        showToast('🎤 Tu turno: Responde en inglés', 'info');
    }
}

function handleRoleplayContinue(data) {
    roleplayState.turnNumber = data.turn_number || roleplayState.turnNumber + 1;
    roleplayState.lastBotSpeech = data.bot_speech || '';
    
    // Mensaje del bot con botón de audio
    const botCard = document.createElement('div');
    botCard.className = 'roleplay-bot-turn';
    botCard.style.cssText = `
        margin: 1rem 0;
        background: white;
        padding: 1rem;
        border-radius: 0.75rem;
        border: 2px solid #E8F4FD;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    `;
    
    botCard.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
            <div style="width: 2rem; height: 2rem; background: #4A90E2; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg>
            </div>
            <span style="font-size: 0.875rem; font-weight: 700; color: #64748B;">Profesor (Turno ${roleplayState.turnNumber}/${roleplayState.totalTurns})</span>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
            <p style="font-size: 1.05rem; font-weight: 600; color: #1E293B; margin: 0; flex: 1;">
                ${roleplayState.lastBotSpeech}
            </p>
            <div id="roleplay-audio-btn-${Date.now()}"></div>
        </div>
    `;
    
    const chatArea = document.getElementById('chat-area');
    if (chatArea) {
        chatArea.appendChild(botCard);
        chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    // Agregar botón de audio
    const audioId = `roleplay-audio-btn-${Date.now()}`;
    setTimeout(() => {
        const audioContainer = botCard.querySelector(`#${audioId}`);
        if (audioContainer) {
            const audioBtn = createAudioButton(roleplayState.lastBotSpeech, 'en-US');
            audioBtn.style.transform = 'scale(1.3)';
            audioContainer.appendChild(audioBtn);
            if (window.lucide) window.lucide.createIcons();
        }
    }, 50);
    
    // Activar micrófono
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) {
        micBtn.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
        micBtn.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.4)';
        showToast('🎤 Tu turno: Responde en inglés', 'info');
    }
    
    // Si es el último turno, mostrar mensaje de finalización
    if (roleplayState.turnNumber >= roleplayState.totalTurns) {
        setTimeout(() => {
            showToast('🎉 ¡Roleplay completado!', 'success');
            roleplayState.active = false;
        }, 1000);
    }
}

function handleRoleplayFeedback(data) {
    const feedbackCard = document.createElement('div');
    feedbackCard.className = 'roleplay-feedback';
    
    const isCorrect = data.is_correct !== false;
    
    feedbackCard.style.cssText = `
        margin: 1rem 0;
        background: ${isCorrect ? 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)' : 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)'};
        padding: 1rem;
        border-radius: 0.75rem;
        border: 2px solid ${isCorrect ? '#10B981' : '#EF4444'};
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    `;
    
    let feedbackHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
            <div style="font-size: 1.5rem;">${isCorrect ? '✅' : '❌'}</div>
            <span style="font-size: 0.875rem; font-weight: 700; color: #1E293B;">
                ${isCorrect ? '¡Muy bien!' : 'Necesitas mejorar esto'}
            </span>
        </div>
    `;
    
    if (data.user_said) {
        feedbackHTML += `
            <p style="font-size: 0.85rem; color: #64748B; margin-bottom: 0.5rem;">
                <strong>Dijiste:</strong> "${data.user_said}"
            </p>
        `;
    }
    
    if (data.feedback_es) {
        feedbackHTML += `
            <p style="font-size: 0.95rem; color: #1E293B; margin-bottom: 0.75rem;">
                ${data.feedback_es}
            </p>
        `;
    }
    
    if (data.correct_example) {
        feedbackHTML += `
            <div style="background: white; padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 0.75rem;">
                <p style="font-size: 0.75rem; color: #64748B; margin: 0 0 0.25rem 0; text-transform: uppercase; font-weight: 700;">Ejemplo correcto:</p>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <p style="font-size: 1rem; font-weight: 600; color: #10B981; margin: 0; flex: 1;">
                        ${data.correct_example}
                    </p>
                    <div id="feedback-audio-${Date.now()}"></div>
                </div>
            </div>
        `;
    }
    
    if (data.suggestion_es) {
        feedbackHTML += `
            <p style="font-size: 0.85rem; color: #64748B; margin: 0; font-style: italic;">
                💡 ${data.suggestion_es}
            </p>
        `;
    }
    
    if (data.allow_retry) {
        feedbackHTML += `
            <button id="roleplay-retry-btn" style="
                margin-top: 0.75rem;
                padding: 0.5rem 1rem;
                background: #7B68EE;
                color: white;
                border: none;
                border-radius: 0.5rem;
                font-weight: 700;
                font-size: 0.875rem;
                cursor: pointer;
            ">🔄 Reintentar</button>
        `;
    }
    
    feedbackCard.innerHTML = feedbackHTML;
    
    const chatArea = document.getElementById('chat-area');
    if (chatArea) {
        chatArea.appendChild(feedbackCard);
        chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    // Agregar botón de audio para el ejemplo correcto
    if (data.correct_example) {
        const audioId = `feedback-audio-${Date.now()}`;
        setTimeout(() => {
            const audioContainer = feedbackCard.querySelector(`#${audioId}`);
            if (audioContainer) {
                const audioBtn = createAudioButton(data.correct_example, 'en-US');
                audioContainer.appendChild(audioBtn);
                if (window.lucide) window.lucide.createIcons();
            }
        }, 50);
    }
    
    // Botón de reintentar
    if (data.allow_retry) {
        setTimeout(() => {
            const retryBtn = feedbackCard.querySelector('#roleplay-retry-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    showToast('🎤 Intenta de nuevo', 'info');
                    const micBtn = document.getElementById('mic-btn');
                    if (micBtn) {
                        micBtn.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
                        micBtn.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.4)';
                    }
                });
            }
        }, 50);
    }
}

