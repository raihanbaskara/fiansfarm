# Rencana prototipe toko telur

## Lingkup dan arsitektur

Pertahankan prototipe commerce berbahasa Indonesia dengan React, Vite, TypeScript, dan Tailwind CSS. Shopify telah dibatalkan oleh pengguna dan tidak boleh dihubungkan kembali tanpa permintaan baru. Semua produk, varian, stok, dan harga adalah data contoh lokal; state keranjang hanya berjalan di antarmuka. Checkout harus menegaskan bahwa tidak ada pesanan atau pembayaran yang akan dibuat, dan tidak meminta data pribadi atau kartu.

Tambahkan dashboard admin demo di `/admin` yang mengikuti desain dark-only storefront. Dashboard menampilkan ringkasan stok per butir, penyesuaian stok manual, pencatatan pengurangan setelah penjualan Shopee, riwayat perubahan, dan status perangkat conveyor/sensor IR. Untuk prototipe ini stok dan aktivitas disimpan di `localStorage`; tombol hitungan sensor hanya simulasi browser dan harus diberi label jelas. Tidak ada data yang dikirim ke perangkat, API, atau database dan belum ada autentikasi admin; autentikasi server ditambahkan ketika backend siap.

Pertahankan dua bagian utama: hero layar penuh dan bagian penemuan produk/katalog. Video suasana pertama menjadi latar hero, video kedua menjadi latar bagian katalog. Dialog produk, drawer keranjang, serta checkout demo tetap tersedia. Empat produk telur contoh dan foto produk katalog tetap diberi label demo; yang diganti adalah foto atmosfer latar. Gunakan satu tema gelap saja: hapus kontrol, state tersimpan, dan semua aturan tema terang.

## Arah desain

- **Gerakan desain:** editorial commerce pangan dengan sinematografi peternakan yang natural, tekstur film yang lembut, dan antarmuka gelap yang tenang.
- **Prinsip:** produk dan teks tetap terbaca; latar video hanya memberi konteks ayam/peternakan; gerak kamera pelan; batas demo dan perilaku keranjang/checkout selalu jelas.
- **Palet:** charcoal-hitam dan hitam pekat sebagai bidang utama, putih tulang untuk teks, serta aksen lembut warna cangkang dan amber pada detail telur. Tidak ada tema terang.
- **Tata letak:** hero editorial berlapis video penuh, lalu galeri produk responsif dengan video atmosfer berbeda; dialog dan bag muncul kontekstual.
- **Motif:** dua cuplikan peternakan yang berbeda; lapisan liquid-glass monokrom; mark telur di dalam lingkaran.
- **Interaksi:** navigasi kategori, pemilihan varian, bag lokal, dan checkout simulasi. Tidak ada tombol tema atau pilihan visual terang.
- **Animasi:** video diputar muted, autoplay, inline, dan loop tanpa kontrol; overlay gelap menjaga kontras. Animasi UI tetap tunduk pada `prefers-reduced-motion`; jika gerak dikurangi, video dijeda.
- **Tipografi:** Instrument Serif italic untuk judul; Barlow 300/400/500/600 untuk isi dan kontrol.
- **Esensi merek:** demo toko telur yang tenang dan jujur; bersahaja, rapi, sinematik.
- **Nada bahasa:** ringkas dan jelas. Contoh: “Pilihan telur untuk meja sehari-hari.” dan “Produk dan harga hanya contoh.”
- **Logo:** siluet telur minimal di dalam lingkaran kaca; tidak menetapkan nama usaha baru.
- **Aksen khas:** putih tulang dan kilau amber lembut pada foto/video, tidak mengubah dasar hitam.

## Phase 2 — Definisi global video

- **Tujuan/audiens:** suasana visual dekoratif di storefront demo untuk pengunjung yang menjelajahi produk telur; tidak menyatakan bahwa produk berasal dari peternakan yang digambarkan.
- **Gaya visual:** film dokumenter editorial, live-action fotorealistis; kamera organik yang sangat halus; grading low-key yang hangat, bayangan charcoal dan aksen jerami/amber; detail bulu natural dengan latar cukup redup untuk menjaga keterbacaan UI.
- **Kerapatan detail:** lingkungan peternakan sederhana dan meyakinkan, sejumlah kecil ayam, jerami serta pakan; komposisi bersih tanpa tulisan, logo, manusia, atau elemen berlebihan.
- **Elemen berulang:** ayam betina berbulu cokelat alami dan jengger merah, proporsi serta pola bulu yang konsisten; suasana tetap tenang dan tidak menunjukkan perlakuan kasar.
- **Dialog, nyanyian, narasi, dan musik latar:** tidak ada. Video dibuat tanpa audio dan diputar muted.
- **Perilaku web:** dua MP4 terpisah, horizontal 16:9, masing-masing 6 detik; loop lembut, tanpa kontrol; dekoratif dan tidak menangkap klik.

