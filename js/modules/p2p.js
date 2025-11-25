// Módulo de Chat P2P usando PeerJS (WebRTC)
import { showToast } from '../utils/ui.js';
import { getState } from '../state.js';

let peer = null;
let currentConnection = null;
let isP2PActive = false;
let myPeerId = null;

export function initP2P() {
    console.log("Módulo P2P inicializado");
    
    const p2pBtn = document.getElementById('p2p-btn');
    if (p2pBtn) {
        p2pBtn.addEventListener('click', showP2PModal);
    }
}

function generateRoomCode() {
    // Generar código de 6 dígitos único
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function showP2PModal() {
    const existingModal = document.getElementById('p2p-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'p2p-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in p-4';
    modal.style.backdropFilter = 'blur(4px)';
    
    modal.innerHTML = `
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden" style="animation: modalSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);">
            <!-- Header -->
            <div class="relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 opacity-90"></div>
                <div class="absolute inset-0" style="background: radial-gradient(circle at top right, rgba(255,255,255,0.3) 0%, transparent 60%);"></div>
                <div class="relative p-5 text-white">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                <span class="text-2xl">👥</span>
                            </div>
                            <div>
                                <h2 class="text-xl font-black">Chat P2P</h2>
                                <p class="text-xs opacity-90">Práctica en tiempo real</p>
                            </div>
                        </div>
                        <button onclick="this.closest('#p2p-modal').remove()" class="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="p-6">
                ${isP2PActive ? `
                    <!-- Estado Conectado -->
                    <div class="text-center mb-6">
                        <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full mb-4">
                            <div class="text-4xl animate-pulse">✅</div>
                        </div>
                        <h3 class="text-xl font-black text-gray-800 mb-2">¡Conectado!</h3>
                        <p class="text-sm text-gray-600 mb-3">Ya puedes chatear con tu compañero</p>
                        <div class="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl">
                            <span class="text-xs text-gray-500 font-bold">Código de sala:</span>
                            <span class="font-mono font-black text-purple-600 text-lg">${myPeerId}</span>
                        </div>
                    </div>
                    
                    <button 
                        onclick="window.disconnectP2P()" 
                        class="w-full py-3.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-2xl font-bold hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
                    >
                        <span class="text-xl group-hover:scale-110 transition-transform">🚪</span>
                        <span>Desconectar</span>
                    </button>
                ` : `
                    <!-- Opciones de Conexión -->
                    <div class="space-y-4">
                        <!-- Crear Sala -->
                        <div class="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-5">
                            <div class="flex items-start gap-3 mb-3">
                                <div class="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <span class="text-xl">🎯</span>
                                </div>
                                <div class="flex-1">
                                    <h3 class="font-black text-gray-800 text-base mb-1">Crear Nueva Sala</h3>
                                    <p class="text-xs text-gray-600">Genera un código para compartir con tu compañero</p>
                                </div>
                            </div>
                            <button 
                                onclick="window.createP2PRoom()" 
                                class="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
                            >
                                <span class="text-lg group-hover:scale-110 transition-transform">➕</span>
                                <span>Crear Sala</span>
                            </button>
                        </div>
                        
                        <!-- Divisor -->
                        <div class="flex items-center gap-3">
                            <div class="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                            <span class="text-xs text-gray-400 font-bold px-3 bg-gray-100 rounded-full">O</span>
                            <div class="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                        </div>
                        
                        <!-- Unirse a Sala -->
                        <div class="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-5">
                            <div class="flex items-start gap-3 mb-3">
                                <div class="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <span class="text-xl">🔗</span>
                                </div>
                                <div class="flex-1">
                                    <h3 class="font-black text-gray-800 text-base mb-1">Unirse a Sala</h3>
                                    <p class="text-xs text-gray-600">Ingresa el código de tu compañero</p>
                                </div>
                            </div>
                            <input 
                                type="text" 
                                id="room-code-input" 
                                placeholder="Ej: ABC123" 
                                maxlength="8"
                                class="w-full px-4 py-3 border-2 border-purple-300 rounded-xl focus:border-purple-500 focus:outline-none font-mono text-center text-xl font-bold uppercase mb-3 transition-colors"
                                style="letter-spacing: 0.1em;"
                            >
                            <button 
                                onclick="window.joinP2PRoom()" 
                                class="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
                            >
                                <span class="text-lg group-hover:scale-110 transition-transform">🚀</span>
                                <span>Conectar</span>
                            </button>
                        </div>
                        
                        <!-- Info -->
                        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <div class="flex gap-3">
                                <div class="text-2xl flex-shrink-0">💡</div>
                                <div class="text-xs text-gray-700 leading-relaxed">
                                    <p class="font-bold mb-1">¿Cómo funciona?</p>
                                    <p>La conexión es directa entre navegadores (P2P). Ambos deben estar online al mismo tiempo. Los mensajes no usan la API de Gemini.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cerrar al hacer click fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    // Focus en input si existe
    setTimeout(() => {
        const input = document.getElementById('room-code-input');
        if (input) {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }
    }, 100);
}

window.createP2PRoom = function() {
    if (!window.Peer) {
        showToast('Error: PeerJS no está cargado', 'error');
        return;
    }
    
    const roomCode = generateRoomCode();
    myPeerId = roomCode;
    
    showToast('Creando sala...', 'info');
    
    // Cerrar conexión anterior si existe
    if (peer) {
        peer.destroy();
    }
    
    peer = new window.Peer(roomCode, {
        debug: 0,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        }
    });
    
    peer.on('open', (id) => {
        console.log('Sala creada:', id);
        isP2PActive = true;
        showToast(`✅ Sala creada: ${id}`, 'success');
        showP2PModal(); // Refrescar modal
        showP2PStatus('connected');
        
        // Copiar código al portapapeles
        if (navigator.clipboard) {
            navigator.clipboard.writeText(id).then(() => {
                showToast('📋 Código copiado al portapapeles', 'info');
            }).catch(() => {
                console.log('No se pudo copiar al portapapeles');
            });
        }
    });
    
    peer.on('connection', (conn) => {
        console.log('Compañero conectándose...');
        handleConnection(conn);
        showToast('✅ ¡Compañero conectado!', 'success');
        document.getElementById('p2p-modal')?.remove();
    });
    
    peer.on('error', (err) => {
        console.error('Error P2P:', err);
        showToast('❌ Error al crear sala. Intenta de nuevo.', 'error');
        isP2PActive = false;
        showP2PStatus('disconnected');
    });
    
    peer.on('disconnected', () => {
        console.log('Peer desconectado, intentando reconectar...');
        if (peer && !peer.destroyed) {
            peer.reconnect();
        }
    });
};

window.joinP2PRoom = function() {
    const input = document.getElementById('room-code-input');
    const roomCode = input?.value.trim().toUpperCase();
    
    if (!roomCode || roomCode.length < 4) {
        showToast('⚠️ Ingresa un código válido (mínimo 4 caracteres)', 'warning');
        input?.focus();
        return;
    }
    
    if (!window.Peer) {
        showToast('❌ Error: PeerJS no está cargado', 'error');
        return;
    }
    
    showToast('🔄 Conectando...', 'info');
    
    // Cerrar conexión anterior si existe
    if (peer) {
        peer.destroy();
    }
    
    // Crear peer temporal para conectarse
    peer = new window.Peer({
        debug: 0,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        }
    });
    
    peer.on('open', (id) => {
        console.log('Mi ID:', id);
        myPeerId = id;
        
        // Intentar conectar a la sala
        const conn = peer.connect(roomCode, {
            reliable: true
        });
        
        handleConnection(conn);
        
        conn.on('open', () => {
            console.log('Conexión establecida');
            isP2PActive = true;
            showToast('✅ ¡Conectado exitosamente!', 'success');
            document.getElementById('p2p-modal')?.remove();
            showP2PStatus('connected');
        });
        
        conn.on('error', (err) => {
            console.error('Error de conexión:', err);
            showToast('❌ No se pudo conectar. Verifica el código.', 'error');
            isP2PActive = false;
            showP2PStatus('disconnected');
        });
    });
    
    peer.on('error', (err) => {
        console.error('Error P2P:', err);
        if (err.type === 'peer-unavailable') {
            showToast('❌ Sala no encontrada. Verifica el código.', 'error');
        } else {
            showToast('❌ Error de conexión. Intenta de nuevo.', 'error');
        }
        isP2PActive = false;
        showP2PStatus('disconnected');
    });
    
    peer.on('disconnected', () => {
        console.log('Peer desconectado, intentando reconectar...');
        if (peer && !peer.destroyed) {
            peer.reconnect();
        }
    });
};

