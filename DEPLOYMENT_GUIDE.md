# 📱 DESPLIEGUE EN GITHUB PAGES - Profesor IA v4.0

## 🎯 OBJETIVO
Publicar la aplicación en GitHub Pages para acceder desde cualquier dispositivo Android/iOS.

---

## 📋 PASOS PRECISOS PARA DESPLIEGUE

### **PASO 1: Preparar el Repositorio Local**

1. Abre PowerShell en `C:\Users\kengy\Desktop\Profesor-ingles`

2. Verifica que estás en la rama main:
```powershell
git branch
```

3. Verifica el estado actual:
```powershell
git status
```

---

### **PASO 2: Agregar los Archivos de v4_final**

1. Agrega todos los archivos nuevos al staging:
```powershell
git add v4_final/
```

2. Verifica qué archivos se agregaron:
```powershell
git status
```

Deberías ver:
- `v4_final/index.html`
- `v4_final/css/styles.css`
- `v4_final/js/` (todos los archivos JS)
- `v4_final/VERIFICATION_CHECKLIST.md`

3. Haz commit de los cambios:
```powershell
git commit -m "feat: v4_final - App completa con todas las mejoras

- Modo oscuro manual
- Lógica del juego corregida (pedir en español, responder en inglés)
- Detección mejorada de audio en lecciones
- Sistema de temas completados
- Racha diaria
- Barra de progreso hacia siguiente nivel
- Filtros y exportación de vocabulario (CSV)
- Temporizador de estudio
- Quiz corregidos (pregunta en español, opciones en inglés)
- Botones de salir en modos de cámara
- CSS nativo sin dependencias externas"
```

---

### **PASO 3: Subir los Cambios a GitHub**

1. Sube los cambios al repositorio remoto:
```powershell
git push origin main
```

Si te pide credenciales:
- Usuario: `aldowagner78-cmd`
- Contraseña: Tu Personal Access Token de GitHub

---

### **PASO 4: Configurar GitHub Pages**

1. Ve a tu repositorio en GitHub:
   ```
   https://github.com/aldowagner78-cmd/profesor-ingles
   ```

2. Click en **"Settings"** (Configuración)

3. En el menú lateral izquierdo, busca **"Pages"**

4. En **"Source"** (Fuente):
   - Selecciona: **`main`** (rama)
   - Selecciona: **`/ (root)`** (carpeta raíz)
   - Click en **"Save"**

5. Espera 1-2 minutos mientras GitHub construye el sitio

6. Verás un mensaje verde:
   ```
   Your site is live at https://aldowagner78-cmd.github.io/profesor-ingles/
   ```

---

### **PASO 5: Configurar la Ruta Correcta**

**OPCIÓN A: Usar v4_final como carpeta principal**

Crea un archivo `index.html` en la raíz que redirija a v4_final:

```powershell
New-Item -Path "index.html" -ItemType File -Force
```

Edita el archivo y agrega:
```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="0; url=v4_final/index.html">
    <title>Profesor IA - Redireccionando...</title>
</head>
<body>
    <p>Redireccionando a la aplicación...</p>
    <p>Si no se redirige automáticamente, <a href="v4_final/index.html">haz clic aquí</a>.</p>
</body>
</html>
```

**OPCIÓN B: Mover v4_final al root (Recomendado)**

```powershell
# Respaldar versiones anteriores
mkdir archive -Force
Move-Item v2_modular archive/ -Force
Move-Item v3_final archive/ -Force

# Mover contenido de v4_final al root
Get-ChildItem v4_final/* | Move-Item -Destination . -Force

# Eliminar carpeta vacía
Remove-Item v4_final -Recurse -Force
```

Luego:
```powershell
git add .
git commit -m "chore: mover v4_final al root para GitHub Pages"
git push origin main
```

---

### **PASO 6: Acceder desde Android**

1. Abre Chrome en tu Android

2. Ve a:
   ```
   https://aldowagner78-cmd.github.io/profesor-ingles/
   ```
   
   O si elegiste Opción A:
   ```
   https://aldowagner78-cmd.github.io/profesor-ingles/v4_final/
   ```

3. **Agregar a Pantalla de Inicio (PWA)**:
   - Toca el menú (⋮) en Chrome
   - Selecciona "Agregar a pantalla de inicio"
   - La app aparecerá como ícono en tu Android

4. **Permitir Permisos**:
   - Cámara: Necesario para el modo Explorar y Juego
   - Micrófono: Necesario para el reconocimiento de voz

---

### **PASO 7: Verificación Final**

Prueba en Android:
- [ ] La app carga correctamente
- [ ] Puedes ingresar tu API Key
- [ ] La cámara funciona (pide permiso)
- [ ] El micrófono funciona (pide permiso)
- [ ] Los botones de audio funcionan
- [ ] El modo oscuro se activa
- [ ] El vocabulario se guarda (localStorage)
- [ ] La exportación CSV funciona

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### Error: "Permission denied"
```powershell
git config --global user.email "tu_email@example.com"
git config --global user.name "aldowagner78-cmd"
```

### Error: "Failed to push"
Verifica tu token:
```powershell
git remote set-url origin https://aldowagner78-cmd:TU_TOKEN@github.com/aldowagner78-cmd/profesor-ingles.git
```

### La página no carga
1. Verifica que GitHub Pages esté habilitado en Settings
2. Espera 5 minutos y recarga
3. Limpia caché del navegador (Ctrl+Shift+R)

### La cámara no funciona en Android
1. Asegúrate de usar **HTTPS** (GitHub Pages usa HTTPS por defecto)
2. Chrome debe tener permisos de cámara habilitados
3. Algunos navegadores móviles no soportan `getUserMedia` (usa Chrome)

### El micrófono no funciona
1. Debe ser **HTTPS** (GitHub Pages ya lo es)
2. Solo funciona en Chrome Android (no en Firefox)
3. Permisos deben estar habilitados

---

## 📱 URL FINAL

Después de completar los pasos, tu app estará en:

```
https://aldowagner78-cmd.github.io/profesor-ingles/
```

Puedes compartir esta URL para acceder desde cualquier dispositivo.

---

## 🎉 ¡LISTO!

Tu aplicación "Profesor IA" ahora está disponible globalmente y puedes usarla desde tu celular Android en cualquier momento.

**Beneficios:**
- ✅ Acceso 24/7 desde cualquier lugar
- ✅ No requiere instalación
- ✅ Funciona como PWA (se puede agregar a inicio)
- ✅ Datos guardados localmente en tu dispositivo
- ✅ HTTPS seguro por defecto
- ✅ Gratis (GitHub Pages es gratuito)

**Siguiente paso recomendado:**
Crear un archivo `manifest.json` para convertirla en PWA completa con ícono personalizado.
