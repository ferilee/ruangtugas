# Panduan Pengujian RuangTugas

Proyek ini menggunakan [Bun Test](https://bun.sh/docs/test/runner) untuk menjalankan unit test pada backend API. Pengujian dilakukan menggunakan database SQLite *in-memory* (`:memory:`) untuk memastikan pengujian berjalan cepat dan tidak merusak data produksi/pengembangan.

## Cara Menjalankan Test

### 1. Jalankan Sekali
Untuk menjalankan semua test sekali saja:
```bash
npm test
```

### 2. Mode Watch (Otomatis)
Untuk menjalankan test secara otomatis setiap kali ada perubahan pada file kode:
```bash
npm run test:watch
```
*Sangat direkomendasikan untuk menjalankan perintah ini di terminal terpisah selama proses pengembangan.*

## Cakupan Test
File test utama berada di `tests/api.test.ts` dan mencakup:
- **Kesehatan API**: Endpoint `/health` dan `/config`.
- **Statistik**: Endpoint `/stats/summary`.
- **Manajemen User**: CRUD (Create, Read, Update, Delete) user.
- **Tugas (Assignments)**: Pembuatan dan pengambilan daftar tugas.
- **Tracker**: Pelacakan pengumpulan tugas siswa.

## Struktur Test
- **Setup**: Menggunakan `bootstrapDb()` untuk membuat skema tabel di memori sebelum test dimulai.
- **Isolasi**: Setiap kali perintah test dijalankan, database dimulai dari keadaan bersih (seed data awal).