## Phase 3 — Rencana klip

| Klip | Fungsi / penempatan | Adegan dan kamera | Gerak | Keyframe / batas |
|---|---|---|---|---|
| 1 | Establishing; latar hero | Wide shot sejumlah ayam cokelat bergerak tenang di area peternakan beralas jerami saat cahaya pagi lembut. Sisakan komposisi lapang pada area teks dan fokuskan ayam di bagian bawah/sisi bingkai. | Sangat pelan; kamera nyaris statis dengan slide lateral halus. | Keyframe pertama baru; 16:9; loop mandiri; tidak memakai keyframe dari klip sebelumnya. |
| 2 | Suasana pendukung; latar katalog | Close shot ayam cokelat mematuk sedikit pakan di dekat sarang jerami dengan beberapa telur terlihat; ayam kedua tetap lembut di latar. Komposisi tidak menghalangi teks atau kartu produk. | Sangat pelan; push-in kecil dan gerakan ayam natural yang dapat kembali ke pose tenang. | Keyframe pertama baru; 16:9; scene cut dari klip 1; loop mandiri; tidak memakai keyframe dari klip sebelumnya. |

**Transition description klip 1:** Sejumlah ayam betina berbulu cokelat dengan jengger merah sudah terlihat pada bagian bawah dan sisi kanan area peternakan sejak awal, lalu tetap berada di dalam bingkai. Mereka mengambil beberapa langkah pendek dan satu ayam mematuk tanah sekali ketika kamera bergerak lateral dengan sangat lembut; menjelang akhir, kelompok kembali ke susunan tenang yang mirip dengan awal sehingga pengulangan terasa halus. Tidak ada ayam, manusia, pakan, tulisan, atau benda yang muncul mendadak; gerak tetap terkendali dan tidak menyentuh area teks.

**Transition description klip 2:** Ayam cokelat di foreground tetap tampak di sisi kanan dekat sarang jerami dengan beberapa telur yang sudah terlihat sejak frame pertama. Sepanjang adegan, ayam menunduk mematuk sedikit pakan lalu mengangkat kepala, sementara ayam kedua hanya bergerak kecil di latar; kamera melakukan push-in tipis dan berakhir kembali pada pose tenang yang menyerupai komposisi pembuka untuk loop yang tidak mencolok. Tidak ada manusia, tulisan, logo, atau objek lain yang muncul atau menghilang.

**BGM blueprint:** Tidak diperlukan; sumber musik `none`, dialog/narasi `none`, dan audio generation dinonaktifkan.

## Struktur proyek

- `src/App.tsx`: hero, navigasi publik, katalog, detail produk, bag lokal, checkout simulasi, dan pemilihan storefront/admin berdasarkan path.
- `src/pages/AdminDashboard.tsx`: dashboard admin demo `/admin`, ringkasan stok, pengelolaan per butir, penjualan Shopee manual, aktivitas lokal, dan status/simulasi sensor IR.
- `src/data/products.ts`: empat produk telur contoh, kategori, varian, dan harga placeholder IDR.
- `src/components/FarmVideoBackground.tsx`: video dekoratif muted/autoplay/inline/loop yang mematuhi reduced motion.
- `public/videos/farm-wide.mp4`: video establishing untuk hero.
- `public/videos/farm-close.mp4`: video ayam dekat sarang/pakan untuk katalog.
- `src/components/BlurText.tsx`: judul blur-in bertahap ketika terlihat.
- `src/components/Icon.tsx`: ikon inline SVG untuk commerce dan telur; ikon matahari/bulan tidak lagi dipakai.
- `src/index.css` dan `tailwind.config.ts`: satu design system dark-only, liquid glass, layout, overlay video, dan reduced motion.
- `index.html`: metadata Indonesia dan tema warna dark-only.
- `public/manus-routes.json`: deklarasi route `/` dan `/admin`.
- `TODO.md`: outcome publik, admin, video, dan deployment.
- `Dockerfile` dan `server.mjs`: build produksi Vite dan server Node untuk file statis serta `/healthz`.

## Serving dan penerbitan produksi

Konfigurasi deploy menggunakan `Dockerfile` pada akar repositori dan health path `/healthz`. Image memakai lockfile serta izin lifecycle yang sudah dicheck-in, membangun UI Vite ke `dist`, lalu menjalankan `server.mjs` pada `0.0.0.0:$PORT` (default 3000). UI tetap simulasi: Shopify tidak terhubung, tidak memerlukan secret, dan tidak membuat pesanan.

`publishing.auto_publish` aktif. Checkpoint di `main` akan memicu penerbitan otomatis; jangan mengirim permintaan `POST publish` kedua untuk versi yang sama.
