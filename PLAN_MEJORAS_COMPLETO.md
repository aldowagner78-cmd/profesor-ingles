# 🎯 PLAN DE MEJORAS COMPLETO - PROFESOR IA

**Fecha:** 22 de Noviembre 2025  
**Estado:** En Progreso

---

## 📷 MÓDULO 1: CAMERA (Modo Cámara AR)

### ✅ Funciona bien actualmente:
- Modo Explorar con formato bilingüe correcto
- Audio solo en inglés (no español)
- Sistema anti-repetición de objetos

### 🔧 Pendiente - Modo Juego:
- [ ] Agregar botón "Buscar Siguiente" (siguiente misión)
- [ ] Agregar botón "Volver" (regresar a selector)
- [ ] Verificar formato de respuesta al acertar: "**Object (Objeto)**" + 🔊
- [ ] Verificar formato de ejemplos: "**Sentence (Oración)**" + 🔊
- [ ] Confirmar que audio solo reproduce inglés

### 🆕 Pendiente - Modo Traducir (nuevo):
- [ ] Crear botón "Traducir" en selector de modos
- [ ] Implementar captura de texto con OCR (Vision API de Gemini)
- [ ] Implementar detección automática de idioma
- [ ] Lógica: ES→EN o EN→ES según detección
- [ ] Mostrar texto original + traducción
- [ ] Botón 🔊 para escuchar traducción
- [ ] UI para mostrar resultados de traducción

### 💡 Sugerencias adicionales:
- [ ] Modo Desafío Rápido: Encontrar 5 objetos seguidos
- [ ] Categorías temáticas: "Aprende frutas", "Aprende animales"
- [ ] Historial visual: Mostrar fotos de objetos identificados
- [ ] Pronunciación comparativa: Grabar voz y comparar
- [ ] Modo sin cámara: Subir foto desde galería

---

## 💬 MÓDULO 2: CHAT (Modo Aprendizaje/Clase)

### 🔴 PRIORIDAD ALTA:
- [ ] **Arreglar botones 🔊 que no funcionan**
- [ ] **Quiz solo en inglés** (sin traducción en opciones)
- [ ] **Felicitaciones bilingües:** "Great! (¡Genial!)" + 🔊
- [ ] **Botones de control:**
  - [ ] Botón "Limpiar Chat"
  - [ ] Botón "Reiniciar Lección"
  - [ ] Botón "Lección Anterior"

### 🟡 PRIORIDAD MEDIA:

#### Nuevos tipos de Quiz:
- [ ] **Quiz de Completar (Fill in the blank):**
  ```
  Complete: "I ___ to school every day."
  [____________________] [CHECK ✓]
  ```

- [ ] **Quiz de Verdadero/Falso:**
  ```
  Is this correct? "He don't like pizza"
  [TRUE ✓] [FALSE ✗]
  ```

- [ ] **Quiz de Ordenar Palabras:**
  ```
  Ordena: "I like to play soccer"
  [to] [play] [soccer] [I] [like] (drag & drop)
  ```

- [ ] **Quiz de Emparejar:**
  ```
  Apple  •  • Manzana
  Car    •  • Coche
  ```

#### Mejoras UX Quiz:
- [ ] Contador de progreso: "Question 3/10"
- [ ] Barra de progreso visual: ████░░░░░░ 40%
- [ ] Estadísticas al final: ✓7 ✗3 Score: 70% 🎉
- [ ] Botón "Try Again"
- [ ] Botón "Review Mistakes"
- [ ] Explicación pedagógica al fallar

#### Mejoras Lecciones:
- [ ] Tarjetas de vocabulario flashcards
- [ ] Audio completo de lección
- [ ] Notas personales
- [ ] Modo resumen (3 puntos clave)

#### Mejoras Roleplay:
- [ ] Escenarios específicos seleccionables
- [ ] Avatar visual del personaje
- [ ] Modo libre (sin límite de turnos)
- [ ] Grabación de voz para comparar
- [ ] Nivel de dificultad (Básico/Avanzado)

