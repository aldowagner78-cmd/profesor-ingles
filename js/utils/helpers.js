// ============================================
// UTILIDADES Y FUNCIONES AUXILIARES
// ============================================

export function formatDate(date) {
    return new Date(date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Función mejorada para detectar si un texto es inglés puro
export function isEnglishText(text) {
    if (!text || typeof text !== 'string' || text.length < 3) return false;
    
    // Remover puntuación y espacios extras para análisis
    const cleanText = text.replace(/[.,!?;:'"()\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // INDICADORES DEFINITIVOS DE ESPAÑOL (rechazar inmediatamente)
    const spanishCharacters = /[áéíóúñü¿¡]/i;
    if (spanishCharacters.test(text)) return false;
    
    // Palabras comunes en español (si aparece alguna, NO es inglés puro)
    const spanishWords = /\b(el|la|los|las|un|una|de|del|al|con|por|para|como|ejemplo|ejemplos|explicación|significa|usa|usamos|forma|modo|verbo|verbos|sustantivo|adjetivo|frase|oracion|oración|traducción|español|inglés|ingles|que|qué|cómo|cuando|donde|porque|también|tambien|muy|más|mas|menos|bien|mal|sí|si|no|esto|esta|ese|esa|ser|estar|tener|hacer|dice|dijo|dices|pregunta|respuesta|correcto|incorrecto|intenta|intente|nivel|lección|leccion|tema|temas|aprende|aprender|practica|practicar|siguiente|anterior|inicio|fin|completado|error|errores)\b/i;
    if (spanishWords.test(cleanText)) return false;
    
    // Debe contener SOLO caracteres latinos básicos (A-Z, números, guiones, apóstrofes)
    const hasOnlyBasicLatin = /^[a-zA-Z0-9\s\-'']+$/.test(cleanText);
    if (!hasOnlyBasicLatin) return false;
    
    // Debe contener al menos UNA palabra común en inglés
    const commonEnglishWords = /\b(the|a|an|is|are|was|were|have|has|had|do|does|did|can|could|will|would|should|shall|may|might|must|I|you|he|she|it|we|they|my|your|his|her|its|our|their|this|that|these|those|what|which|who|whom|when|where|why|how|am|be|been|being|to|from|in|on|at|by|with|about|as|into|through|during|before|after|above|below|between|under|over|of|for|and|or|but|not|no|yes|all|some|any|each|every|other|another|such|more|most|very|too|so|just|only|also|even|still|already|yet|now|then|here|there|up|down|out|off|away|back|again|hello|hi|good|bad|great|nice|please|thank|thanks|sorry|welcome|goodbye|bye|morning|afternoon|evening|night|day|time|today|tomorrow|yesterday|want|need|like|love|know|think|see|look|hear|listen|speak|talk|say|tell|ask|answer|work|play|eat|drink|go|come|get|give|take|make|help|buy|sell|read|write|find|use|call|try|keep|let|begin|start|stop|end|leave|stay|feel|seem|become|continue)\b/i;
    
    return commonEnglishWords.test(cleanText);
}
