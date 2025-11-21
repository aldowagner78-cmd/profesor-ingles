// Configuración Global
export const CONFIG = {
    APP_NAME: 'Profesor IA',
    VERSION: '4.0.0',
    DEFAULT_LANG: 'es',
    GEMINI_MODEL: 'gemini-2.0-flash',
    API_KEYS_KEY: 'profesor_ia_user_apikey',
    STATE_KEY: 'profesor_ia_state',
    VOCAB_KEY: 'profesor_ia_vocabulary'
};

export const SYLLABUS = [
    { 
        id: 'A1', 
        name: 'Nivel Inicial (A1)', 
        topics: [
            'Saludos y Despedidas', 
            'Verbo To Be', 
            'Colores y Números', 
            'La Familia', 
            'Presente Simple', 
            'Ropa y Accesorios'
        ] 
    },
    { 
        id: 'A2', 
        name: 'Nivel Básico (A2)', 
        topics: [
            'Rutinas Diarias', 
            'Pasado Simple', 
            'Futuro con Going To', 
            'Comida y Restaurantes', 
            'Adjetivos Comparativos', 
            'Direcciones y Lugares'
        ] 
    },
    { 
        id: 'B1', 
        name: 'Intermedio (B1)', 
        topics: [
            'Experiencias (Present Perfect)', 
            'Condicionales (0 y 1)', 
            'Obligaciones (Must/Have to)', 
            'Viajes y Turismo', 
            'Voz Pasiva Simple', 
            'Salud y Cuerpo'
        ] 
    },
    { 
        id: 'B2', 
        name: 'Intermedio Alto (B2)', 
        topics: [
            'Phrasal Verbs Comunes', 
            'Condicionales (2 y 3)', 
            'Estilo Indirecto (Reported Speech)', 
            'Expresiones de Opinión', 
            'Inglés para el Trabajo', 
            'Tecnología'
        ] 
    },
    { 
        id: 'C1', 
        name: 'Avanzado (C1)', 
        topics: [
            'Modismos y Slang', 
            'Inglés de Negocios', 
            'Debate y Argumentación', 
            'Matices de Pronunciación', 
            'Redacción Formal', 
            'Literatura'
        ] 
    }
];

export const GAME_OBJECTS = [
    { es: 'Plátano', en: 'Banana' },
    { es: 'Manzana', en: 'Apple' },
    { es: 'Taza', en: 'Cup' },
    { es: 'Botella', en: 'Bottle' },
    { es: 'Silla', en: 'Chair' },
    { es: 'Bolígrafo', en: 'Pen' },
    { es: 'Laptop', en: 'Laptop' },
    { es: 'Libro', en: 'Book' },
    { es: 'Zapato', en: 'Shoe' },
    { es: 'Llaves', en: 'Keys' },
    { es: 'Teléfono', en: 'Phone' },
    { es: 'Reloj', en: 'Watch' },
    { es: 'Gafas', en: 'Glasses' },
    { es: 'Bolsa', en: 'Bag' },
    { es: 'Sombrero', en: 'Hat' }
];
