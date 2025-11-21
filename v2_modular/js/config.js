// Configuración Global
export const CONFIG = {
    APP_NAME: 'Profesor IA',
    VERSION: '2.0.3',
    DEFAULT_LANG: 'es',
    GEMINI_MODEL: 'gemini-pro',
    API_KEYS_KEY: 'profesor_ia_apikeys'
};

export const SYLLABUS = [
    { id: 'A1', name: 'Nivel Inicial (A1)', topics: ['Saludos y Despedidas', 'Verbo To Be', 'Colores y Números', 'La Familia', 'Presente Simple', 'Ropa y Accesorios'] },
    { id: 'A2', name: 'Nivel Básico (A2)', topics: ['Rutinas Diarias', 'Pasado Simple', 'Futuro con Going To', 'Comida y Restaurantes', 'Adjetivos Comparativos', 'Direcciones y Lugares'] },
    { id: 'B1', name: 'Intermedio (B1)', topics: ['Experiencias (Present Perfect)', 'Condicionales (0 y 1)', 'Obligaciones (Must/Have to)', 'Viajes y Turismo', 'Voz Pasiva Simple', 'Salud y Cuerpo'] },
    { id: 'B2', name: 'Intermedio Alto (B2)', topics: ['Phrasal Verbs Comunes', 'Condicionales (2 y 3)', 'Estilo Indirecto (Reported Speech)', 'Expresiones de Opinión', 'Inglés para el Trabajo', 'Tecnología'] },
    { id: 'C1', name: 'Avanzado (C1)', topics: ['Modismos y Slang', 'Inglés de Negocios', 'Debate y Argumentación', 'Matices de Pronunciación', 'Redacción Formal', 'Literatura'] }
];

export function initConfig() {
    // Validar o inicializar keys si es necesario
    const currentKeys = localStorage.getItem(CONFIG.API_KEYS_KEY);
    if(!currentKeys || currentKeys.length < 10) {
        console.log("Inicializando API Keys por defecto...");
        localStorage.setItem(CONFIG.API_KEYS_KEY, "AIzaSyDBNgYIJLCksdy9Ij7gZ-ofQtfmzcVMEGw,AIzaSyBQhp4KQZgmaSpt3a1cz7al7qUah5TbODI,AIzaSyA8_qSO0lUpx2rO6LOmXQ8F5gsmiRF7B5E,AIzaSyC-SxodAxeSL-XYEauF49hy4_qsVxIUPKc");
    }
}
