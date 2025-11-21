// Módulo de Cámara Completo
import { callGemini } from '../services/gemini.js';
import { speakText } from '../services/voice.js';
import { showToast, triggerConfetti } from '../utils/ui.js';
import { getState, updateState } from '../state.js';

let stream = null;
let isAnalyzing = false;
let currentMode = 'explore'; // 'explore' | 'game'
let currentMission = null;

export function initCamera() {
    console.log("Inicializando Cámara...");
    
    // Botón de Inicio
    const startBtn = document.getElementById('start-camera-btn');
    if (startBtn) {
        startBtn.onclick = async () => {
            const video = document.getElementById('camera-feed');
            const success = await startCamera(video);
            if (success) {
                document.getElementById('camera-start-screen').classList.add('hidden');
                document.getElementById('camera-overlay').classList.remove('hidden');
                document.getElementById('camera-controls').classList.remove('hidden');
                setMode('explore'); // Default mode
            }
        };
    }

    // Botón de Captura
    const captureBtn = document.getElementById('capture-btn');
    if (captureBtn) captureBtn.onclick = handleCapture;

    // Botón Cerrar Análisis
    const closeBtn = document.getElementById('close-analysis');
    if (closeBtn) closeBtn.onclick = closeAnalysis;
    
    // Botón Escuchar
    const speakBtn = document.getElementById('speak-obj-btn');
    if (speakBtn) {
        speakBtn.onclick = () => {
            const text = document.getElementById('detected-obj').innerText;
            speakText(text);
        };
    }

    // Selector de Modos
    document.getElementById('mode-explore').onclick = () => setMode('explore');
    document.getElementById('mode-game').onclick = () => setMode('game');
}

function setMode(mode) {
    currentMode = mode;
    
    // Actualizar UI botones
    const btnExplore = document.getElementById('mode-explore');
    const btnGame = document.getElementById('mode-game');
    const missionPanel = document.getElementById('mission-panel');
    
    if (mode === 'explore') {
        btnExplore.className = "px-4 py-1.5 rounded-full text-xs font-bold text-white bg-blue-600 shadow-sm transition-all";
        btnGame.className = "px-4 py-1.5 rounded-full text-xs font-bold text-slate-400 hover:text-white transition-all";
        missionPanel.classList.add('hidden');
        currentMission = null;
    } else {
        btnGame.className = "px-4 py-1.5 rounded-full text-xs font-bold text-white bg-purple-600 shadow-sm transition-all";
        btnExplore.className = "px-4 py-1.5 rounded-full text-xs font-bold text-slate-400 hover:text-white transition-all";
        missionPanel.classList.remove('hidden');
        startNewMission();
    }
}

async function startNewMission() {
    const missions = ['Banana', 'Apple', 'Cup', 'Bottle', 'Chair', 'Pen', 'Laptop', 'Book', 'Shoe', 'Keys'];
    currentMission = missions[Math.floor(Math.random() * missions.length)];
    
    const missionEl = document.getElementById('camera-mission');
    if(missionEl) missionEl.innerHTML = `Encuentra: <span class="text-yellow-400">${currentMission}</span>`;
    
    speakText("Find a " + currentMission);
}

export async function startCamera(videoElement) {
    if (stream) return true;

    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => videoElement.play();
        videoElement.classList.remove('opacity-50');
        return true;
    } catch (e) {
        console.error("Error camara trasera:", e);
        try { 
            stream = await navigator.mediaDevices.getUserMedia({ video: true }); 
            videoElement.srcObject = stream;
            videoElement.onloadedmetadata = () => videoElement.play();
            videoElement.classList.remove('opacity-50');
            return true;
        } catch(err){ 
            console.error("Error camara frontal:", err);
            showToast("No se pudo acceder a la cámara", "error");
            return false;
        }
    }
}

export function stopCamera() {
    if(stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }
    // Reset UI
    document.getElementById('camera-start-screen').classList.remove('hidden');
    document.getElementById('camera-overlay').classList.add('hidden');
    document.getElementById('camera-controls').classList.add('hidden');
    const video = document.getElementById('camera-feed');
    if(video) video.classList.add('opacity-50');
}

async function handleCapture() {
    if (isAnalyzing) return;
    
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('camera-canvas');
    
    if (!stream || !video || !canvas) return;

    // Efecto visual
    video.classList.add('opacity-50');
    setTimeout(() => video.classList.remove('opacity-50'), 200);

    isAnalyzing = true;
    const btn = document.getElementById('capture-btn');
    btn.classList.add('animate-pulse');
    
    try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const base64Image = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];

        let prompt = "";
        if (currentMode === 'game' && currentMission) {
            prompt = `
                Analiza la imagen. ¿Contiene un/una "${currentMission}"?
                Responde JSON: { "type": "analysis", "object": "${currentMission}", "found": boolean, "description": "Si no es, describe qué ves brevemente en español." }
            `;
        } else {
            prompt = `
                Analiza esta imagen. Identifica el objeto principal.
                Responde JSON: { "type": "analysis", "object": "Nombre en Inglés", "pronunciation": "/IPA/", "description": "Breve descripción en español" }
            `;
        }
        
        const data = await callGemini(prompt, base64Image);
        showAnalysisResult(data);

    } catch (e) {
        console.error(e);
        showToast("Error al analizar: " + e.message, "error");
    } finally {
        isAnalyzing = false;
        btn.classList.remove('animate-pulse');
    }
}

function showAnalysisResult(data) {
    if (data.type !== 'analysis') return;

    const resultPanel = document.getElementById('analysis-result');
    const objTitle = document.getElementById('detected-obj');
    const objDesc = document.getElementById('detected-desc');
    const objPron = document.getElementById('detected-pron');
    
    if (resultPanel && objTitle && objDesc) {
        resultPanel.classList.remove('hidden');
        
        if (currentMode === 'game') {
            if (data.found) {
                objTitle.innerText = "¡Encontrado!";
                objTitle.className = "text-2xl font-black text-green-600 leading-none";
                objDesc.innerText = `¡Genial! Encontraste: ${data.object}`;
                objPron.innerText = "";
                triggerConfetti();
                speakText("Great job! You found the " + data.object);
                
                // Dar puntos
                const s = getState();
                updateState({ score: s.score + 50 });
                
                setTimeout(() => {
                    closeAnalysis();
                    startNewMission();
                }, 3000);
            } else {
                objTitle.innerText = "Intenta de nuevo";
                objTitle.className = "text-2xl font-black text-orange-500 leading-none";
                objDesc.innerText = data.description || "No veo el objeto buscado.";
                objPron.innerText = "";
                speakText("Try again.");
            }
        } else {
            // Explore Mode
            objTitle.innerText = data.object;
            objTitle.className = "text-2xl font-black text-blue-600 leading-none";
            objDesc.innerText = data.description;
            objPron.innerText = data.pronunciation || "";
            speakText(data.object);
        }
    }
}

function closeAnalysis() {
    const resultPanel = document.getElementById('analysis-result');
    if (resultPanel) {
        resultPanel.classList.add('hidden');
    }
}
