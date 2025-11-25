// Controlador Principal de la Aplicación
import { getApiKey, setApiKey } from './services/gemini.js';
import { updateDailyStreak, getState, updateState, getCurrentProfile, getAllProfiles } from './state.js';
import { initChat } from './modules/chat.js';
import { initProfile, renderProfile } from './modules/profile.js';
import { initP2P } from './modules/p2p.js';
import { showWelcomeScreen } from './modules/profiles.js';
import { showToast } from './utils/ui.js';
import { initVoice } from './services/voice.js';

// Estado de la vista actual
let currentView = 'class';

// Lazy loading de módulos
let cameraModule = null;

// Temporizador de estudio
let studyStartTime = Date.now();
let studyTimerInterval = null;

// Inicialización de la App
document.addEventListener('DOMContentLoaded', () => {
    console.log("Profesor IA v4.1.0 - Iniciando...");
    
    try {
        // Verificar API Key
        checkApiKey();
        
        // Inicializar Lucide Icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    } catch (error) {
        console.error("Error en inicialización:", error);
        showErrorOnSplash(error.message);
    }
});

// Splash Screen Logic - Usar window.load para asegurar carga completa
window.addEventListener('load', () => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        // Mantener visible al menos 1.5 segundos para branding
        setTimeout(() => {
            splash.classList.add('fade-out');
            setTimeout(() => splash.remove(), 500);
        }, 1500);
    }
});

// Fallback: Forzar eliminación del splash después de 5 segundos
setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        console.warn("Splash screen forzado a desaparecer");
        splash.remove();
    }
}, 5000);

function showErrorOnSplash(message) {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        const errorBox = document.createElement('div');
        errorBox.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: #EF4444;
            color: white;
            padding: 1rem;
            border-radius: 0.5rem;
            font-size: 0.875rem;
            z-index: 10001;
        `;
        errorBox.textContent = `Error: ${message}`;
        document.body.appendChild(errorBox);
    }
}

function checkApiKey() {
    // Primero verificar si hay un perfil seleccionado
    const currentProfile = getCurrentProfile();
    const allProfiles = getAllProfiles();
    
    if (!currentProfile || allProfiles.length === 0) {
        // No hay perfil: mostrar pantalla de bienvenida a pantalla completa
        showWelcomeScreen();
        return;
    }
    
    const apiKey = getApiKey();
    
    if (!apiKey) {
        showSetupModal();
    } else {
        initApp();
    }
}

function showSetupModal() {
    const modal = document.getElementById('setup-modal');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    
    const input = document.getElementById('api-key-input');
    const saveBtn = document.getElementById('save-key-btn');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const key = input?.value.trim();
            
            if (!key) {
                alert('Por favor, ingresa una API Key válida.');
                return;
            }
            
            if (!key.startsWith('AIza')) {
                alert('La API Key debe comenzar con "AIza". Verifica que sea correcta.');
                return;
            }
            
            setApiKey(key);
            modal.classList.add('hidden');
            initApp();
        });
    }
    
    // Enter en input
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveBtn?.click();
            }
        });
    }
}

function initApp() {
    console.log("Inicializando aplicación...");
    
    // Actualizar racha diaria
    const streak = updateDailyStreak();
    if (streak > 1) {
        setTimeout(() => {
            showToast(`🔥 ¡Racha de ${streak} días!`, 'success');
        }, 1000);
    }
    
    // Inicializar módulos críticos (NO camera todavía - lazy loading)
    initChat();
    initProfile();
    initP2P(); // Inicializar P2P sin conectar todavía
    
    // Desbloquear audio en iOS/Mobile con la primera interacción
    const unlockAudio = () => {
        initVoice();
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    
    // Configurar navegación
    setupNavigation();
    
    // Iniciar temporizador de estudio
    startStudyTimer();
    
    // Mostrar vista inicial
    switchView('class');
}

function setupNavigation() {
    const navButtons = {
        'nav-camera': 'camera',
        'nav-class': 'class',
        'nav-profile': 'profile'
    };
    
    Object.entries(navButtons).forEach(([btnId, viewName]) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => switchView(viewName));
        }
    });
}

function switchView(viewName) {
    if (currentView === viewName) return;
    
    // Limpiar módulos si es necesario
    if (currentView === 'camera' && cameraModule) {
        cameraModule.cleanupCamera();
    }
    
    currentView = viewName;
    
    // Lazy loading de cámara solo cuando se necesita
    if (viewName === 'camera' && !cameraModule) {
        import('./modules/camera.js').then(module => {
            cameraModule = module;
            cameraModule.initCamera();
            console.log('📸 Módulo de cámara cargado dinámicamente');
        }).catch(error => {
            console.error('Error al cargar módulo de cámara:', error);
            showToast('Error al cargar la cámara', 'error');
        });
    }
    
    // Actualizar navegación
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.getElementById(`nav-${viewName}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Actualizar vistas
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.add('hidden');
    });
    
    const activeView = document.getElementById(`view-${viewName}`);
    if (activeView) {
        activeView.classList.remove('hidden');
    }
    
    // Si entramos a perfil, forzar re-render
    if (viewName === 'profile') {
        renderProfile();
    }
}

function startStudyTimer() {
    studyStartTime = Date.now();
    
    // Actualizar cada segundo
    studyTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - studyStartTime) / 1000); // segundos
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        
        const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        const timerEl = document.getElementById('study-timer');
        if (timerEl) {
            timerEl.textContent = formatted;
        }
    }, 1000);
}

// Guardar tiempo de estudio al cerrar la página
window.addEventListener('beforeunload', () => {
    const state = getState();
    const elapsed = Math.floor((Date.now() - studyStartTime) / 1000);
    updateState({ studyTimeToday: (state.studyTimeToday || 0) + elapsed });
});

// Exponer funciones globales necesarias
window.switchView = switchView;
