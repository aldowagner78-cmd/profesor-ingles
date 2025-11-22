// Módulo de Perfil
import { getState, getVocabulary, resetState, updateState, exportVocabulary, isTopicCompleted } from '../state.js';
import { setApiKey } from '../services/gemini.js';
import { setSpeechRate } from '../services/voice.js';
import { SYLLABUS } from '../config.js';
import { callGemini } from '../services/gemini.js';
import { speakText } from '../services/voice.js';
import { showToast, createAudioButton, showLoading } from '../utils/ui.js';

let currentVocabFilter = 'all';
let deferredPrompt = null;

export function initProfile() {
    console.log("Inicializando Perfil...");
    
    // Detectar evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Mostrar botón de instalar
        const installBtn = document.getElementById('install-app-btn');
        if (installBtn) {
            installBtn.style.display = 'flex';
        }
    });
    
    // Botón Instalar App
    document.getElementById('install-app-btn')?.addEventListener('click', async () => {
        if (!deferredPrompt) {
            showToast('La app ya está instalada o no se puede instalar', 'info');
            return;
        }
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            showToast('🎉 ¡App instalada con éxito!', 'success');
            document.getElementById('install-app-btn').style.display = 'none';
        }
        
        deferredPrompt = null;
    });
    
    // Inicializar tema
    const state = getState();
    if (state.darkMode) {
        document.body.setAttribute('data-theme', 'dark');
        updateThemeUI(true);
    }
    
    // Toggle de Tema
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        const state = getState();
        const newDarkMode = !state.darkMode;
        updateState({ darkMode: newDarkMode });
        
        if (newDarkMode) {
            document.body.setAttribute('data-theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
        }
        
        updateThemeUI(newDarkMode);
        showToast(newDarkMode ? '🌙 Modo oscuro activado' : '☀️ Modo claro activado', 'success');
    });
    
    // Slider de Velocidad
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
    
    if (speedSlider && speedValue) {
        speedSlider.addEventListener('input', (e) => {
            const rate = parseFloat(e.target.value);
            setSpeechRate(rate);
            speedValue.textContent = `${rate.toFixed(1)}x`;
        });
    }
    
    // Botón Cambiar API Key
    document.getElementById('change-key-btn')?.addEventListener('click', () => {
        if (confirm('¿Quieres cambiar tu API Key?')) {
            setApiKey('');
            location.reload();
        }
    });
    
    // Botón Reset
    document.getElementById('reset-btn')?.addEventListener('click', () => {
        if (confirm('¿Estás seguro de borrar todo tu progreso? Esta acción no se puede deshacer.')) {
            // Guardar API key antes de limpiar
            const apiKey = localStorage.getItem('gemini_api_key');
            
            resetState();
            localStorage.clear();
            
            // Restaurar API key
            if (apiKey) {
                localStorage.setItem('gemini_api_key', apiKey);
            }
            
            location.reload();
        }
    });
    
    // Filtros de Vocabulario
    const filters = ['all', 'a1', 'a2', 'b1', 'b2', 'c1'];
    filters.forEach(filter => {
        document.getElementById(`vocab-filter-${filter}`)?.addEventListener('click', () => {
            currentVocabFilter = filter;
            updateFilterButtons();
            renderVocabulary();
        });
    });
    
    // Botón Exportar
    document.getElementById('vocab-export')?.addEventListener('click', () => {
        const csv = exportVocabulary();
        if (csv.split('\n').length <= 2) {
            showToast('No hay vocabulario para exportar', 'error');
            return;
        }
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vocabulario-profesor-ia-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('✅ Vocabulario exportado', 'success');
    });
    
    // Escuchar cambios de estado
    window.addEventListener('stateChanged', renderProfile);
    window.addEventListener('vocabularyChanged', renderVocabulary);
    
    // Render inicial
    renderProfile();
    renderVocabulary();
}

function updateThemeUI(isDark) {
    const icon = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');
    
    if (icon && label) {
        icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
        label.textContent = isDark ? 'Desactivar modo oscuro' : 'Activar modo oscuro';
        if (window.lucide) window.lucide.createIcons();
    }
}

