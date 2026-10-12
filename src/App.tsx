import { useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { BlurText } from './components/BlurText';
import { FarmVideoBackground } from './components/FarmVideoBackground';
import { Icon } from './components/Icon';
import { AdminDashboard } from './pages/AdminDashboard';
import { products } from './data/products';
import type { Product } from './data/products';
import { eggPackages } from './data/packages';
import type { EggPackage } from './data/packages';
import { inventoryStorageKey, inventoryUpdateEvent } from './data/inventory';

type CartLine = {
  productId: string;
  variant: string;
  pricePerUnit: number;
  eggsCount: number;
  quantity: number;
};

type CheckoutStep = 'review' | 'complete' | null;

const easeOut = [0.22, 1, 0.36, 1] as const;
const heroVideo = '/videos/farm-wide.mp4';

function readInventory() {
  try {
    const raw = localStorage.getItem(inventoryStorageKey);
    return raw ? JSON.parse(raw) as Record<string, number> : {};
  } catch {
    return {};
  }
}

const reveal = (delay: number, reduced: boolean) => ({
  initial: reduced ? false : { filter: 'blur(10px)', opacity: 0, y: 20 },
  animate: { filter: 'blur(0px)', opacity: 1, y: 0 },
  transition: { duration: reduced ? 0 : 0.8, delay: reduced ? 0 : delay, ease: easeOut },
});

function formatPrice(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

function formatCount(value: number) {
  return new Intl.NumberFormat('id-ID').format(value);
}

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

const comparisons = [
  {
    feature: 'Warna Kuning Telur',
    market: 'Kuning pucat, encer, mudah ambyar',
    ourFarm: 'Oranye kemerahan pekat, bulat kokoh & kental berprotein tinggi',
  },
  {
    feature: 'Aroma & Karakter Rasa',
    market: 'Cenderung berbau amis tajam',
    ourFarm: 'Gurih manis alami, bebas amis, harum saat diolah',
  },
  {
    feature: 'Sistem Pemeliharaan',
    market: 'Kandang baterai sempit buatan pabrik',
    ourFarm: 'Umbaran bebas (Free-Range), sinar matahari penuh & bahagia',
  },
  {
    feature: 'Pakan Alami Harian',
    market: 'Konsentrat kimia & pakan instan',
    ourFarm: 'Dedak padi fermentasi, jagung giling, sayuran hijau & maggot BSF',
  },
  {
    feature: 'Siklus dari Kandang ke Meja',
    market: 'Menumpuk 1–3 minggu di gudang agen',
    ourFarm: 'Maksimal 24 jam langsung dipanen & disortir dari peternak mitra',
  },
];

const faqs = [
  {
    question: 'Berapa lama daya simpan telur ayam kampung ini?',
    answer: 'Telur bertahan 3–4 minggu pada suhu ruang sejuk dan berventilasi baik, serta lebih dari 6 minggu jika disimpan di chiller kulkas. Karena dipanen segar maksimal 24 jam tanpa perlakuan kimiawi, lapisan kutikula alami cangkang tetap utuh melindungi kesegaran isi.',
  },
  {
    question: 'Apakah aman dikonsumsi setengah matang atau untuk jamu?',
    answer: 'Sangat aman dan direkomendasikan. Ayam dipelihara secara alami bebas antibiotik sintetis dengan pakan kaya antioksidan. Kuning telur bertekstur kental pekat dan tidak amis, sangat lezat untuk STMJ, telur setengah matang, maupun pelengkap jamu tradisional.',
  },
  {
    question: 'Bagaimana keamanan pengiriman jika memesan melalui Shopee?',
    answer: 'Setiap paket dilapisi kemasan karton bersekat tebal plus bubble wrap per butir untuk meredam getaran kurir ekspedisi. Kami menyediakan garansi ganti butir jika terdapat telur yang pecah dalam pengiriman dengan menyertakan video unboxing.',
  },
  {
    question: 'Berapa minimal pemesanan dan apakah melayani langganan rutin?',
    answer: 'Pemesanan minimal dapat dimulai dari 10 butir (kotak praktis) hingga puluhan tray keluarga (isi 30 butir per tray). Untuk pasokan rutin mingguan warung, kafe, atau konsumsi keluarga, kamu bisa memesan berulang di etalase Shopee kami.',
  },
];

function Storefront() {
  const reduceMotion = useReducedMotion();
  const heroProduct = products[0];
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartItems, setCartItems] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [stocks, setStocks] = useState<Record<string, number>>(readInventory);
  const [customEggCount, setCustomEggCount] = useState(15);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const availableStock = stocks[heroProduct.id] ?? 0;

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalEggsInCart = cartItems.reduce((sum, item) => sum + item.eggsCount * item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);
  const overlayOpen = Boolean(selectedProduct || cartOpen || checkoutStep);

  useCloseOnEscape(() => {
    setSelectedProduct(null);
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
    const refreshInventory = () => setStocks(readInventory());
    window.addEventListener('storage', refreshInventory);
    window.addEventListener(inventoryUpdateEvent, refreshInventory);
    refreshInventory();
    return () => {
      window.removeEventListener('storage', refreshInventory);
      window.removeEventListener(inventoryUpdateEvent, refreshInventory);
    };
  }, []);

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
    const variantName = `Pilihan Kustom (${customEggCount} Butir)`;
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
      <div data-theme="dark" className="app-shell min-h-screen text-[#f6f5ef] selection:bg-[#cbd2b3] selection:text-[#050706]">
        {/* Fixed Header */}
        <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-8 lg:px-16">
          <div className="mx-auto flex max-w-[1520px] items-center justify-between gap-4">
            <a href="#hero" aria-label="Beranda Butir Pagi" className="liquid-glass inline-flex h-12 shrink-0 items-center gap-2.5 rounded-full px-4 text-white transition-transform hover:scale-[1.02]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[#cbd2b3]">
                <Icon name="egg" size={18} />
              </span>
              <span className="font-heading text-2xl italic tracking-tight">Butir Pagi</span>
            </a>

            <nav aria-label="Navigasi utama" className="liquid-glass hidden items-center gap-1 rounded-full p-1.5 md:flex">
              <a className="nav-link" href="#hero">Beranda</a>
              <a className="nav-link" href="#paket">Pilihan Paket</a>
              <a className="nav-link" href="#kualitas">Standar Kualitas</a>
              <a className="nav-link" href="#iot">Teknologi Kandang</a>
              <a className="nav-link" href="#faq">FAQ</a>
              <a className="nav-link" href="/admin">Panel Admin</a>
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
                initial={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
                transition={{ duration: 0.25 }}
                aria-label="Navigasi seluler"
                className="liquid-glass mx-auto mt-2 flex max-w-[calc(100vw-2rem)] flex-col gap-1 rounded-2xl p-3 md:hidden"
              >
                <a className="mobile-nav-link" href="#hero" onClick={() => setMobileMenuOpen(false)}>Beranda</a>
                <a className="mobile-nav-link" href="#paket" onClick={() => setMobileMenuOpen(false)}>Pilihan Paket</a>
                <a className="mobile-nav-link" href="#kualitas" onClick={() => setMobileMenuOpen(false)}>Standar Kualitas</a>
                <a className="mobile-nav-link" href="#iot" onClick={() => setMobileMenuOpen(false)}>Teknologi Kandang</a>
                <a className="mobile-nav-link" href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
                <a className="mobile-nav-link" href="/admin" onClick={() => setMobileMenuOpen(false)}>Panel Admin</a>
              </motion.nav>
            )}
          </AnimatePresence>
        </header>

        <main className="overflow-x-hidden">
          {/* 1. CINEMATIC HERO SECTION */}
          <section id="hero" className="hero-screen relative isolate flex min-h-[100dvh] flex-col overflow-hidden bg-black">
            <FarmVideoBackground src={heroVideo} className="farm-video-background--hero" reduceMotion={Boolean(reduceMotion)} priority />
            <div className="hero-shade absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-[#050706]" />

            <div className="relative z-10 mx-auto flex flex-1 max-w-[1400px] flex-col items-center justify-center px-4 pb-16 pt-32 text-center sm:px-8 sm:pt-36">
              <motion.div {...reveal(0.2, Boolean(reduceMotion))} className="liquid-glass inline-flex items-center gap-2.5 rounded-full p-1.5 pr-4 text-[11px] tracking-[.14em] text-white/90 sm:text-xs">
                <span className="flex h-5 items-center justify-center rounded-full bg-[#cbd2b3] px-2.5 text-[10px] font-bold tracking-[.12em] text-[#050706]">
                  FIAN'S FARM
                </span>
                <span>Telur Ayam Kampung Asli · Panen Segar Harian</span>
              </motion.div>

              <h1 className="mt-8 max-w-5xl font-heading text-[clamp(3.2rem,8.5vw,7.6rem)] italic leading-[.85] tracking-tight text-white">
                <BlurText text="Kemurnian Telur Kampung Asli untuk Meja Anda" />
              </h1>

              <motion.p {...reveal(0.65, Boolean(reduceMotion))} className="mt-6 max-w-2xl text-sm font-light leading-relaxed text-white/75 sm:text-base">
                Berasal dari peternakan umbaran bebas (free-range) dengan pakan alami bergizi tinggi. Telur segar dipanen pagi ini dan disortir otomatis lewat conveyor IoT untuk jaminan kualitas tanpa kompromi.
              </motion.p>

              {/* Price & Primary CTAs */}
              <motion.div {...reveal(0.9, Boolean(reduceMotion))} className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => scrollToSection('paket')}
                  className="liquid-glass-strong group inline-flex items-center gap-3 rounded-full px-7 py-4 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
                >
                  <span>Pilih Paket Kemasan</span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
                    <Icon name="arrow-right" size={14} />
                  </span>
                </button>

                <a
                  href={heroProduct.shopeeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="liquid-glass inline-flex items-center gap-2.5 rounded-full px-6 py-4 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <span>Pesan di Shopee</span>
                  <Icon name="arrow-up-right" size={16} />
                </a>
              </motion.div>

              {/* 3 Origin Metric Highlights */}
              <motion.div {...reveal(1.15, Boolean(reduceMotion))} className="mt-14 grid w-full max-w-4xl grid-cols-1 gap-3 text-left sm:grid-cols-3 sm:gap-4">
                <div className="liquid-glass rounded-[1.4rem] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] tracking-[.16em] text-white/45">HARGA TERJANGKAU</span>
                    <span className="text-[#cbd2b3]"><Icon name="egg" size={18} /></span>
                  </div>
                  <p className="mt-3 font-heading text-3xl italic leading-none text-white">{formatPrice(heroProduct.price)}</p>
                  <p className="mt-1.5 text-[11px] font-light text-white/60">Per butir murni langsung dari kandang mitra</p>
                </div>

                <div className="liquid-glass rounded-[1.4rem] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] tracking-[.16em] text-white/45">PAKAN ALAMI 100%</span>
                    <span className="text-emerald-300"><Icon name="sparkle" size={18} /></span>
                  </div>
                  <p className="mt-3 font-heading text-3xl italic leading-none text-white">Free-Range</p>
                  <p className="mt-1.5 text-[11px] font-light text-white/60">Dedak padi, jagung giling & maggot BSF</p>
                </div>

                <div className="liquid-glass rounded-[1.4rem] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] tracking-[.16em] text-white/45">JAMINAN PANEN</span>
                    <span className="text-amber-300"><Icon name="shield" size={18} /></span>
                  </div>
                  <p className="mt-3 font-heading text-3xl italic leading-none text-white">Segar 24 Jam</p>
                  <p className="mt-1.5 text-[11px] font-light text-white/60">Panen hari ini, dikemas & dikirim hari ini</p>
                </div>
              </motion.div>
            </div>
          </section>

          {/* 2. INTERACTIVE PACK BUILDER (PILIHAN PAKET & KUSTOM BUTIR) */}
          <section id="paket" className="relative isolate py-28 sm:py-36">
            <div className="mx-auto max-w-[1480px] px-4 sm:px-8 lg:px-12">
              <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-medium tracking-[.18em] text-[#cbd2b3]">PILIHAN KEMASAN HIGIENIS</p>
                  <h2 className="mt-2 font-heading text-4xl italic leading-none sm:text-5xl md:text-6xl">
                    Pilih Paket atau Tentukan Jumlah Butir.
                  </h2>
                </div>
                <div className="max-w-md text-xs font-light leading-relaxed text-white/65">
                  Setiap butir telur dikemas dalam karton proteksi peredam benturan. Tersedia stok langsung dari peternakan mitra kami.
                </div>
              </div>

              {/* 3 Pack Cards Grid */}
              <div className="grid gap-6 md:grid-cols-3">
                {/* Pack 1: Kotak 10 Butir */}
                {eggPackages.map((pkg) => (
                  <article
                    key={pkg.id}
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

                    <div className="mt-8 border-t border-white/10 pt-6">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="block text-[9px] tracking-[.14em] text-white/45">TOTAL HARGA</span>
                          <span className="mt-1 block font-heading text-3xl italic text-white">{formatPrice(pkg.price)}</span>
                        </div>
                        <span className="text-[11px] text-white/50">(@ Rp2.500 / butir)</span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => addPackageToCart(pkg)}
                          className="liquid-glass-strong inline-flex items-center justify-center gap-1.5 rounded-full py-3 text-xs font-medium text-white transition-colors hover:bg-white/15"
                        >
                          <Icon name="plus" size={14} /> Ke Keranjang
                        </button>
                        <a
                          href={heroProduct.shopeeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="liquid-glass inline-flex items-center justify-center gap-1.5 rounded-full py-3 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          Shopee <Icon name="arrow-up-right" size={13} />
                        </a>
                      </div>
                    </div>
                  </article>
                ))}

                {/* Pack 3: Kustom Egg Stepper Calculator */}
                <article className="liquid-glass-strong relative flex flex-col justify-between rounded-[2rem] p-6 sm:p-8">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full border border-white/10 bg-white/[.06] px-3 py-1 text-[10px] tracking-[.12em] text-[#cbd2b3]">
                        KUSTOM BEBAS
                      </span>
                      <span className="text-xs text-white/45">Bebas Tentukan</span>
                    </div>

                    <h3 className="mt-6 font-heading text-3xl italic text-white">Pilih Jumlah Butir</h3>
                    <p className="mt-2 text-xs font-light leading-relaxed text-white/65">
                      Perlu jumlah tertentu untuk kebutuhan usaha, restoran, atau stok spesifik? Tentukan sendiri jumlah butir yang ingin kamu pesan.
                    </p>

                    {/* Interactive Stepper */}
                    <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-5 text-center">
                      <span className="text-[10px] tracking-[.14em] text-white/45">JUMLAH TELUR</span>
                      <div className="my-3 flex items-center justify-center gap-4">
                        <button
                          type="button"
                          onClick={() => setCustomEggCount((c) => Math.max(5, c - 5))}
                          aria-label="Kurangi lima butir"
                          className="liquid-glass flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-transform active:scale-95"
                        >
                          <Icon name="minus" size={16} />
                        </button>

                        <div className="min-w-24">
                          <span className="font-heading text-5xl italic text-white">{customEggCount}</span>
                          <span className="block text-[11px] text-white/45">butir</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setCustomEggCount((c) => c + 5)}
                          aria-label="Tambah lima butir"
                          className="liquid-glass flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-transform active:scale-95"
                        >
                          <Icon name="plus" size={16} />
                        </button>
                      </div>

                      {/* Quick preset buttons */}
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {[15, 20, 25, 50].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCustomEggCount(preset)}
                            className={`rounded-lg px-2.5 py-1 text-[10px] transition-colors ${
                              customEggCount === preset ? 'bg-white text-black font-semibold' : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                          >
                            {preset} btr
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 border-t border-white/10 pt-6">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="block text-[9px] tracking-[.14em] text-white/45">KALKULASI BIAYA</span>
                        <span className="mt-1 block font-heading text-3xl italic text-white">
                          {formatPrice(customEggCount * heroProduct.price)}
                        </span>
                      </div>
                      <span className="text-[11px] text-white/50">{customEggCount} × Rp2.500</span>
                    </div>

                    <button
                      type="button"
                      onClick={addCustomEggsToCart}
                      className="liquid-glass-strong mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-xs font-medium text-white transition-all hover:bg-white/15"
                    >
                      <Icon name="bag" size={15} /> Tambahkan {customEggCount} Butir ke Keranjang
                    </button>
                  </div>
                </article>
              </div>
            </div>
          </section>

          {/* 3. GAPLESS BENTO GRID — ANATOMI KUALITAS & KEMURNIAN TELUR */}
          <section id="kualitas" className="relative isolate border-t border-white/[.08] py-28 sm:py-36">
            <div className="mx-auto max-w-[1480px] px-4 sm:px-8 lg:px-12">
              <div className="mb-14 max-w-3xl">
                <p className="text-[10px] font-medium tracking-[.18em] text-[#cbd2b3]">STANDAR KUALITAS TINGGI</p>
                <h2 className="mt-2 font-heading text-4xl italic leading-none sm:text-5xl md:text-6xl">
                  Anatomi Kesegaran Telur Kampung Asli.
                </h2>
                <p className="mt-4 text-sm font-light leading-relaxed text-white/65">
                  Dari pemilihan bibit ayam kampung murni, pola umbaran bebas di padang rumput, hingga pakan bernutrisi tinggi, kami mengutamakan mutu pangan terbaik untuk keluarga Anda.
                </p>
              </div>

              {/* Bento Grid */}
              <div className="grid gap-5 md:grid-cols-3">
                {/* Bento Card 1: Kuning Telur Oranye Pekat (Span 2) */}
                <article className="liquid-glass-strong relative col-span-1 flex flex-col justify-between overflow-hidden rounded-[2rem] p-7 md:col-span-2 md:p-10">
                  <div className="relative z-10 max-w-xl">
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] tracking-[.12em] text-amber-200">
                      NUTRISI TINGGI · BETA-KAROTEN
                    </span>
                    <h3 className="mt-4 font-heading text-3xl italic sm:text-4xl text-white">
                      Kuning Telur Oranye Pekat & Bulat Kental
                    </h3>
                    <p className="mt-3 text-xs sm:text-sm font-light leading-relaxed text-white/70">
                      Warna oranye kemerahan alami didapatkan dari asupan hijauan alami dan serangga tanah di peternakan bebas kandang. Putih telurnya tebal bertekstur kental, tidak berair seperti telur simpanan lama.
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

                {/* Bento Card 2: Cangkang Kokoh */}
                <article className="liquid-glass-strong col-span-1 flex flex-col justify-between rounded-[2rem] p-7 md:p-8">
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

                {/* Bento Card 3: Bebas Hormon & Antibiotik */}
                <article className="liquid-glass-strong col-span-1 flex flex-col justify-between rounded-[2rem] p-7 md:p-8">
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

                {/* Bento Card 4: Panen Segar 24 Jam (Span 2) */}
                <article className="liquid-glass-strong col-span-1 flex flex-col justify-between rounded-[2rem] p-7 md:col-span-2 md:p-10">
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

          {/* 4. TRANSPARANSI IOT CONVEYOR & SENSOR COUNTER */}
          <section id="iot" className="relative isolate border-t border-white/[.08] py-24 sm:py-32">
            <div className="mx-auto max-w-[1480px] px-4 sm:px-8 lg:px-12">
              <div className="liquid-glass-strong relative overflow-hidden rounded-[2.5rem] p-8 sm:p-12 lg:p-16">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)] lg:items-center">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-1.5 text-xs text-emerald-200">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                      <span>SISTEM SENSOR KANDANG AKTIF</span>
                    </div>

                    <h2 className="mt-5 font-heading text-4xl italic leading-none text-white sm:text-5xl lg:text-6xl">
                      Transparansi Panen Berbasis IoT.
                    </h2>

                    <p className="mt-4 max-w-xl text-sm font-light leading-relaxed text-white/70">
                      Inovasi peternakan Butir Pagi menghubungkan mesin conveyor penyortir dengan sensor Infrared (IR) counter dan Node-RED MQTT. Setiap butir telur yang baru dipanen tercatat secara real-time demi akurasi stok dan ketertelusuran produk.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-4">
                      <a
                        href="/admin"
                        className="liquid-glass inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-medium tracking-[.1em] text-white transition-colors hover:bg-white/15"
                      >
                        Buka Dashboard Admin Peternak <Icon name="arrow-up-right" size={14} />
                      </a>
                    </div>
                  </div>

                  {/* Status Panel Box */}
                  <div className="rounded-2xl border border-white/10 bg-black/50 p-6 sm:p-8">
                    <p className="text-[10px] tracking-[.16em] text-white/45">LIVE CONVEYOR #01 STATUS</p>

                    <div className="mt-5 grid grid-cols-2 gap-4">
                      <div className="rounded-xl border border-white/[.06] bg-white/[.03] p-4">
                        <span className="text-[10px] text-white/45">KONEKSI</span>
                        <p className="mt-1 flex items-center gap-2 text-sm font-medium text-emerald-300">
                          <Icon name="wifi" size={15} /> Terkalibrasi
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/[.06] bg-white/[.03] p-4">
                        <span className="text-[10px] text-white/45">SENSOR</span>
                        <p className="mt-1 flex items-center gap-2 text-sm font-medium text-white/90">
                          <Icon name="activity" size={15} /> IR Counter
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-white/[.06] bg-white/[.03] p-4">
                      <span className="text-[10px] text-white/45">TOTAL STOK TERSEDIA HARI INI</span>
                      <p className="mt-2 font-heading text-4xl italic text-white">
                        {formatCount(availableStock)} <span className="font-body text-xs not-italic text-white/50">butir siap kirim</span>
                      </p>
                    </div>

                    <p className="mt-4 text-[10px] leading-relaxed text-white/40">
                      Data stok disinkronkan langsung dari catatan operasional conveyor peternakan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 5. QUALITY COMPARISON MATRIX */}
          <section className="relative isolate border-t border-white/[.08] py-28 sm:py-36">
            <div className="mx-auto max-w-[1480px] px-4 sm:px-8 lg:px-12">
              <div className="mb-12 text-center">
                <p className="text-[10px] font-medium tracking-[.18em] text-[#cbd2b3]">PERBANDINGAN NYATA</p>
                <h2 className="mt-2 font-heading text-4xl italic leading-none sm:text-5xl md:text-6xl">
                  Telur Pasar Biasa vs Butir Pagi.
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-xs sm:text-sm font-light text-white/65">
                  Kenapa harga Rp2.500 / butir memberikan nilai kesehatan yang jauh lebih berharga bagi keluarga Anda.
                </p>
              </div>

              <div className="liquid-glass-strong overflow-hidden rounded-[2rem]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] tracking-[.14em] text-white/45">
                        <th className="px-6 py-5 font-normal">PARAMETER KUALITAS</th>
                        <th className="px-6 py-5 font-normal">TELUR PASAR BIASA</th>
                        <th className="px-6 py-5 font-normal text-[#cbd2b3]">TELUR KAMPUNG BUTIR PAGI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[.06] text-xs">
                      {comparisons.map((row) => (
                        <tr key={row.feature} className="transition-colors hover:bg-white/[.02]">
                          <td className="px-6 py-4.5 font-medium text-white/90">{row.feature}</td>
                          <td className="px-6 py-4.5 font-light text-white/50">{row.market}</td>
                          <td className="px-6 py-4.5 font-medium text-[#cbd2b3]">{row.ourFarm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* 6. INTERACTIVE FAQ SECTION */}
          <section id="faq" className="relative isolate border-t border-white/[.08] py-28 sm:py-36">
            <div className="mx-auto max-w-[1080px] px-4 sm:px-8">
              <div className="mb-12 text-center">
                <p className="text-[10px] font-medium tracking-[.18em] text-[#cbd2b3]">PERTANYAAN UMUM</p>
                <h2 className="mt-2 font-heading text-4xl italic sm:text-5xl">Pertanyaan yang Sering Diajukan</h2>
                <p className="mt-3 text-xs text-white/60">Semua yang perlu kamu ketahui tentang penyimpanan dan pemesanan.</p>
              </div>

              <div className="space-y-3.5">
                {faqs.map((faq, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div
                      key={faq.question}
                      className="liquid-glass-strong rounded-2xl border border-white/10 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        className="flex w-full items-center justify-between p-6 text-left"
                        aria-expanded={isOpen}
                      >
                        <span className="font-heading text-xl italic text-white sm:text-2xl">{faq.question}</span>
                        <span className={`ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : 'text-white/50'}`}>
                          <Icon name="chevron-down" size={16} />
                        </span>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <p className="px-6 pb-6 pt-1 text-xs sm:text-sm font-light leading-relaxed text-white/70">
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

        {/* 7. FOOTER */}
        <footer className="border-t border-white/10 bg-[#030504] px-4 py-16 sm:px-8 lg:px-16">
          <div className="mx-auto flex max-w-[1480px] flex-col gap-10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[#cbd2b3]">
                  <Icon name="egg" size={19} />
                </span>
                <span className="font-heading text-3xl italic tracking-tight text-white">Butir Pagi</span>
              </div>
              <p className="mt-3 max-w-sm text-xs font-light leading-relaxed text-white/55">
                Peternakan telur ayam kampung terpilih mitra Fian's Farm. Segar, alami, dan higienis langsung ke dapur keluarga Anda.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <a href="#hero" className="text-white/60 hover:text-white transition-colors">Beranda</a>
              <a href="#paket" className="text-white/60 hover:text-white transition-colors">Pilihan Paket</a>
              <a href="#kualitas" className="text-white/60 hover:text-white transition-colors">Kualitas</a>
              <a href="#faq" className="text-white/60 hover:text-white transition-colors">FAQ</a>
              <a href="/admin" className="text-white/60 hover:text-white transition-colors">Panel Admin</a>
              <a
                href={heroProduct.shopeeUrl}
                target="_blank"
                rel="noreferrer"
                className="liquid-glass-strong rounded-full px-4 py-2 text-white"
              >
                Toko Shopee ↗
              </a>
            </div>
          </div>

          <div className="mx-auto mt-12 flex max-w-[1480px] flex-col gap-3 border-t border-white/[.06] pt-6 sm:flex-row sm:items-center sm:justify-between text-[11px] text-white/40">
            <p>© {new Date().getFullYear()} Butir Pagi · Fian's Farm. Seluruh hak cipta dilindungi.</p>
            <p>Pemesanan & Distribusi Terintegrasi Shopee</p>
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

        {/* CHECKOUT MODAL */}
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
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
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
            className="liquid-glass flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
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
              Pilih paket 10 butir, 30 butir, atau tentukan sendiri jumlah butir yang kamu butuhkan.
            </p>
            <button
              type="button"
              onClick={onShop}
              className="liquid-glass-strong mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-medium"
            >
              Lihat pilihan paket <Icon name="arrow-right" size={15} />
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
                Pesanan dikonfirmasi dan diproses pengirimannya langsung melalui Shopee.
              </p>
              <button
                type="button"
                onClick={onCheckout}
                className="liquid-glass-strong mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
              >
                Lanjutkan ke Pembayaran <Icon name="arrow-right" size={16} />
              </button>
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
        className="liquid-glass-strong relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] p-6 sm:p-9"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup ringkasan"
          className="liquid-glass absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
        >
          <Icon name="close" size={16} />
        </button>

        {step === 'complete' ? (
          <div className="py-6 text-center">
            <span className="liquid-glass mx-auto flex h-16 w-16 items-center justify-center rounded-full text-emerald-300">
              <Icon name="check" size={26} />
            </span>
            <h2 id="checkout-title" className="mt-5 font-heading text-4xl italic text-white">Pesanan Siap Diproses</h2>
            <p className="mx-auto mt-3 max-w-sm text-xs font-light leading-relaxed text-white/70">
              Silakan selesaikan pesananmu di etalase Shopee Butir Pagi agar alamat dan ekspedisi dapat langsung diverifikasi.
            </p>
            <a
              href={shopeeUrl}
              target="_blank"
              rel="noreferrer"
              className="liquid-glass-strong mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium text-white"
            >
              Buka Shopee Sekarang <Icon name="arrow-up-right" size={16} />
            </a>
            <div className="mt-4">
              <button
                type="button"
                onClick={onReset}
                className="text-xs text-white/50 hover:text-white"
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[10px] tracking-[.16em] text-white/50">RINGKASAN SEBELUM CHECKOUT</p>
            <h2 id="checkout-title" className="mt-2 font-heading text-4xl italic text-white">Konfirmasi Pilihan</h2>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-xs text-white/75">
              <p className="font-medium text-white">Pemesanan Terintegrasi Shopee</p>
              <p className="mt-1 font-light leading-relaxed text-white/60">
                Data pembayaran, opsi kurir instan/reguler, dan nomor resi akan langsung diproses dengan aman via etalase Shopee Fian's Farm.
              </p>
            </div>

            <div className="mt-5 max-h-48 space-y-2.5 overflow-y-auto pr-1">
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

            <div className="mt-7 flex flex-col gap-2.5">
              <a
                href={shopeeUrl}
                target="_blank"
                rel="noreferrer"
                onClick={onComplete}
                className="liquid-glass-strong inline-flex items-center justify-center gap-2 rounded-full py-4 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
              >
                Bayar di Shopee <Icon name="arrow-up-right" size={16} />
              </a>
              <button
                type="button"
                onClick={onReturn}
                className="rounded-full border border-white/10 py-3 text-xs text-white/70 hover:bg-white/5"
              >
                Ubah Pilihan di Keranjang
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/admin') return <AdminDashboard />;
  return <Storefront />;
}

export default App;
