// Servicio de Comunicación con Gemini AI
import { CONFIG } from '../config.js';

let currentKeyIdx = 0;

function getApiKeys() {
    const raw = localStorage.getItem(CONFIG.API_KEYS_KEY) || "";
    return raw.split(',').map(k => k.trim()).filter(k => k !== "");
}

export async function callGemini(prompt, imageBase64 = null) {
    const apiKeys = getApiKeys();
    if(apiKeys.length === 0) throw new Error("No API Keys configured");

    const apiKey = apiKeys[currentKeyIdx];
    
    // Selección inteligente de modelo
    // gemini-pro: Solo texto (Chat)
    // gemini-1.5-flash: Texto e Imágenes (Cámara) - Si falla, usar gemini-pro-vision
    let model = CONFIG.GEMINI_MODEL;
    
    if (imageBase64) {
        // Para imágenes necesitamos un modelo multimodal
        // Intentamos primero con flash que es más rápido, si no pro-vision
        model = 'gemini-1.5-flash'; 
    } else {
        // Para solo texto, gemini-pro es el más estable y gratuito
        model = 'gemini-pro';
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const parts = [{ text: prompt + " Respond ONLY in JSON." }];
    if (imageBase64) {
        parts.push({ inline_data: { mime_type: "image/jpeg", data: imageBase64 } });
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }] }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API Error ${response.status}:`, errorBody);
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        if(!data.candidates || !data.candidates[0].content) throw new Error("Invalid API Response");

        const text = data.candidates[0].content.parts[0].text;
        const jsonStr = text.replace(/```json|```/g, '').trim();
        return JSON.parse(jsonStr);

    } catch (error) {
        console.error("Gemini Error:", error);
        
        if (error.name === 'AbortError') {
            throw new Error('Timeout: La solicitud tardó demasiado');
        }
        
        // Rotación de keys
        currentKeyIdx = (currentKeyIdx + 1) % apiKeys.length;
        if(currentKeyIdx !== 0) {
            console.log("Rotando API Key...");
            return callGemini(prompt, imageBase64);
        }
        throw error;
    }
}
