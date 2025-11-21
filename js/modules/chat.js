// Módulo de Chat
import { callGemini } from '../services/gemini.js';
import { speakText, startListening, stopListening } from '../services/voice.js';
import { showToast, triggerConfetti, createAudioButton } from '../utils/ui.js';
import { getState, updateState, markTopicCompleted } from '../state.js';
import { SYLLABUS, CONFIG } from '../config.js';

const MAX_HISTORY = 10;

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
                const input = document.getElementById('chat-input');
                if (input) input.value = text;
                sendTextMsg();
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

async function sendTextMsg() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    // UI Usuario
    addMessageToUI(text, 'user');
    input.value = '';
    
    // Guardar en historial
    const state = getState();
    let history = state.chatHistory || [];
    history.push({ role: 'user', content: text });
    
    // Loading
    const loadingId = addMessageToUI('...', 'bot');
    
    try {
        const currentLevel = SYLLABUS[state.levelIdx];
        const currentTopic = currentLevel.topics[state.topicIdx];
        
        const contextStr = history.slice(-MAX_HISTORY).map(h => `${h.role}: ${h.content}`).join('\n');
        
        const prompt = `
            You are an English Teacher API.
            Current Level: ${currentLevel.name}
            Current Topic: ${currentTopic}
            
            Chat History:
            ${contextStr}
            
            Task: Evaluate the user's message. Provide feedback and continue the conversation.
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
    
    // Audio automático del reply
    if (data.reply) {
        speakText(data.reply, 'en-US');
        
        // Agregar botón de audio
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
                - Examples in English
                - Use Markdown formatting
                
                Respond STRICTLY in JSON format:
                {
                    "type": "lesson",
                    "title": "Lesson title",
                    "content_markdown": "# Title\\n\\nExplanation in Spanish...\\n\\n## Examples\\n- Example 1 in English\\n- Example 2 in English"
                }
            `;
        } else if (action === 'quiz') {
            prompt = `
                You are an English Teacher API.
                Topic: ${currentTopic}
                
                Task: Generate a multiple choice question to test English knowledge.
                - Question must be in SPANISH asking about English usage
                - All options must be in ENGLISH
                - Example: "¿Cómo se dice 'Buenos días' en inglés?" with options ["Good morning", "Good night", "Good afternoon", "Hello"]
                
                Respond STRICTLY in JSON format:
                {
                    "type": "quiz",
                    "question": "Question in Spanish about English",
                    "options": ["English Option A", "English Option B", "English Option C", "English Option D"],
                    "answer_index": 0
                }
            `;
        } else if (action === 'roleplay') {
            prompt = `
                You are an English Teacher API.
                Topic: ${currentTopic}
                
                Task: Start a roleplay scenario.
                Respond STRICTLY in JSON format:
                {
                    "type": "chat",
                    "reply": "Opening phrase in English to start the roleplay",
                    "feedback": "Instructions for the user in Spanish (what they should do)",
                    "correction": null
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
    
    const html = `
        <div style="background: linear-gradient(135deg, #FFF1EB 0%, #E8F4FD 100%); padding: 1rem; border-radius: 0.75rem; border: 2px solid white;">
            <h3 style="font-weight: 900; margin-bottom: 1rem; color: #1E293B;">${data.title || 'Lección'}</h3>
            <div class="lesson-content" style="font-size: 0.875rem; line-height: 1.6;">
                ${content}
            </div>
        </div>
    `;
    
    const msgId = addMessageToUI(html, 'bot');
    
    // Agregar botones de audio a los ejemplos en inglés
    setTimeout(() => {
        const lessonContent = document.querySelector(`#${msgId} .lesson-content`);
        if (lessonContent) {
            // Función mejorada para detectar inglés puro
            function isEnglishText(text) {
                if (!text || text.length < 3) return false;
                
                // Remover puntuación para análisis
                const cleanText = text.replace(/[.,!?;:'"()\[\]]/g, '').trim();
                
                // Patrones que indican español
                const spanishIndicators = [
                    /á|é|í|ó|ú|ñ|¿|¡/i, // Caracteres españoles
                    /\b(el|la|los|las|un|una|de|del|al|con|por|para|como|ejemplo|explicación|significa|usa|forma|modo|verbo|sustantivo|adjetivo)\b/i
                ];
                
                // Si contiene indicadores de español, no es inglés puro
                for (const pattern of spanishIndicators) {
                    if (pattern.test(cleanText)) return false;
                }
                
                // Debe contener solo caracteres latinos básicos
                const hasOnlyBasicLatin = /^[a-zA-Z0-9\s\-'']+$/.test(cleanText);
                
                // Debe tener al menos una palabra reconocible en inglés
                const commonEnglishWords = /\b(the|a|an|is|are|was|were|have|has|had|do|does|did|can|could|will|would|should|may|might|must|I|you|he|she|it|we|they|my|your|his|her|its|our|their|this|that|these|those|what|which|who|when|where|why|how|am|be|been|being|to|from|in|on|at|by|with|about|as|into|through|during|before|after|above|below|between|under|over|of|for|and|or|but|not|no|yes|all|some|any|each|every|other|another|such|more|most|very|too|so|just|only|also|even|still|already|yet|now|then|here|there|up|down|out|off|away|back|again)\b/i;
                
                return hasOnlyBasicLatin && commonEnglishWords.test(cleanText);
            }
            
            // Buscar elementos que potencialmente contengan inglés
            const elements = lessonContent.querySelectorAll('li, code, strong, p, em');
            
            elements.forEach(element => {
                const text = element.textContent.trim();
                
                // Si el elemento es corto y es inglés puro, agregar botón
                if (isEnglishText(text) && !element.querySelector('.audio-btn')) {
                    const audioBtn = createAudioButton(text, 'en-US');
                    audioBtn.style.display = 'inline-flex';
                    audioBtn.style.verticalAlign = 'middle';
                    audioBtn.style.marginLeft = '0.5rem';
                    element.appendChild(audioBtn);
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
                ${data.options.map((opt, idx) => `
                    <button class="quiz-option" data-index="${idx}" style="
                        padding: 0.75rem;
                        border: 1px solid #E2E8F0;
                        border-radius: 0.5rem;
                        background: white;
                        text-align: left;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-size: 0.875rem;
                    ">${opt}</button>
                `).join('')}
            </div>
            <div id="quiz-feedback" class="hidden" style="margin-top: 1rem; padding: 0.75rem; border-radius: 0.5rem; font-weight: 700;"></div>
        </div>
    `;
    
    const msgId = addMessageToUI(html, 'bot');
    
    // Event listeners para las opciones
    setTimeout(() => {
        const options = document.querySelectorAll(`#${msgId} .quiz-option`);
        options.forEach(btn => {
            btn.addEventListener('mouseenter', (e) => {
                e.target.style.background = '#F8FAFC';
                e.target.style.borderColor = '#4A90E2';
            });
            btn.addEventListener('mouseleave', (e) => {
                e.target.style.background = 'white';
                e.target.style.borderColor = '#E2E8F0';
            });
            btn.addEventListener('click', (e) => {
                const selectedIdx = parseInt(e.target.dataset.index);
                const feedback = document.querySelector(`#${msgId} #quiz-feedback`);
                
                // Deshabilitar todas las opciones
                options.forEach(o => o.style.pointerEvents = 'none');
                
                if (selectedIdx === data.answer_index) {
                    // Correcto
                    e.target.style.background = '#D1FAE5';
                    e.target.style.borderColor = '#10B981';
                    feedback.style.background = '#D1FAE5';
                    feedback.style.color = '#065F46';
                    feedback.textContent = '¡Correcto! 🎉 +10 puntos';
                    feedback.classList.remove('hidden');
                    
                    const state = getState();
                    updateState({ score: state.score + 10 });
                    triggerConfetti();
                } else {
                    // Incorrecto
                    e.target.style.background = '#FEE2E2';
                    e.target.style.borderColor = '#EF4444';
                    
                    // Mostrar la correcta
                    options[data.answer_index].style.background = '#D1FAE5';
                    options[data.answer_index].style.borderColor = '#10B981';
                    
                    feedback.style.background = '#FEE2E2';
                    feedback.style.color = '#991B1B';
                    feedback.textContent = `Incorrecto. La respuesta era: ${data.options[data.answer_index]}`;
                    feedback.classList.remove('hidden');
                }
            });
        });
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
