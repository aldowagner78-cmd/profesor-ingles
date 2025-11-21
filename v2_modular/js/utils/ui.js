// Utilidades de UI (Toast, Confetti, Modals)

export function initUI() {
    // Inicializar iconos Lucide
    if(window.lucide) window.lucide.createIcons();
}

export function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-xl z-50 font-bold text-sm flex items-center gap-2 fade-in-up ${type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-800 text-white'}`;
    toast.innerHTML = `<span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

export function triggerConfetti() {
    const colors = ['#f00', '#0f0', '#00f', '#ff0', '#f0f', '#f80', '#0ff'];
    for(let i=0; i<20; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        const duration = Math.random() * 2 + 2;
        c.style.animationDuration = duration + 's';
        document.body.appendChild(c);
        setTimeout(() => {
            if(c.parentNode) c.remove();
        }, duration * 1000);
    }
}
