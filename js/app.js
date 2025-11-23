// Controlador Principal de la Aplicación
import { getApiKey, setApiKey } from './services/gemini.js';
import { updateDailyStreak, getState, updateState } from './state.js';
import { initCamera, cleanupCamera } from './modules/camera.js';
import { initChat } from './modules/chat.js';
import { initProfile, renderProfile } from './modules/profile.js';
import { showToast } from './utils/ui.js';

// Estado de la vista actual
let currentView = 'class';

// Temporizador de estudio
let studyStartTime = Date.now();
let studyTimerInterval = null;

// Inicialización de la App
document.addEventListener('DOMContentLoaded', () => {
    console.log("Profesor IA v5.0 (Fixed) - Iniciando...");
    
    // Verificar API Key
    checkApiKey();
    
    // Inicializar Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
});

// Splash Screen Logic - Usar window.load para asegurar carga completa
window.addEventListener('load', () => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        // Mantener visible al menos 2 segundos para branding
        setTimeout(() => {
            splash.classList.add('fade-out');
            setTimeout(() => splash.remove(), 500);
        }, 2000);
    }
});

function checkApiKey() {
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
    
    // Inicializar módulos
    initCamera();
    initChat();
    initProfile();
    
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
    if (currentView === 'camera') {
        cleanupCamera();
    }
    
    currentView = viewName;
    
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
