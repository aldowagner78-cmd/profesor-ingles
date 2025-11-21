# 🚀 DESPLIEGUE RÁPIDO - Profesor IA v4.0

## ⚡ PASO 1: LIMPIAR Y MOVER v4_final AL ROOT

### Ejecuta en PowerShell:

```powershell
cd C:\Users\kengy\Desktop\Profesor-ingles

# 1. Crear carpeta de respaldo
New-Item -Path "archive" -ItemType Directory -Force

# 2. Mover versiones viejas
Move-Item -Path "v2_modular" -Destination "archive\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "v3_final" -Destination "archive\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "index.html" -Destination "archive\" -Force -ErrorAction SilentlyContinue

# 3. Mover contenido de v4_final al root
Get-ChildItem -Path "v4_final\*" -Recurse | ForEach-Object {
    $dest = $_.FullName.Replace("v4_final\", "")
    $destDir = Split-Path $dest -Parent
    if ($destDir -and -not (Test-Path $destDir)) {
        New-Item -Path $destDir -ItemType Directory -Force | Out-Null
    }
    Copy-Item -Path $_.FullName -Destination $dest -Force
}

# 4. Verificar estructura
Get-ChildItem -Name
```

Deberías ver:
- ✅ `index.html`
- ✅ `manifest.json`
- ✅ `sw.js`
- ✅ `css/`
- ✅ `js/`
- ✅ `.git/`

---

## ⚡ PASO 2: SUBIR A GITHUB

```powershell
# 1. Agregar todos los archivos
git add .

# 2. Commit
git commit -m "feat: PWA completa v4.0 - Instalable en Android

- Manifest.json para PWA
- Service Worker para funcionamiento offline
- Botón 'Instalar App' en perfil
- Optimizado para móviles
- Versiones antiguas archivadas"

# 3. Push a GitHub
git push origin main
```

**Si pide credenciales:**
- Usuario: `aldowagner78-cmd`
- Contraseña: Tu Personal Access Token

---

## ⚡ PASO 3: CONFIGURAR GITHUB PAGES

1. Ve a: `https://github.com/aldowagner78-cmd/profesor-ingles`
2. Click en **"Settings"**
3. Click en **"Pages"** (menú lateral izquierdo)
4. En **"Source"**:
   - Branch: **`main`**
   - Folder: **`/ (root)`**
5. Click **"Save"**
6. Espera 2-3 minutos

Tu app estará en:
```
https://aldowagner78-cmd.github.io/profesor-ingles/
```

---

## 📱 PASO 4: INSTALAR EN ANDROID

### MÉTODO 1: Botón "Instalar App" (Recomendado)

1. Abre Chrome en Android
2. Ve a: `https://aldowagner78-cmd.github.io/profesor-ingles/`
3. Ingresa tu API Key de Gemini
4. Ve a **"Perfil"** (tab derecha)
5. Verás el botón **"📥 Instalar App"**
6. Tócalo y confirma
7. ¡Listo! La app aparece en tu pantalla de inicio 🎉

### MÉTODO 2: Menú de Chrome (si el botón no aparece)

1. Abre la app en Chrome
2. Toca el menú **⋮** (3 puntos)
3. Selecciona **"Instalar app"** o **"Agregar a pantalla de inicio"**
4. Confirma

---

## ✅ VERIFICACIÓN EN ANDROID

- [ ] La app carga
- [ ] Puedes ingresar API Key
- [ ] Cámara funciona (pide permiso)
- [ ] Micrófono funciona (pide permiso)
- [ ] Modo oscuro funciona
- [ ] Audio funciona
- [ ] Botón "Instalar App" aparece

---

## 🎯 URL FINAL

```
https://aldowagner78-cmd.github.io/profesor-ingles/
```

**Comparte este link para que cualquiera pueda instalarlo.**

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### Botón "Instalar App" no aparece
- Debe ser HTTPS ✅ (GitHub Pages ya lo es)
- Debe tener manifest.json ✅
- Debe tener service worker ✅
- Chrome Android solamente
- Si ya está instalada, el botón se oculta

### La app no se actualiza
```powershell
# Cambiar versión en sw.js
# Línea 2: CACHE_NAME = 'profesor-ia-v4.1-cache'
git add sw.js
git commit -m "chore: bump cache version"
git push origin main
```

### Permisos de cámara/micrófono
- Ve a Configuración → Apps → Chrome → Permisos
- Habilita Cámara y Micrófono

---

## 🎉 ¡LISTO!

Tu app **"Profesor IA"** ahora es una PWA completa que funciona como una app nativa en Android.

**Características:**
- ✅ Instalable desde Chrome
- ✅ Funciona offline (Service Worker)
- ✅ Ícono en pantalla de inicio
- ✅ Sin bordes del navegador (modo standalone)
- ✅ Tema personalizado
- ✅ Acceso a cámara y micrófono
- ✅ 100% gratis

**Tiempo total: 5-10 minutos**
