// Módulo de Perfil
import { getState, getVocabulary, resetState, updateState, exportVocabulary, isTopicCompleted, getWordsForReview, updateWordSRS, getCurrentProfile, getAllProfiles } from '../state.js';
import { setApiKey } from '../services/gemini.js';
import { setSpeechRate } from '../services/voice.js';
import { SYLLABUS } from '../config.js';
import { callGemini } from '../services/gemini.js';
import { speakText } from '../services/voice.js';
import { showToast, createAudioButton, showLoading, showConfirmModal } from '../utils/ui.js';
import { showProfileSwitcher } from './profiles.js';

let currentVocabFilter = 'all';
let deferredPrompt = null;
let srsReviewSession = null; // Estado de la sesión de repaso

// Capturar evento lo antes posible (fuera de initProfile)
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('✨ Evento beforeinstallprompt capturado');
    e.preventDefault();
    deferredPrompt = e;
    
    // Intentar mostrar el botón si el DOM ya está listo
    const installBtn = document.getElementById('install-app-btn');
    if (installBtn) {
        installBtn.style.display = 'flex';
    }
});

const AVATARS = [
    '👨‍🎓', '👩‍🎓', '🧑‍🏫', '🤖', '👽', '🦊', 
    '🦁', '🐯', '🐨', '🐼', '🐸', '🦄',
    '🦸', '🦹', '🧙', '🧚', '🧛', '🧟'
];

