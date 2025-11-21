// Módulo de Cámara
import { callGemini } from '../services/gemini.js';
import { speakText } from '../services/voice.js';
import { showToast, triggerConfetti, createAudioButton, showLoading } from '../utils/ui.js';
import { getState, updateState, addToVocabulary } from '../state.js';
import { GAME_OBJECTS } from '../config.js';

let stream = null;
let currentMode = null; // 'explore' | 'game'
let currentMission = null;
let isAnalyzing = false;
let usedObjects = []; // Objetos ya usados en esta sesión

export function initCamera() {
    console.log("Inicializando Cámara...");
    
    // Selector de Modo
    document.getElementById('mode-explore-btn')?.addEventListener('click', () => startMode('explore'));
    document.getElementById('mode-game-btn')?.addEventListener('click', () => startMode('game'));
    
    // Botón Volver
    document.getElementById('back-to-selector-btn')?.addEventListener('click', stopCamera);
    
    // Botón Captura
    document.getElementById('capture-btn')?.addEventListener('click', handleCapture);
    
    // Botón Cerrar Análisis
    document.getElementById('close-analysis')?.addEventListener('click', closeAnalysis);
}

async function startMode(mode) {
    currentMode = mode;
    
    // Ocultar selector
    document.getElementById('camera-mode-selector')?.classList.add('hidden');
    
    // Mostrar vista de cámara
    const cameraView = document.getElementById('camera-view');
    cameraView?.classList.remove('hidden');
    
    // Iniciar cámara
    const video = document.getElementById('camera-feed');
    const success = await startCameraStream(video);
    
    if (!success) {
        showToast('No se pudo acceder a la cámara', 'error');
        stopCamera();
        return;
    }
    
    // Configurar modo
    if (mode === 'game') {
        startNewMission();
    } else {
        document.getElementById('mission-overlay')?.classList.add('hidden');
    }
}

async function startCameraStream(videoElement) {
    if (stream) return true;
    
    try {
        // Intentar cámara trasera primero
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        videoElement.srcObject = stream;
        return true;
    } catch (e) {
        console.error("Error con cámara trasera:", e);
        
        // Fallback a cámara frontal
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoElement.srcObject = stream;
            return true;
        } catch (err) {
            console.error("Error con cámara frontal:", err);
            return false;
        }
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    currentMode = null;
    currentMission = null;
    
    // Resetear UI
    document.getElementById('camera-view')?.classList.add('hidden');
    document.getElementById('camera-mode-selector')?.classList.remove('hidden');
    document.getElementById('analysis-panel')?.classList.add('hidden');
    
    const video = document.getElementById('camera-feed');
    if (video) video.srcObject = null;
}

function startNewMission() {
    // Filtrar objetos no usados
    let availableObjects = GAME_OBJECTS.filter(obj => !usedObjects.includes(obj.en));
    
    // Si ya se usaron todos, resetear y empezar de nuevo
    if (availableObjects.length === 0) {
        usedObjects = [];
        availableObjects = [...GAME_OBJECTS];
        showToast('¡Completaste todos los objetos! Comenzando de nuevo 🎉', 'success');
    }
    
    // Seleccionar objeto aleatorio de los disponibles
    currentMission = availableObjects[Math.floor(Math.random() * availableObjects.length)];
    
    // Agregar a la lista de usados
    usedObjects.push(currentMission.en);
    
    const missionOverlay = document.getElementById('mission-overlay');
    const missionText = document.getElementById('mission-text');
    
    if (missionOverlay && missionText) {
        missionOverlay.classList.remove('hidden');
        missionText.innerHTML = `Encuentra: <span>${currentMission.es}</span>`;
    }
    
    // Audio en español
    speakText(`Encuentra: ${currentMission.es}`, 'es-ES');
}

