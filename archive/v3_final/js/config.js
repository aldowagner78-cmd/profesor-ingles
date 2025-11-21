// Configuración Global
export const CONFIG = {
    APP_NAME: 'Profesor IA',
    VERSION: '3.0.0',
    DEFAULT_LANG: 'es',
    // Usamos gemini-2.0-flash para todo (Modelo confirmado por el usuario)
    GEMINI_TEXT_MODEL: 'gemini-2.0-flash',
    // Usamos gemini-2.0-flash para visión (multimodal)
    GEMINI_VISION_MODEL: 'gemini-2.0-flash',
    API_KEYS_KEY: 'profesor_ia_user_apikey'
};

export const SYLLABUS = [
    { id: 'A1', name: 'Nivel Inicial (A1)', topics: ['Saludos y Despedidas', 'Verbo To Be', 'Colores y Números', 'La Familia', 'Presente Simple', 'Ropa y Accesorios'] },
    { id: 'A2', name: 'Nivel Básico (A2)', topics: ['Rutinas Diarias', 'Pasado Simple', 'Futuro con Going To', 'Comida y Restaurantes', 'Adjetivos Comparativos', 'Direcciones y Lugares'] },
    { id: 'B1', name: 'Intermedio (B1)', topics: ['Experiencias (Present Perfect)', 'Condicionales (0 y 1)', 'Obligaciones (Must/Have to)', 'Viajes y Turismo', 'Voz Pasiva Simple', 'Salud y Cuerpo'] },
    { id: 'B2', name: 'Intermedio Alto (B2)', topics: ['Phrasal Verbs Comunes', 'Condicionales (2 y 3)', 'Estilo Indirecto (Reported Speech)', 'Expresiones de Opinión', 'Inglés para el Trabajo', 'Tecnología'] },
    { id: 'C1', name: 'Avanzado (C1)', topics: ['Modismos y Slang', 'Inglés de Negocios', 'Debate y Argumentación', 'Matices de Pronunciación', 'Redacción Formal', 'Literatura'] }
];

export function initConfig() {
    // Ya no inicializamos keys por defecto.
    // El usuario debe proveerlas.
}
