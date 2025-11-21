// Servicio de Voz (TTS y STT)

let speechRate = 1.0; // Velocidad global

export function setSpeechRate(rate) {
    speechRate = Math.max(0.5, Math.min(1.5, rate));
}

export function getSpeechRate() {
    return speechRate;
}

// Text-to-Speech
export function speakText(text, lang = 'en-US') {
    if (!text) return;
    
    // Cancelar cualquier speech en curso
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = speechRate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Seleccionar una voz apropiada si está disponible
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => voice.lang.startsWith(lang.split('-')[0]));
    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }
    
    window.speechSynthesis.speak(utterance);
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
