# Panduan Deployment & Hosting Sistem POS

Dokumen ini berisi panduan lengkap untuk melakukan instalasi, konfigurasi, dan deployment aplikasi POS System (Point of Sale) ke server produksi (VPS) atau lingkungan lokal.

## 📋 Prasyarat Sistem

Sebelum memulai, pastikan server atau komputer target memiliki perangkat lunak berikut:

1.  **Node.js**: Versi 18.x atau 20.x (LTS recommended).
2.  **MySQL Server**: Versi 8.0 atau MariaDB 10.x.
3.  **Git**: Untuk mengambil kode sumber (jika via repository).
4.  **PM2** (Opsional tapi direkomendasikan): Untuk manajemen proses aplikasi di production.

---

## ⚙️ 1. Persiapan Lingkungan (Environment)

### Instalasi Node.js & MySQL (Contoh di Ubuntu/Debian)

```bash
# Update paket sistem
sudo apt update && sudo apt upgrade -y

# Install Node.js (menggunakan nvm atau nodesource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi instalasi
node -v
npm -v

# Install MySQL Server
sudo apt install -y mysql-server

# Amankan instalasi MySQL (set root password, hapus user anonymous)
sudo mysql_secure_installation
```

### Membuat Database

Masuk ke MySQL shell dan buat database kosong untuk aplikasi:

```bash
sudo mysql -u root -p
```

Perintah SQL:
```sql
CREATE DATABASE pos_system;
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password_anda';
FLUSH PRIVILEGES;
EXIT;
```
*(Ganti 'password_anda' dengan password yang kuat)*

---

## 🚀 2. Instalasi Aplikasi

1.  **Clone Repository atau Upload Source Code**
    Salin seluruh folder proyek ke server, misalnya ke `/var/www/pos-system`.

2.  **Install Dependensi**
    Masuk ke direktori proyek dan install library yang dibutuhkan:
    ```bash
    cd /path/to/pos-system
    npm install
    ```

3.  **Konfigurasi Environment Variable**
    Buat file `.env` di root folder proyek:
    ```bash
    cp .env.example .env  # Jika ada contoh, atau buat baru
    nano .env
    ```

    Isi file `.env` dengan konfigurasi berikut:
    ```env
    # Konfigurasi Server
    PORT=5001
    NODE_ENV=production

    # Konfigurasi Database (Ganti user, password, dan nama db sesuai setup MySQL Anda)
    DATABASE_URL="mysql://root:password_anda@localhost:3306/pos_system"

    # Keamanan Session (Gunakan string acak yang panjang)
    SESSION_SECRET="rahasia_super_aman_dan_panjang_acak_12345"
    ```

---

## 🛠️ 3. Build & Database Migration

Sebelum aplikasi bisa dijalankan di mode produksi, kita perlu melakukan build frontend dan memastikan skema database terbentuk.

1.  **Build Aplikasi (Frontend & Backend)**
    Proses ini akan mengkompilasi kode TypeScript dan mem-build aset React (Vite) ke folder `dist`.
    ```bash
    npm run build
    ```
    *Pastikan tidak ada error selama proses build.*

2.  **Setup Database Schema**
    Aplikasi ini menggunakan Drizzle ORM. Skema database akan otomatis disinkronkan saat aplikasi pertama kali dijalankan, atau Anda bisa memicunya manual:
    ```bash
    npm run db:push
    ```

---

## ▶️ 4. Menjalankan Aplikasi (Production)

### Opsi A: Menjalankan Langsung (Untuk Tes)
```bash
npm start
```
Aplikasi akan berjalan di port `5001`. Anda bisa mengaksesnya di `http://IP-SERVER:5001`.

### Opsi B: Menggunakan PM2 (Rekomendasi Production)
PM2 memastikan aplikasi tetap berjalan di background dan otomatis restart jika crash atau server reboot.

1.  **Install PM2 Global**
    ```bash
    sudo npm install -g pm2
    ```

2.  **Jalankan Aplikasi dengan PM2**
    ```bash
    pm2 start npm --name "pos-system" -- start
    ```
    
    Atau jika ingin menjalankan file build langsung:
    ```bash
    pm2 start dist/index.js --name "pos-system"
    ```

3.  **Simpan Konfigurasi PM2**
    Agar otomatis jalan saat server restart:
    ```bash
    pm2 save
    pm2 startup
    # Copy paste perintah yang muncul di terminal
    ```

---

## 🌐 5. Setup Nginx Reverse Proxy (Opsional)

Agar aplikasi bisa diakses via domain (contoh: `pos.tokoanda.com`) tanpa mengetik port 5001, gunakan Nginx.

1.  **Install Nginx**
    ```bash
    sudo apt install nginx
    ```

2.  **Buat Konfigurasi Blok Server**
    ```bash
    sudo nano /etc/nginx/sites-available/pos-system
    ```

    Isi dengan konfigurasi berikut:
    ```nginx
    server {
        listen 80;
        server_name domain-anda.com atau IP-Public-Anda;

        location / {
            proxy_pass http://localhost:5001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

3.  **Aktifkan Konfigurasi**
    ```bash
    sudo ln -s /etc/nginx/sites-available/pos-system /etc/nginx/sites-enabled/
    sudo nginx -t  # Test konfigurasi
    sudo systemctl restart nginx
    ```

---

## ❓ Troubleshooting Umum

**1. Error "Connection Refused" ke Database**
*   Cek apakah MySQL service berjalan: `sudo systemctl status mysql`.
*   Cek `DATABASE_URL` di `.env`. Pastikan username/password benar.
*   Pastikan user MySQL memiliki hak akses (GRANT ALL PRIVILEGES).

**2. Error saat `npm install`**
*   Hapus `node_modules` dan `package-lock.json` lalu coba lagi.
*   Pastikan versi Node.js sesuai (v18+).

**3. Halaman Putih / Blank di Browser**
*   Cek console browser (F12) untuk error JavaScript.
*   Pastikan proses build (`npm run build`) sukses 100%.
*   Pastikan file statis di folder `dist/public` ada.

**4. Aplikasi Sering Restart Sendiri**
*   Cek log PM2: `pm2 logs pos-system`.
*   Biasanya karena error memori atau koneksi database terputus.

---

**Kontak Support**
Jika ada kendala teknis lebih lanjut, silakan hubungi tim pengembang atau administrator sistem.