// Obtener icono específico según categoría de palabra
function getWordIcon(word) {
    const w = word.toLowerCase();
    
    // Animales
    if (/dog|cat|bird|fish|lion|tiger|elephant|bear|cow|horse|sheep|pig|chicken|duck|rabbit|mouse|snake|frog|monkey|giraffe|zebra|kangaroo/.test(w)) return '🐾';
    
    // Frutas
    if (/apple|banana|orange|grape|lemon|watermelon|strawberry|pear|peach|cherry|mango|pineapple|kiwi|melon/.test(w)) return '🍎';
    
    // Comida
    if (/food|meal|dinner|lunch|breakfast|pizza|burger|sandwich|bread|cheese|egg|meat|chicken|rice|pasta|soup|salad|cake|cookie/.test(w)) return '🍽️';
    
    // Bebidas
    if (/water|juice|milk|coffee|tea|soda|beer|wine|drink/.test(w)) return '🥤';
    
    // Partes del cuerpo
    if (/mouth|eye|hand|foot|head|nose|ear|arm|leg|finger|toe|knee|elbow|shoulder|neck|face|body|hair|tooth|teeth/.test(w)) return '👤';
    
    // Útiles escolares
    if (/pencil|pen|book|notebook|eraser|ruler|scissors|glue|paper|crayon|marker/.test(w)) return '📝';
    
    // Vehículos
    if (/car|bus|train|plane|bike|motorcycle|truck|boat|ship|taxi|subway/.test(w)) return '🚗';
    
    // Naturaleza
    if (/tree|flower|plant|sun|moon|star|cloud|rain|snow|wind|mountain|river|ocean|beach|forest|grass|leaf/.test(w)) return '🌿';
    
    // Casa/Muebles
    if (/chair|table|bed|door|window|house|room|kitchen|bathroom|sofa|couch|desk|lamp|mirror/.test(w)) return '🏠';
    
    // Ropa
    if (/shirt|pants|shoes|dress|hat|jacket|coat|socks|skirt|jeans|sweater|tie|belt|gloves/.test(w)) return '👕';
    
    // Números/Tiempo
    if (/number|time|clock|hour|minute|day|week|month|year|today|tomorrow|yesterday|morning|afternoon|evening|night/.test(w)) return '🕐';
    
    // Colores
    if (/red|blue|green|yellow|black|white|color|pink|purple|orange|brown|gray|grey/.test(w)) return '🎨';
    
    // Verbos/Acciones
    if (/walk|run|jump|eat|drink|sleep|play|read|write|speak|talk|listen|see|look|watch|go|come|work|study/.test(w)) return '🏃';
    
    // Emociones
    if (/happy|sad|angry|tired|excited|scared|surprised|worried|love|hate|feel|emotion/.test(w)) return '😊';
    
    // Tecnología
    if (/computer|phone|tablet|laptop|internet|email|app|website|software|screen|keyboard|mouse/.test(w)) return '💻';
    
    // Default
    return '📚';
}

function updateFilterButtons() {
    const filters = ['all', 'a1', 'a2', 'b1', 'b2', 'c1'];
    filters.forEach(filter => {
        const btn = document.getElementById(`vocab-filter-${filter}`);
        if (btn) {
            if (filter === currentVocabFilter) {
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-primary');
            } else {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
            }
        }
    });
}

export function renderProfile() {
    const state = getState();
    const currentLevel = SYLLABUS[state.levelIdx];
    
    // Actualizar Score en Header
    const scoreDisplay = document.getElementById('score-display');
    if (scoreDisplay) scoreDisplay.textContent = state.score;
    
    // Actualizar Nivel en Header
    const levelDisplay = document.getElementById('level-display');
    if (levelDisplay) levelDisplay.textContent = currentLevel.name;
    
    // Actualizar Score en Perfil
    const profileScore = document.getElementById('profile-score');
    if (profileScore) profileScore.textContent = state.score;
    
    // Actualizar Racha en Perfil
    const profileStreak = document.getElementById('profile-streak');
    if (profileStreak) profileStreak.textContent = state.dailyStreak || 0;
    
    // Actualizar Nivel en Perfil
    const profileLevel = document.getElementById('profile-level');
    if (profileLevel) profileLevel.textContent = currentLevel.name;
    
    // Actualizar Barra de Progreso
    updateProgressBar();
    
    // Renderizar Syllabus
    renderSyllabus();
}

