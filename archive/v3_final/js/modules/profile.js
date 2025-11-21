import { getState } from '../state.js';
import { SYLLABUS } from '../config.js';
import { setApiKey } from '../services/gemini.js';

export function initProfile() {
    const resetBtn = document.getElementById('reset-btn');
    if(resetBtn) {
        resetBtn.onclick = () => {
            if(confirm("¿Estás seguro de borrar todo tu progreso?")) {
                localStorage.removeItem('teacher_state');
                location.reload();
            }
        };
    }

    const changeKeyBtn = document.getElementById('change-key-btn');
    if(changeKeyBtn) {
        changeKeyBtn.onclick = () => {
            if(confirm("¿Quieres cambiar tu API Key?")) {
                setApiKey(''); // Clear key
                location.reload(); // Reload to trigger the modal again
            }
        };
    }

    renderProfile();
}

export function renderProfile() {
    const state = getState();
    const currentLevel = SYLLABUS[state.levelIdx];
    
    // Actualizar Stats
    const scoreEl = document.getElementById('profile-score');
    if(scoreEl) scoreEl.innerText = state.score;
    
    const levelEl = document.getElementById('profile-level');
    if(levelEl) levelEl.innerText = currentLevel.name;

    // Renderizar Syllabus
    const list = document.getElementById('syllabus-list');
    if(!list) return;
    
    list.innerHTML = '';
    
    SYLLABUS.forEach((level, lIdx) => {
        level.topics.forEach((topic, tIdx) => {
            const isCompleted = lIdx < state.levelIdx || (lIdx === state.levelIdx && tIdx < state.topicIdx);
            const isCurrent = lIdx === state.levelIdx && tIdx === state.topicIdx;
            const isLocked = !isCompleted && !isCurrent;
            
            const item = document.createElement('div');
            item.className = `relative pl-10 py-1 ${isLocked ? 'opacity-50 grayscale' : ''}`;
            
            let icon = '';
            if (isCompleted) icon = `<div class="absolute left-0 top-1 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center text-white shadow-sm z-10"><i data-lucide="check" class="w-4 h-4"></i></div>`;
            else if (isCurrent) icon = `<div class="absolute left-0 top-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-blue-200 shadow-lg z-10 ring-4 ring-blue-50"><i data-lucide="play" class="w-3 h-3 fill-current"></i></div>`;
            else icon = `<div class="absolute left-0 top-1 w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 z-10"><i data-lucide="lock" class="w-3 h-3"></i></div>`;
            
            item.innerHTML = `
                ${icon}
                <div class="bg-white border ${isCurrent ? 'border-blue-200 shadow-sm' : 'border-transparent'} rounded-xl p-3 transition-all">
                    <p class="text-xs font-bold text-slate-400 uppercase mb-0.5">${level.name}</p>
                    <p class="font-bold text-slate-800">${topic}</p>
                </div>
            `;
            
            list.appendChild(item);
        });
    });
    
    if(window.lucide) window.lucide.createIcons();
}
