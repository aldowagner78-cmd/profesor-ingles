// Módulo de Gestión de Perfiles de Usuario
import { getAllProfiles, createProfile, deleteProfile, setCurrentProfile, getCurrentProfile, updateProfileInfo } from '../state.js';
import { showToast } from '../utils/ui.js';

const AVATARS = ['👤', '👨', '👩', '👦', '👧', '🧑', '👨‍🎓', '👩‍🎓', '🧑‍💼', '🧑‍💻'];

// Nueva función de bienvenida a pantalla completa
export function showWelcomeScreen() {
    const welcome = document.createElement('div');
    welcome.id = 'welcome-screen';
    welcome.style.cssText = `
        position: fixed;
        inset: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
    `;
    
    welcome.innerHTML = `
        <div class="welcome-content" style="max-width: 500px; width: 100%; animation: welcomeSlideUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);">
            <!-- Logo y título -->
            <div style="text-align: center; margin-bottom: 3rem;">
                <div style="display: inline-block; background: rgba(255,255,255,0.15); padding: 1.5rem; border-radius: 2rem; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.1); margin-bottom: 1.5rem;">
                    <div style="font-size: 5rem; line-height: 1;">🎓</div>
                </div>
                <h1 style="font-size: 2.5rem; font-weight: 900; color: white; margin-bottom: 0.5rem; text-shadow: 0 2px 20px rgba(0,0,0,0.2); font-family: 'Nunito', -apple-system, sans-serif;">
                    Profesor IA
                </h1>
                <p style="font-size: 1.125rem; color: rgba(255,255,255,0.9); font-weight: 600; text-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    Aprende inglés con inteligencia artificial
                </p>
            </div>
            
            <!-- Formulario de perfil -->
            <div style="background: white; border-radius: 2rem; padding: 2rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <h2 style="font-size: 1.5rem; font-weight: 800; color: #1F2937; margin-bottom: 0.5rem; text-align: center;">
                    ¡Bienvenido! 👋
                </h2>
                <p style="font-size: 0.875rem; color: #6B7280; text-align: center; margin-bottom: 2rem;">
                    Primero, cuéntanos un poco sobre ti
                </p>
                
                <!-- Input Nombre -->
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-size: 0.875rem; font-weight: 700; color: #374151; margin-bottom: 0.5rem;">
                        ¿Cómo te llamas?
                    </label>
                    <input 
                        type="text" 
                        id="welcome-name-input" 
                        placeholder="Ej: María, Carlos, Juan..."
                        maxlength="20"
                        autocomplete="off"
                        style="width: 100%; padding: 1rem; border: 2px solid #E5E7EB; border-radius: 1rem; font-size: 1rem; font-weight: 500; transition: all 0.2s; background: linear-gradient(to right, #F9FAFB, #FFFFFF);"
                        onfocus="this.style.borderColor='#667eea'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)';"
                        onblur="this.style.borderColor='#E5E7EB'; this.style.boxShadow='none';"
                    >
                </div>
                
                <!-- Selector de Avatar -->
                <div style="margin-bottom: 2rem;">
                    <label style="display: block; font-size: 0.875rem; font-weight: 700; color: #374151; margin-bottom: 0.75rem;">
                        Elige tu avatar
                    </label>
                    <div id="welcome-avatar-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; max-width: 100%;">
                        ${AVATARS.map((avatar, idx) => `
                            <button 
                                class="welcome-avatar-btn ${idx === 0 ? 'selected' : ''}"
                                data-avatar="${avatar}"
                                onclick="window.selectWelcomeAvatar('${avatar}')"
                                style="width: 100%; aspect-ratio: 1; font-size: 2rem; background: linear-gradient(135deg, #F3F4F6, #E5E7EB); border: 2px solid #D1D5DB; border-radius: 1rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;"
                                onmouseover="if(!this.classList.contains('selected')) { this.style.transform='scale(1.05)'; this.style.borderColor='#667eea'; }"
                                onmouseout="if(!this.classList.contains('selected')) { this.style.transform='scale(1)'; this.style.borderColor='#D1D5DB'; }"
                            >
                                ${avatar}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Botón Continuar -->
                <button 
                    id="welcome-continue-btn"
                    onclick="window.completeWelcome()"
                    disabled
                    style="width: 100%; padding: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 1rem; font-size: 1.125rem; font-weight: 700; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4); opacity: 0.5;"
                    onmouseover="if(!this.disabled) { this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(102, 126, 234, 0.6)'; }"
                    onmouseout="if(!this.disabled) { this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 14px rgba(102, 126, 234, 0.4)'; }"
                >
                    Comenzar mi aprendizaje 🚀
                </button>
            </div>
            
            <!-- Información adicional -->
            <div style="text-align: center; margin-top: 2rem; color: rgba(255,255,255,0.8); font-size: 0.75rem; font-weight: 600;">
                <p>✨ Gratis · 🔒 Privado · 🌍 Sin límites</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(welcome);
    
    // Fade in
    setTimeout(() => {
        welcome.style.opacity = '1';
    }, 10);
    
    // Agregar estilos de animación
    if (!document.getElementById('welcome-screen-styles')) {
        const style = document.createElement('style');
        style.id = 'welcome-screen-styles';
        style.textContent = `
            @keyframes welcomeSlideUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .welcome-avatar-btn.selected {
                background: linear-gradient(135deg, #DBEAFE 0%, #E0E7FF 100%) !important;
                border-color: #667eea !important;
                border-width: 3px !important;
                transform: scale(1.08) !important;
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
            }
            
            #welcome-continue-btn:not(:disabled) {
                opacity: 1 !important;
                cursor: pointer !important;
            }
            
            #welcome-continue-btn:disabled {
                cursor: not-allowed !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Setup input validation
    const input = document.getElementById('welcome-name-input');
    const btn = document.getElementById('welcome-continue-btn');
    
    if (input && btn) {
        input.focus();
        
        input.addEventListener('input', () => {
            const isValid = input.value.trim().length >= 2;
            btn.disabled = !isValid;
            btn.style.opacity = isValid ? '1' : '0.5';
            btn.style.cursor = isValid ? 'pointer' : 'not-allowed';
        });
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !btn.disabled) {
                window.completeWelcome();
            }
        });
    }
}

let selectedWelcomeAvatar = AVATARS[0];

window.selectWelcomeAvatar = function(avatar) {
    selectedWelcomeAvatar = avatar;
    
    document.querySelectorAll('.welcome-avatar-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.avatar === avatar) {
            btn.classList.add('selected');
        }
    });
};

window.completeWelcome = function() {
    const input = document.getElementById('welcome-name-input');
    const name = input?.value.trim();
    
    if (!name || name.length < 2) {
        showToast('Por favor, ingresa un nombre válido', 'warning');
        return;
    }
    
    // Crear perfil
    const profile = createProfile(name, selectedWelcomeAvatar);
    setCurrentProfile(profile.id);
    
    // Fade out y remover
    const welcome = document.getElementById('welcome-screen');
    if (welcome) {
        welcome.style.opacity = '0';
        setTimeout(() => {
            welcome.remove();
            showToast(`¡Bienvenido, ${name}! 🎉`, 'success');
            // Recargar app
            window.location.reload();
        }, 500);
    }
};

export function showProfileSelector() {
    const profiles = getAllProfiles();
    
    const modal = document.createElement('div');
    modal.id = 'profile-selector-modal';
    modal.className = 'fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center z-[9999] p-4';
    modal.style.backdropFilter = 'blur(8px)';
    
    modal.innerHTML = `
        <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden" style="animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);">
            <!-- Header con diseño mejorado -->
            <div class="relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-90"></div>
                <div class="absolute inset-0" style="background: radial-gradient(circle at top right, rgba(255,255,255,0.3) 0%, transparent 60%);"></div>
                <div class="relative p-8 text-center text-white">
                    <div class="inline-block mb-4 p-4 bg-white/20 rounded-full backdrop-blur-sm" style="box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
                        <div class="text-6xl">🎓</div>
                    </div>
                    <h1 class="text-3xl font-black mb-2" style="text-shadow: 0 2px 10px rgba(0,0,0,0.2);">
                        Profesor IA
                    </h1>
                    <p class="text-sm opacity-95 font-medium">
                        Aprende inglés con inteligencia artificial
                    </p>
                </div>
            </div>
            
            <div class="p-6">
                ${profiles.length > 0 ? `
                    <div class="mb-6">
                        <h3 class="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Selecciona tu perfil:</h3>
                        <div class="space-y-3 max-h-64 overflow-y-auto pr-2" style="scrollbar-width: thin; scrollbar-color: #CBD5E0 #F7FAFC;">
                            ${profiles.map(profile => `
                                <button 
                                    onclick="window.selectProfile('${profile.id}')" 
                                    class="profile-card-button w-full flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-purple-50 border-2 border-gray-200 hover:border-blue-400 rounded-2xl transition-all group shadow-sm hover:shadow-md"
                                >
                                    <div class="w-16 h-16 flex items-center justify-center bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                                        <span class="text-4xl">${profile.avatar}</span>
                                    </div>
                                    <div class="flex-1 text-left">
                                        <div class="font-black text-gray-800 text-lg group-hover:text-blue-600 transition-colors">${profile.name}</div>
                                        <div class="text-xs text-gray-500 font-medium mt-0.5">Toca para continuar</div>
                                    </div>
                                    <div class="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                    </div>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-3 my-6">
                        <div class="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                        <span class="text-xs text-gray-400 font-bold px-2 bg-gray-100 rounded-full">O</span>
                        <div class="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                    </div>
                ` : `
                    <div class="text-center py-6 mb-6">
                        <div class="text-5xl mb-4">👋</div>
                        <h3 class="text-xl font-bold text-gray-800 mb-2">¡Bienvenido!</h3>
                        <p class="text-sm text-gray-600">Crea tu perfil para comenzar a aprender</p>
                    </div>
                `}
                
                <button 
                    onclick="window.showCreateProfile()" 
                    class="w-full py-4 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white rounded-2xl font-bold text-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
                >
                    <div class="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                    <span class="text-2xl relative z-10 group-hover:scale-110 transition-transform">✨</span>
                    <span class="relative z-10">Crear Nuevo Perfil</span>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Agregar animación CSS
    if (!document.getElementById('profile-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'profile-modal-styles';
        style.textContent = `
            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            .profile-card-button:active {
                transform: scale(0.98);
            }
        `;
        document.head.appendChild(style);
    }
}

export function showCreateProfile() {
    const modal = document.getElementById('profile-selector-modal');
    if (!modal) return;
    
    modal.innerHTML = `
        <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden" style="animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);">
            <!-- Header -->
            <div class="relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 opacity-90"></div>
                <div class="absolute inset-0" style="background: radial-gradient(circle at top right, rgba(255,255,255,0.3) 0%, transparent 60%);"></div>
                <div class="relative p-6 text-white">
                    <button onclick="window.showProfileSelector()" class="absolute top-4 left-4 w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <div class="text-center pt-8">
                        <div class="inline-block mb-3 p-3 bg-white/20 rounded-full backdrop-blur-sm">
                            <div class="text-5xl">✨</div>
                        </div>
                        <h2 class="text-2xl font-black mb-1">Crear Perfil</h2>
                        <p class="text-sm opacity-95">Personaliza tu experiencia de aprendizaje</p>
                    </div>
                </div>
            </div>
            
            <div class="p-6 space-y-5">
                <!-- Nombre -->
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <span>👤</span>
                        <span>¿Cómo te llamas?</span>
                    </label>
                    <input 
                        type="text" 
                        id="profile-name-input" 
                        placeholder="Ej: María, Carlos, etc." 
                        maxlength="20"
                        class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none text-lg font-medium transition-colors"
                        autocomplete="off"
                        style="background: linear-gradient(to right, #F9FAFB, #FFFFFF);"
                    >
                    <p class="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        Este nombre aparecerá en tu perfil
                    </p>
                </div>
                
                <!-- Avatares -->
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <span>🎨</span>
                        <span>Elige tu avatar:</span>
                    </label>
                    <div class="grid grid-cols-6 gap-3" id="avatar-grid">
                        ${AVATARS.map((avatar, idx) => `
                            <button 
                                onclick="window.selectAvatar('${avatar}')" 
                                class="avatar-option w-14 h-14 text-3xl bg-gradient-to-br from-gray-100 to-gray-200 hover:from-blue-100 hover:to-purple-100 border-2 border-gray-300 hover:border-blue-500 rounded-2xl transition-all ${idx === 0 ? 'selected' : ''} flex items-center justify-center"
                                data-avatar="${avatar}"
                            >
                                ${avatar}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Botón crear -->
                <button 
                    onclick="window.confirmCreateProfile()" 
                    class="w-full py-4 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white rounded-2xl font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group relative overflow-hidden mt-6"
                    id="create-profile-btn"
                >
                    <div class="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                    <span class="text-2xl relative z-10 group-hover:scale-110 transition-transform">🎉</span>
                    <span class="relative z-10">Crear Mi Perfil</span>
                </button>
            </div>
        </div>
    `;
    
    // Auto-focus en input
    setTimeout(() => {
        const input = document.getElementById('profile-name-input');
        if (input) {
            input.focus();
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    window.confirmCreateProfile();
                }
            });
            
            // Validación en tiempo real
            input.addEventListener('input', () => {
                const btn = document.getElementById('create-profile-btn');
                if (btn) {
                    btn.disabled = input.value.trim().length < 2;
                }
            });
        }
    }, 100);
}

