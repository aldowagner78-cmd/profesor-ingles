// Orquestador Principal
import { initConfig, SYLLABUS } from './config.js';
import { initState, getState } from './state.js';
import { initUI, showToast } from './utils/ui.js';
import { initVoice } from './services/voice.js';
import { getApiKey, setApiKey } from './services/gemini.js';

// Importar Módulos
import * as CameraModule from './modules/camera.js';
import * as ChatModule from './modules/chat.js';
import * as ProfileModule from './modules/profile.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Iniciando Profesor IA v3 Final...');
    
    try {
        // 1. Inicializar Servicios Base
        initConfig();
        initState();
        initUI();
        
        // 2. Verificar API Key
        checkApiKey();
        
        // 3. Renderizar UI Inicial
        updateUI();
        setupNavigation();
        
        // 4. Inicializar Voz (lazy load)
        setTimeout(initVoice, 1000);
        
        // 5. Iniciar en vista por defecto
        switchTab('class');
        
        console.log('Sistema listo.');
    } catch (error) {
        console.error('Error crítico al iniciar:', error);
        alert('Error al iniciar la aplicación. Por favor recarga.');
    }
});

function checkApiKey() {
    const key = getApiKey();
    const modal = document.getElementById('setup-modal');
    const input = document.getElementById('api-key-input');
    const saveBtn = document.getElementById('save-key-btn');
    
    if (!key) {
        modal.classList.remove('hidden');
    }
    
    saveBtn.onclick = () => {
        const newKey = input.value.trim();
        if (newKey.length > 10) {
            setApiKey(newKey);
            modal.classList.add('hidden');
            showToast("API Key guardada correctamente");
            // Recargar para asegurar que todo tome la nueva key
            setTimeout(() => location.reload(), 500);
        } else {
            alert("Por favor ingresa una API Key válida");
        }
    };
}

function updateUI() {
    const state = getState();
    const currentLevel = SYLLABUS[state.levelIdx];
    
    document.getElementById('score-display').innerText = state.score;
    document.getElementById('level-display').innerText = currentLevel.name;
}

function setupNavigation() {
    document.getElementById('nav-camera').onclick = () => switchTab('camera');
    document.getElementById('nav-class').onclick = () => switchTab('class');
    document.getElementById('nav-profile').onclick = () => switchTab('profile');
}

function switchTab(tab) {
    // Detener cámara si salimos de ella
    if (tab !== 'camera') {
        CameraModule.stopCamera();
    }
    
    // Ocultar todas las vistas
    document.querySelectorAll('[id^="view-"]').forEach(el => el.classList.add('hidden'));
    
    // Mostrar vista seleccionada
    const view = document.getElementById('view-' + tab);
    if(view) view.classList.remove('hidden');
    
    // Actualizar botones nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-blue-600');
        btn.classList.add('text-slate-400');
    });
    const activeBtn = document.getElementById('nav-' + tab);
    if(activeBtn) {
        activeBtn.classList.add('text-blue-600');
        activeBtn.classList.remove('text-slate-400');
    }

    // Inicializar módulo específico
    if (tab === 'camera') {
        CameraModule.initCamera();
    } else if (tab === 'class') {
        ChatModule.initChat();
    } else if (tab === 'profile') {
        ProfileModule.initProfile();
    }
}

// Escuchar cambios de estado para actualizar UI globalmente
document.addEventListener('stateChanged', () => {
    updateUI();
});