async function handleCapture() {
    if (isAnalyzing) return;
    
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('camera-canvas');
    
    if (!stream || !video || !canvas) return;
    
    isAnalyzing = true;
    
    // Efecto visual
    video.style.opacity = '0.5';
    setTimeout(() => video.style.opacity = '1', 200);
    
    try {
        // Capturar imagen
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const base64Image = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
        
        // Preparar prompt según modo
        let prompt = '';
        
        if (currentMode === 'game' && currentMission) {
            prompt = `
                You are an English Teacher API. Analyze this image.
                Task: Check if the image contains a "${currentMission.en}".
                Respond STRICTLY in JSON format:
                {
                    "type": "analysis",
                    "object_en": "${currentMission.en}",
                    "object_es": "${currentMission.es}",
                    "ipa": "/IPA pronunciation/",
                    "found": true/false,
                    "description_es": "If not found, describe what you see in Spanish",
                    "examples": [
                        {"en": "Simple sentence in English", "es": "Traducción al español"},
                        {"en": "Another sentence", "es": "Otra traducción"}
                    ]
                }
            `;
        } else {
            prompt = `
                You are an English Teacher API. Analyze this image.
                Task: Identify the main object.
                Respond STRICTLY in JSON format:
                {
                    "type": "analysis",
                    "object": "English Name",
                    "object_es": "Spanish translation",
                    "ipa": "/IPA pronunciation/",
                    "examples": [
                        {"en": "Simple sentence in English", "es": "Traducción al español"},
                        {"en": "Another sentence", "es": "Otra traducción"}
                    ]
                }
            `;
        }
        
        const data = await callGemini(prompt, base64Image);
        showAnalysisResult(data);
        
    } catch (e) {
        console.error(e);
        showToast(`Error: ${e.message}`, 'error');
    } finally {
        isAnalyzing = false;
    }
}

