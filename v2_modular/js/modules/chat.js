// Módulo de Chat Completo
import { callGemini } from '../services/gemini.js';
import { speakText, startListening, stopListening } from '../services/voice.js';
import { getState, updateState } from '../state.js';
import { SYLLABUS } from '../config.js';
import { showToast, triggerConfetti } from '../utils/ui.js';

const MAX_HISTORY = 10;

export function initChat() {
    console.log("Inicializando Chat...");
    
    // Event Listeners
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) sendBtn.onclick = sendTextMsg;
    
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.onkeypress = (e) => {
            if(e.key === 'Enter') sendTextMsg();
        };
    }

    // Micrófono (Toggle)
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) {
        micBtn.onclick = () => {
            const isActive = micBtn.classList.contains('mic-active');
            
            if (isActive) {
                stopListening();
                micBtn.classList.remove('mic-active');
                document.getElementById('mic-status').innerText = "Toca para hablar";
            } else {
                micBtn.classList.add('mic-active');
                document.getElementById('mic-status').innerText = "Escuchando...";
                
                startListening(
                    (text) => { // onResult
                        const input = document.getElementById('chat-input');
                        if(input) input.value = text;
                        sendTextMsg();
                    },
                    () => { // onEnd
                        micBtn.classList.remove('mic-active');
                        document.getElementById('mic-status').innerText = "Toca para hablar";
                    }
                );
            }
        };
    }

    // Botones de Acción
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.onclick = () => handleAction(btn.dataset.action);
    });

    // Restaurar historial si existe
    renderHistory();
}

function renderHistory() {
    const state = getState();
    if(state.chatHistory && state.chatHistory.length > 0) {
        const area = document.getElementById('chat-area');
        if (!area) return;
        // Limpiar excepto el saludo inicial si se desea, o limpiar todo
        // area.innerHTML = ''; 
        state.chatHistory.forEach(msg => addMsgToUI(msg.content, msg.role, false));
    }
}

async function sendTextMsg() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;

    // 1. UI Usuario
    addMsgToUI(text, 'user');
    input.value = '';
    
    // 2. Guardar en Estado
    const state = getState();
    let history = state.chatHistory || [];
    history.push({ role: 'user', content: text });
    
    // 3. UI Loading
    const loadingId = addMsgToUI('...', 'bot');

    try {
        // 4. Llamada a Gemini
        const currentLevel = SYLLABUS[state.levelIdx];
        const currentTopic = currentLevel.topics[state.topicIdx];
        
        const contextStr = history.slice(-MAX_HISTORY).map(h => `${h.role}: ${h.content}`).join('\n');
        
        const prompt = `
            Eres un profesor de inglés. Nivel: ${currentLevel.name}. Tema: ${currentTopic}.
            Historial:
            ${contextStr}
            
            Responde JSON: { "type": "eval", "feedback": "Español", "correction": "Corrección o null", "reply": "Inglés" }
        `;
        
        const data = await callGemini(prompt);
        
        // 5. Procesar Respuesta
        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.remove();
        
        if(data.reply) {
            history.push({ role: 'bot', content: data.reply });
            updateState({ chatHistory: history.slice(-MAX_HISTORY * 2) }); // Persistir
        }
        
        handleResponse(data);

    } catch (e) {
        console.error(e);
        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) {
            loadingEl.innerHTML = `<span class="text-red-500 font-bold">Error: ${e.message}</span>`;
        }
    }
}

