# RuangTugas

RuangTugas adalah aplikasi manajemen tugas sederhana untuk **Guru** dan **Murid** dengan stack:

- `Bun` (runtime)
- `Hono` (web framework)
- `Drizzle ORM` + `SQLite` (database)
- Frontend statis di `public/`

Semua endpoint backend tersedia di prefix `/api`.

## Fitur Utama

### Guru
- Login menggunakan Google OAuth
- Membuat tugas (judul, deskripsi, deadline, lampiran)
- Melihat tracker pengumpulan murid
- Memberi nilai dan feedback

### Murid
- Login menggunakan Google OAuth
- Melihat timeline tugas
- Menyimpan draft jawaban
- Mengirim jawaban final (teks/file)
- Melihat nilai dan feedback di gradebook

## Struktur Proyek

```txt
src/
  index.ts             # entry server Bun + route /api
  api/router.ts        # seluruh endpoint API
  db/
    index.ts           # koneksi drizzle + sqlite
    schema.ts          # schema users, assignments, submissions
    bootstrap.ts       # create table + seed data awal
public/
  index.html           # UI aplikasi
  main.js              # logic frontend
uploads/               # file upload lampiran/jawaban
drizzle.config.ts      # konfigurasi drizzle-kit
```

## Prasyarat

- Bun terpasang (versi terbaru disarankan)

## Instalasi

1. Masuk ke folder project:
   ```bash
   cd /home/ferilee/DEV/RuangTugas
   ```
2. Install dependency:
   ```bash
   bun install
   ```

## Menjalankan Aplikasi

Jalankan mode development:

```bash
bun run dev
```

Atau jalankan mode biasa:

```bash
bun run start
```

Default aplikasi berjalan di:

- `http://localhost:2003`

## Setup Google OAuth

Panduan lengkap ada di:

- [GOOGLE_OAUTH_SETUP.md](/home/ferilee/DEV/RuangTugas/GOOGLE_OAUTH_SETUP.md)

Ringkasnya:
- Buat OAuth Client ID tipe Web di Google Cloud Console
- Tambahkan origin `http://localhost:2003`
- Set environment variable `GOOGLE_CLIENT_ID`

## Panduan Penggunaan

### 1) Login
1. Buka `http://localhost:2003`
2. Pilih role default untuk akun baru (Guru/Murid)
3. Klik tombol **Sign in with Google**

### 2) Alur Guru
1. Isi form **Buat Tugas**:
   - Judul
   - Deadline
   - Deskripsi/instruksi
   - Lampiran (opsional)
2. Klik **Publikasikan**
3. Buka **Lihat Tracker** pada tugas
4. Beri nilai dan feedback untuk submission yang sudah `submitted`

### 3) Alur Murid
1. Pada **Timeline Tugas**, klik **Kerjakan**
2. Tulis jawaban dan/atau upload file
3. Klik:
   - **Simpan Draft** untuk menyimpan progres
   - **Kirim** untuk submit final
4. Lihat hasil di **Gradebook Personal**

## Daftar Endpoint API

Semua endpoint berada di bawah `/api`.

### Health & Auth
- `GET /api/health`
- `POST /api/auth/google`

### User
- `GET /api/users`
- `GET /api/users?role=teacher`
- `GET /api/users?role=student`

### Assignment
- `GET /api/assignments`
- `GET /api/assignments?role=teacher&userId=<id>`
- `GET /api/assignments?role=student&userId=<id>`
- `POST /api/assignments`
- `GET /api/assignments/:id/tracker`

### Submission
- `GET /api/student/:studentId/submissions`
- `PATCH /api/submissions/:id`
- `PATCH /api/submissions/:id/grade`

### Upload
- `POST /api/upload` (multipart `file`)

## Contoh Payload

### Login

`POST /api/auth/google`

```json
{
  "credential": "GOOGLE_ID_TOKEN",
  "role": "student"
}
```

### Buat Assignment

`POST /api/assignments`

```json
{
  "teacherId": 1,
  "title": "Latihan Persamaan Linear",
  "description": "Kerjakan soal nomor 1-10.",
  "deadline": "2026-05-10T08:00:00.000Z",
  "attachmentUrl": "/uploads/contoh.pdf"
}
```

### Simpan/Kirim Submission

`PATCH /api/submissions/:id`

```json
{
  "status": "submitted",
  "answerText": "Jawaban saya ...",
  "answerFileUrl": "/uploads/jawaban-siti.pdf"
}
```

### Grading

`PATCH /api/submissions/:id/grade`

```json
{
  "score": 90,
  "feedback": "Langkah pengerjaan sudah tepat."
}
```

## Database

Database menggunakan `SQLite` file:

- `./sqlite.db`

Skema utama:
- `users`
- `assignments`
- `submissions`

Relasi:
- 1 guru dapat memiliki banyak assignment
- 1 assignment memiliki banyak submission
- 1 murid memiliki banyak submission

## Script NPM/Bun

- `bun run dev` -> run server dengan watch
- `bun run start` -> run server biasa
- `bun run db:generate` -> generate migration Drizzle
- `bun run db:studio` -> buka Drizzle Studio

## Catatan

- Login menggunakan verifikasi Google ID Token di backend.
- Upload file disimpan lokal pada folder `uploads/`.
- Jika ingin production-ready, disarankan menambah:
  - auth (JWT/session)
  - validasi role di middleware
  - object storage eksternal untuk file
  - logging dan observability
