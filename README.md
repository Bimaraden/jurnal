# TugasHub - Sistem Pengumpulan Tugas Jurnalistik

TugasHub adalah aplikasi full-stack khusus untuk ekstrakurikuler Jurnalistik untuk menyederhanakan proses pengumpulan tugas (liputan, foto jurnalistik, artikel berita). Aplikasi ini didesain agar sangat mudah digunakan bagi siswa dan memberikan pengawasan yang komprehensif bagi guru/pembina ekskul.

## 🌟 Keunggulan TugasHub
1. **Sederhana Bagi Siswa:** Cukup masukkan NISN, sistem otomatis memverifikasi nama & kelas, melihat tugas aktif, memilih foto/PDF dari galeri HP, melihat pratinjau, dan langsung kirim. Tidak perlu rename file, atau memilah folder Google Drive.
2. **Karakter Visual yang Hangat:** Desain editorial modern dengan palet warna terinspirasi dari edtech (*warm cream, yellow accents, clean white cards*), dengan *whitespace* yang luas dan ramah pengguna.
3. **Penyimpanan Terstruktur (v1, v2, dll.):** Mendukung revisi tanpa menghapus pengumpulan lama. Nama file diseragamkan otomatis oleh server sesuai format: `[NISN]_[NAMA]_[KELAS]_[PERIODE]_[TASK]_[NUMBER]_v[VERSION].[EXT]`.
4. **Konsol Guru:** Meliputi dashboard statistik, checklist pengumpulan per siswa, kelola anggota (CRUD), kelola periode bulanan, kelola tugas (maksimal 4 tugas per periode), pratinjau berkas siswa, simulasi sinkronisasi Google Drive, dan ekspor data langsung ke CSV (*Formula Injection Protected*).

---

## 🛠️ Panduan Instalasi (Lokal)

Sebagai pemula, ikuti langkah-langkah mudah di bawah ini untuk menjalankan TugasHub di komputer Anda.

