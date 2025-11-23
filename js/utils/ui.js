// Utilidades de UI

export function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    
    if (!modal || !titleEl || !msgEl || !okBtn || !cancelBtn) {
        // Fallback si no existe el modal en el DOM
        if (confirm(`${title}\n\n${message}`)) {
            onConfirm();
        }
        return;
    }
    
    titleEl.textContent = title;
    msgEl.textContent = message;
    
    const close = () => {
        modal.classList.add('hidden');
        okBtn.onclick = null;
        cancelBtn.onclick = null;
    };
    
    okBtn.onclick = () => {
        onConfirm();
        close();
    };
    
    cancelBtn.onclick = close;
    
    modal.classList.remove('hidden');
    
    // Asegurar que los iconos se rendericen si es necesario
    if (window.lucide) window.lucide.createIcons();
}

export function showToast(message, type = 'info') {
    // Crear toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Estilos inline (ya que no están en CSS)
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '1rem 1.5rem',
        borderRadius: '0.75rem',
        color: 'white',
        fontWeight: '700',
        fontSize: '0.875rem',
        zIndex: '10000',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        animation: 'slideUp 0.3s ease-out',
        maxWidth: '90%'
    });
    
    // Colores según tipo
    const colors = {
        info: '#4A90E2',
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B'
    };
    toast.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(toast);
    
    // Auto-remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function triggerConfetti() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        
        Object.assign(confetti.style, {
            position: 'fixed',
            width: '10px',
            height: '10px',
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            left: Math.random() * 100 + '%',
            top: '-10px',
            opacity: Math.random() + 0.5,
            transform: `rotate(${Math.random() * 360}deg)`,
            animation: `confettiFall ${2 + Math.random() * 2}s linear forwards`,
            pointerEvents: 'none',
            zIndex: '9999'
        });
        
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 4000);
    }
    
    // Agregar keyframes si no existen
    if (!document.getElementById('confetti-styles')) {
        const style = document.createElement('style');
        style.id = 'confetti-styles';
        style.textContent = `
            @keyframes confettiFall {
                to {
                    transform: translateY(100vh) rotate(720deg);
                    opacity: 0;
                }
            }
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
}

export function showLoading(container, message = 'Cargando...') {
    const loader = document.createElement('div');
    loader.className = 'loading-container';
    loader.innerHTML = `
        <div class="spinner"></div>
        <p>${message}</p>
    `;
    
    Object.assign(loader.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        padding: '2rem',
        color: '#64748B'
    });
    
    // Spinner
    const spinner = loader.querySelector('.spinner');
    Object.assign(spinner.style, {
        width: '2rem',
        height: '2rem',
        border: '3px solid #E2E8F0',
        borderTop: '3px solid #4A90E2',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
    });
    
    // Agregar animation si no existe
    if (!document.getElementById('spinner-styles')) {
        const style = document.createElement('style');
        style.id = 'spinner-styles';
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    if (container) {
        container.appendChild(loader);
    }
    
    return loader;
}

export function createAudioButton(text, lang = 'en-US') {
    const btn = document.createElement('button');
    btn.className = 'audio-btn';
    btn.innerHTML = '<i data-lucide="volume-2"></i>';
    btn.title = 'Escuchar';
    
    Object.assign(btn.style, {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '1.5rem',
        height: '1.5rem',
        borderRadius: '0.375rem',
        background: '#E8F4FD',
        color: '#4A90E2',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginLeft: '0.5rem',
        verticalAlign: 'middle'
    });
    
    btn.onmouseover = () => {
        if (!btn.classList.contains('playing')) {
            btn.style.background = '#4A90E2';
            btn.style.color = 'white';
        }
    };
    
    btn.onmouseout = () => {
        if (!btn.classList.contains('playing')) {
            btn.style.background = '#E8F4FD';
            btn.style.color = '#4A90E2';
        }
    };
    
    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Resetear visualmente otros botones activos
        document.querySelectorAll('.audio-btn.playing').forEach(b => {
            if (b !== btn) {
                b.classList.remove('playing');
                // No cambiar icono, solo estilo
            }
        });

        // Importar dinámicamente desde la ruta correcta
        import('../services/voice.js').then(({ speakText }) => {
            const result = speakText(text, lang);
            
            if (result) {
                // Comenzó a reproducir
                btn.classList.add('playing');
                // NO cambiar icono a cuadrado vacío
                // Solo cambiar color para indicar activo
                btn.style.color = '#EF4444'; // Rojo para indicar "Stop"
                
                const resetBtn = () => {
                    btn.classList.remove('playing');
                    btn.style.color = '#4A90E2'; // Volver a azul
                };
                
                result.addEventListener('end', resetBtn);
                result.addEventListener('error', resetBtn);
            } else {
                // Se detuvo (toggle off)
                btn.classList.remove('playing');
                btn.style.color = '#4A90E2'; // Volver a azul
            }
        }).catch(err => {
            console.error('Error importing voice service:', err);
            // Fallback: intentar con el objeto global si existe
            if (window.speechSynthesis) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = lang;
                window.speechSynthesis.speak(utterance);
            }
        });
    };
    
    // Renderizar icono
    if (window.lucide) {
        setTimeout(() => window.lucide.createIcons({ icons: { 'volume-2': window.lucide.icons['volume-2'] } }), 0);
    }
    
    return btn;
}