window.disconnectP2P = function() {
    if (currentConnection) {
        currentConnection.close();
        currentConnection = null;
    }
    
    if (peer) {
        peer.destroy();
        peer = null;
    }
    
    isP2PActive = false;
    myPeerId = null;
    
    showToast('Desconectado', 'info');
    document.getElementById('p2p-modal')?.remove();
    showP2PStatus('disconnected');
};

function handleConnection(conn) {
    currentConnection = conn;
    
    conn.on('data', (data) => {
        if (data.type === 'message') {
            addP2PMessageToUI(data.content, 'peer');
        } else if (data.type === 'typing') {
            showTypingIndicator();
        }
    });
    
    conn.on('close', () => {
        showToast('Compañero desconectado', 'warning');
        isP2PActive = false;
        showP2PStatus('disconnected');
    });
}

export function sendP2PMessage(text) {
    if (!currentConnection || !isP2PActive) {
        showToast('No hay conexión P2P activa', 'warning');
        return false;
    }
    
    currentConnection.send({
        type: 'message',
        content: text,
        timestamp: Date.now()
    });
    
    addP2PMessageToUI(text, 'me');
    return true;
}

function addP2PMessageToUI(text, sender) {
    const chatArea = document.getElementById('chat-area');
    if (!chatArea) return;
    
    const div = document.createElement('div');
    div.className = `flex gap-3 fade-in-up mb-4`;
    
    const isMe = sender === 'me';
    const emoji = isMe ? '🙋' : '👤';
    const bgColor = isMe ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200';
    const alignment = isMe ? 'ml-auto' : 'mr-auto';
    
    div.innerHTML = `
        <div class="${isMe ? 'hidden' : 'w-8 h-8 bg-purple-500'} rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md">
            ${emoji}
        </div>
        <div class="${bgColor} ${alignment} p-3 rounded-2xl max-w-[85%] shadow-sm text-sm border-2">
            <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-bold text-gray-500 uppercase">${isMe ? 'Tú' : 'Compañero'}</span>
                <span class="text-xs text-gray-400">👥 P2P</span>
            </div>
            <p class="text-gray-800">${text}</p>
        </div>
        ${isMe ? `<div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md">${emoji}</div>` : ''}
    `;
    
    chatArea.appendChild(div);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
}

function showTypingIndicator() {
    // Implementar indicador de "escribiendo..."
    const existing = document.getElementById('typing-indicator');
    if (existing) existing.remove();
    
    const chatArea = document.getElementById('chat-area');
    if (!chatArea) return;
    
    const div = document.createElement('div');
    div.id = 'typing-indicator';
    div.className = 'flex gap-3 mb-4 fade-in';
    div.innerHTML = `
        <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md">
            👤
        </div>
        <div class="bg-purple-50 border-2 border-purple-200 p-3 rounded-2xl">
            <div class="flex gap-1">
                <span class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0s"></span>
                <span class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
                <span class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></span>
            </div>
        </div>
    `;
    
    chatArea.appendChild(div);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
    
    setTimeout(() => div.remove(), 2000);
}

function showP2PStatus(status) {
    const p2pBtn = document.getElementById('p2p-btn');
    if (!p2pBtn) return;
    
    if (status === 'connected') {
        p2pBtn.classList.add('bg-green-500', 'animate-pulse');
        p2pBtn.classList.remove('bg-purple-500');
    } else {
        p2pBtn.classList.remove('bg-green-500', 'animate-pulse');
        p2pBtn.classList.add('bg-purple-500');
    }
}

export function isP2PConnected() {
    return isP2PActive && currentConnection;
}

export function notifyTyping() {
    if (currentConnection && isP2PActive) {
        currentConnection.send({ type: 'typing' });
    }
}