### 1. Prasyarat (Prerequisites)
Pastikan komputer Anda sudah terpasang:
*   **Node.js** (Versi 18 atau lebih baru). Unduh di [nodejs.org](https://nodejs.org/).
*   **Git** (Opsional, untuk kloning kode).

### 2. Instalasi Dependensi
Buka terminal (Command Prompt / Powershell / Terminal macOS) di folder project TugasHub, lalu jalankan perintah:
```bash
npm install
```
Perintah ini akan mengunduh dan menginstal semua pustaka yang diperlukan seperti Express, React, Tailwind CSS v4, Lucide Icons, dan Multer.

### 3. Mengatur Environment Variables
Ganti nama file `.env.example` menjadi `.env`, atau buat file baru bernama `.env` di folder utama (root) project, lalu sesuaikan isinya:
```env
NODE_ENV=development
PORT=3000
MAX_FILE_SIZE_MB=10

# Aktifkan Demo Mode untuk penggunaan instan tanpa konfigurasi cloud!
DEMO_MODE=true

# Kredensial akun Guru/Pengawas Jurnalistik untuk login
TEACHER_EMAIL=guru@jurnalistik.com
TEACHER_PASSWORD=guruadmin123

# Integrasi Google Drive (diisi jika DEMO_MODE=false)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_DRIVE_ROOT_FOLDER_ID=
```

### 4. Menjalankan Server Pengembangan (Dev Server)
Jalankan perintah berikut di terminal:
```bash
npm run dev
```
Setelah berjalan, buka browser Anda dan akses:
👉 **`http://localhost:3000`**

---

## 🚀 Fitur Demo Mode (Instan & Tanpa Ribet)
TugasHub dilengkapi dengan **`DEMO_MODE=true`** secara bawaan. Saat mode ini aktif:
*   Aplikasi menyimpan semua data secara dinamis di file lokal **`db.json`** yang terletak di folder project Anda. Data Anda **tidak akan hilang** meskipun browser direfresh atau server dimuat ulang!
*   Berkas foto/PDF yang diunggah siswa akan disimpan langsung di folder lokal **`public/uploads/`** dengan penamaan formal yang rapi secara otomatis. Berkas ini dapat langsung dibuka dan diunduh dari browser/konsol guru.
*   Anda tidak memerlukan akun Firebase atau Google Cloud untuk menguji seluruh alur pendaftaran, pengumpulan tugas, revisi, penilaian, dan ekspor CSV.

### Akun Uji Coba Default:
*   **Siswa (NISN):**
    *   `0012345678` (Budi Santoso - XI-1)
    *   `0012345679` (Andi Pratama - XI-1)
    *   `0012345680` (Citra Ramadhani - XI-2)
    *   `0012345681` (Dewi Lestari - XII-MIPA-3)
*   **Konsol Guru (Tombol "Portal Pengawas" di kanan atas halaman utama):**
    *   **Email:** `guru@jurnalistik.com`
    *   **Kata Sandi:** `guruadmin123`

---

## 🛡️ Integrasi Produksi (Firebase & Google Drive)

Jika Anda ingin mengaktifkan TugasHub untuk sekolah Anda dengan basis data awan dan arsip otomatis ke Google Drive, ikuti konfigurasi berikut:

### 1. Firebase Firestore & Storage
Untuk memindahkan database dari `db.json` lokal ke cloud:
1.  Buka [Firebase Console](https://console.firebase.google.com/).
2.  Buat project baru dan aktifkan **Cloud Firestore** dan **Firebase Storage**.
3.  Di Firebase Storage, buat folder terstruktur bernama `submissions/`.
4.  Gunakan Firebase Authentication untuk otentikasi login Guru dan pendaftaran akun Anonim Siswa jika diperlukan.
5.  Ubah `DEMO_MODE=false` di `.env` dan ganti inisialisasi database di backend untuk menghubungkannya ke SDK Firebase Admin.

### 2. Google Drive API (Arsip Otomatis)
Bila siswa mengumpulkan tugas, file dapat disinkronkan ke Google Drive sekolah:
1.  Buka Google Cloud Console dan buat proyek baru.
2.  Aktifkan **Google Drive API**.
3.  Konfigurasikan **OAuth Consent Screen** dan buat kredensial **OAuth Client ID** tipe Web Application.
4.  Gunakan refresh token OAuth untuk mendapatkan akses offline jangka panjang.
5.  Masukkan `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, dan `GOOGLE_REFRESH_TOKEN` ke file `.env` Anda.
6.  Buat folder utama di Google Drive Anda (misal: "TugasHub Jurnalistik") dan salin Folder ID-nya ke `.env` pada variabel `GOOGLE_DRIVE_ROOT_FOLDER_ID`.
7.  Kini setiap kali siswa mengumpulkan berkas, server akan otomatis membuat struktur sub-folder berdasarkan tahun, nama periode, dan topik tugas di Google Drive Anda secara real-time!

---

## 📁 Struktur Folder Project
```text
TugasHub/
├── public/                 # Folder aset statis
│   └── uploads/            # Penyimpanan fisik file tugas siswa (dalam Demo Mode)
├── src/
│   ├── types.ts            # Type safety interfaces (Period, Student, Assignment, dll)
│   ├── index.css           # Styling global dengan Tailwind CSS v4
│   ├── main.tsx            # Entrypoint utama React
│   ├── App.tsx             # Shell router pusat, navigasi, & pengecekan sesi
│   └── pages/
│       ├── student/
│       │   ├── StudentVerify.tsx   # Form verifikasi NISN
│       │   ├── StudentTasks.tsx    # Daftar tugas aktif & progress bulanan
│       │   └── TaskDetail.tsx      # Detail tugas & Form multiple file upload + preview
│       └── teacher/
│           ├── TeacherLogin.tsx    # Halaman login Pengawas/Guru
│           ├── Dashboard.tsx       # Checklist pengumpulan, review berkas & statistik
│           ├── Members.tsx         # Manajemen CRUD anggota siswa
│           ├── Periods.tsx         # Manajemen CRUD siklus periode bulanan
│           └── Assignments.tsx     # Kelola penugasan (Maksimal 4)
├── server.ts               # Express Backend (Vite dev middleware, Multer, CSV Exporter)
├── server-db.ts            # Local database service (membaca & menyimpan db.json)
├── db.json                 # Data penyimpanan persisten lokal
├── package.json            # Konfigurasi dependensi project & script build
└── tsconfig.json           # Konfigurasi TypeScript compiler
```

---

## 🛠️ Troubleshooting (Penyelesaian Masalah)

### 1. Masalah: Port 3000 sudah digunakan oleh aplikasi lain
Jika terminal menunjukkan error port sudah terpakai, matikan proses yang berjalan di port 3000 terlebih dahulu, atau ganti variabel `PORT=3000` di file `.env` Anda dengan port lain yang kosong (misal `3001`).

### 2. Masalah: Format file ditolak saat mengunggah tugas
Pastikan berkas tugas yang dipilih siswa sesuai dengan format yang ditentukan guru. Untuk tugas bertipe **Foto Jurnalistik**, sistem hanya menerima ekstensi `.jpg`, `.jpeg`, `.png`, dan `.webp`. Untuk tugas bertipe **Laporan Berita**, sistem hanya menerima ekstensi `.pdf`.

### 3. Masalah: Tampilan halaman berantakan di layar HP
TugasHub didesain dengan prinsip *Mobile-First*. Jika Anda mengujinya di laptop, Anda bisa memperkecil ukuran jendela browser atau menekan tombol `F12` lalu memilih mode tampilan ponsel (*Responsive Mobile View*) untuk merasakan pengalaman pengumpulan tugas di HP secara optimal.

---

## 🌐 Panduan Pengembangan Eksternal & Deploy ke Hosting (Production)

Jika Anda ingin memindahkan proyek ini dari AI Studio ke komputer lokal teman Anda (misalnya menggunakan VS Code) dan ingin meng-upload-nya ke web hosting agar bisa diakses oleh seluruh siswa di internet, ikuti panduan lengkap di bawah ini:

### 1. Cara Menjalankan di VS Code (Lokal Eksternal)
Untuk melanjutkan coding di komputer sendiri secara mandiri:
1.  **Download Source Code:** Unduh seluruh file proyek ini dalam format `.zip` dari menu export AI Studio, lalu ekstrak ke komputer Anda.
2.  **Buka di Editor:** Buka folder proyek menggunakan VS Code.
3.  **Buka Terminal:** Jalankan perintah berikut berurutan:
    ```bash
    # Menginstal semua dependensi package yang dibutuhkan
    npm install
    
    # Menjalankan server dalam mode development
    npm run dev
    ```
4.  Buka browser ke `http://localhost:3000`. Server pengembangan menggunakan Vite middleware untuk menyajikan aplikasi frontend React dan backend Express secara bersamaan di satu port.

---

### 2. Mempersiapkan File untuk Produksi (Build Phase)
Sebelum mengunggah aplikasi ke hosting, Anda harus membangun versi produksi agar aplikasi berjalan sangat cepat dan optimal. Jalankan perintah:
```bash
npm run build
```
Perintah di atas akan melakukan dua hal utama:
*   Mengompilasi frontend React menjadi file statis super cepat yang diletakkan di dalam folder `dist/`.
*   Mengompilasi backend server TypeScript (`server.ts`) menjadi satu berkas JavaScript NodeJS mandiri bernama `dist/server.cjs` menggunakan esbuild.

Untuk menjalankannya dalam mode production di komputer lokal, gunakan perintah:
```bash
npm run start
```

---

### 3. Pilihan Layanan Web Hosting & Cara Deploy

TugasHub adalah aplikasi **Full-Stack (React + NodeJS/Express)**. Berbeda dengan website statis biasa, website full-stack membutuhkan server yang bisa menjalankan NodeJS secara terus-menerus. Berikut adalah pilihan hosting yang bisa digunakan:

#### 💡 PILIHAN A: Hosting Cloud Modern (Sangat Direkomendasikan & Mudah)
Layanan gratis/murah seperti **Render.com, Railway.app, atau Fly.io** sangat ramah pemula dan bisa mendeteksi proyek NodeJS otomatis.

1.  **Hubungkan ke GitHub:** Upload folder proyek Anda ke repositori GitHub pribadi atau publik.
2.  **Hubungkan ke Layanan Hosting (misalnya Render.com):**
    *   Buat akun di Render, lalu klik **New > Web Service**.
    *   Hubungkan ke repositori GitHub proyek TugasHub Anda.
3.  **Atur Konfigurasi Deploy di Dashboard Hosting:**
    *   **Build Command:** `npm run build`
    *   **Start Command:** `npm run start`
4.  **Atur Environment Variables (Sangat Penting):**
    Di tab "Environment" atau "Variables" di hosting Anda, tambahkan variabel berikut:
    *   `NODE_ENV=production`
    *   `PORT=3000` (atau biarkan kosong jika diatur otomatis oleh hosting)
    *   `DEMO_MODE=true` (jika ingin menyimpan data langsung di berkas lokal `db.json`)
    *   `TEACHER_EMAIL=pilihan-email-guru@anda.com`
    *   `TEACHER_PASSWORD=password-guru-anda`
    *   *(Opsional)* Masukkan kredensial Google Drive Anda jika ingin mengaktifkan sinkronisasi otomatis.

#### 🖥️ PILIHAN B: VPS (Virtual Private Server - Misal IDCloudHost, DigitalOcean, AWS)
Pilihan terbaik untuk performa penuh dan stabil tanpa batasan tidur server gratisan.

1.  Sewa VPS Linux (Ubuntu Server).
2.  Install NodeJS dan Git di VPS:
    ```bash
    sudo apt update
    sudo apt install nodejs npm git
    ```
3.  Clone proyek Anda dari GitHub ke VPS.
4.  Jalankan `npm install` dan `npm run build`.
5.  Gunakan **PM2** (Process Manager) agar server NodeJS Anda tetap berjalan di latar belakang secara abadi meskipun terminal ditutup:
    ```bash
    # Install PM2 secara global
    sudo npm install pm2 -g
    
    # Jalankan server menggunakan PM2
    pm2 start dist/server.cjs --name "tugashub"
    
    # Atur PM2 agar otomatis hidup saat VPS restart
    pm2 startup
    pm2 save
    ```
6.  Gunakan **Nginx** sebagai reverse proxy untuk mengarahkan port internal `3000` ke domain publik Anda (port `80` / `443` HTTPS).

#### 📁 PILIHAN C: Shared Hosting (cPanel - Pilihan Populer di Indonesia)
Jika teman Anda menggunakan Shared Hosting biasa yang mendukung NodeJS:

1.  Masuk ke **cPanel**, cari menu **"Setup Node.js App"**.
2.  Klik **Create Application**:
    *   **Node.js version:** Pilih versi 18 atau 20.
    *   **Application Mode:** Pilih `Production`.
    *   **Application startup file:** Isi dengan `dist/server.cjs` (setelah Anda melakukan build lokal, atau biarkan default lalu upload hasil build Anda).
    *   **Application URL:** Pilih domain/subdomain yang ingin Anda gunakan.
3.  Upload semua file proyek TugasHub Anda menggunakan **File Manager** cPanel (kecuali folder `node_modules`). Pastikan folder `dist/` hasil build lokal Anda ikut terunggah dengan sempurna.
4.  Kembali ke menu "Setup Node.js App", klik **"Run JS Package Install"** untuk mengunduh semua pustaka NodeJS langsung di server hosting.
5.  Tambahkan **Environment Variables** di bagian bawah halaman cPanel tersebut (isi seperti file `.env` Anda).
6.  Klik **Restart Application**.

#### ⚡ PILIHAN D: Vercel (Serverless Cloud - Gratis & Praktis)
Vercel adalah platform cloud serverless gratis yang sangat cepat dan populer. Proyek TugasHub ini telah dilengkapi dengan berkas konfigurasi `vercel.json` bawaan agar Anda dapat mendeploy aplikasi full-stack (React Frontend + Express Backend) ini dengan mudah tanpa konfigurasi rumit.

##### ⚠️ PENTING: Batasan Serverless Vercel (Harap Dibaca!)
Sebelum mendeploy ke Vercel, pahami sifat dasar platform **Serverless**:
1.  **Sistem Berkas Sementara (Ephemeral Filesystem):** Serverless function di Vercel bersifat *stateless* (tidak menyimpan status secara abadi). Artinya, jika Anda mendeploy dengan pengaturan standar (`DEMO_MODE=true`):
    *   Setiap kali serverless function tertidur/restart (otomatis terjadi setelah beberapa menit tanpa lalu lintas pengunjung), berkas database lokal **`db.json`** akan direset kembali ke kondisi draf awal.
    *   Foto/PDF siswa yang dikirim dan disimpan di folder `public/uploads/` akan **hilang** secara otomatis saat serverless function disegarkan oleh Vercel.
2.  **Solusi Penggunaan Nyata di Vercel:**
    *   **Penyimpanan File Tugas:** Anda **SANGAT DISARANKAN** menghubungkan aplikasi ke **Google Drive** pribadi melalui Portal Pengawas. Begitu diaktifkan, semua foto/PDF siswa otomatis dialihkan dan disimpan permanen di akun Google Drive Anda, sehingga aman dari penghapusan berkala Vercel.
    *   **Penyimpanan Database:** Untuk penggunaan sungguhan jangka panjang, disarankan memigrasikan penyimpanan database berbasis file `db.json` ke database awan eksternal (seperti Firebase Firestore).
    *   **Alternatif:** Jika ingin menggunakan database lokal `db.json` dan folder `uploads/` lokal secara permanen dan stabil tanpa takut hilang, gunakan layanan **Render.com, Railway.app, VPS, atau cPanel** (Pilihan A, B, atau C) karena platform tersebut menyediakan disk server persisten.

##### Langkah-Langkah Deploy ke Vercel:
1.  **Kirim Proyek ke GitHub:**
    *   Buat sebuah repositori baru di GitHub (bisa Private maupun Public).
    *   Unggah (*Push*) semua file proyek TugasHub Anda ke repositori tersebut.
2.  **Hubungkan Akun ke Vercel:**
    *   Kunjungi [Vercel](https://vercel.com/) dan login menggunakan akun GitHub Anda.
    *   Klik tombol **Add New...** > **Project**.
    *   Pilih repositori GitHub `TugasHub` Anda, lalu klik **Import**.
3.  **Atur Konfigurasi Project:**
    *   **Framework Preset:** Pilih `Other` atau `Vite`.
    *   **Root Directory:** Biarkan default (`./`).
    *   **Build & Development Settings:**
        *   **Build Command:** `npm run build` (Vercel akan mengompilasi frontend React ke folder `dist` dan membundel backend Express ke `dist/server.cjs`).
        *   **Output Directory:** Biarkan default atau kosong.
        *   **Install Command:** `npm install`
4.  **Masukkan Environment Variables (Sangat Penting):**
    Buka bagian menu **Environment Variables**, masukkan variabel-variabel berikut satu per satu:
    *   `NODE_ENV` = `production`
    *   `DEMO_MODE` = `true` (agar aplikasi dapat langsung berjalan menggunakan database file lokal `db.json`)
    *   `TEACHER_EMAIL` = `email-login-guru-pilihan-anda@domain.com`
    *   `TEACHER_PASSWORD` = `password-pilihan-anda`
    *   *(Opsional)* Masukkan variabel Google Drive Anda (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, dll.) jika ingin mengaktifkan sinkronisasi otomatis dari awal.
5.  **Klik Deploy:**
    *   Klik tombol **Deploy**. Proses kompilasi akan memakan waktu sekitar 1-2 menit.
    *   Setelah selesai, Vercel akan memberikan Anda URL website publik gratis (misalnya: `tugashub.vercel.app`) yang bisa langsung diakses oleh siswa dan guru dari mana saja!

---

### 4. Mengenal Penyimpanan File Tugas Siswa di Hosting

*   **Jika DEMO_MODE=true (Menggunakan Penyimpanan Lokal):**
    Semua berkas tugas siswa akan diunggah ke folder `public/uploads/` di server hosting Anda secara dinamis. Pastikan folder `public/uploads/` memiliki izin akses tulis (*write permissions*) di server hosting Anda (CHMOD `755` atau `777` di cPanel). *Catatan: Tidak disarankan pada serverless seperti Vercel karena file akan hilang secara berkala saat server disegarkan.*
*   **Jika Menggunakan Google Drive (Produksi Penuh):**
    Semua berkas yang dikirim siswa akan otomatis diteruskan ke penyimpanan Google Drive Anda secara aman, sehingga penyimpanan hosting Anda akan tetap kosong dan hemat kuota! Ini adalah solusi terbaik jika Anda mendeploy di Vercel.
