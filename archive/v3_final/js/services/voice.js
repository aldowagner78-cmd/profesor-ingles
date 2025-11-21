// Servicio de Voz (TTS y STT)
import { getState } from '../state.js';
import { showToast } from '../utils/ui.js';

let synth = window.speechSynthesis;
let recognition = null;
let isListening = false;

export function initVoice() {
    // Cargar voces
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
            console.log("Voces cargadas:", speechSynthesis.getVoices().length);
        };
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Speech recognition no disponible');
        return false;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    return true;
}

export function speakText(text, lang = 'en') {
    if (!text) return;
    stopAudio();
    
    const state = getState();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'es' ? 'es-ES' : 'en-US';
    utterance.rate = state.speechRate || 0.9;
    
    let voices = synth.getVoices();
    // Intentar encontrar una voz de Google o Microsoft que suene mejor
    const preferredVoice = voices.find(v => 
        v.lang.startsWith(lang === 'es' ? 'es' : 'en') && 
        (v.name.includes('Google') || v.name.includes('Natural'))
    ) || voices.find(v => v.lang.startsWith(lang === 'es' ? 'es' : 'en'));

    if(preferredVoice) utterance.voice = preferredVoice;
    
    synth.speak(utterance);
}

export function stopAudio() {
    if(synth.speaking) synth.cancel();
}

export function startListening(onResultCallback, onEndCallback) {
    if (!recognition) {
        if(!initVoice()) {
            showToast("Tu navegador no soporta reconocimiento de voz", "error");
            return;
        }
    }
    
    if(isListening) {
        stopListening();
        return;
    }
    
    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        console.log("Escuchado:", text);
        if(onResultCallback) onResultCallback(text);
    };
    
    recognition.onerror = (event) => {
        console.error('Speech error:', event.error);
        if(event.error === 'not-allowed') showToast('Permiso de micrófono denegado', 'error');
        if(event.error === 'no-speech') showToast('No se escuchó nada', 'info');
        isListening = false;
        if(onEndCallback) onEndCallback();
    };
    
    recognition.onend = () => {
        isListening = false;
        if(onEndCallback) onEndCallback();
    };

    try {
        recognition.start();
        isListening = true;
    } catch(e) { 
        console.error("Error al iniciar reconocimiento:", e);
        isListening = false;
        if(onEndCallback) onEndCallback();
    }
}

export function stopListening() {
    if(!recognition) return;
    try {
        recognition.stop();
    } catch(e) { console.error(e); }
    isListening = false;
}
