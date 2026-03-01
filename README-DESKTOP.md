POS System Desktop (Electron) Guide

Prasyarat
- Node.js 24.x
- npm
- electron-builder terpasang via devDependencies

Konsep
- Backend tetap berjalan di Railway (Express + MySQL).
- Aplikasi desktop (Electron .exe) memanggil API Railway via HTTPS.
- Base URL API dikontrol oleh VITE_API_BASE_URL.

Pengaturan Base URL
1. Salin .env.electron.example menjadi .env.electron
2. Isi VITE_API_BASE_URL dengan domain Railway Anda, contoh:
   VITE_API_BASE_URL="https://your-railway-service.up.railway.app"

Build untuk Windows
- PowerShell:
  $env:VITE_API_BASE_URL="https://your-railway-service.up.railway.app"; npm run build:electron-win

Masuk Akun
- Admin default dibuat otomatis saat pertama kali server tidak memiliki user.
  username: admin
  password: admin123

Catatan Keamanan
- Jangan menaruh DATABASE_URL dalam aplikasi desktop.
- Gunakan HTTPS dan JWT untuk autentikasi.

Struktur Produksi
- Server Express menyajikan file statis dari dist/public
- Electron membaca VITE_API_BASE_URL untuk memanggil API