export function initProfile() {
    console.log("Inicializando Perfil...");
    
    // Inicializar Avatar
    const savedAvatar = localStorage.getItem('userAvatar') || '👨‍🎓';
    updateAvatarUI(savedAvatar);

    // Evento abrir modal avatar
    document.getElementById('profile-avatar-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('avatar-modal');
        const grid = document.getElementById('avatar-grid');
        
        if (grid && grid.children.length === 0) {
            // Generar grid si está vacío
            AVATARS.forEach(avatar => {
                const btn = document.createElement('button');
                btn.className = 'avatar-option';
                btn.textContent = avatar;
                btn.style.cssText = `
                    font-size: 2rem;
                    background: var(--color-surface);
                    border: 2px solid var(--color-border);
                    border-radius: 0.75rem;
                    padding: 0.5rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    aspect-ratio: 1;
                `;
                
                btn.addEventListener('click', () => {
                    localStorage.setItem('userAvatar', avatar);
                    updateAvatarUI(avatar);
                    modal.classList.add('hidden');
                    showToast('Avatar actualizado', 'success');
                });
                
                btn.addEventListener('mouseenter', () => {
                    btn.style.transform = 'scale(1.1)';
                    btn.style.borderColor = 'var(--color-primary)';
                });
                
                btn.addEventListener('mouseleave', () => {
                    btn.style.transform = 'scale(1)';
                    btn.style.borderColor = 'var(--color-border)';
                });
                
                grid.appendChild(btn);
            });
        }
        
        modal.classList.remove('hidden');
    });

    // Cerrar modal avatar
    document.getElementById('close-avatar-modal')?.addEventListener('click', () => {
        document.getElementById('avatar-modal').classList.add('hidden');
    });

    // Verificar si ya tenemos el evento guardado
    if (deferredPrompt) {
        const installBtn = document.getElementById('install-app-btn');
        if (installBtn) {
            installBtn.style.display = 'flex';
        }
    }
    
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

    // Slider de Tamaño de Fuente
    const fontSlider = document.getElementById('font-size-slider');
    const fontValue = document.getElementById('font-size-value');
    
    if (fontSlider && fontValue) {
        // Cargar valor guardado
        const savedSize = localStorage.getItem('fontSize') || '100';
        fontSlider.value = savedSize;
        updateFontSize(savedSize);
        updateFontLabel(savedSize, fontValue);

        fontSlider.addEventListener('input', (e) => {
            const size = e.target.value;
            updateFontSize(size);
            updateFontLabel(size, fontValue);
            localStorage.setItem('fontSize', size);
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
        showConfirmModal(
            '¿Reiniciar Progreso?',
            'Se borrarán todos tus puntos, nivel y vocabulario. Tu API Key se mantendrá guardada.',
            () => {
                // Guardar API key antes de limpiar usando la clave correcta de CONFIG
                const apiKey = localStorage.getItem(CONFIG.API_KEYS_KEY);
                
                resetState();
                localStorage.clear();
                
                // Restaurar API key
                if (apiKey) {
                    localStorage.setItem(CONFIG.API_KEYS_KEY, apiKey);
                }
                
                location.reload();
            }
        );
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
    
    // Botón Descargar Backup (JSON completo)
    document.getElementById('backup-download-btn')?.addEventListener('click', () => {
        try {
            // Crear objeto con TODO el localStorage
            const backup = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                backup[key] = localStorage.getItem(key);
            }
            
            const json = JSON.stringify(backup, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `profesor-ia-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('💾 Backup descargado correctamente', 'success');
        } catch (e) {
            showToast(`Error al crear backup: ${e.message}`, 'error');
        }
    });
    
    // Botón Restaurar Backup
    document.getElementById('backup-restore-btn')?.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const backup = JSON.parse(text);
                
                showConfirmModal(
                    '¿Restaurar Backup?',
                    'Esto sobrescribirá todo tu progreso actual con los datos del archivo.',
                    () => {
                        // Restaurar cada clave del backup
                        localStorage.clear();
                        for (const [key, value] of Object.entries(backup)) {
                            localStorage.setItem(key, value);
                        }
                        
                        showToast('✅ Backup restaurado. Recargando...', 'success');
                        setTimeout(() => location.reload(), 1500);
                    }
                );
                
            } catch (e) {
                showToast(`Error al leer archivo: ${e.message}`, 'error');
            }
        });
        
        input.click();
    });
    
    // Sistema de Repetición Espaciada (SRS)
    document.getElementById('start-srs-review-btn')?.addEventListener('click', startSRSReview);
    
    // Botón Cambiar Perfil
    document.getElementById('switch-profile-btn')?.addEventListener('click', () => {
        showProfileSwitcher();
    });
    
    // Escuchar cambios de estado
    window.addEventListener('stateChanged', renderProfile);
    window.addEventListener('vocabularyChanged', () => {
        renderVocabulary();
        updateSRSBanner();
    });
    
    // Render inicial
    renderProfile();
    renderVocabulary();
    updateSRSBanner();
}

function updateThemeUI(isDark) {
    const iconMoon = document.getElementById('theme-icon-moon');
    const iconSun = document.getElementById('theme-icon-sun');
    const label = document.getElementById('theme-label');
    
    if (iconMoon && iconSun) {
        if (isDark) {
            iconMoon.style.opacity = '0';
            iconSun.style.opacity = '1';
        } else {
            iconMoon.style.opacity = '1';
            iconSun.style.opacity = '0';
        }
    }
    
    if (label) {
        label.textContent = isDark ? 'Desactivar modo oscuro' : 'Activar modo oscuro';
    }
}

function updateFontSize(size) {
    // Ajustar el tamaño de fuente raíz (afecta a todos los rem)
    // 100% = 16px (default), 125% = 20px
    document.documentElement.style.fontSize = `${size}%`;
}

function updateFontLabel(size, labelEl) {
    const s = parseInt(size);
    if (s <= 105) labelEl.textContent = 'Pequeño';
    else if (s <= 115) labelEl.textContent = 'Mediano';
    else labelEl.textContent = 'Grande';
}

// Obtener icono específico según categoría de palabra
function getWordIcon(word) {
    const w = word.toLowerCase().trim();
    
    // Helper para regex de palabra completa
    const matches = (keywords) => new RegExp(`\\b(${keywords})\\b`, 'i').test(w);

    // Electrónica / Gadgets (Prioridad alta para 'remote')
    if (matches('remote|remote control|tv|television|camera|battery|charger|plug|switch|button|control')) return '📺';
    
    // Baño / Higiene (Prioridad alta para 'paper' compuesto)
    if (matches('toilet paper|soap|shampoo|towel|toothbrush|toothpaste|bath|shower|toilet|tissue|hygiene')) return '🧻';

    // Animales
    if (matches('dog|cat|bird|fish|lion|tiger|elephant|bear|cow|horse|sheep|pig|chicken|duck|rabbit|mouse|snake|frog|monkey|giraffe|zebra|kangaroo|pet|animal|insect|spider|fly|bee|butterfly')) return '🐾';
    
    // Frutas / Verduras
    if (matches('apple|banana|orange|grape|lemon|watermelon|strawberry|pear|peach|cherry|mango|pineapple|kiwi|melon|fruit|berry|vegetable|carrot|potato|tomato|onion|garlic|lettuce|cucumber')) return '🍎';
    
    // Comida (General)
    if (matches('food|meal|dinner|lunch|breakfast|pizza|burger|sandwich|bread|cheese|egg|meat|chicken|rice|pasta|soup|salad|cake|cookie|chocolate|candy|sugar|salt|pepper|butter|oil')) return '🍔';
    
    // Bebidas
    if (matches('water|juice|milk|coffee|tea|soda|beer|wine|drink|beverage|bottle')) return '🥤';
    
    // Vajilla / Cocina (Glass específico aquí)
    if (matches('glass|cup|mug|plate|dish|fork|spoon|knife|pan|pot|bowl|kitchen|cooker|oven|fridge|microwave')) return '🍽️';
    
    // Partes del cuerpo
    if (matches('mouth|eye|hand|foot|head|nose|ear|arm|leg|finger|toe|knee|elbow|shoulder|neck|face|body|hair|tooth|teeth|back|stomach|heart|brain')) return '👤';
    
    // Útiles escolares / Oficina (Paper genérico aquí, después de toilet paper)
    if (matches('pencil|pen|book|notebook|eraser|ruler|scissors|glue|paper|crayon|marker|desk|school|class|student|teacher|board|backpack|bag')) return '📝';
    
    // Vehículos / Transporte
    if (matches('car|bus|train|plane|airplane|bike|bicycle|motorcycle|truck|boat|ship|taxi|subway|vehicle|drive|ride|wheel|tire')) return '🚗';
    
    // Naturaleza
    if (matches('tree|flower|plant|sun|moon|star|cloud|rain|snow|wind|mountain|river|ocean|beach|forest|grass|leaf|sky|nature|world|earth|stone|rock|sand')) return '🌿';
    
    // Casa / Muebles
    if (matches('chair|table|bed|door|window|house|room|kitchen|bathroom|bedroom|living room|sofa|couch|desk|lamp|mirror|home|apartment|floor|wall|roof|ceiling|carpet|rug')) return '🏠';
    
    // Ropa
    if (matches('shirt|t-shirt|pants|trousers|shoes|dress|hat|cap|jacket|coat|socks|skirt|jeans|sweater|tie|belt|gloves|clothes|wear|fashion|scarf|boots')) return '👕';
    
    // Números / Tiempo
    if (matches('number|time|clock|hour|minute|second|day|week|month|year|today|tomorrow|yesterday|morning|afternoon|evening|night|monday|tuesday|wednesday|thursday|friday|saturday|sunday')) return '🕐';
    
    // Colores
    if (matches('red|blue|green|yellow|black|white|color|pink|purple|orange|brown|gray|grey|dark|light|gold|silver')) return '🎨';
    
    // Verbos / Acciones
    if (matches('walk|run|jump|eat|drink|sleep|play|read|write|speak|talk|listen|see|look|watch|go|come|work|study|learn|teach|do|make|buy|sell|open|close')) return '🏃';
    
    // Emociones
    if (matches('happy|sad|angry|tired|excited|scared|surprised|worried|love|hate|feel|emotion|smile|cry|laugh|bored')) return '😊';
    
    // Tecnología
    if (matches('computer|phone|mobile|cellphone|tablet|laptop|internet|email|app|website|software|screen|keyboard|mouse|wifi|digital|tech|robot')) return '💻';
    
    // Lugares
    if (matches('city|town|country|park|shop|store|market|supermarket|hospital|bank|restaurant|hotel|airport|station|street|road|bridge|building')) return '🏙️';

    // Familia / Personas
    if (matches('family|mother|father|mom|dad|brother|sister|son|daughter|grandma|grandpa|parent|child|baby|friend|boy|girl|man|woman|person|people')) return '👨‍👩‍👧';

    // Música / Arte
    if (matches('music|song|sing|dance|guitar|piano|drum|art|draw|paint|picture|photo')) return '🎵';

    // Deportes
    if (matches('sport|football|soccer|basketball|tennis|ball|game|player|team|swim|run')) return '⚽';

    // Default
    return '🔹';
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

function updateAvatarUI(avatar) {
    const iconEl = document.getElementById('current-avatar-icon');
    if (iconEl) {
        iconEl.textContent = avatar;
    }
}

export function renderProfile() {
    const state = getState();
    const currentLevel = SYLLABUS[state.levelIdx];
    
    // Actualizar nombre del perfil
    const currentProfile = getCurrentProfile();
    const allProfiles = getAllProfiles();
    const profile = allProfiles.find(p => p.id === currentProfile);
    
    if (profile) {
        const profileHeader = document.querySelector('.profile-header h2');
        if (profileHeader) profileHeader.textContent = profile.name;
        
        const profileAvatar = document.getElementById('current-avatar-icon');
        if (profileAvatar) profileAvatar.textContent = profile.avatar;
    }
    
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
        
        list.style.display = 'block';
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
                <h2 class="text-primary" style="font-size: 2rem; font-weight: 900; margin-bottom: 0.5rem;">
                    ${word.object}
                </h2>
                <p class="text-secondary" style="font-size: 0.875rem; font-family: monospace; margin-bottom: 0.25rem;">
                    ${word.ipa || ''}
                </p>
                <p class="text-secondary">
                    <strong>Español:</strong> ${word.translation}
                </p>
            </div>
            <div id="vocab-examples" style="margin-top: 1rem;">
                <p class="text-primary" style="font-weight: 700; margin-bottom: 0.75rem;">
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
                div.className = 'bg-neutral border-neutral';
                div.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1rem;
                    border-radius: 0.75rem;
                    margin-bottom: 0.5rem;
                    border: 1px solid;
                `;
                
                const text = document.createElement('span');
                text.textContent = sentence;
                text.className = 'text-primary';
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

// Sistema de Repetición Espaciada (SRS)
function updateSRSBanner() {
    const wordsToReview = getWordsForReview();
    const banner = document.getElementById('srs-review-banner');
    const count = document.getElementById('srs-words-count');
    
    if (!banner || !count) return;
    
    if (wordsToReview.length > 0) {
        banner.classList.remove('hidden');
        count.textContent = wordsToReview.length;
    } else {
        banner.classList.add('hidden');
    }
}

function startSRSReview() {
    const wordsToReview = getWordsForReview();
    
    if (wordsToReview.length === 0) {
        showToast('¡No hay palabras para repasar! Sigue aprendiendo.', 'info');
        return;
    }
    
    srsReviewSession = {
        words: wordsToReview,
        currentIndex: 0,
        correct: 0,
        incorrect: 0
    };
    
    showSRSModal();
}

function showSRSModal() {
    if (!srsReviewSession || srsReviewSession.currentIndex >= srsReviewSession.words.length) {
        finishSRSReview();
        return;
    }
    
    const word = srsReviewSession.words[srsReviewSession.currentIndex];
    const icon = getWordIcon(word.object);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.id = 'srs-review-modal';
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.maxWidth = '500px';
    
    content.innerHTML = `
        <div style="padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <span style="font-size: 0.75rem; color: #64748B; font-weight: 700;">
                    PREGUNTA ${srsReviewSession.currentIndex + 1} / ${srsReviewSession.words.length}
                </span>
                <button id="skip-srs-btn" style="font-size: 0.75rem; color: #EF4444; font-weight: 700; background: none; border: none; cursor: pointer;">
                    Salir
                </button>
            </div>
            
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="font-size: 3rem; margin-bottom: 0.5rem;">${icon}</div>
                <h2 style="font-size: 1.5rem; font-weight: 900; color: var(--color-primary); margin-bottom: 0.5rem;">
                    ${word.translation}
                </h2>
                <p style="font-size: 0.875rem; color: #64748B;">
                    ¿Cómo se dice en inglés?
                </p>
            </div>
            
            <div id="srs-answer-input" style="margin-bottom: 1rem;">
                <input type="text" id="srs-input" placeholder="Escribe tu respuesta..." 
                       style="width: 100%; padding: 0.75rem; border: 2px solid #E2E8F0; border-radius: 0.5rem; font-size: 1rem; text-align: center;"
                       autocomplete="off">
            </div>
            
            <div id="srs-feedback" class="hidden" style="margin-bottom: 1rem;"></div>
            
            <div style="display: flex; gap: 0.5rem;">
                <button id="reveal-answer-btn" class="btn btn-secondary" style="flex: 1;">
                    👁️ Ver Respuesta
                </button>
                <button id="check-answer-btn" class="btn btn-primary" style="flex: 1;">
                    ✅ Comprobar
                </button>
            </div>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Focus en input
    setTimeout(() => {
        const input = document.getElementById('srs-input');
        if (input) input.focus();
    }, 100);
    
    // Event listeners
    document.getElementById('skip-srs-btn')?.addEventListener('click', () => {
        srsReviewSession = null;
        modal.remove();
    });
    
    document.getElementById('reveal-answer-btn')?.addEventListener('click', () => {
        revealSRSAnswer(word, false);
    });
    
    document.getElementById('check-answer-btn')?.addEventListener('click', () => {
        const input = document.getElementById('srs-input');
        const userAnswer = input?.value.trim().toLowerCase();
        const correctAnswer = word.object.toLowerCase();
        
        if (userAnswer === correctAnswer) {
            revealSRSAnswer(word, true);
        } else {
            revealSRSAnswer(word, false);
        }
    });
    
    // Enter para comprobar
    document.getElementById('srs-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('check-answer-btn')?.click();
        }
    });
}

function revealSRSAnswer(word, isCorrect) {
    const feedback = document.getElementById('srs-feedback');
    const answerInput = document.getElementById('srs-answer-input');
    const revealBtn = document.getElementById('reveal-answer-btn');
    const checkBtn = document.getElementById('check-answer-btn');
    
    if (!feedback || !answerInput || !revealBtn || !checkBtn) return;
    
    answerInput.classList.add('hidden');
    revealBtn.classList.add('hidden');
    checkBtn.classList.add('hidden');
    feedback.classList.remove('hidden');
    
    if (isCorrect) {
        srsReviewSession.correct++;
        updateWordSRS(word.object, 5); // Calidad perfecta
        
        feedback.innerHTML = `
            <div style="text-align: center; padding: 1rem; background: #DCFCE7; border-radius: 0.75rem; border: 2px solid #10B981;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎉</div>
                <p style="font-weight: 700; color: #065F46; margin-bottom: 0.5rem;">¡Correcto!</p>
                <p style="font-size: 1.25rem; font-weight: 900; color: #10B981; margin-bottom: 0.25rem;">${word.object}</p>
                <p style="font-size: 0.875rem; color: #047857;">${word.ipa || ''}</p>
            </div>
            <button id="next-srs-btn" class="btn btn-success" style="width: 100%; margin-top: 1rem;">
                Siguiente ➡️
            </button>
        `;
        
        speakText(word.object, 'en-US');
        
    } else {
        srsReviewSession.incorrect++;
        updateWordSRS(word.object, 1); // Calidad baja
        
        feedback.innerHTML = `
            <div style="text-align: center; padding: 1rem; background: #FEF3C7; border-radius: 0.75rem; border: 2px solid #F59E0B;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">💡</div>
                <p style="font-weight: 700; color: #92400E; margin-bottom: 0.5rem;">La respuesta correcta es:</p>
                <p style="font-size: 1.5rem; font-weight: 900; color: #F59E0B; margin-bottom: 0.25rem;">${word.object}</p>
                <p style="font-size: 0.875rem; color: #78350F; margin-bottom: 0.25rem;">${word.ipa || ''}</p>
                <p style="font-size: 0.875rem; color: #92400E;">(${word.translation})</p>
            </div>
            <button id="next-srs-btn" class="btn btn-warning" style="width: 100%; margin-top: 1rem; background: #F59E0B; color: white;">
                Siguiente ➡️
            </button>
        `;
        
        speakText(word.object, 'en-US');
    }
    
    document.getElementById('next-srs-btn')?.addEventListener('click', () => {
        document.getElementById('srs-review-modal')?.remove();
        srsReviewSession.currentIndex++;
        showSRSModal();
    });
}

function finishSRSReview() {
    if (!srsReviewSession) return;
    
    const total = srsReviewSession.words.length;
    const correct = srsReviewSession.correct;
    const percentage = Math.round((correct / total) * 100);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.maxWidth = '400px';
    
    let emoji = '🎉';
    let message = '¡Excelente trabajo!';
    let color = '#10B981';
    
    if (percentage < 50) {
        emoji = '💪';
        message = '¡Sigue practicando!';
        color = '#F59E0B';
    } else if (percentage < 80) {
        emoji = '👍';
        message = '¡Buen esfuerzo!';
        color = '#4A90E2';
    }
    
    content.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">${emoji}</div>
            <h2 style="font-size: 1.5rem; font-weight: 900; color: ${color}; margin-bottom: 0.5rem;">
                ${message}
            </h2>
            <p style="font-size: 3rem; font-weight: 900; color: ${color}; margin-bottom: 0.5rem;">
                ${percentage}%
            </p>
            <p style="font-size: 0.875rem; color: #64748B; margin-bottom: 1.5rem;">
                ${correct} de ${total} respuestas correctas
            </p>
            <button id="finish-srs-btn" class="btn btn-primary" style="width: 100%;">
                ✅ Finalizar
            </button>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    document.getElementById('finish-srs-btn')?.addEventListener('click', () => {
        modal.remove();
        srsReviewSession = null;
        updateSRSBanner();
        showToast(`¡Repaso completado! ${percentage}%`, 'success');
    });
}