function handleResponse(data) {
    if (data.type === 'eval') {
        let html = '';
        if (data.correction) html += `<div class="text-xs text-red-500 mb-1 font-bold">Corrección: ${data.correction}</div>`;
        html += `<div class="text-sm text-slate-600 mb-2">${data.feedback}</div>`;
        html += `<div class="text-lg font-bold text-blue-700">${data.reply} <button onclick="window.speak('${data.reply.replace(/'/g, "\\'")}')" class="inline-block ml-2 align-middle"><i data-lucide="volume-2" class="w-4 h-4"></i></button></div>`;
        
        addMsgToUI(html, 'bot');
        speakText(data.reply);
    } 
    else if (data.type === 'lesson') {
        const content = data.content || "No content.";
        // Check if marked is available
        const parsed = window.marked ? window.marked.parse(content) : content;
        addMsgToUI(parsed, 'bot');
        speakText("Here is your lesson.", 'en');
    }
    else if (data.type === 'quiz') {
        let html = `<p class="font-bold mb-2">${data.question}</p>`;
        data.options.forEach(opt => {
            // Usamos window.checkQuiz para poder llamarlo desde el HTML string
            html += `<button onclick="window.checkQuiz('${opt}', '${data.answer}')" class="block w-full text-left p-2 rounded border mb-1 hover:bg-blue-50">${opt}</button>`;
        });
        addMsgToUI(html, 'bot');
    }
}

function addMsgToUI(html, role, animate = true) {
    const div = document.createElement('div');
    div.className = `flex gap-3 ${animate ? 'fade-in-up' : ''}`;
    div.id = 'msg-' + Date.now();
    
    const content = `
        <div class="${role === 'bot' ? 'w-8 h-8 bg-blue-600' : 'hidden'} rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md">
            <i data-lucide="bot" class="w-5 h-5"></i>
        </div>
        <div class="chat-bubble ${role === 'user' ? 'user-msg' : 'bot-msg'}">
            ${html}
        </div>
    `;
    div.innerHTML = content;
    const area = document.getElementById('chat-area');
    if(area) {
        area.appendChild(div);
        area.scrollTop = area.scrollHeight;
    }
    
    if(window.lucide) window.lucide.createIcons();
    return div.id;
}

async function handleAction(action) {
    const state = getState();
    const currentLevel = SYLLABUS[state.levelIdx];
    const currentTopic = currentLevel.topics[state.topicIdx];
    
    const loadingId = addMsgToUI('Generando...', 'bot');
    
    try {
        let prompt = "";
        if(action === 'lesson') {
            prompt = `Lección corta sobre ${currentTopic} (${currentLevel.name}). JSON type "lesson", field "content" (markdown).`;
        } else if (action === 'quiz') {
            prompt = `Pregunta opción múltiple ${currentTopic}. JSON type "quiz", fields: question, options[], answer.`;
        } else if (action === 'roleplay') {
            prompt = `Roleplay ${currentTopic}. JSON type "eval", reply="Start phrase", feedback="Roleplay", correction=null.`;
        } else if (action === 'next') {
            // Lógica de siguiente tema
            const loadingEl = document.getElementById(loadingId);
            if(loadingEl) loadingEl.remove();
            nextTopic();
            return;
        }

        const data = await callGemini(prompt);
        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.remove();
        handleResponse(data);

    } catch(e) {
        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) {
            loadingEl.innerHTML = `<span class="text-red-500 font-bold">Error: ${e.message}</span>`;
        }
    }
}

function nextTopic() {
    const state = getState();
    const currentLevel = SYLLABUS[state.levelIdx];
    
    if (state.topicIdx < currentLevel.topics.length - 1) {
        updateState({ topicIdx: state.topicIdx + 1 });
        showToast(`Nuevo tema: ${currentLevel.topics[state.topicIdx + 1]}`);
    } else {
        showToast("¡Nivel completado! (Lógica de cambio de nivel pendiente)");
    }
    // Actualizar UI global
    document.dispatchEvent(new CustomEvent('stateChanged'));
}

// Exponer funciones globales para los onclick en el HTML inyectado
window.speak = (text) => speakText(text);
window.checkQuiz = (selected, correct) => {
    if (selected === correct) {
        addMsgToUI("¡Correcto! 🎉 +10 puntos", 'bot');
        const s = getState();
        updateState({ score: s.score + 10 });
        triggerConfetti();
    } else {
        addMsgToUI(`Incorrecto. La respuesta era: ${correct}`, 'bot');
    }
};