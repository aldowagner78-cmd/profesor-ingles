// Módulo de Juego y Lógica
import { getState, updateState } from '../state.js';

export const COMMON_OBJECTS = [
    {es: "Silla", en: "Chair"}, {es: "Mesa", en: "Table"}, {es: "Taza", en: "Cup"}, 
    {es: "Computadora", en: "Computer"}, {es: "Teléfono", en: "Phone"}, {es: "Lápiz", en: "Pencil"}
    // ... más objetos
];

export function getRandomMission() {
    return COMMON_OBJECTS[Math.floor(Math.random() * COMMON_OBJECTS.length)];
}

// Algoritmo de Levenshtein para Fuzzy Match
export function fuzzyMatch(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if(s1 === s2) return true;
    if(s1.includes(s2) || s2.includes(s1)) return true;
    
    const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i += 1) { track[0][i] = i; }
    for (let j = 0; j <= s2.length; j += 1) { track[j][0] = j; }
    for (let j = 1; j <= s2.length; j += 1) {
        for (let i = 1; i <= s1.length; i += 1) {
            const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1,
                track[j - 1][i] + 1,
                track[j - 1][i - 1] + indicator
            );
        }
    }
    const distance = track[s2.length][s1.length];
    const maxLen = Math.max(s1.length, s2.length);
    return (1 - distance / maxLen) > 0.6; 
}
