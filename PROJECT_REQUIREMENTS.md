# Especificaciones de Diseño: "Profesor IA - Inglés"

Este documento detalla los requerimientos funcionales y técnicos para reconstruir la aplicación desde cero en una sola interacción.

## 1. Visión General
Aplicación web progresiva (PWA) de cliente único (sin backend) para la enseñanza de inglés mediante Inteligencia Artificial Generativa. La app utiliza un modelo **BYOK (Bring Your Own Key)** donde el usuario introduce su propia API Key de Google Gemini.

## 2. Stack Tecnológico
-   **Core:** HTML5, Vanilla JavaScript (ES Modules), CSS3.
-   **Estilos:** CSS3 Nativo (Variables CSS, Flexbox, Grid). Sin frameworks externos (como Tailwind) para evitar dependencias rotas en el futuro. Diseño 100% custom y responsivo.
-   **IA:** Google Gemini API (Modelo: `gemini-2.0-flash`).
-   **Persistencia:** `localStorage` (para progreso, API Key y vocabulario aprendido).
-   **Audio:** Web Speech API (`SpeechSynthesis` para TTS, `SpeechRecognition` para STT).
-   **Iconos:** Lucide Icons.
-   **Markdown:** Marked.js (para renderizar lecciones).

## 3. Estrategia de Audio (Crítico)
El manejo de voces debe ser preciso para evitar confusión.
*   **Voz en Inglés (`en-US` o `en-GB`):** Se usa EXCLUSIVAMENTE para leer palabras, oraciones de ejemplo y respuestas del bot en el chat ("reply").
*   **Voz en Español (`es-ES` o `es-MX`):** Se usa para feedback de errores en el juego ("Eso parece una manzana...") o instrucciones habladas específicas.
*   **Silencio (Solo Texto):** Las explicaciones gramaticales (Lecciones) y las instrucciones de Roleplay NO se leen automáticamente, solo se muestran en texto para lectura comprensiva.
*   **Control de Velocidad (Rate):** El usuario debe poder ajustar la velocidad de lectura (0.5x a 1.5x) desde el Perfil o un menú de configuración rápida, afectando a todas las voces en inglés.

---

## 4. Detalle de Funcionalidades

### A. Módulo de Cámara (Vision AI)
El usuario interactúa con el mundo real para aprender vocabulario.
*   **Hardware:** Acceso a cámara trasera (móvil) o webcam.
*   **Interfaz Inicial:** Al entrar, mostrar claramente dos botones grandes para elegir modo: **[🔭 Explorar]** y **[🎮 Jugar]**. No iniciar el juego automáticamente.
*   **Modos de Operación:**
    1.  **Modo Explorar (Libre):**
        *   **Acción:** Usuario apunta y captura foto.
        *   **Prompt IA:** Identificar objeto principal. Generar oración de ejemplo simple.
        *   **Respuesta IA (JSON):** `{ "object": "Chair", "ipa": "/tʃɛər/", "translation": "Silla", "sentence": "The cat is under the chair." }`
        *   **UI:**
            *   Tarjeta con: Palabra (Inglés), IPA, Traducción (Español).
            *   Oración de ejemplo debajo.
            *   **Audio:** Reproducción automática de la *Palabra*. Botón 🔊 pequeño al lado de la *Oración* para escucharla en Inglés.
            *   **Validación Usuario:** Dos botones: [✅ Correcto] / [❌ Incorrecto].
                *   **Si Correcto:** +Puntos, Confeti, Guardar palabra en "Vocabulario Aprendido".
                *   **Si Incorrecto:** Input de texto (Prompt: "¿Qué es?"). Usuario escribe "Mesa". IA genera nueva oración con "Table", reproduce audio y guarda en Vocabulario.

    2.  **Modo Juego (Scavenger Hunt):**
        *   **Inicio:** Usuario pulsa "Jugar".
        *   **Lógica:** App selecciona objeto random (ej: "Banana").
        *   **Misión:** Texto: "Encuentra: Banana". **Audio (Español):** "Encuentra: Banana".
        *   **Validación:** Foto -> IA analiza `found: boolean`.
        *   **Éxito (`found: true`):**
            *   **Audio (Inglés):** "Great job! You found the Banana."
            *   **Refuerzo:** Mostrar 2 oraciones de ejemplo con la palabra. Botones de audio individuales para cada oración.
            *   **Recompensa:** +Puntos, Confeti.
        *   **Fallo (`found: false`):**
            *   **Audio (Español):** "Eso parece una [Objeto detectado], busca una Banana."
            *   Texto de feedback en español.