let selectedAvatar = AVATARS[0];

window.selectAvatar = function(avatar) {
    selectedAvatar = avatar;
    
    document.querySelectorAll('.avatar-option').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.avatar === avatar) {
            btn.classList.add('selected');
        }
    });
};

window.confirmCreateProfile = function() {
    const input = document.getElementById('profile-name-input');
    const name = input?.value.trim();
    
    if (!name || name.length < 2) {
        showToast('Por favor, ingresa un nombre válido (mínimo 2 caracteres)', 'warning');
        input?.focus();
        return;
    }
    
    // Crear perfil
    const profile = createProfile(name, selectedAvatar);
    setCurrentProfile(profile.id);
    
    showToast(`¡Bienvenido, ${name}! 🎉`, 'success');
    
    // Remover modal y continuar con la app
    document.getElementById('profile-selector-modal')?.remove();
    
    // Recargar app con el nuevo perfil
    window.location.reload();
};

window.selectProfile = function(profileId) {
    const profiles = getAllProfiles();
    const profile = profiles.find(p => p.id === profileId);
    
    if (profile) {
        setCurrentProfile(profileId);
        showToast(`¡Hola de nuevo, ${profile.name}! 👋`, 'success');
        
        // Remover modal y continuar con la app
        document.getElementById('profile-selector-modal')?.remove();
        
        // Recargar app con el perfil seleccionado
        window.location.reload();
    }
};

