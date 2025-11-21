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
    
    // Detectar si hay mezcla de idiomas (traducción entre paréntesis o similar)
    // Patrón: "Texto en inglés (Texto en español)" o "Texto en inglés - Texto en español"
    const mixedLanguagePattern = /\([^)]*(?:hola|gracias|por favor|buenos|días|noche|cómo|qué|dónde|cuándo|por qué|porque|también|muy|más|menos|bien|mal|sí|no|esto|esta|ese|esa|mi|tu|su|el|la|los|las|un|una|de|del|al|con|para|sobre|desde|hasta)[^)]*\)/i;
    if (mixedLanguagePattern.test(text)) return false;
    
    // Detectar traducciones con guión o dos puntos
    const translationPattern = /(?::|—|–|-)\s*(?:hola|gracias|mi|tu|nombre|tengo|estoy|soy|voy|hago|quiero|necesito|puedo|debo)/i;
    if (translationPattern.test(text)) return false;
    
    // Palabras comunes en español (si aparece alguna, NO es inglés puro)
    const spanishWords = /\b(hola|adiós|adios|gracias|por favor|buenos|días|tardes|noches|mañana|hoy|ayer|ahora|después|antes|siempre|nunca|mucho|poco|muy|más|mas|menos|bien|mal|sí|si|no|esto|esta|ese|esa|aquí|allí|aqui|alli|mi|tu|su|nuestro|vuestro|su|yo|tú|él|ella|nosotros|vosotros|ellos|ellas|ser|estar|tener|hacer|ir|venir|decir|poder|deber|querer|saber|conocer|poner|dar|ver|mirar|escuchar|hablar|comer|beber|dormir|trabajar|estudiar|aprender|enseñar|comprar|vender|pagar|costar|llamar|preguntar|responder|entender|comprender|el|la|los|las|un|una|unos|unas|de|del|al|a|en|con|sin|sobre|bajo|entre|por|para|desde|hasta|hacia|contra|según|como|cómo|que|qué|cual|cuál|quien|quién|cuando|cuándo|donde|dónde|porque|por qué|porqué|aunque|pero|sino|o|u|y|e|ni|también|tampoco|muy|mucho|poco|bastante|demasiado|tan|tanto|cuanto|cuánto|alguno|ninguno|todo|cada|otro|mismo|propio|tal|cual|ejemplo|ejemplos|explicación|explicacion|significa|quiere decir|usa|usamos|se usa|forma|modo|manera|verbo|verbos|sustantivo|adjetivo|frase|oracion|oración|traducción|traduccion|español|inglés|ingles|que|qué|cómo|cuando|donde|porque|también|tambien|muy|más|mas|menos|bien|mal|sí|si|no|esto|esta|ese|esa|ser|estar|tener|hacer|dice|dijo|dices|pregunta|respuesta|correcto|incorrecto|intenta|intente|nivel|lección|leccion|tema|temas|aprende|aprender|practica|practicar|siguiente|anterior|inicio|fin|completado|error|errores|felicidades|excelente|perfecto|intenta de nuevo|vuelve a intentar)\b/i;
    if (spanishWords.test(cleanText)) return false;
    
    // Debe contener SOLO caracteres latinos básicos (A-Z, números, guiones, apóstrofes)
    const hasOnlyBasicLatin = /^[a-zA-Z0-9\s\-'']+$/.test(cleanText);
    if (!hasOnlyBasicLatin) return false;
    
    // Debe contener al menos UNA palabra común en inglés
    const commonEnglishWords = /\b(the|a|an|is|are|was|were|have|has|had|do|does|did|can|could|will|would|should|shall|may|might|must|I|you|he|she|it|we|they|my|your|his|her|its|our|their|this|that|these|those|what|which|who|whom|when|where|why|how|am|be|been|being|to|from|in|on|at|by|with|about|as|into|through|during|before|after|above|below|between|under|over|of|for|and|or|but|not|no|yes|all|some|any|each|every|other|another|such|more|most|very|too|so|just|only|also|even|still|already|yet|now|then|here|there|up|down|out|off|away|back|again|hello|hi|good|bad|great|nice|please|thank|thanks|sorry|welcome|goodbye|bye|morning|afternoon|evening|night|day|time|today|tomorrow|yesterday|want|need|like|love|know|think|see|look|hear|listen|speak|talk|say|tell|ask|answer|work|play|eat|drink|go|come|get|give|take|make|help|buy|sell|read|write|find|use|call|try|keep|let|begin|start|stop|end|leave|stay|feel|seem|become|continue)\b/i;
    
    return commonEnglishWords.test(cleanText);
}

// Función para extraer solo las partes en inglés de un texto mixto
export function extractEnglishOnly(text) {
    if (!text || typeof text !== 'string') return null;
    
    // Si tiene caracteres españoles, intentar extraer la parte en inglés antes del paréntesis/guión
    const mixedPattern = /^([^(—–-]+)(?:\s*[\(—–-]|\s*:)/;
    const match = text.match(mixedPattern);
    
    if (match && match[1]) {
        const englishPart = match[1].trim();
        // Verificar que la parte extraída sea realmente inglés
        if (isEnglishText(englishPart)) {
            return englishPart;
        }
    }
    
    // Si todo el texto es inglés, devolver tal cual
    if (isEnglishText(text)) {
        return text;
    }
    
    return null;
}