### 🟢 PRIORIDAD BAJA:
- [ ] Quiz de Pronunciación (IA evalúa)
- [ ] Quiz de Escucha (Listening)
- [ ] Quiz de Diálogo Contextual
- [ ] Quiz de Velocidad (Timed)
- [ ] Sistema de vidas: ❤️❤️❤️
- [ ] Gamificación: rachas, combos, x2 x3
- [ ] Avatares y animaciones
- [ ] Highlights de sintaxis (colores)

---

## 👤 MÓDULO 3: PROFILE (Perfil del Usuario)

### 🔴 CORRECCIONES CRÍTICAS:
- [x] **Arreglar modo oscuro:**
  - [x] Icono no es claro (moon ↔ sun)
  - [x] No cambia al presionar toggle
  
- [x] **Arreglar reset:**
  - [x] Mantener API key al resetear
  - [x] No debe pedir API nuevamente
  
- [x] **Cambiar formato de vocabulario:**
  - [x] De grid de tarjetas → Lista vertical
  - [x] Iconos específicos por categoría
  - [x] Formato: `[ICON] Word (Traducción) 🔊`
  
- [x] **Agregar traducciones:**
  - [x] Todas las palabras: "English (Español)"
  - [x] Botón 🔊 reproduce solo inglés
  - [x] Ejemplos en modal: "Sentence (Oración)" 🔊

### 🟡 MEJORAS IMPORTANTES:

#### Sistema de Iconos:
```javascript
🐾 Animales (dog, cat, bird)
🍎 Frutas (apple, banana, orange)
🍽️ Comida (pizza, burger, meal)
👤 Cuerpo (mouth, eye, hand)
📝 Escuela (pencil, book, notebook)
🚗 Vehículos (car, bus, train)
🌿 Naturaleza (tree, flower, plant)
🏠 Casa (chair, table, bed)
👕 Ropa (shirt, pants, shoes)
🕐 Tiempo (clock, hour, day)
🎨 Colores (red, blue, green)
🏃 Acciones (walk, run, jump)
📚 Default
```

#### Búsqueda y Filtrado:
- [ ] Barra de búsqueda en vocabulario
- [ ] Buscar por inglés o español
- [ ] Filtro en tiempo real
- [ ] Múltiples filtros combinados (nivel + categoría)
- [ ] Orden: alfabético, reciente, menos practicada

#### Estadísticas Detalladas:
- [ ] Contador de palabras por categoría
- [ ] Gráfico circular/barras
- [ ] Palabras aprendidas hoy/semana
- [ ] Dashboard visual con gráficos
- [ ] Heatmap de actividad (calendario)
- [ ] Tiempo total estudiado

#### Modo Práctica:
- [ ] Botón "Practicar Vocabulario"
- [ ] Flashcards: Frente (inglés) → Atrás (español)
- [ ] Sistema repetición espaciada (algoritmo Leitner)
- [ ] Quiz solo con vocabulario personal
- [ ] Marcar "La sé" / "No la sé"

#### Gestión de Vocabulario:
- [ ] Botón editar ✏️ (cambiar traducción, nota)
- [ ] Botón eliminar 🗑️ (con confirmación)
- [ ] Agregar palabra manualmente (+ Agregar)
- [ ] Notas personales por palabra
- [ ] Favoritos ⭐

#### Logros y Gamificación:
- [ ] Sistema de badges:
  - 🏆 First Word
  - 🔥 Week Warrior (7 días racha)
  - 📚 Vocabulary Builder (50 palabras)
  - 🎯 Century (100 palabras)
  - ⭐ Polyglot (todos los niveles)
- [ ] Progreso visual por nivel (barras)
- [ ] Niveles de usuario (Novato → Maestro)