### B. Módulo de Clase (Chat AI)
Tutor virtual consciente del nivel.
*   **Contexto:** Nivel (A1-C1) y Tema actual.
*   **Entradas:** Texto y Voz (STT).
*   **Botones de Acción Rápida:**
    1.  **📚 Lección:**
        *   **Contenido:** Explicación gramatical en **Español**. Ejemplos en **Inglés**.
        *   **Formato:** Markdown (Negritas, Listas).
        *   **Audio Interactivo:** CADA ejemplo en inglés dentro de la lección debe tener un botón 🔊 al lado para escuchar la pronunciación exacta.
    2.  **📝 Quiz:**
        *   **Contenido:** Pregunta opción múltiple (4 opciones: A, B, C, D).
        *   **Validación:** Local (sin llamar a IA al responder). Feedback inmediato.
    3.  **🎭 Roleplay:**
        *   **Inicio:** Instrucción de escenario en **Español** (Texto, no audio). Ej: "Estás en un hotel, pide una habitación...".
        *   **Interacción:** Usuario habla/escribe en Inglés. IA responde en Inglés (con Audio) y da feedback en Español (Texto).
    4.  **⏭️ Siguiente:** Avanza tema.

*   **Formato de Respuesta Chat (JSON):**
    *   `reply`: Texto en Inglés (Lo que dice el personaje/profesor). **Audio Automático (Inglés).**
    *   `feedback`: Comentario pedagógico en Español. **Texto (Sin Audio).**
    *   `correction`: Corrección de errores (si los hay). **Texto (Sin Audio).**

### C. Módulo de Perfil
*   **Gamificación:** Puntos y Racha.
*   **Configuración de Audio:** Slider para ajustar velocidad de voz (0.5x - 1.5x).
*   **Vocabulario Aprendido (Interactivo):**
    *   Lista de tarjetas con las palabras descubiertas (Icono + Palabra Inglés + Traducción).
    *   **Interacción:** Al hacer clic en una palabra (ej: "Cup"), se abre un mini-modal o expansión.
    *   **Acción IA:** Solicita a la IA 3 oraciones nuevas usando esa palabra en diferentes contextos.
    *   **Resultado:** Muestra las oraciones con botones de audio 🔊 para practicar listening.
*   **Mapa de Aprendizaje:** Lista de Niveles/Temas con estado (Bloqueado/Actual/Completado).
*   **Configuración:** Reset Progreso, Cambiar API Key.

---

## 5. Protocolo de IA (Critical)
*   **Modelo:** `gemini-2.0-flash`.
*   **System Prompt:** "You are an English Teacher API. You respond STRICTLY in JSON. No markdown blocks. Your JSON must be clean and parseable."
*   **JSON Schemas:**
    *   `type: "analysis"` (Vision): `{ object, ipa, translation, sentence, found (bool), description_es (for errors) }`
    *   `type: "chat"` (Conversation): `{ reply (en), feedback (es), correction (en/null) }`
    *   `type: "lesson"` (Theory): `{ title, content_markdown (es explanation, en examples) }`
    *   `type: "quiz"` (Test): `{ question, options[], answer_index }`

## 6. Flujo de Inicio
1.  Check `localStorage`.
2.  No Key -> Modal (Glassmorphism).
3.  Has Key -> Init App.

---

**¿Falta algún detalle en esta lista antes de generar el Prompt Maestro?**
