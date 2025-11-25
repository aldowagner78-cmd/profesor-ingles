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
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in';
    
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scale-in">
            <div class="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
                <h2 class="text-xl font-bold flex items-center gap-2">
                    👥 Chat P2P
                    <button onclick="this.closest('#p2p-modal').remove()" class="ml-auto text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
                </h2>
                <p class="text-sm opacity-90 mt-1">Practica inglés con un compañero en tiempo real</p>
            </div>
            
            <div class="p-6 space-y-4">
                ${isP2PActive ? `
                    <div class="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                        <div class="text-3xl mb-2">✅</div>
                        <p class="font-bold text-green-700">Conectado</p>
                        <p class="text-sm text-gray-600 mt-1">Sala: <span class="font-mono font-bold">${myPeerId}</span></p>
                    </div>
                    <button onclick="window.disconnectP2P()" class="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors">
                        🚪 Desconectar
                    </button>
                ` : `
                    <div class="space-y-3">
                        <button onclick="window.createP2PRoom()" class="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition-all">
                            🎯 Crear Sala
                        </button>
                        
                        <div class="flex items-center gap-2">
                            <div class="flex-1 border-t border-gray-300"></div>
                            <span class="text-xs text-gray-400 font-bold">O</span>
                            <div class="flex-1 border-t border-gray-300"></div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">Código de Sala:</label>
                            <input 
                                type="text" 
                                id="room-code-input" 
                                placeholder="ABC123" 
                                maxlength="6"
                                class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-mono text-center text-lg uppercase"
                            >
                        </div>
                        
                        <button onclick="window.joinP2PRoom()" class="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg transition-all">
                            🚀 Unirse a Sala
                        </button>
                    </div>
                    
                    <div class="bg-blue-50 p-3 rounded-xl border border-blue-200">
                        <p class="text-xs text-gray-600">
                            <span class="font-bold">💡 Tip:</span> Comparte el código de sala con tu compañero para conectarse. La conexión es directa y privada.
                        </p>
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
}

window.createP2PRoom = function() {
    if (!window.Peer) {
        showToast('Error: PeerJS no está cargado', 'error');
        return;
    }
    
    const roomCode = generateRoomCode();
    myPeerId = roomCode;
    
    showToast('Creando sala...', 'info');
    
    peer = new window.Peer(roomCode, {
        debug: 0 // Sin logs para producción
    });
    
    peer.on('open', (id) => {
        console.log('Sala creada:', id);
        isP2PActive = true;
        showToast(`Sala creada: ${id}`, 'success');
        showP2PModal(); // Refrescar modal
        
        // Copiar código al portapapeles
        if (navigator.clipboard) {
            navigator.clipboard.writeText(id).then(() => {
                showToast('Código copiado al portapapeles', 'info');
            });
        }
    });
    
    peer.on('connection', (conn) => {
        handleConnection(conn);
        showToast('¡Compañero conectado!', 'success');
    });
    
    peer.on('error', (err) => {
        console.error('Error P2P:', err);
        showToast('Error al crear sala. Intenta de nuevo.', 'error');
        isP2PActive = false;
    });
};

window.joinP2PRoom = function() {
    const input = document.getElementById('room-code-input');
    const roomCode = input?.value.trim().toUpperCase();
    
    if (!roomCode || roomCode.length < 4) {
        showToast('Ingresa un código válido', 'warning');
        return;
    }
    
    if (!window.Peer) {
        showToast('Error: PeerJS no está cargado', 'error');
        return;
    }
    
    showToast('Conectando...', 'info');
    
    // Crear peer temporal para conectarse
    peer = new window.Peer({
        debug: 0
    });
    
    peer.on('open', (id) => {
        myPeerId = id;
        const conn = peer.connect(roomCode);
        handleConnection(conn);
        
        conn.on('open', () => {
            isP2PActive = true;
            showToast('¡Conectado!', 'success');
            document.getElementById('p2p-modal')?.remove();
            showP2PStatus('connected');
        });
        
        conn.on('error', (err) => {
            console.error('Error de conexión:', err);
            showToast('No se pudo conectar. Verifica el código.', 'error');
        });
    });
    
    peer.on('error', (err) => {
        console.error('Error P2P:', err);
        showToast('Error de conexión', 'error');
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
