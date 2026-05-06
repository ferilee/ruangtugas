Membangun aplikasi manajemen tugas dengan *stack* modern seperti Bun, Hono, dan Drizzle adalah pilihan yang sangat cerdas untuk performa yang ringan dan cepat. Mengingat sistem ini akan menangani interaksi antara guru dan murid, fokus utamanya adalah pada alur kerja (workflow) yang jelas dan manajemen *state* tugas.

Berikut adalah ringkasan alur dan fitur utama untuk aplikasi Anda:

---

## **1. Arsitektur Alur Aplikasi (Workflow)**

Alur aplikasi ini dirancang untuk memfasilitasi siklus hidup tugas dari pembuatan hingga penilaian:

1.  **Autentikasi & Role:** Pengguna masuk ke sistem dan diidentifikasi berdasarkan perannya (**Guru** atau **Murid**).
2.  **Manajemen Tugas (Sisi Guru):** Guru membuat tugas dengan detail instruksi, lampiran (jika ada), dan tenggat waktu (*deadline*).
3.  **Notifikasi & Distribusi:** Tugas muncul di *dashboard* murid yang relevan secara *real-time*.
4.  **Submission (Sisi Murid):** Murid mengakses tugas, mengerjakan, dan mengunggah jawaban (teks atau file).
5.  **Review & Feedback:** Guru menerima notifikasi pengumpulan, memberikan nilai, dan umpan balik balik yang kemudian bisa dilihat kembali oleh murid.

---

## **2. Fitur-Fitur Utama**

### **A. Dashboard Guru (Manajemen Instruksional)**
* **Task Builder:** Form pembuatan tugas menggunakan komponen ShadcnUI yang mendukung Rich Text atau Markdown.
* **Assignment Tracker:** Tabel untuk memantau siapa saja murid yang sudah mengumpulkan, siapa yang terlambat, dan siapa yang belum membuka tugas.
* **Grading System:** Fitur untuk memberikan poin/nilai dan komentar evaluasi secara langsung pada hasil kerja murid.

### **B. Dashboard Murid (Pusat Belajar)**
* **Timeline Tugas:** Tampilan daftar tugas berdasarkan prioritas tenggat waktu terdekat.
* **Submission Portal:** Area unggah file atau input teks jawaban dengan status yang jelas (Draft, Submitted, Graded).
* **Gradebook Personal:** Riwayat nilai dan umpan balik dari guru untuk melihat perkembangan belajar mandiri.

### **C. Fitur Sistem & Administrasi**
* **File Management (RustFS):** Integrasi penyimpanan file yang efisien dan aman untuk materi tugas maupun jawaban murid.
* **Data Persistence (Drizzle + SQLite):** Skema database yang teroptimasi untuk relasi antara tabel `users`, `assignments`, dan `submissions`.
* **Containerized Deployment:** Dockerfile tunggal atau Docker Compose untuk memastikan aplikasi berjalan konsisten di lingkungan pengembangan maupun produksi.

---

## **3. Keunggulan Stack yang Dipilih**

* **Bun & Hono:** Memberikan *runtime* dan *framework* dengan latensi sangat rendah, sangat cocok untuk aplikasi yang membutuhkan responsivitas tinggi.
* **Drizzle ORM:** Memastikan interaksi dengan SQLite sangat cepat dan *type-safe* menggunakan TypeScript.
* **Tailwind & ShadcnUI:** Memungkinkan Anda membangun antarmuka yang bersih, profesional, dan responsif dengan waktu pengembangan yang singkat.
* **Docker:** Memudahkan pengelolaan *environment* terutama saat menangani *storage* melalui RustFS.