#### Exportar/Compartir:
- [ ] CSV (actual) ✓
- [ ] PDF con diseño bonito
- [ ] Anki deck
- [ ] Excel (.xlsx)
- [ ] Imprimir tarjetas recortables
- [ ] Compartir imagen con stats (redes sociales)

### 🟢 MEJORAS AVANZADAS:
- [ ] Syllabus clickeable (ir a tema)
- [ ] Sistema de puntos por tema
- [ ] Modo libre (desbloquear todos)
- [ ] Tabla de clasificación
- [ ] Notificaciones push (recordatorios)
- [ ] Backup en la nube (Google Drive)
- [ ] Sincronización multi-dispositivo
- [ ] Preferencias de audio (voz, acento, velocidad)
- [ ] Meta diaria personalizada
- [ ] Desafío semanal

---

## 🎨 REGLAS GENERALES DEL SISTEMA

### **REGLAS DE ORO:**
1. ✅ **Usuario puede escribir/hablar en ESPAÑOL o INGLÉS**
2. ✅ **IA SIEMPRE responde en INGLÉS con traducción (Español) entre paréntesis**
3. ✅ **Botón 🔊 reproduce SOLO la parte en inglés**
4. ✅ **EXCEPCIÓN: Quiz muestra opciones SOLO en inglés (sin traducción)**
5. ✅ **Felicitaciones en inglés con traducción: "Great job! (¡Buen trabajo!)"**
6. ✅ **Usar `extractEnglishOnly()` antes de `speakText()` siempre**

### **FORMATO ESTÁNDAR:**
```
Lecciones: "I can swim (Puedo nadar)" 🔊
Vocabulario: "Apple (Manzana)" 🔊
Ejemplos: "She is reading (Ella está leyendo)" 🔊
Quiz opciones: "Good morning" 🔊 (SIN traducción)
Felicitaciones: "Excellent! (¡Excelente!)" 🔊
```

---

## 📊 CRONOGRAMA DE IMPLEMENTACIÓN

### **FASE 1 - CORRECCIONES CRÍTICAS** (Inmediato)
- Módulo Profile: Modo oscuro, reset, vocabulario
- Módulo Chat: Botones 🔊, quiz en inglés, felicitaciones

### **FASE 2 - NUEVAS FUNCIONALIDADES** (Corto plazo)
- Módulo Camera: Modo Traducir
- Módulo Chat: Nuevos tipos de quiz (completar, verdadero/falso)
- Módulo Profile: Búsqueda, iconos, estadísticas

### **FASE 3 - MEJORAS UX** (Mediano plazo)
- Modo práctica flashcards
- Logros y gamificación
- Calendario de actividad
- Mejoras visuales y animaciones

### **FASE 4 - FUNCIONES AVANZADAS** (Largo plazo)
- Backup en la nube
- Sincronización multi-dispositivo
- Tabla de clasificación
- Notificaciones push

---

## 📝 NOTAS DE DESARROLLO

- **Priorizar:** Correcciones críticas antes que nuevas features
- **Testing:** Verificar audio 🔊 funciona en cada cambio
- **Consistencia:** Aplicar formato bilingüe en TODA la app
- **Performance:** Optimizar para móviles (es PWA)
- **Accesibilidad:** Considerar tamaño de texto, contraste, navegación por teclado

---

## ✅ ESTADO ACTUAL

**Última actualización:** 22 Nov 2025  
**Progreso general:** 30%

- ✅ Módulo Camera: Modo Explorar funcionando
- ✅ Módulo Chat: Sistema conversacional básico
- ✅ Módulo Profile: Estructura base
- 🔄 En progreso: Correcciones críticas Profile
- ⏳ Pendiente: Modo Traducir, nuevos quiz, mejoras UX

---

**Repositorio:** https://github.com/aldowagner78-cmd/profesor-ingles  
**Deploy:** https://aldowagner78-cmd.github.io/profesor-ingles/
