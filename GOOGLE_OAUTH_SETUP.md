# Panduan Setup Google OAuth (RuangTugas)

Dokumen ini menjelaskan konfigurasi Google OAuth agar login Guru/Murid di RuangTugas berjalan di lokal.

## 1. Buat Project di Google Cloud

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Pilih atau buat project baru.

## 2. Konfigurasi OAuth Consent Screen

1. Masuk ke menu **APIs & Services** -> **OAuth consent screen**.
2. Pilih tipe **External** (umumnya untuk development).
3. Isi informasi app minimum:
   - App name
   - User support email
   - Developer contact information
4. Simpan konfigurasi.
5. Tambahkan test user (email Google yang akan dipakai login saat development), jika status app masih Testing.

## 3. Buat OAuth Client ID (Web)

1. Masuk ke **APIs & Services** -> **Credentials**.
2. Klik **Create Credentials** -> **OAuth client ID**.
3. Pilih **Application type: Web application**.
4. Isi **Name** (bebas), misalnya `RuangTugas Local`.
5. Tambahkan **Authorized JavaScript origins**:
   - `http://localhost:2003`
6. Klik **Create**.
7. Simpan nilai **Client ID** (format `xxxx.apps.googleusercontent.com`).

Catatan:
- Untuk flow yang dipakai aplikasi ini (Google Identity Services + popup), origin wajib benar.
- Redirect URI tidak dipakai untuk mode callback JavaScript di frontend ini.

## 4. Set Environment Variable di Aplikasi

Backend butuh `GOOGLE_CLIENT_ID` untuk verifikasi ID Token.

Contoh di terminal:

```bash
export GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
bun run dev
```

Atau langsung saat start:

```bash
GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com" bun run start
```

## 5. Jalankan dan Uji Login

1. Buka `http://localhost:2003`.
2. Pastikan server dijalankan dengan env `GOOGLE_CLIENT_ID`.
3. Pilih role default akun baru (`Murid` atau `Guru`).
4. Klik tombol **Sign in with Google**.

Perilaku sistem:
- Jika email Google sudah ada di tabel `users`, user langsung login.
- Jika email belum ada, sistem membuat user baru dengan role sesuai pilihan.

## 6. Troubleshooting

### Error: `GOOGLE_CLIENT_ID belum diset di environment`
- Pastikan variabel env `GOOGLE_CLIENT_ID` sudah di-set sebelum server dijalankan.

### Error: `The given origin is not allowed for the given client ID`
- Pastikan `http://localhost:2003` sudah ditambahkan ke Authorized JavaScript origins.
- Pastikan port aplikasi memang `2003`.

### Error verifikasi token gagal
- Pastikan Client ID di frontend sama dengan `GOOGLE_CLIENT_ID` di backend.
- Pastikan user menyelesaikan popup login Google sampai selesai.

### Login berhasil di Google tapi ditolak aplikasi
- Pastikan akun Google memiliki email terverifikasi.
- Cek response API `/api/auth/google` di Network tab browser.
