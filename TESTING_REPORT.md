# KosManager — Audit & Perbaikan E2E

## File aplikasi
- `index.html` — dipertahankan dari arsip pengguna.
- `style.css` — dipertahankan dari arsip pengguna.
- `script.js` — diperbaiki secara terbatas.

## Perubahan pada script.js
1. Antrean DELETE:
   - Membaca ID milik akun aktif yang masih ada di tabel.
   - Menghapus hanya ID tersebut dengan filter `owner_id`.
   - Menggunakan `select('id')` untuk memverifikasi hasil DELETE.
   - Antrean tetap disimpan jika penghapusan belum terkonfirmasi.
   - ID yang memang sudah tidak ada dianggap selesai (idempoten).

2. Snapshot sinkronisasi:
   - `cloudBase` memakai snapshot pada awal proses pengiriman.
   - Perubahan yang terjadi selama sinkronisasi awal dijadwalkan untuk sinkronisasi susulan.
   - Ini mengurangi risiko perubahan lokal baru dianggap sudah tersinkron padahal belum terkirim.

3. Arsip penghuni:
   - `active=false` dan `exitDate` tetap digunakan.
   - Saat penghuni keluar, seluruh tagihan tetap disimpan, termasuk tunggakan.
   - Penghapusan penghuni secara eksplisit melalui aksi hapus tetap merupakan alur berbeda.

4. Diagnostik:
   - Pembersihan mencoba ID UUID khusus diagnostik meskipun respons INSERT mengalami timeout.
   - Pembersihan tetap dibatasi `owner_id` dan ID unik yang dibuat oleh diagnostik.
   - Tanggal uji memakai tanggal lokal aplikasi.

## Hasil pengujian otomatis lokal
- `node --check script.js`: LULUS.
- Logika merge: 7/7 tes lulus.
- Logika antrean DELETE dan snapshot: 3/3 tes lulus menggunakan mock Supabase.
- Parsing stylesheet CSS: tidak ditemukan error sintaks top-level.
- ID HTML duplikat: tidak ditemukan.

## Batasan yang belum diuji
Pengujian di atas adalah pemeriksaan statis dan simulasi lokal. Belum dilakukan:
- Login ke akun Supabase pengguna.
- Transaksi langsung INSERT/UPDATE/DELETE di proyek Supabase.
- Interaksi UI nyata melalui Android WebView / Sketchware.
- Pengujian lintas sesi dengan dua perangkat atau dua tab.
- Pengujian pemuatan ulang aplikasi pada perangkat pengguna.

Tidak ada permintaan yang dikirim ke Supabase selama audit dan pembuatan paket ini. Tidak ada tabel atau data cloud yang diubah oleh proses ini.

## Catatan sebelum uji langsung
Jalankan diagnostik hanya ketika jaringan stabil dan akun sudah masuk. Pastikan hasil bagian pembersihan menyatakan semua ID uji telah dibersihkan. Jika ada peringatan, simpan ID yang ditampilkan untuk penelusuran; jangan menghapus data lain secara manual.
