// Servicio de Comunicación con Gemini AI
import { CONFIG } from '../config.js';

export function getApiKey() {
    return localStorage.getItem(CONFIG.API_KEYS_KEY);
}

export function setApiKey(key) {
    if (!key) return;
    localStorage.setItem(CONFIG.API_KEYS_KEY, key.trim());
}

export async function callGemini(prompt, imageBase64 = null, isRetry = false) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("No API Key configured");

    const model = CONFIG.GEMINI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const parts = [{ text: prompt }];
    if (imageBase64) {
        parts.push({ 
            inline_data: { 
                mime_type: "image/jpeg", 
                data: imageBase64 
            } 
        });
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: [{ parts }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                }
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API Error ${response.status}:`, errorBody);
            
            if (response.status === 404) {
                throw new Error(`Modelo no encontrado (${model}). Verifica tu API Key.`);
            } else if (response.status === 403) {
                throw new Error("API Key inválida o sin permisos.");
            } else if (response.status === 429) {
                throw new Error("Has excedido tu cuota gratuita.");
            }
            
            throw new Error(`Error del servidor (${response.status})`);
        }
        
        const data = await response.json();
        if (!data.candidates || !data.candidates[0].content) {
            throw new Error("Respuesta vacía de la IA");
        }

        const text = data.candidates[0].content.parts[0].text;
        
        // Extracción robusta de JSON
        let jsonStr = text;
        const firstOpen = text.indexOf('{');
        const lastClose = text.lastIndexOf('}');
        
        if (firstOpen !== -1 && lastClose !== -1) {
            jsonStr = text.substring(firstOpen, lastClose + 1);
        }
        
        // Limpieza
        jsonStr = jsonStr.replace(/```json|```/g, '').trim();

        try {
            return JSON.parse(jsonStr);
        } catch (parseError) {
            console.error("JSON Parse Error. Raw text:", text);
            
            // Intentar limpiar caracteres de control (Intento 1)
            try {
                const cleaned = jsonStr.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
                return JSON.parse(cleaned);
            } catch (e2) {
                // Intento 2: Autoreparación con IA (Solo si no es ya un reintento)
                if (!isRetry) {
                    console.warn("JSON inválido, intentando autoreparación con la IA...");
                    const repairPrompt = `
                        FIX JSON SYNTAX ERROR.
                        The following JSON has a syntax error (likely unescaped newlines in strings or bad quotes).
                        
                        BROKEN JSON:
                        ${jsonStr}
                        
                        TASK: Return ONLY the corrected, valid JSON object. No markdown.
                    `;
                    // Llamada recursiva marcada como reintento
                    return await callGemini(repairPrompt, null, true);
                }
                
                throw new Error("Error de sintaxis en la respuesta de la IA (incluso tras reintento).");
            }
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error("La petición tardó demasiado. Intenta de nuevo.");
        }
        console.error("Gemini Error:", error);
        throw error;
    }
}
