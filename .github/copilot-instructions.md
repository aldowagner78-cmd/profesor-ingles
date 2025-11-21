# Copilot Instructions for "Profesor IA" Codebase

## Project Overview
This is a **single-file client-side web application** ("Profesor IA - Inglés") designed to teach English using AI. It runs entirely in the browser without a backend server, utilizing external APIs for intelligence.

## Architecture & Core Components
- **Single Entry Point:** The entire application logic, styling, and markup reside in `index.html`.
- **View Management:** A simple tab system (`switchTab`) toggles visibility between three main sections:
  - `view-camera`: Object recognition game using the device camera.
  - `view-class`: Chat interface for lessons and quizzes.
  - `view-profile`: User progress and score display.
- **AI Integration:** Direct client-side calls to Google Gemini API (`gemini-2.0-flash`).
- **State Persistence:** Uses `localStorage` (`teacher_score`) to save user progress.

## Key Workflows
### 1. AI Communication Pattern
All AI interactions go through the `callGemini` function.
- **Protocol:** The system prompt explicitly enforces **JSON-only responses**.
- **Response Handling:** `handleResponse` parses the JSON and updates the UI based on the `type` field:
  - `lesson`: Renders markdown content.
  - `quiz`: Displays interactive multiple-choice questions.
  - `eval`: Provides feedback on user answers.
  - `analysis`: Results from image recognition.

### 2. Camera & Image Analysis
- **Flow:** `startCamera` -> `takePicture` (captures canvas) -> `callGemini` (with base64 image) -> UI Update.
- **Hardware Access:** Uses `navigator.mediaDevices.getUserMedia` with a fallback for environment/user facing modes.

### 3. Voice Interaction
- **Speech-to-Text:** Uses `webkitSpeechRecognition` for capturing user pronunciation.
- **Text-to-Speech:** Uses `speechSynthesis` to read out English words/sentences (`speakText` function).

## Development Conventions
- **No Build Step:** Do not suggest npm commands, webpack, or compilation steps. All code is vanilla JS inside `<script>` tags.
- **CDN Dependencies:** Libraries (Tailwind, Lucide, Marked) are loaded via CDN.
- **Styling:** Tailwind CSS utility classes are used exclusively. Custom styles (animations, glassmorphism) are in the `<style>` block.
- **Security Note:** The API key is currently hardcoded. When modifying `callGemini`, preserve the existing key variable unless implementing a secure proxy pattern.

## Critical Files
- `index.html`: Contains 100% of the application code.

## Common Tasks
- **Adding a new AI feature:**
  1. Update the `sysPrompt` in `callGemini` to define a new JSON `type`.
  2. Add a handler case in `handleResponse`.
  3. Create the UI element in the HTML structure.
- **Modifying UI:** Use Tailwind classes. For complex animations, add to the internal `<style>` block.
