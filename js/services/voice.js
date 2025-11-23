// Servicio de Voz (TTS y STT)

let speechRate = 1.0; // Velocidad global

export function setSpeechRate(rate) {
    speechRate = Math.max(0.5, Math.min(1.5, rate));
}

export function getSpeechRate() {
    return speechRate;
}

// Text-to-Speech
let currentText = null;
let currentUtterance = null; // Variable global para evitar Garbage Collection
let audioQueue = [];
let isSpeaking = false;

export function speakText(text, lang = 'en-US') {
    if (!text) return null;
    
    // Añadir a la cola en lugar de cancelar inmediatamente
    audioQueue.push({ text, lang });
    processQueue();
    
    return null; // Ya no devolvemos el utterance directamente
}

function processQueue() {
    if (isSpeaking || audioQueue.length === 0) return;
    
    isSpeaking = true;
    const { text, lang } = audioQueue.shift();
    currentText = text;
    
    // Crear utterance y asignarlo a la variable global
    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance; // MANTENER REFERENCIA VIVA
    
    utterance.lang = lang;
    utterance.rate = speechRate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onend = () => {
        currentText = null;
        currentUtterance = null; // Limpiar referencia al terminar
        isSpeaking = false;
        processQueue(); // Procesar siguiente en la cola
    };
    
    utterance.onerror = (e) => {
        console.error("TTS Error:", e);
        currentText = null;
        currentUtterance = null;
        isSpeaking = false;
        processQueue(); // Intentar siguiente incluso si hubo error
    };
    
    // Seleccionar una voz apropiada si está disponible
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => voice.lang.startsWith(lang.split('-')[0]));
    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }
    
    // Pequeño timeout para asegurar estabilidad
    setTimeout(() => {
        window.speechSynthesis.speak(utterance);
        
        // Fix para Chrome: a veces se pausa indefinidamente si el texto es largo
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }
    }, 10);
}

export function cancelAudio() {
    audioQueue = [];
    isSpeaking = false;
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
}

// Speech-to-Text
let recognition = null;

export function startListening(onResult, onEnd, lang = 'en-US') {
    // Verificar soporte
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.error("Speech Recognition no soportado en este navegador");
        if (onEnd) onEnd();
        return;
    }
    
    if (recognition) {
        recognition.stop();
    }
    
    recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (onResult) onResult(transcript);
    };
    
    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        if (onEnd) onEnd();
    };
    
    recognition.onend = () => {
        if (onEnd) onEnd();
    };
    
    try {
        recognition.start();
    } catch (e) {
        console.error("Error starting recognition:", e);
        if (onEnd) onEnd();
    }
}

export function stopListening() {
    if (recognition) {
        recognition.stop();
        recognition = null;
    }
}

// Cargar voces (necesario para algunos navegadores)
if (typeof window !== 'undefined') {
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
}
