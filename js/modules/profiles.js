// Módulo de Gestión de Perfiles de Usuario
import { getAllProfiles, createProfile, deleteProfile, setCurrentProfile, getCurrentProfile, updateProfileInfo } from '../state.js';
import { showToast } from '../utils/ui.js';

const AVATARS = ['👤', '👨', '👩', '👦', '👧', '🧑', '👨‍🎓', '👩‍🎓', '🧑‍🎓', '👨‍💼', '👩‍💼', '🧑‍💻'];

export function showProfileSelector() {
    const profiles = getAllProfiles();
    
    const modal = document.createElement('div');
    modal.id = 'profile-selector-modal';
    modal.className = 'fixed inset-0 bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center z-[9999]';
    
    modal.innerHTML = `
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scale-in">
            <div class="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white text-center">
                <div class="text-5xl mb-3">🎓</div>
                <h2 class="text-2xl font-black">Profesor IA</h2>
                <p class="text-sm opacity-90 mt-2">Selecciona tu perfil o crea uno nuevo</p>
            </div>
            
            <div class="p-6">
                ${profiles.length > 0 ? `
                    <div class="mb-4">
                        <label class="block text-sm font-bold text-gray-700 mb-3">Perfiles existentes:</label>
                        <div class="space-y-2 max-h-60 overflow-y-auto">
                            ${profiles.map(profile => `
                                <button 
                                    onclick="window.selectProfile('${profile.id}')" 
                                    class="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 rounded-xl transition-all group"
                                >
                                    <div class="text-3xl">${profile.avatar}</div>
                                    <div class="flex-1 text-left">
                                        <div class="font-bold text-gray-800">${profile.name}</div>
                                        <div class="text-xs text-gray-500">Perfil creado</div>
                                    </div>
                                    <div class="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        →
                                    </div>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-2 my-4">
                        <div class="flex-1 border-t border-gray-300"></div>
                        <span class="text-xs text-gray-400 font-bold">O</span>
                        <div class="flex-1 border-t border-gray-300"></div>
                    </div>
                ` : ''}
                
                <button 
                    onclick="window.showCreateProfile()" 
                    class="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                    <span class="text-2xl">➕</span>
                    Crear Nuevo Perfil
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

export function showCreateProfile() {
    const modal = document.getElementById('profile-selector-modal');
    if (!modal) return;
    
    modal.innerHTML = `
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scale-in">
            <div class="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white">
                <button onclick="window.showProfileSelector()" class="text-white hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center mb-3">
                    ← Atrás
                </button>
                <div class="text-5xl mb-3 text-center">✨</div>
                <h2 class="text-2xl font-black text-center">Crear Perfil</h2>
                <p class="text-sm opacity-90 mt-2 text-center">Personaliza tu experiencia de aprendizaje</p>
            </div>
            
            <div class="p-6 space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">¿Cómo te llamas?</label>
                    <input 
                        type="text" 
                        id="profile-name-input" 
                        placeholder="Tu nombre" 
                        maxlength="20"
                        class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none text-lg"
                        autocomplete="off"
                    >
                    <p class="text-xs text-gray-500 mt-1">Este nombre aparecerá en tu perfil</p>
                </div>
                
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">Elige tu avatar:</label>
                    <div class="grid grid-cols-6 gap-2" id="avatar-grid">
                        ${AVATARS.map((avatar, idx) => `
                            <button 
                                onclick="window.selectAvatar('${avatar}')" 
                                class="avatar-option w-12 h-12 text-2xl bg-gray-100 hover:bg-blue-100 border-2 border-gray-300 hover:border-blue-500 rounded-xl transition-all ${idx === 0 ? 'selected' : ''}"
                                data-avatar="${avatar}"
                            >
                                ${avatar}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <button 
                    onclick="window.confirmCreateProfile()" 
                    class="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    id="create-profile-btn"
                >
                    🎉 Crear Perfil
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
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in';
    
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scale-in">
            <div class="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white flex items-center justify-between">
                <h2 class="text-xl font-bold">Cambiar Perfil</h2>
                <button onclick="this.closest('#profile-switch-modal').remove()" class="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
            </div>
            
            <div class="p-6">
                <div class="space-y-2 mb-4">
                    ${profiles.map(profile => `
                        <button 
                            onclick="window.switchToProfile('${profile.id}')" 
                            class="w-full flex items-center gap-3 p-3 ${profile.id === currentId ? 'bg-purple-50 border-purple-400' : 'bg-gray-50 hover:bg-blue-50 border-gray-200 hover:border-blue-400'} border-2 rounded-xl transition-all"
                        >
                            <div class="text-3xl">${profile.avatar}</div>
                            <div class="flex-1 text-left">
                                <div class="font-bold text-gray-800">${profile.name}</div>
                                ${profile.id === currentId ? '<div class="text-xs text-purple-600 font-bold">Perfil actual</div>' : '<div class="text-xs text-gray-500">Cambiar a este perfil</div>'}
                            </div>
                        </button>
                    `).join('')}
                </div>
                
                <button 
                    onclick="window.showCreateProfile()" 
                    class="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                >
                    ➕ Crear Nuevo Perfil
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
        background: #DBEAFE !important;
        border-color: #3B82F6 !important;
        transform: scale(1.1);
    }
`;
document.head.appendChild(style);