function renderSyllabus() {
    const state = getState();
    const list = document.getElementById('syllabus-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    SYLLABUS.forEach((level, lIdx) => {
        level.topics.forEach((topic, tIdx) => {
            const isCompleted = isTopicCompleted(lIdx, tIdx);
            const isCurrent = lIdx === state.levelIdx && tIdx === state.topicIdx;
            const isLocked = lIdx > state.levelIdx || (lIdx === state.levelIdx && tIdx > state.topicIdx);
            
            const item = document.createElement('div');
            item.className = 'syllabus-item';
            if (isLocked) item.style.opacity = '0.5';
            
            let iconClass = 'locked';
            let iconName = 'lock';
            if (isCompleted) {
                iconClass = 'completed';
                iconName = 'check';
            } else if (isCurrent) {
                iconClass = 'current';
                iconName = 'play';
            }
            
            let contentClass = '';
            if (isCurrent) contentClass = 'current';
            
            item.innerHTML = `
                <div class="syllabus-icon ${iconClass}">
                    <i data-lucide="${iconName}"></i>
                </div>
                <div class="syllabus-content ${contentClass}">
                    <p class="syllabus-level">${level.name}</p>
                    <p class="syllabus-topic">${topic}${isCompleted ? ' ✅' : ''}</p>
                </div>
            `;
            
            list.appendChild(item);
        });
    });
    
    if (window.lucide) window.lucide.createIcons();
}

function updateProgressBar() {
    const state = getState();
    const progressBar = document.getElementById('progress-bar');
    const progressCurrent = document.getElementById('progress-current');
    const progressTarget = document.getElementById('progress-target');
    const progressMessage = document.getElementById('progress-message');
    
    if (!progressBar || !progressCurrent || !progressTarget || !progressMessage) return;
    
    // Definir meta de puntos por nivel (ejemplo: cada nivel requiere más puntos)
    const pointsPerLevel = [500, 750, 1000, 1500, 2000]; // A1, A2, B1, B2, C1
    const currentLevelTarget = pointsPerLevel[state.levelIdx] || 1000;
    
    // Calcular puntos desde el inicio del nivel actual
    const previousLevelsPoints = pointsPerLevel.slice(0, state.levelIdx).reduce((sum, p) => sum + p, 0);
    const currentLevelPoints = state.score - previousLevelsPoints;
    
    // Asegurar que no sea negativo
    const pointsInLevel = Math.max(0, currentLevelPoints);
    const percentage = Math.min(100, (pointsInLevel / currentLevelTarget) * 100);
    
    progressBar.style.width = `${percentage}%`;
    progressCurrent.textContent = `${pointsInLevel} puntos`;
    progressTarget.textContent = `${currentLevelTarget} puntos`;
    
    const remaining = currentLevelTarget - pointsInLevel;
    if (remaining > 0) {
        progressMessage.textContent = `Te faltan ${remaining} puntos para el siguiente nivel`;
    } else {
        progressMessage.textContent = `¡Listo para avanzar! Completa todos los temas.`;
    }
}

function renderVocabulary() {
    const vocab = getVocabulary();
    const list = document.getElementById('vocabulary-list');
    if (!list) return;
    
    // Aplicar filtro
    let filteredVocab = vocab;
    if (currentVocabFilter !== 'all') {
        filteredVocab = vocab.filter(word => 
            (word.level || 'A1').toUpperCase() === currentVocabFilter.toUpperCase()
        );
    }
    
    if (filteredVocab.length === 0) {
        const message = currentVocabFilter === 'all' 
            ? 'Aún no has aprendido palabras. ¡Usa la cámara para empezar!'
            : `No hay palabras del nivel ${currentVocabFilter.toUpperCase()}`;
        list.innerHTML = `<p style="text-align: center; color: #94A3B8; font-size: 0.875rem; padding: 2rem;">${message}</p>`;
        return;
    }
    
    // Cambiar a lista vertical
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '0.5rem';
    list.innerHTML = '';
    
    filteredVocab.forEach(word => {
        const card = document.createElement('div');
        card.className = 'vocab-item-list';
        card.style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: 0.75rem;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        
        // Icono específico por categoría
        const icon = getWordIcon(word.object);
        
        card.innerHTML = `
            <span style="font-size: 1.5rem;">${icon}</span>
            <div style="flex: 1;">
                <div style="font-weight: 700; color: var(--color-text-primary); font-size: 0.9375rem;">
                    ${word.object} <span style="color: var(--color-text-muted); font-weight: 400;">(${word.translation})</span>
                </div>
            </div>
            <button class="vocab-audio-btn" style="
                background: var(--color-primary);
                color: white;
                border: none;
                border-radius: 50%;
                width: 2.5rem;
                height: 2.5rem;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: transform 0.2s ease;
            ">
                <i data-lucide="volume-2" style="width: 1.25rem; height: 1.25rem;"></i>
            </button>
        `;
        
        // Hover effect
        card.addEventListener('mouseenter', () => {
            card.style.borderColor = 'var(--color-primary)';
            card.style.transform = 'translateX(4px)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.borderColor = 'var(--color-border)';
            card.style.transform = 'translateX(0)';
        });
        
        // Click en tarjeta → abrir modal
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.vocab-audio-btn')) {
                showVocabModal(word);
            }
        });
        
        // Click en botón de audio → reproducir solo inglés
        const audioBtn = card.querySelector('.vocab-audio-btn');
        audioBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            speakText(word.object, 'en-US');
        });
        
        list.appendChild(card);
    });
    
    if (window.lucide) window.lucide.createIcons();
}

