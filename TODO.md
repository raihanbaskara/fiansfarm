# Hasil prototipe toko telur

- [ ] **Katalog dan detail telur contoh:** Tampilkan katalog satu halaman yang responsif untuk empat jenis contoh: telur ayam, ayam kampung, bebek, dan puyuh. Produk, foto, varian, stok, serta harga Rupiah harus jelas diberi label sebagai contoh. Dialog detail menunjukkan foto, harga, pilihan varian, dan kontrol tambah ke bag lokal; jangan mengambil atau mengaku memakai data Shopify langsung. Foto produk contoh menggunakan aset managed-storage.

- [ ] **Keranjang dan checkout simulasi:** Sediakan bag lokal dengan ubah jumlah, hapus item, dan subtotal. Alur checkout harus jelas menyatakan bahwa tidak ada pesanan/pembayaran nyata, tidak meminta detail kartu, dan tidak membuat pesanan.

- [ ] **Landing page dan penemuan produk:** Hero e-commerce dengan CTA berbelanja dan bagian kedua untuk filter serta penemuan produk telur; jangan tampilkan konten agensi desain.

- [ ] **Dashboard admin demo di `/admin`:** Tampilkan ringkasan stok dalam satuan butir, status stok menipis, jumlah masuk sensor dan penjualan Shopee hari ini, status perangkat conveyor/sensor IR, tabel stok per produk, aktivitas perubahan, serta tampilan responsif yang memakai desain dark-only storefront. Admin dapat menyesuaikan stok manual per butir, mencatat penjualan Shopee terkonfirmasi untuk mengurangi stok, dan mencoba event sensor yang diberi label simulasi. Simpan perubahan demo hanya di `localStorage`; jangan mengklaim data tersinkron ke server atau perangkat, dan jelaskan bahwa autentikasi belum tersedia.

- [ ] **Visual responsif dan interaksi:** Navigasi serta tata letak desktop/tablet/mobile tetap rapi pada satu tema gelap saja, memakai liquid-glass halus, Instrument Serif dan Barlow, animasi blur/fade terukur, kontras yang nyaman, dan perilaku reduced-motion yang dapat diakses.
- [x] **Tema dark-only:** Hilangkan seluruh kontrol, state tersimpan, dan pilihan tema terang; situs harus selalu memakai tampilan hitam/gelap.
- [x] **Dua video latar ayam/peternakan:** Ganti foto atmosfer dengan dua klip MP4 loop terpisah—masing-masing 6 detik, lanskap 16:9, low-key natural cinematic, tanpa dialog/narasi/musik; video pertama wide shot ayam berjalan tenang di peternakan untuk hero, video kedua close shot ayam mematuk pakan dekat telur untuk katalog. Putar sebagai background tanpa kontrol, muted dan inline; video hanya ilustrasi, bukan klaim asal produk.

- [ ] **Kontrak penerbitan produksi:** Tambahkan Dockerfile yang menginstal dependensi terkunci dengan `pnpm@11.25.0` dan allow-list lifecycle project, membangun UI ke `dist`, lalu menjalankan server produksi pada `0.0.0.0:$PORT`. Health path `/healthz` harus memberi respons sukses tanpa autentikasi. Deklarasikan konfigurasi Webdev `deploy` dengan Dockerfile akar dan health path `/healthz`, lalu publikasikan checkpoint final tanpa mengaktifkan Shopify, pembayaran, atau order nyata.
