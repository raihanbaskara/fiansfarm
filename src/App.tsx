import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { BlurText } from './components/BlurText';
import { FarmVideoBackground } from './components/FarmVideoBackground';
import { Icon } from './components/Icon';
import { products } from './data/products';
import { eggPackages, quickEggCounts } from './data/packages';
import type { EggPackage } from './data/packages';

const StorefrontScrollMotion = lazy(() => import('./components/StorefrontScrollMotion'));

const heroVideo = '/videos/farm-wide.mp4';
const collectionVideo = '/videos/farm-close.mp4';
const whatsappNumber = '6282339272715';
const whatsappDisplay = '+62 823-3927-2715';
const easeOut = [0.22, 1, 0.36, 1] as const;

export type CartLine = {
  productId: string;
  variant: string;
  pricePerUnit: number;
  eggsCount: number;
  quantity: number;
};

type CheckoutStep = 'review' | 'complete' | null;

function formatPrice(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function createWhatsAppUrl(lines: CartLine[], totalEggs: number, subtotal: number) {
  const itemsList = lines
    .map((line) => `• ${line.variant} × ${line.quantity} = ${formatPrice(line.pricePerUnit * line.quantity)}`)
    .join('\n');

  const message = [
    'Halo Butir Pagi / Fian\'s Farm, saya ingin memesan Telur Ayam Kampung:',
    '',
    itemsList,
    '',
    `Total Telur: ${totalEggs} butir`,
    `Estimasi Harga: ${formatPrice(subtotal)} (belum termasuk ongkir)`,
    '',
    'Mohon konfirmasi ketersediaan stok, cara pengemasan, ongkir, dan total pembayaran. Terima kasih!',
  ].join('\n');

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function singleWhatsAppUrl(count: number, pricePerEgg: number) {
  const estimate = formatPrice(count * pricePerEgg);
  const message = [
    'Halo Butir Pagi / Fian\'s Farm, saya ingin memesan Telur Ayam Kampung:',
    `Jumlah: ${count} butir`,
    `Estimasi harga: ${estimate} (belum termasuk ongkir)`,
    'Mohon konfirmasi ketersediaan stok, pengemasan, dan ongkir ke alamat saya. Terima kasih!',
  ].join('\n');
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

const faqs = [
  {
    question: 'Berapa harga telur ayam kampung per butir?',
    answer: 'Harga resmi adalah Rp2.500 per butir. Anda bisa membeli satuan sesuai kebutuhan atau memilih paket kotak 10 butir dan tray 30 butir.',
  },
  {
    question: 'Berapa lama daya simpan telur ayam kampung ini?',
    answer: 'Telur bertahan 3–4 minggu pada suhu ruang sejuk dan berventilasi baik, serta lebih dari 6 minggu jika disimpan di chiller kulkas. Lapisan kutikula alami cangkang tetap utuh karena dipanen segar tanpa perlakuan kimiawi.',
  },
  {
    question: 'Apakah aman dikonsumsi setengah matang atau untuk jamu?',
    answer: 'Sangat aman dan direkomendasikan. Ayam dipelihara secara alami bebas antibiotik sintetis dengan pakan alami kaya antioksidan. Kuning telur bertekstur kental pekat dan tidak amis, sangat lezat untuk STMJ, telur setengah matang, maupun pelengkap jamu tradisional.',
  },
  {
    question: 'Bagaimana cara pemesanan dan pengiriman?',
    answer: 'Anda dapat memilih jumlah butir di website ini, lalu menyelesaikan pemesanan melalui WhatsApp (+62 823-3927-2715) atau toko resmi Shopee kami. Biaya pengiriman dan opsi kurir akan dikonfirmasi langsung sesuai alamat tujuan.',
  },
  {
    question: 'Bagaimana keamanan telur saat dikirim?',
    answer: 'Setiap pesanan dikemas khusus menggunakan karton bersekat tebal plus pelindung benturan per butir. Kami menyediakan garansi ganti butir jika terdapat telur yang pecah dalam pengiriman dengan menyertakan video unboxing.',
  },
];

const reveal = (delay: number, reduced: boolean) => ({
  initial: reduced ? false : { filter: 'blur(10px)', opacity: 0, y: 18 },
  animate: { filter: 'blur(0px)', opacity: 1, y: 0 },
  transition: { duration: reduced ? 0 : 0.75, delay: reduced ? 0 : delay, ease: easeOut },
});

function useCloseOnEscape(close: () => void, isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close, isOpen]);
}

function Storefront() {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const heroProduct = products[0];

  const [customEggCount, setCustomEggCount] = useState(1);
  const [cartItems, setCartItems] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalEggsInCart = cartItems.reduce((sum, item) => sum + item.eggsCount * item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);
  const overlayOpen = Boolean(cartOpen || checkoutStep);

  useCloseOnEscape(() => {
    setCartOpen(false);
    setCheckoutStep(null);
  }, overlayOpen);

  useEffect(() => {
    if (!overlayOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [overlayOpen]);

  useEffect(() => {
    if (!announcement) return;
    const timeout = window.setTimeout(() => setAnnouncement(''), 3000);
    return () => window.clearTimeout(timeout);
  }, [announcement]);

  const addPackageToCart = (pkg: EggPackage) => {
    setCartItems((current) => {
      const existing = current.find((line) => line.productId === heroProduct.id && line.variant === pkg.name);
      if (existing) {
        return current.map((line) => line === existing ? { ...line, quantity: line.quantity + 1 } : line);
      }
      return [...current, {
        productId: heroProduct.id,
        variant: pkg.name,
        pricePerUnit: pkg.price,
        eggsCount: pkg.count,
        quantity: 1,
      }];
    });
    setAnnouncement(`${pkg.name} berhasil ditambahkan`);
    setCartOpen(true);
  };

  const addCustomEggsToCart = () => {
    if (customEggCount < 1) return;
    const variantName = `Kustom Satuan (${customEggCount} Butir)`;
    const unitPrice = customEggCount * heroProduct.price;

    setCartItems((current) => {
      const existing = current.find((line) => line.productId === heroProduct.id && line.variant === variantName);
      if (existing) {
        return current.map((line) => line === existing ? { ...line, quantity: line.quantity + 1 } : line);
      }
      return [...current, {
        productId: heroProduct.id,
        variant: variantName,
        pricePerUnit: unitPrice,
        eggsCount: customEggCount,
        quantity: 1,
      }];
    });
    setAnnouncement(`${customEggCount} butir telur ditambahkan ke keranjang`);
    setCartOpen(true);
  };

  const updateQuantity = (variant: string, change: number) => {
    setCartItems((current) => current
      .map((line) => line.variant === variant ? { ...line, quantity: line.quantity + change } : line)
      .filter((line) => line.quantity > 0));
  };

  const removeLine = (variant: string) => {
    setCartItems((current) => current.filter((line) => line.variant !== variant));
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div ref={rootRef} data-theme="dark" className="app-shell min-h-screen text-[#f6f5ef] selection:bg-[#cbd2b3] selection:text-[#050706]">
        <Suspense fallback={null}>
          <StorefrontScrollMotion rootRef={rootRef} reduceMotion={Boolean(reduceMotion)} />
        </Suspense>

        {/* HEADER */}
        <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-8 lg:px-16">
          <div className="mx-auto flex max-w-[1520px] items-center justify-between gap-3">
            <a href="#hero" aria-label="Beranda Butir Pagi" className="liquid-glass inline-flex h-12 shrink-0 items-center gap-2.5 rounded-full px-4 text-white transition-transform hover:scale-[1.02]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[#cbd2b3]">
                <Icon name="egg" size={18} />
              </span>
              <span className="font-heading text-2xl italic tracking-tight">Butir Pagi</span>
            </a>

            <nav aria-label="Navigasi utama" className="liquid-glass hidden items-center gap-1 rounded-full p-1.5 md:flex">
              <a className="nav-link" href="#hero">Beranda</a>
              <a className="nav-link" href="#paket">Pilihan Paket & Satuan</a>
              <a className="nav-link" href="#cara-pesan">Cara Pesan</a>
              <a className="nav-link" href="#kualitas">Standar Kualitas</a>
              <a className="nav-link" href="#faq">FAQ</a>
              <button
                type="button"
                onClick={() => scrollToSection('paket')}
                className="liquid-glass-strong ml-2 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[.12em] text-white transition-all hover:bg-white/15"
              >
                Pesan Telur <Icon name="arrow-up-right" size={14} />
              </button>
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setCartOpen(true); setMobileMenuOpen(false); }}
                className="liquid-glass inline-flex h-12 items-center gap-2.5 rounded-full px-4 text-sm font-medium transition-colors hover:bg-white/10"
                aria-label={`Buka keranjang belanja, ${cartCount} pesanan`}
              >
                <Icon name="bag" size={18} />
                <span className="hidden sm:inline">Keranjang</span>
                {cartCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-black">
                    {cartCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((value) => !value)}
                className="liquid-glass flex h-12 w-12 items-center justify-center rounded-full md:hidden"
                aria-label={mobileMenuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
                aria-expanded={mobileMenuOpen}
              >
                <Icon name={mobileMenuOpen ? 'close' : 'menu'} size={19} />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.nav
                initial={reduceMotion ? false : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: reduceMotion ? 0 : 0.22 }}
                aria-label="Navigasi seluler"
                className="liquid-glass mx-auto mt-2 flex max-w-[calc(100vw-2rem)] flex-col gap-1 rounded-2xl p-3 md:hidden"
              >
                <a className="mobile-nav-link" href="#hero" onClick={() => setMobileMenuOpen(false)}>Beranda</a>
                <a className="mobile-nav-link" href="#paket" onClick={() => setMobileMenuOpen(false)}>Pilihan Paket & Satuan</a>
                <a className="mobile-nav-link" href="#cara-pesan" onClick={() => setMobileMenuOpen(false)}>Cara Pesan</a>
                <a className="mobile-nav-link" href="#kualitas" onClick={() => setMobileMenuOpen(false)}>Standar Kualitas</a>
                <a className="mobile-nav-link" href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
              </motion.nav>
            )}
          </AnimatePresence>
        </header>

        <main className="overflow-x-hidden">
          {/* 1. CINEMATIC HERO */}
          <section id="hero" className="hero-screen relative isolate flex min-h-[100dvh] flex-col overflow-hidden bg-black">
            <FarmVideoBackground src={heroVideo} className="farm-video-background--hero" reduceMotion={Boolean(reduceMotion)} priority />
            <div className="hero-shade absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-[#050706]" />

            <div className="relative z-10 mx-auto flex flex-1 max-w-[1400px] flex-col items-center justify-center px-4 pb-16 pt-32 text-center sm:px-8 sm:pt-36">
              <motion.div {...reveal(0.15, Boolean(reduceMotion))} className="liquid-glass inline-flex items-center gap-2.5 rounded-full p-1.5 pr-4 text-[11px] tracking-[.14em] text-white/90 sm:text-xs">
                <span className="flex h-5 items-center justify-center rounded-full bg-[#cbd2b3] px-2.5 text-[10px] font-bold tracking-[.12em] text-[#050706]">
                  FIAN'S FARM
                </span>
                <span>Telur Ayam Kampung Asli · Panen Segar Harian</span>
              </motion.div>

              <h1 className="mt-8 max-w-5xl font-heading text-[clamp(3.2rem,8.5vw,7.6rem)] italic leading-[.85] tracking-tight text-white">
                <BlurText text="Kemurnian Telur Kampung Asli untuk Meja Anda" />
              </h1>

              {/* Subtitle updated per request */}
              <motion.p {...reveal(0.5, Boolean(reduceMotion))} className="mt-6 max-w-2xl text-sm font-light leading-relaxed text-white/75 sm:text-base">
                Pilih jumlah butir, cek estimasi harga, lalu lanjutkan pemesanan melalui Shopee atau WhatsApp. Ketersediaan, pengemasan, dan ongkir dikonfirmasi pada kanal pilihan Anda.
              </motion.p>

              <motion.div {...reveal(0.8, Boolean(reduceMotion))} className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => scrollToSection('paket')}
                  className="liquid-glass-strong group inline-flex items-center gap-3 rounded-full px-7 py-4 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
                >
                  <span>Pilih Jumlah & Paket</span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
                    <Icon name="arrow-right" size={14} />
                  </span>
                </button>
                <a
                  href={singleWhatsAppUrl(customEggCount, heroProduct.price)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="liquid-glass inline-flex items-center gap-2.5 rounded-full px-6 py-4 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Pesan via WhatsApp <Icon name="arrow-up-right" size={16} />
                </a>
              </motion.div>

              <motion.div {...reveal(1.05, Boolean(reduceMotion))} className="mt-12 grid w-full max-w-4xl grid-cols-1 gap-3 text-left sm:grid-cols-3 sm:gap-4">
                <div data-scroll-reveal className="liquid-glass rounded-[1.4rem] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] tracking-[.16em] text-white/45">HARGA PER BUTIR</span>
                    <span className="text-[#cbd2b3]"><Icon name="egg" size={18} /></span>
                  </div>
                  <p className="mt-3 font-heading text-3xl italic leading-none text-white">{formatPrice(heroProduct.price)}</p>
                  <p className="mt-1.5 text-[11px] font-light text-white/60">Harga telur murni, sebelum ongkir</p>
                </div>

                <div data-scroll-reveal className="liquid-glass rounded-[1.4rem] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] tracking-[.16em] text-white/45">PAKAN ALAMI 100%</span>
                    <span className="text-emerald-300"><Icon name="sparkle" size={18} /></span>
                  </div>
                  <p className="mt-3 font-heading text-3xl italic leading-none text-white">Free-Range</p>
                  <p className="mt-1.5 text-[11px] font-light text-white/60">Dedak padi, jagung giling & maggot BSF</p>
                </div>

                <div data-scroll-reveal className="liquid-glass rounded-[1.4rem] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] tracking-[.16em] text-white/45">KANAL RESMI</span>
                    <span className="text-amber-300"><Icon name="arrow-up-right" size={18} /></span>
                  </div>
                  <p className="mt-3 font-heading text-3xl italic leading-none text-white">WA & Shopee</p>
                  <p className="mt-1.5 text-[11px] font-light text-white/60">CS: {whatsappDisplay}</p>
                </div>
              </motion.div>
            </div>
          </section>

          {/* 2. PACK BUILDER — CUSTOM SATUAN DI PALING KIRI DENGAN GAMBAR */}
          <section id="paket" className="relative isolate min-h-screen overflow-hidden bg-black py-28 sm:py-36">
            <FarmVideoBackground src={collectionVideo} className="farm-video-background--collection" reduceMotion={Boolean(reduceMotion)} />
            <div className="collection-shade" />

            <div className="relative z-10 mx-auto max-w-[1480px] px-4 sm:px-8 lg:px-12">
              <div data-scroll-reveal className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-medium tracking-[.18em] text-[#cbd2b3]">PILIHAN KEMASAN & SATUAN</p>
                  <h2 className="mt-2 font-heading text-4xl italic leading-none sm:text-5xl md:text-6xl">
                    Pilih Jumlah Butir atau Paket Siap Simpan.
                  </h2>
                </div>
                <div data-scroll-velocity className="scroll-velocity-mark max-w-md text-xs font-light leading-relaxed text-white/65">
                  Tentukan jumlah butir satuan bebas sesuai kebutuhan, atau pilih kotak 10 butir dan tray keluarga 30 butir yang paling hemat.
                </div>
              </div>

              {/* 3 CARDS: 1) KUSTOM SATUAN (PALING KIRI + ADA GAMBAR), 2) KOTAK 10 BUTIR, 3) TRAY 30 BUTIR */}
              <div className="grid gap-6 md:grid-cols-3">
                {/* CARD 1: KUSTOM SATUAN (PALING KIRI DENGAN GAMBAR) */}
                <article
                  data-scroll-reveal
                  className="liquid-glass-strong group relative flex flex-col justify-between rounded-[2rem] p-6 sm:p-8 transition-transform duration-500 hover:-translate-y-1"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full border border-white/10 bg-white/[.06] px-3 py-1 text-[10px] tracking-[.12em] text-[#cbd2b3]">
                        KUSTOM SATUAN
                      </span>
                      <span className="text-xs text-white/45">Bebas Satuan</span>
                    </div>

                    {/* Gambar Produk */}
                    <div className="mt-6 aspect-[16/10] overflow-hidden rounded-2xl bg-black/40">
                      <img
                        src={heroProduct.image}
                        alt="Telur Ayam Kampung Satuan Bebas"
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>

                    <h3 className="mt-6 font-heading text-3xl italic text-white">Beli Satuan Kustom</h3>
                    <p className="mt-2 text-xs font-light leading-relaxed text-white/65">
                      Tentukan sendiri berapa butir yang Anda butuhkan (bisa satuan custom mulai 1 butir).
                    </p>

                    {/* Stepper Satuan (Step 1 by 1) */}
                    <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4 text-center sm:p-5">
                      <span className="text-[10px] tracking-[.14em] text-white/45">JUMLAH TELUR</span>
                      <div className="my-3 flex items-center justify-center gap-4">
                        <button
                          type="button"
                          onClick={() => setCustomEggCount((c) => Math.max(1, c - 1))}
                          disabled={customEggCount <= 1}
                          aria-label="Kurangi satu butir"
                          className="liquid-glass flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <Icon name="minus" size={16} />
                        </button>

                        <div className="min-w-24 text-center">
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={1}
                            value={customEggCount}
                            onChange={(e) => setCustomEggCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                            className="w-24 bg-transparent text-center font-heading text-5xl italic text-white outline-none"
                            aria-label="Jumlah butir telur kustom"
                          />
                          <span className="block text-[11px] text-white/45">butir</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setCustomEggCount((c) => c + 1)}
                          aria-label="Tambah satu butir"
                          className="liquid-glass flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-transform active:scale-95"
                        >
                          <Icon name="plus" size={16} />
                        </button>
                      </div>

                      {/* Quick presets */}
                      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                        {quickEggCounts.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCustomEggCount(preset)}
                            className={`rounded-lg px-2.5 py-1 text-[10px] transition-colors ${
                              customEggCount === preset ? 'bg-[#cbd2b3] font-semibold text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                          >
                            {preset} btr
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-white/10 pt-5">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="block text-[9px] tracking-[.14em] text-white/45">KALKULASI BIAYA</span>
                        <span className="mt-1 block font-heading text-3xl italic text-white">
                          {formatPrice(customEggCount * heroProduct.price)}
                        </span>
                      </div>
                      <span className="text-[11px] text-white/50">{customEggCount} × {formatPrice(heroProduct.price)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={addCustomEggsToCart}
                      className="liquid-glass-strong mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-xs font-medium text-white transition-all hover:bg-white/15"
                    >
                      <Icon name="bag" size={15} /> Tambahkan {customEggCount} Butir ke Keranjang
                    </button>
                  </div>
                </article>

                {/* CARD 2 & 3: PAKET KOTAK 10 BUTIR & TRAY 30 BUTIR */}
                {eggPackages.map((pkg) => (
                  <article
                    key={pkg.id}
                    data-scroll-reveal
                    className={`liquid-glass-strong group relative flex flex-col justify-between rounded-[2rem] p-6 sm:p-8 transition-transform duration-500 hover:-translate-y-1 ${
                      pkg.id === 'tray-30' ? 'ring-1 ring-[#cbd2b3]/30 shadow-[0_0_40px_rgba(203,210,179,0.06)]' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="rounded-full border border-white/10 bg-white/[.06] px-3 py-1 text-[10px] tracking-[.12em] text-[#cbd2b3]">
                          {pkg.badge}
                        </span>
                        <span className="text-xs text-white/45">{pkg.count} Butir</span>
                      </div>

                      <div className="mt-6 aspect-[16/10] overflow-hidden rounded-2xl bg-black/40">
                        <img
                          src={heroProduct.image}
                          alt={pkg.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>

                      <h3 className="mt-6 font-heading text-3xl italic text-white">{pkg.name}</h3>
                      <p className="mt-2 text-xs font-light leading-relaxed text-white/65">{pkg.description}</p>
                      <p className="mt-4 rounded-xl border border-white/[.08] bg-white/[.02] p-3 text-[11px] text-white/60">
                        <span className="font-medium text-white/80">Rekomendasi: </span>
                        {pkg.idealFor}
                      </p>
                    </div>

                    <div className="mt-6 border-t border-white/10 pt-5">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="block text-[9px] tracking-[.14em] text-white/45">TOTAL HARGA</span>
                          <span className="mt-1 block font-heading text-3xl italic text-white">{formatPrice(pkg.price)}</span>
                        </div>
                        <span className="text-[11px] text-white/50">(@ Rp2.500 / butir)</span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => addPackageToCart(pkg)}
                          className="liquid-glass-strong inline-flex items-center justify-center gap-1.5 rounded-full py-3 text-xs font-medium text-white transition-colors hover:bg-white/15"
                        >
                          <Icon name="plus" size={14} /> Ke Keranjang
                        </button>
                        <a
                          href={singleWhatsAppUrl(pkg.count, heroProduct.price)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="liquid-glass inline-flex items-center justify-center gap-1.5 rounded-full py-3 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          WhatsApp <Icon name="arrow-up-right" size={13} />
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* 3. GSAP OVERLAPPING SECTION — CARA PEMESANAN */}
          <section id="cara-pesan" data-overlap-section className="relative isolate overflow-hidden border-t border-white/[.08] py-24 sm:py-32 lg:py-36">
            <div className="mx-auto max-w-[1480px] px-4 sm:px-8 lg:px-12">
              <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between">
                <div data-scroll-reveal className="max-w-3xl">
                  <p className="text-[10px] font-medium tracking-[.18em] text-[#cbd2b3]">PESAN DENGAN CARA ANDA</p>
                  <h2 className="mt-2 font-heading text-4xl italic leading-[.95] sm:text-5xl md:text-6xl">
                    Satu Produk. Dua Jalur Pemesanan.
                  </h2>
                </div>
                <p data-scroll-velocity className="scroll-velocity-mark max-w-sm text-xs font-light leading-relaxed text-white/60">
                  Pilih jumlah butir di kalkulator atau pilih paket, lalu selesaikan pesanan via WhatsApp atau Shopee.
                </p>
              </div>

              {/* OVERLAPPING CARDS (GSAP ScrollTrigger Stacking) */}
              <div className="grid items-stretch gap-3 md:grid-cols-3 md:gap-0">
                <article data-overlap-card data-scroll-reveal className="order-step-card liquid-glass-strong relative z-10 flex flex-col justify-between rounded-[1.8rem] p-6 sm:p-8">
                  <div>
                    <p className="font-heading text-5xl italic text-[#cbd2b3]">01</p>
                    <h3 className="mt-8 font-heading text-3xl italic text-white">Tentukan Kebutuhan</h3>
                    <p className="mt-3 text-xs font-light leading-relaxed text-white/60">
                      Gunakan stepper satuan kustom atau pilih kotak 10 butir dan tray 30 butir untuk melihat estimasi biaya sebelum memesan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => scrollToSection('paket')}
                    className="mt-8 inline-flex items-center gap-2 self-start text-xs font-medium text-white/80 transition-colors hover:text-[#cbd2b3]"
                  >
                    Pilih Paket Sekarang <Icon name="arrow-up-right" size={14} />
                  </button>
                </article>

                <article data-overlap-card data-scroll-reveal className="order-step-card liquid-glass-strong relative z-20 flex flex-col justify-between rounded-[1.8rem] p-6 sm:p-8 md:-ml-7 md:mt-8">
                  <div>
                    <p className="font-heading text-5xl italic text-[#cbd2b3]">02</p>
                    <h3 className="mt-8 font-heading text-3xl italic text-white">Pesan via WhatsApp</h3>
                    <p className="mt-3 text-xs font-light leading-relaxed text-white/60">
                      Langsung terhubung dengan admin ({whatsappDisplay}). Konfirmasi ketersediaan stok, pengemasan, ongkir, dan alamat pengiriman.
                    </p>
                  </div>
                  <a
                    href={singleWhatsAppUrl(customEggCount, heroProduct.price)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="liquid-glass-strong mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-xs font-medium text-white transition-transform hover:-translate-y-0.5"
                  >
                    Chat WhatsApp <Icon name="arrow-up-right" size={14} />
                  </a>
                </article>

                <article data-overlap-card data-scroll-reveal className="order-step-card liquid-glass-strong relative z-30 flex flex-col justify-between rounded-[1.8rem] p-6 sm:p-8 md:-ml-7 md:-mt-1">
                  <div>
                    <p className="font-heading text-5xl italic text-[#cbd2b3]">03</p>
                    <h3 className="mt-8 font-heading text-3xl italic text-white">Beli di Shopee</h3>
                    <p className="mt-3 text-xs font-light leading-relaxed text-white/60">
                      Ingin menggunakan metode pembayaran ShopeePay, SPayLater, atau gratis ongkir? Buka etalase resmi mitra di Shopee.
                    </p>
                  </div>
                  <a
                    href={heroProduct.shopeeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="liquid-glass mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-xs font-medium text-white/85 transition-colors hover:bg-white/10"
                  >
                    Buka Etalase Shopee <Icon name="arrow-up-right" size={14} />
                  </a>
                </article>
              </div>
            </div>
          </section>

          {/* 4. STANDAR KUALITAS ALAMI BENTO */}
          <section id="kualitas" className="relative isolate border-t border-white/[.08] py-28 sm:py-36">
            <div className="mx-auto max-w-[1480px] px-4 sm:px-8 lg:px-12">
              <div data-scroll-reveal className="mb-14 max-w-3xl">
                <p className="text-[10px] font-medium tracking-[.18em] text-[#cbd2b3]">STANDAR KUALITAS TINGGI</p>
                <h2 className="mt-2 font-heading text-4xl italic leading-none sm:text-5xl md:text-6xl">
                  Anatomi Kesegaran Telur Kampung Asli.
                </h2>
                <p className="mt-4 text-sm font-light leading-relaxed text-white/65">
                  Dari pemilihan bibit ayam kampung murni, pola umbaran bebas di padang rumput, hingga pakan bernutrisi tinggi, kami mengutamakan mutu pangan terbaik untuk keluarga Anda.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <article data-scroll-reveal className="liquid-glass-strong relative col-span-1 flex flex-col justify-between overflow-hidden rounded-[2rem] p-7 md:col-span-2 md:p-10">
                  <div className="relative z-10 max-w-xl">
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] tracking-[.12em] text-amber-200">
                      NUTRISI TINGGI · BETA-KAROTEN
                    </span>
                    <h3 className="mt-4 font-heading text-3xl italic sm:text-4xl text-white">
                      Kuning Telur Oranye Pekat & Bulat Kental
                    </h3>
                    <p className="mt-3 text-xs sm:text-sm font-light leading-relaxed text-white/70">
                      Warna oranye kemerahan alami didapatkan dari asupan hijauan segar dan serangga alami di peternakan bebas kandang. Putih telurnya tebal bertekstur kental, tidak berair seperti telur simpanan lama.
                    </p>
                  </div>

                  <div className="relative z-10 mt-8 flex flex-wrap gap-6 border-t border-white/10 pt-6">
                    <div>
                      <span className="block font-heading text-2xl italic text-[#cbd2b3]">Omega-3</span>
                      <span className="text-[10px] text-white/50">Mendukung kesehatan jantung</span>
                    </div>
                    <div>
                      <span className="block font-heading text-2xl italic text-[#cbd2b3]">Lutein</span>
                      <span className="text-[10px] text-white/50">Meningkatkan kesehatan mata</span>
                    </div>
                    <div>
                      <span className="block font-heading text-2xl italic text-[#cbd2b3]">Protein Murni</span>
                      <span className="text-[10px] text-white/50">Cepat diserap tubuh</span>
                    </div>
                  </div>
                </article>

                <article data-scroll-reveal className="liquid-glass-strong col-span-1 flex flex-col justify-between rounded-[2rem] p-7 md:p-8">
                  <div>
                    <span className="rounded-full border border-white/10 bg-white/[.06] px-3 py-1 text-[10px] tracking-[.12em] text-[#cbd2b3]">
                      PROTEKSI ALAMI
                    </span>
                    <h3 className="mt-4 font-heading text-2xl sm:text-3xl italic text-white">
                      Cangkang Tebal & Bebas Retak
                    </h3>
                    <p className="mt-3 text-xs font-light leading-relaxed text-white/65">
                      Kalsium alami optimal dari pola pakan teratur membuat dinding cangkang lebih padat, tahan guncangan ekspedisi, dan kedap dari kontaminasi bakteri luar.
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-3 text-xs text-white/50">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-emerald-300">
                      <Icon name="check" size={15} />
                    </span>
                    <span>Tersortir tanpa retak halus</span>
                  </div>
                </article>

                <article data-scroll-reveal className="liquid-glass-strong col-span-1 flex flex-col justify-between rounded-[2rem] p-7 md:p-8">
                  <div>
                    <span className="rounded-full border border-white/10 bg-white/[.06] px-3 py-1 text-[10px] tracking-[.12em] text-[#cbd2b3]">
                      BEBAS RESIDU KIMIA
                    </span>
                    <h3 className="mt-4 font-heading text-2xl sm:text-3xl italic text-white">
                      100% Non-Antibiotik & Tanpa Hormon
                    </h3>
                    <p className="mt-3 text-xs font-light leading-relaxed text-white/65">
                      Ayam dipelihara secara organik tanpa suntikan hormon pemacu pertumbuhan, menghasilkan telur alami yang sangat aman untuk anak-anak, ibu hamil, dan lansia.
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-3 text-xs text-white/50">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-emerald-300">
                      <Icon name="check" size={15} />
                    </span>
                    <span>Aman konsumsi setengah matang</span>
                  </div>
                </article>

                <article data-scroll-reveal className="liquid-glass-strong col-span-1 flex flex-col justify-between rounded-[2rem] p-7 md:col-span-2 md:p-10">
                  <div className="max-w-xl">
                    <span className="rounded-full border border-white/10 bg-white/[.06] px-3 py-1 text-[10px] tracking-[.12em] text-[#cbd2b3]">
                      JAMINAN KESEGARAN
                    </span>
                    <h3 className="mt-4 font-heading text-3xl sm:text-4xl italic text-white">
                      Panen Pagi Hari, Dikirim di Hari yang Sama
                    </h3>
                    <p className="mt-3 text-xs sm:text-sm font-light leading-relaxed text-white/70">
                      Kami tidak pernah menimbun telur di ruang pendingin buatan berminggu-minggu. Siklus panen langsung masuk antrean kemas dan dikirim ke alamat Anda maksimal dalam 24 jam.
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs text-white/60">
                    <span>Peternakan Mitra: Blitar & Malang Selatan</span>
                    <span className="text-[#cbd2b3]">Garansi ganti butir jika pecah di jalan</span>
                  </div>
                </article>
              </div>
            </div>
          </section>

          {/* 5. FAQ */}
          <section id="faq" className="relative isolate border-t border-white/[.08] py-24 sm:py-32">
            <div className="mx-auto max-w-[1080px] px-4 sm:px-8">
              <div data-scroll-reveal className="mb-10 text-center sm:mb-12">
                <p className="text-[10px] font-medium tracking-[.18em] text-[#cbd2b3]">INFORMASI PEMESANAN</p>
                <h2 className="mt-2 font-heading text-4xl italic sm:text-5xl">Pertanyaan yang Sering Diajukan</h2>
                <p className="mt-3 text-xs text-white/60">Informasi seputar kualitas, penyimpanan, dan cara pemesanan.</p>
              </div>

              <div className="space-y-3.5">
                {faqs.map((faq, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div key={faq.question} data-scroll-reveal className="liquid-glass-strong rounded-2xl border border-white/10 transition-colors">
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6"
                        aria-expanded={isOpen}
                      >
                        <span className="font-heading text-xl italic text-white sm:text-2xl">{faq.question}</span>
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : 'text-white/50'}`}>
                          <Icon name="chevron-down" size={16} />
                        </span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                            transition={{ duration: reduceMotion ? 0 : 0.24 }}
                            className="overflow-hidden"
                          >
                            <p className="px-5 pb-5 pt-0 text-xs font-light leading-relaxed text-white/70 sm:px-6 sm:pb-6 sm:text-sm">
                              {faq.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </main>

        {/* FOOTER */}
        <footer className="border-t border-white/10 bg-[#030504] px-4 py-12 sm:px-8 sm:py-16 lg:px-16">
          <div className="mx-auto flex max-w-[1480px] flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[#cbd2b3]">
                  <Icon name="egg" size={19} />
                </span>
                <span className="font-heading text-3xl italic tracking-tight text-white">Butir Pagi</span>
              </div>
              <p className="mt-3 max-w-sm text-xs font-light leading-relaxed text-white/55">
                Telur Ayam Kampung Asli mitra Fian's Farm · {formatPrice(heroProduct.price)} / butir. Pesan langsung via WhatsApp ({whatsappDisplay}) atau Shopee.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <a href="#hero" className="px-2 py-2 text-white/60 transition-colors hover:text-white">Beranda</a>
              <a href="#paket" className="px-2 py-2 text-white/60 transition-colors hover:text-white">Pilihan Paket</a>
              <a href="#cara-pesan" className="px-2 py-2 text-white/60 transition-colors hover:text-white">Cara Pesan</a>
              <a href="#faq" className="px-2 py-2 text-white/60 transition-colors hover:text-white">FAQ</a>
              <a href={singleWhatsAppUrl(customEggCount, heroProduct.price)} target="_blank" rel="noopener noreferrer" className="liquid-glass-strong rounded-full px-4 py-2 text-white">
                WhatsApp ({whatsappDisplay}) ↗
              </a>
              <a href={heroProduct.shopeeUrl} target="_blank" rel="noopener noreferrer" className="liquid-glass rounded-full px-4 py-2 text-white/85">
                Shopee ↗
              </a>
            </div>
          </div>
          <div className="mx-auto mt-10 flex max-w-[1480px] flex-col gap-2 border-t border-white/[.06] pt-5 text-[10px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Butir Pagi · Fian's Farm</p>
            <p>Pemesanan, konfirmasi stok, dan ongkir diselesaikan via WhatsApp atau Shopee.</p>
          </div>
        </footer>

        {/* CART DRAWER */}
        <AnimatePresence>
          {cartOpen && (
            <CartDrawer
              lines={cartItems}
              totalEggs={totalEggsInCart}
              subtotal={subtotal}
              onClose={() => setCartOpen(false)}
              onUpdate={updateQuantity}
              onRemove={removeLine}
              onCheckout={() => {
                setCartOpen(false);
                setCheckoutStep('review');
              }}
              onShop={() => {
                setCartOpen(false);
                scrollToSection('paket');
              }}
            />
          )}
        </AnimatePresence>

        {/* CHECKOUT MODAL (DIRAPIKAN AGAR TOMBOL CLOSE TIDAK MENABRAK JUDUL) */}
        <AnimatePresence>
          {checkoutStep && (
            <CheckoutDialog
              step={checkoutStep}
              lines={cartItems}
              totalEggs={totalEggsInCart}
              subtotal={subtotal}
              shopeeUrl={heroProduct.shopeeUrl}
              onClose={() => setCheckoutStep(null)}
              onComplete={() => {
                setCartItems([]);
                setCheckoutStep('complete');
              }}
              onReturn={() => {
                setCheckoutStep(null);
                setCartOpen(true);
              }}
              onReset={() => {
                setCheckoutStep(null);
                scrollToSection('paket');
              }}
            />
          )}
        </AnimatePresence>

        {/* TOAST ANNOUNCEMENT */}
        <AnimatePresence>
          {announcement && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              role="status"
              className="liquid-glass-strong fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-white/20 px-6 py-3 text-xs font-medium text-white shadow-2xl backdrop-blur-xl"
            >
              {announcement}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

type CartDrawerProps = {
  lines: CartLine[];
  totalEggs: number;
  subtotal: number;
  onClose: () => void;
  onUpdate: (variant: string, change: number) => void;
  onRemove: (variant: string) => void;
  onCheckout: () => void;
  onShop: () => void;
};

function CartDrawer({ lines, totalEggs, subtotal, onClose, onUpdate, onRemove, onCheckout, onShop }: CartDrawerProps) {
  const whatsappUrl = createWhatsAppUrl(lines, totalEggs, subtotal);

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex justify-end bg-black/75 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="bag-title"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.38, ease: easeOut }}
        className="liquid-glass-strong overlay-scroll flex h-full w-full max-w-[500px] flex-col overflow-y-auto border-l border-white/10 px-5 pb-5 pt-5 sm:px-7"
      >
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <p className="text-[10px] tracking-[.15em] text-white/55">RINGKASAN PESANAN</p>
            <h2 id="bag-title" className="mt-1 font-heading text-3xl italic">
              Keranjang <span className="font-body text-sm not-italic text-white/55">({totalEggs} butir)</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup keranjang"
            className="liquid-glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
            <span className="liquid-glass flex h-16 w-16 items-center justify-center rounded-full text-white/75">
              <Icon name="bag" size={24} />
            </span>
            <h3 className="mt-5 font-heading text-3xl italic">Keranjangmu masih kosong.</h3>
            <p className="mt-2 max-w-xs text-xs font-light leading-relaxed text-white/60">
              Pilih jumlah butir satuan kustom atau paket kemasan untuk mulai berbelanja.
            </p>
            <button
              type="button"
              onClick={onShop}
              className="liquid-glass-strong mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-medium"
            >
              Lihat pilihan telur <Icon name="arrow-right" size={15} />
            </button>
          </div>
        ) : (
          <>
            <div className="overlay-scroll flex-1 space-y-4 overflow-y-auto py-5">
              {lines.map((line) => (
                <div key={line.variant} className="flex items-center justify-between gap-4 rounded-xl border border-white/[.06] bg-white/[.02] p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-xl italic leading-none text-white">{line.variant}</p>
                    <p className="mt-1 text-[11px] text-white/50">{line.eggsCount * line.quantity} butir telur</p>
                    <p className="mt-2 text-xs font-medium text-[#cbd2b3]">{formatPrice(line.pricePerUnit * line.quantity)}</p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="liquid-glass flex items-center rounded-full">
                      <button
                        type="button"
                        onClick={() => onUpdate(line.variant, -1)}
                        aria-label="Kurangi kuantitas"
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
                      >
                        <Icon name="minus" size={13} />
                      </button>
                      <span className="w-7 text-center text-xs font-medium">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onUpdate(line.variant, 1)}
                        aria-label="Tambah kuantitas"
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
                      >
                        <Icon name="plus" size={13} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemove(line.variant)}
                      className="inline-flex items-center gap-1 text-[10px] text-white/45 hover:text-red-300"
                    >
                      <Icon name="trash" size={12} /> Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/65">Total ({totalEggs} butir)</span>
                <span className="font-heading text-2xl italic text-white">{formatPrice(subtotal)}</span>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-white/45">
                Pemesanan diproses langsung via WhatsApp (+62 823-3927-2715) atau etalase Shopee.
              </p>

              <div className="mt-4 flex flex-col gap-2.5">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="liquid-glass-strong flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
                >
                  Pesan via WhatsApp ({whatsappDisplay}) <Icon name="arrow-up-right" size={15} />
                </a>
                <button
                  type="button"
                  onClick={onCheckout}
                  className="rounded-full border border-white/15 py-3 text-xs text-white/80 transition-colors hover:bg-white/5"
                >
                  Tinjau Ringkasan Pesanan
                </button>
              </div>
            </div>
          </>
        )}
      </motion.aside>
    </motion.div>
  );
}

type CheckoutDialogProps = {
  step: Exclude<CheckoutStep, null>;
  lines: CartLine[];
  totalEggs: number;
  subtotal: number;
  shopeeUrl: string;
  onClose: () => void;
  onComplete: () => void;
  onReturn: () => void;
  onReset: () => void;
};

function CheckoutDialog({ step, lines, totalEggs, subtotal, shopeeUrl, onClose, onComplete, onReturn, onReset }: CheckoutDialogProps) {
  const whatsappUrl = createWhatsAppUrl(lines, totalEggs, subtotal);

  return (
    <motion.div
      className="modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.32, ease: easeOut }}
        className="liquid-glass-strong relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] p-6 sm:p-8"
      >
        {/* HEADER MODAL DENGAN TOMBOL CLOSE DI KANAN ATAS (TIDAK LAGI OVERLAP TEKS) */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-[10px] tracking-[.16em] text-white/50">RINGKASAN SEBELUM CHECKOUT</p>
            <h2 id="checkout-title" className="mt-1 font-heading text-3xl italic text-white sm:text-4xl">
              Konfirmasi Pilihan
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup konfirmasi"
            className="liquid-glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {step === 'complete' ? (
          <div className="py-6 text-center">
            <span className="liquid-glass mx-auto flex h-16 w-16 items-center justify-center rounded-full text-emerald-300">
              <Icon name="check" size={26} />
            </span>
            <h2 className="mt-5 font-heading text-4xl italic text-white">Pesanan Disiapkan</h2>
            <p className="mx-auto mt-3 max-w-sm text-xs font-light leading-relaxed text-white/70">
              Silakan lanjutkan ke WhatsApp admin kami untuk konfirmasi alamat dan ongkir, atau selesaikan lewat Shopee.
            </p>
            <div className="mt-7 flex flex-col gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="liquid-glass-strong inline-flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-medium text-white"
              >
                Kirim Draf ke WhatsApp ({whatsappDisplay}) <Icon name="arrow-up-right" size={15} />
              </a>
              <a
                href={shopeeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="liquid-glass inline-flex items-center justify-center gap-2 rounded-full py-3 text-xs font-medium text-white/80 hover:text-white"
              >
                Buka Toko di Shopee <Icon name="arrow-up-right" size={14} />
              </a>
              <button
                type="button"
                onClick={onReset}
                className="text-xs text-white/50 hover:text-white pt-2"
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-4">
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4 text-xs text-white/75">
              <p className="font-medium text-white">Pemesanan Langsung WhatsApp & Shopee</p>
              <p className="mt-1 font-light leading-relaxed text-white/60">
                Data pembayaran, opsi kurir, dan nomor resi dikonfirmasi pada kanal pilihan Anda. WhatsApp otomatis memuat draf rincian pesanan.
              </p>
            </div>

            <div className="mt-4 max-h-48 space-y-2.5 overflow-y-auto pr-1">
              {lines.map((item) => (
                <div key={item.variant} className="flex justify-between border-b border-white/[.06] pb-2.5 text-xs">
                  <span className="text-white/80">{item.variant} <span className="text-white/40">× {item.quantity}</span></span>
                  <span className="font-medium text-[#cbd2b3]">{formatPrice(item.pricePerUnit * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-baseline justify-between border-t border-white/10 pt-4">
              <span className="text-xs text-white/60">Total ({totalEggs} butir)</span>
              <span className="font-heading text-3xl italic text-white">{formatPrice(subtotal)}</span>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onComplete}
                className="liquid-glass-strong inline-flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
              >
                Pesan via WhatsApp ({whatsappDisplay}) <Icon name="arrow-up-right" size={16} />
              </a>

              <a
                href={shopeeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onComplete}
                className="liquid-glass inline-flex items-center justify-center gap-2 rounded-full py-3 text-xs font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
              >
                Bayar di Shopee <Icon name="arrow-up-right" size={15} />
              </a>

              <button
                type="button"
                onClick={onReturn}
                className="rounded-full border border-white/10 py-2.5 text-xs text-white/60 hover:bg-white/5 hover:text-white"
              >
                Ubah Pilihan di Keranjang
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function App() {
  return <Storefront />;
}

export default App;