async function showVocabModal(word) {
    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.maxWidth = '500px';
    
    // Icono específico
    const icon = getWordIcon(word.object);
    
    content.innerHTML = `
        <button id="vocab-modal-close" class="btn-close">
            <i data-lucide="x"></i>
        </button>
        <div style="padding: 1rem;">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="font-size: 3rem; margin-bottom: 0.5rem;">${icon}</div>
                <h2 style="font-size: 2rem; font-weight: 900; color: #4A90E2; margin-bottom: 0.5rem;">
                    ${word.object}
                </h2>
                <p style="font-size: 0.875rem; color: #64748B; font-family: monospace; margin-bottom: 0.25rem;">
                    ${word.ipa || ''}
                </p>
                <p style="color: #64748B;">
                    <strong>Español:</strong> ${word.translation}
                </p>
            </div>
            <div id="vocab-examples" style="margin-top: 1rem;">
                <p style="font-weight: 700; margin-bottom: 0.75rem; color: #1E293B;">
                    Ejemplos de uso:
                </p>
            </div>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    if (window.lucide) window.lucide.createIcons();
    
    // Cerrar modal
    const closeBtn = content.querySelector('#vocab-modal-close');
    closeBtn?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    // Generar ejemplos bilingües
    const examplesContainer = content.querySelector('#vocab-examples');
    const loader = showLoading(examplesContainer, 'Generando ejemplos...');
    
    try {
        const prompt = `
            You are an English Teacher API.
            Task: Generate 3 simple example sentences using the word "${word.object}".
            IMPORTANT: Each sentence must include Spanish translation in parentheses.
            Format: "English sentence (Traducción al español)"
            
            Respond STRICTLY in JSON format:
            {
                "type": "examples",
                "sentences": [
                    "I eat an apple every day (Como una manzana todos los días)",
                    "The apple is red (La manzana es roja)",
                    "She likes green apples (A ella le gustan las manzanas verdes)"
                ]
            }
        `;
        
        const data = await callGemini(prompt);
        
        loader.remove();
        
        if (data.sentences && Array.isArray(data.sentences)) {
            data.sentences.forEach(sentence => {
                const div = document.createElement('div');
                div.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1rem;
                    background: #F8FAFC;
                    border-radius: 0.75rem;
                    margin-bottom: 0.5rem;
                    border: 1px solid #E2E8F0;
                `;
                
                const text = document.createElement('span');
                text.textContent = sentence;
                text.style.cssText = 'flex: 1; font-size: 0.875rem; line-height: 1.5;';
                
                // Extraer solo inglés para audio
                const englishOnly = sentence.split('(')[0].trim();
                const audioBtn = createAudioButton(englishOnly, 'en-US');
                audioBtn.style.marginLeft = '0';
                
                div.appendChild(text);
                div.appendChild(audioBtn);
                examplesContainer.appendChild(div);
            });
            
            if (window.lucide) window.lucide.createIcons();
        }
        
    } catch (e) {
        loader.remove();
        examplesContainer.innerHTML += `
            <p style="color: #EF4444; font-size: 0.875rem; text-align: center;">
                Error al generar ejemplos: ${e.message}
            </p>
        `;
    }
}
