# FitTrack Pro

Aplicație de fitness & hipertrofie (React + Vite + Capacitor), offline-first.

## Rulare locală

**Cerințe:** Node.js

1. `npm install`
2. `npm run dev`

## AI Coach (Bring Your Own Key)

Aplicația nu conține nicio cheie API. Pentru funcțiile AI, fiecare utilizator își introduce propria cheie Gemini
(gratuită din [Google AI Studio](https://aistudio.google.com/apikey)) în **Setări → Configurare AI Coach**.
Cheia se salvează doar pe dispozitiv (`localStorage`, `fittrack_user_gemini_key`). Fără cheie, AI Coach folosește
recomandări offline.

## Build

`npm run build`, apoi `npm run sync` pentru Capacitor.