window.showProfileSelector = showProfileSelector;
window.showCreateProfile = showCreateProfile;

// Función para mostrar el switch de perfil desde la vista de perfil
export function showProfileSwitcher() {
    const profiles = getAllProfiles();
    const currentId = getCurrentProfile();
    
    const modal = document.createElement('div');
    modal.id = 'profile-switch-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in p-4';
    modal.style.backdropFilter = 'blur(4px)';
    
    modal.innerHTML = `
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden" style="animation: modalSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);">
            <div class="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 p-5 text-white relative overflow-hidden">
                <div class="absolute inset-0 opacity-20" style="background: radial-gradient(circle at top right, white 0%, transparent 60%);"></div>
                <div class="relative flex items-center justify-between">
                    <div>
                        <h2 class="text-xl font-black">Cambiar Perfil</h2>
                        <p class="text-sm opacity-90 mt-0.5">Selecciona otro usuario</p>
                    </div>
                    <button onclick="this.closest('#profile-switch-modal').remove()" class="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>
            
            <div class="p-5">
                <div class="space-y-3 mb-5 max-h-80 overflow-y-auto" style="scrollbar-width: thin; scrollbar-color: #CBD5E0 #F7FAFC;">
                    ${profiles.map(profile => `
                        <button 
                            onclick="window.switchToProfile('${profile.id}')" 
                            class="profile-switch-card w-full flex items-center gap-4 p-4 ${profile.id === currentId ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-400' : 'bg-gray-50 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 border-gray-200 hover:border-blue-400'} border-2 rounded-2xl transition-all group"
                        >
                            <div class="w-14 h-14 flex items-center justify-center bg-white rounded-2xl shadow-sm ${profile.id === currentId ? 'ring-4 ring-purple-200' : 'group-hover:scale-110'} transition-all">
                                <span class="text-3xl">${profile.avatar}</span>
                            </div>
                            <div class="flex-1 text-left">
                                <div class="font-black text-gray-800 text-base ${profile.id === currentId ? 'text-purple-700' : 'group-hover:text-blue-600'} transition-colors">${profile.name}</div>
                                ${profile.id === currentId ? 
                                    '<div class="text-xs text-purple-600 font-bold flex items-center gap-1 mt-1"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Perfil actual</div>' : 
                                    '<div class="text-xs text-gray-500 font-medium mt-1">Toca para cambiar</div>'
                                }
                            </div>
                            ${profile.id !== currentId ? `
                                <div class="w-9 h-9 flex items-center justify-center bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                </div>
                            ` : ''}
                        </button>
                    `).join('')}
                </div>
                
                <button 
                    onclick="this.closest('#profile-switch-modal').remove(); window.showCreateProfile()" 
                    class="w-full py-3.5 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white rounded-2xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 group relative overflow-hidden"
                >
                    <div class="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                    <span class="text-xl relative z-10 group-hover:scale-110 transition-transform">➕</span>
                    <span class="relative z-10">Crear Nuevo Perfil</span>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cerrar al hacer click fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

window.switchToProfile = function(profileId) {
    const profiles = getAllProfiles();
    const profile = profiles.find(p => p.id === profileId);
    
    if (profile && profileId !== getCurrentProfile()) {
        setCurrentProfile(profileId);
        showToast(`Cambiado a ${profile.name}`, 'success');
        
        // Recargar app
        window.location.reload();
    }
    
    document.getElementById('profile-switch-modal')?.remove();
};

// CSS adicional para los avatares seleccionados
const style = document.createElement('style');
style.textContent = `
    .avatar-option.selected {
        background: linear-gradient(135deg, #DBEAFE 0%, #E0E7FF 100%) !important;
        border-color: #3B82F6 !important;
        border-width: 3px !important;
        transform: scale(1.08);
        box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
    }
    
    .profile-switch-card:active {
        transform: scale(0.98);
    }
    
    /* Scrollbar personalizado */
    ::-webkit-scrollbar {
        width: 8px;
    }
    
    ::-webkit-scrollbar-track {
        background: #F7FAFC;
        border-radius: 10px;
    }
    
    ::-webkit-scrollbar-thumb {
        background: #CBD5E0;
        border-radius: 10px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
        background: #A0AEC0;
    }
`;
document.head.appendChild(style);