function showAnalysisResult(data) {
    const panel = document.getElementById('analysis-panel');
    const content = document.getElementById('analysis-content');
    
    if (!panel || !content) return;
    
    if (currentMode === 'game') {
        if (data.found) {
            // ¡Éxito!
            content.innerHTML = `
                <div style="padding: 2rem;">
                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
                        <h2 style="font-size: 1.5rem; font-weight: 900; color: #10B981; margin-bottom: 0.5rem;">
                            ¡Encontrado!
                        </h2>
                        <p style="color: #64748B; font-size: 0.875rem; margin-bottom: 1rem;">
                            Buscabas: <strong>${data.object_es || currentMission.es}</strong>
                        </p>
                    </div>
                    
                    <div style="background: #F8FAFC; padding: 1.5rem; border-radius: 0.75rem; margin-bottom: 1rem; border: 2px solid #4A90E2;">
                        <p style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #64748B; margin-bottom: 0.5rem;">
                            En Inglés:
                        </p>
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                            <h3 style="font-size: 1.5rem; font-weight: 900; color: #4A90E2; flex: 1;">
                                ${data.object_en || currentMission.en} <span style="color: #64748B; font-size: 1rem; font-weight: 400;">(${data.object_es || currentMission.es})</span>
                            </h3>
                            <div id="object-audio-container"></div>
                        </div>
                        <p style="font-size: 0.875rem; color: #64748B; font-family: monospace;">
                            ${data.ipa || ''}
                        </p>
                    </div>
                    
                    <div id="game-examples" style="margin-bottom: 1rem;">
                        <p style="font-weight: 700; margin-bottom: 0.75rem; font-size: 0.875rem; color: #1E293B;">
                            Ejemplos:
                        </p>
                    </div>
                    
                    <div style="display: flex; gap: 0.5rem;">
                        <button id="next-mission-btn" class="btn btn-primary" style="flex: 1;">
                            ➡️ Siguiente
                        </button>
                        <button id="exit-game-btn" class="btn btn-secondary" style="flex: 1;">
                            🚪 Salir
                        </button>
                    </div>
                </div>
            `;
            
            // Agregar botón de audio para la palabra en inglés
            const audioContainer = content.querySelector('#object-audio-container');
            if (audioContainer) {
                const audioBtn = createAudioButton(data.object_en || currentMission.en, 'en-US');
                audioBtn.style.marginLeft = '0';
                audioContainer.appendChild(audioBtn);
                if (window.lucide) window.lucide.createIcons();
            }
            
            // Mostrar ejemplos si vienen en data, sino generarlos
            if (data.examples && data.examples.length > 0) {
                renderExamples(data.examples, 'game-examples');
            } else {
                generateExamples(data.object_en || currentMission.en);
            }
            
            // Audio de felicitación en inglés
            setTimeout(() => {
                speakText(`Great job! You found the ${data.object_en || currentMission.en}`, 'en-US');
            }, 500);
            
            triggerConfetti();
            
            // Puntos
            const state = getState();
            updateState({ score: state.score + 50 });
            
            // Event listeners
            setTimeout(() => {
                content.querySelector('#next-mission-btn')?.addEventListener('click', () => {
                    closeAnalysis();
                    startNewMission();
                });
                content.querySelector('#exit-game-btn')?.addEventListener('click', () => {
                    closeAnalysis();
                    stopCamera();
                });
            }, 100);
            
            // NO auto-avanzar, dejar que el usuario lo intente de nuevo
            
        } else {
            // Fallo
            content.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                    <h2 style="font-size: 1.5rem; font-weight: 900; color: #F59E0B; margin-bottom: 1rem;">
                        Intenta de nuevo
                    </h2>
                    <p style="color: #64748B; margin-bottom: 1.5rem;">
                        ${data.description_es || 'No veo el objeto buscado.'}
                    </p>
                    <button id="exit-game-fail-btn" class="btn btn-secondary" style="width: 100%;">
                        🚪 Salir del Juego
                    </button>
                </div>
            `;
            
            speakText(`Eso parece otra cosa. Busca: ${currentMission.es}`, 'es-ES');
            
            // Event listener para salir
            setTimeout(() => {
                content.querySelector('#exit-game-fail-btn')?.addEventListener('click', () => {
                    closeAnalysis();
                    stopCamera();
                });
            }, 100);
        }
        
    } else {
        // Modo Explorar
        content.innerHTML = `
            <div style="padding: 1.5rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                    <div style="flex: 1;">
                        <h3 style="font-size: 1.5rem; font-weight: 900; color: #4A90E2; margin-bottom: 0.25rem;">
                            ${data.object || 'Unknown'} <span style="color: #64748B; font-size: 1rem; font-weight: 400;">(${data.object_es || data.translation || ''})</span>
                        </h3>
                        <p style="font-size: 0.75rem; color: #64748B; font-family: monospace;">
                            ${data.ipa || ''}
                        </p>
                    </div>
                    <div id="explore-audio-container"></div>
                </div>
                
                <div id="explore-examples" style="margin-bottom: 1rem;">
                    <p style="font-weight: 700; margin-bottom: 0.75rem; font-size: 0.875rem; color: #1E293B;">
                        Ejemplos:
                    </p>
                </div>
                
                <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <button id="correct-btn" class="btn btn-primary" style="flex: 1;">
                        ✅ Correcto
                    </button>
                    <button id="incorrect-btn" class="btn btn-secondary" style="flex: 1;">
                        ❌ Incorrecto
                    </button>
                </div>
                <button id="exit-explore-btn" class="btn btn-secondary" style="width: 100%;">
                    🚪 Salir del Modo Explorar
                </button>
                <div id="correction-input" class="hidden" style="margin-top: 1rem;">
                    <input type="text" id="correction-text" placeholder="¿Qué objeto es? (en español)" 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #E2E8F0; border-radius: 0.5rem; margin-bottom: 0.5rem;">
                    <button id="submit-correction-btn" class="btn btn-primary" style="width: 100%;">
                        Enviar corrección
                    </button>
                </div>
            </div>
        `;
        
        // Audio del objeto
        speakText(data.object, 'en-US');
        
        // Botón de audio para la palabra
        const audioContainer = content.querySelector('#explore-audio-container');
        if (audioContainer && data.object) {
            const audioBtn = createAudioButton(data.object, 'en-US');
            audioBtn.style.marginLeft = '0';
            audioContainer.appendChild(audioBtn);
            if (window.lucide) window.lucide.createIcons();
        }
        
        // Mostrar ejemplos si vienen en data
        if (data.examples && data.examples.length > 0) {
            renderExamples(data.examples, 'explore-examples');
        }
        
        // Event listeners
        content.querySelector('#exit-explore-btn')?.addEventListener('click', () => {
            closeAnalysis();
            stopCamera();
        });
        
        content.querySelector('#correct-btn')?.addEventListener('click', () => {
            addToVocabulary({
                object: data.object,
                translation: data.translation,
                ipa: data.ipa
            });
            const state = getState();
            updateState({ score: state.score + 10 });
            showToast('¡Palabra guardada! +10 puntos', 'success');
            triggerConfetti();
            closeAnalysis();
        });
        
        content.querySelector('#incorrect-btn')?.addEventListener('click', () => {
            content.querySelector('#correction-input')?.classList.remove('hidden');
        });
        
        content.querySelector('#submit-correction-btn')?.addEventListener('click', async () => {
            const correctionText = content.querySelector('#correction-text')?.value.trim();
            if (!correctionText) return;
            
            const loader = showLoading(content, 'Generando...');
            
            try {
                const prompt = `
                    You are an English Teacher API.
                    Task: Translate "${correctionText}" to English and create example sentences.
                    Respond STRICTLY in JSON format:
                    {
                        "type": "analysis",
                        "object": "English Word",
                        "object_es": "${correctionText}",
                        "ipa": "/IPA/",
                        "examples": [
                            {"en": "Simple sentence", "es": "Oración simple"}
                        ]
                    }
                `;
                
                const correctedData = await callGemini(prompt);
                loader.remove();
                
                // Guardar y reproducir
                addToVocabulary({
                    object: correctedData.object,
                    translation: correctedData.object_es || correctionText,
                    ipa: correctedData.ipa
                });
                
                speakText(correctedData.object, 'en-US');
                showToast('¡Palabra corregida y guardada!', 'success');
                
                closeAnalysis();
                
            } catch (e) {
                loader.remove();
                showToast(`Error: ${e.message}`, 'error');
            }
        });
    }
    
    panel.classList.remove('hidden');
}

async function generateExamples(word) {
    const container = document.getElementById('game-examples');
    if (!container) return;
    
    try {
        const prompt = `
            You are an English Teacher API.
            Task: Generate 2 simple example sentences using the word "${word}".
            Respond STRICTLY in JSON format:
            {
                "type": "examples",
                "examples": [
                    {"en": "Sentence 1 in English", "es": "Traducción al español"},
                    {"en": "Sentence 2 in English", "es": "Traducción al español"}
                ]
            }
        `;
        
        const data = await callGemini(prompt);
        
        if (data.examples && Array.isArray(data.examples)) {
            renderExamples(data.examples, 'game-examples');
        }
        
    } catch (e) {
        console.error('Error generating examples:', e);
    }
}

function renderExamples(examples, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    examples.forEach(example => {
        const div = document.createElement('div');
        div.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; padding: 0.75rem; background: #F8FAFC; border-radius: 0.5rem;';
        
        const text = document.createElement('span');
        text.textContent = `${example.en} (${example.es})`;
        text.style.cssText = 'flex: 1; font-size: 0.875rem; line-height: 1.4;';
        
        const audioBtn = createAudioButton(example.en, 'en-US');
        
        div.appendChild(text);
        div.appendChild(audioBtn);
        container.appendChild(div);
    });
    
    if (window.lucide) window.lucide.createIcons();
}

function closeAnalysis() {
    document.getElementById('analysis-panel')?.classList.add('hidden');
}

export function cleanupCamera() {
    stopCamera();
}
