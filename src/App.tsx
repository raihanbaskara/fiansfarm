import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { BlurText } from './components/BlurText';
import { FarmVideoBackground } from './components/FarmVideoBackground';
import { Icon } from './components/Icon';
import { AdminDashboard } from './pages/AdminDashboard';
import { productCategories, products } from './data/products';
import type { ProductCategory, Product } from './data/products';
import { inventoryStorageKey, inventoryUpdateEvent } from './data/inventory';

type CartLine = { productId: string; variant: string; quantity: number };
type CheckoutStep = 'review' | 'complete' | null;

const easeOut = [0.22, 1, 0.36, 1] as const;
const heroVideo = '/videos/farm-wide.mp4';
const collectionVideo = '/videos/farm-close.mp4';

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
  const [activeCategory, setActiveCategory] = useState<ProductCategory>('Semua telur');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [cartItems, setCartItems] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [stocks, setStocks] = useState<Record<string, number>>(readInventory);

  const visibleProducts = useMemo(
    () => activeCategory === 'Semua telur' ? products : products.filter((product) => product.category === activeCategory),
    [activeCategory],
  );

  const cartDetails = useMemo(() => cartItems.flatMap((line) => {
    const product = products.find((item) => item.id === line.productId);
    return product ? [{ ...line, product }] : [];
  }), [cartItems]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartDetails.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
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

  const addToCart = (product: Product, variant = product.variants[0]) => {
    setCartItems((current) => {
      const existing = current.find((line) => line.productId === product.id && line.variant === variant);
      if (existing) {
        return current.map((line) => line === existing ? { ...line, quantity: line.quantity + 1 } : line);
      }
      return [...current, { productId: product.id, variant, quantity: 1 }];
    });
    setSelectedProduct(null);
    setCheckoutStep(null);
    setAnnouncement(`${product.name} ditambahkan ke keranjang`);
    setCartOpen(true);
  };

  const updateQuantity = (productId: string, variant: string, change: number) => {
    setCartItems((current) => current
      .map((line) => line.productId === productId && line.variant === variant ? { ...line, quantity: line.quantity + change } : line)
      .filter((line) => line.quantity > 0));
  };

  const removeLine = (productId: string, variant: string) => {
    setCartItems((current) => current.filter((line) => !(line.productId === productId && line.variant === variant)));
  };

  const openProduct = (product: Product) => {
    setSelectedVariant(product.variants[0]);
    setSelectedProduct(product);
  };

  const clearCartAfterOrder = () => {
    setCheckoutStep('complete');
    setCartItems([]);
  };

  const enterOrderReview = () => {
    setCartOpen(false);
    window.open('https://shopee.co.id/shop/47713769', '_blank', 'noopener,noreferrer');
  };

  const startShopping = () => {
    setMobileMenuOpen(false);
    document.getElementById('collection')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <MotionConfig reducedMotion="user">
    <div data-theme="dark" className="app-shell min-h-screen">
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-8 lg:px-16">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <a href="#hero" aria-label="Beranda Butir Pagi" className="liquid-glass inline-flex h-12 shrink-0 items-center gap-2.5 rounded-full px-3.5 text-white transition-transform hover:scale-[1.02]">
            <Icon name="egg" size={22} />
            <span className="font-heading text-xl italic">Butir Pagi</span>
          </a>

          <nav aria-label="Navigasi utama" className="liquid-glass hidden items-center gap-0.5 rounded-full p-1.5 md:flex">
            <a className="nav-link" href="#hero">Beranda</a>
            <a className="nav-link" href="#collection">Pilihan telur</a>
            <a className="nav-link" href="#tentang">Tentang kami</a>
            <a className="nav-link" href="/admin">Admin</a>
            <button type="button" onClick={startShopping} className="liquid-glass-strong ml-1 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-white/10">
              Lihat pilihan telur <Icon name="arrow-up-right" size={15} />
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setCartOpen(true); setMobileMenuOpen(false); }} className="liquid-glass inline-flex h-12 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors hover:bg-white/10 sm:px-4" aria-label={`Buka keranjang, ${cartCount} item`}>
              <Icon name="bag" size={18} />
              <span className="hidden sm:inline">Keranjang</span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-semibold text-black">{cartCount}</span>
            </button>
            <button type="button" onClick={() => setMobileMenuOpen((value) => !value)} className="liquid-glass flex h-12 w-12 items-center justify-center rounded-full md:hidden" aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={mobileMenuOpen}>
              <Icon name={mobileMenuOpen ? 'close' : 'menu'} size={19} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav initial={{ opacity: 0, y: -8, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -8, filter: 'blur(8px)' }} transition={{ duration: 0.25 }} aria-label="Navigasi seluler" className="liquid-glass mx-auto mt-2 flex max-w-[calc(100vw-2rem)] flex-col rounded-2xl p-2 md:hidden">
              <a className="mobile-nav-link" href="#hero" onClick={() => setMobileMenuOpen(false)}>Beranda</a>
              <a className="mobile-nav-link" href="#collection" onClick={() => setMobileMenuOpen(false)}>Pilihan telur</a>
              <a className="mobile-nav-link" href="#tentang" onClick={() => setMobileMenuOpen(false)}>Tentang kami</a>
              <a className="mobile-nav-link" href="/admin" onClick={() => setMobileMenuOpen(false)}>Admin</a>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main>
        <section id="hero" className="hero-screen relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-black">
          <FarmVideoBackground src={heroVideo} className="farm-video-background--hero" reduceMotion={Boolean(reduceMotion)} priority />
          <div className="hero-shade" />
          <div className="hero-copy relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-14 pt-32 text-center sm:px-8 sm:pt-28">
            <motion.div {...reveal(0.25, Boolean(reduceMotion))} className="liquid-glass inline-flex items-center gap-2 rounded-full p-1.5 pr-4 text-[11px] tracking-[.13em] text-white/90 sm:text-xs">
              <span className="rounded-full bg-white px-2.5 py-1 font-semibold tracking-[.1em] text-black">BUTIR PAGI</span>
              <span>Telur pilihan untuk kebutuhan harian</span>
            </motion.div>

            <h1 className="mt-7 max-w-5xl font-heading text-[clamp(3.7rem,10.2vw,8.4rem)] italic leading-[.79] tracking-[-.055em] text-white">
              <BlurText text="Pilihan telur untuk setiap meja" />
            </h1>

            <motion.p {...reveal(0.8, Boolean(reduceMotion))} className="mt-6 max-w-xl text-sm font-light leading-relaxed text-white/80 sm:text-base">
              Pilih telur ayam negeri, ayam kampung, bebek, dan puyuh untuk melengkapi kebutuhan harian. Temukan pilihan yang pas untuk meja makan keluarga.
            </motion.p>

            <motion.div {...reveal(1.05, Boolean(reduceMotion))} className="mt-7 flex flex-wrap items-center justify-center gap-3 sm:gap-5">
              <button type="button" onClick={startShopping} className="liquid-glass-strong inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-transform hover:-translate-y-0.5">
                Lihat pilihan telur <Icon name="arrow-up-right" size={17} />
              </button>
              <button type="button" onClick={() => setCartOpen(true)} className="inline-flex items-center gap-2 rounded-full px-3 py-3 text-sm text-white/85 transition-colors hover:text-white">
                <Icon name="bag" size={17} /> Buka keranjang
              </button>
            </motion.div>

            <motion.div {...reveal(1.2, Boolean(reduceMotion))} className="mt-10 grid grid-cols-2 gap-3 text-left sm:gap-4">
              <div className="liquid-glass w-[min(42vw,220px)] rounded-[1.2rem] p-4 sm:p-5">
                <span className="text-white/65"><Icon name="sparkle" size={20} /></span>
                <p className="mt-4 font-heading text-4xl italic leading-none tracking-tight">04</p>
                <p className="mt-1 text-[11px] font-light leading-snug text-white/75 sm:text-xs">Pilihan jenis telur</p>
              </div>
              <div className="liquid-glass w-[min(42vw,220px)] rounded-[1.2rem] p-4 sm:p-5">
                <span className="text-white/65"><Icon name="check" size={20} /></span>
                <p className="mt-4 font-heading text-4xl italic leading-none tracking-tight">01</p>
                <p className="mt-1 text-[11px] font-light leading-snug text-white/75 sm:text-xs">Satuan stok per butir</p>
              </div>
            </motion.div>
          </div>

          <motion.div {...reveal(1.35, Boolean(reduceMotion))} className="relative z-10 flex flex-col items-center gap-3 px-4 pb-7 sm:pb-8">
            <span className="liquid-glass rounded-full px-4 py-2 text-center text-[10px] tracking-[.12em] text-white/85 sm:text-[11px]">PILIHAN TELUR · DIHITUNG PER BUTIR</span>
            <div className="flex flex-wrap justify-center gap-x-7 gap-y-1 text-[10px] tracking-[.18em] text-white/55 sm:gap-x-12 sm:text-[11px]">
              <span>AYAM</span><span>KAMPUNG</span><span>BEBEK</span><span>PUYUH</span>
            </div>
          </motion.div>
        </section>

        <section id="collection" className="relative isolate min-h-screen overflow-hidden bg-black">
          <FarmVideoBackground src={collectionVideo} className="farm-video-background--collection" reduceMotion={Boolean(reduceMotion)} />
          <div className="collection-shade" />
          <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] flex-col px-5 pb-8 pt-28 sm:px-8 sm:pt-32 lg:px-16 lg:pb-10">
            <div className="mb-9 flex flex-col gap-5 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-4 text-xs tracking-[.16em] text-white/70 sm:text-sm">// Katalog telur</p>
                <h2 className="max-w-3xl font-heading text-5xl italic leading-[.86] tracking-[-.045em] sm:text-6xl md:text-7xl lg:text-[6rem]">
                  Pilihan telur,<br />untuk meja sehari-hari.
                </h2>
              </div>
              <div className="max-w-sm text-xs font-light leading-relaxed text-white/70 sm:text-sm">
                <p>Pilihan telur untuk kebutuhan harian. Stok tercatat per butir.</p>
                <p className="mt-2 text-[10px] tracking-[.1em] text-white/50 sm:text-[11px]">PILIHAN TELUR · HARGA DALAM RUPIAH</p>
              </div>
            </div>

            <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Saring katalog telur">
                {productCategories.map((category) => (
                  <button key={category} type="button" onClick={() => setActiveCategory(category)} aria-pressed={activeCategory === category} className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs transition-colors ${activeCategory === category ? 'liquid-glass-strong text-white' : 'liquid-glass text-white/65 hover:text-white'}`}>
                    {category}
                  </button>
                ))}
              </div>
              <span className="shrink-0 text-[10px] tracking-[.14em] text-white/55">{String(visibleProducts.length).padStart(2, '0')} PRODUK PILIHAN</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              <AnimatePresence mode="popLayout">
                {visibleProducts.map((product, index) => (
                  <motion.article key={product.id} layout={!reduceMotion} initial={reduceMotion ? false : { opacity: 0, y: 18, filter: 'blur(8px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, amount: 0.12 }} exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }} transition={{ duration: reduceMotion ? 0 : 0.55, delay: reduceMotion ? 0 : index * 0.07, ease: easeOut }} className="product-card group">
                    <button type="button" onClick={() => openProduct(product)} className="block w-full text-left" aria-label={`Lihat detail ${product.name}`}>
                      <span className="product-photo relative block aspect-[4/5] rounded-[1.15rem]">
                        <img src={product.image} alt={product.imageAlt} loading="lazy" />
                        <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[9px] tracking-[.13em] text-white/80 backdrop-blur-md">PILIHAN</span>
                        <span className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-black opacity-0 shadow-xl transition-all duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
                          <Icon name="arrow-up-right" size={18} />
                        </span>
                      </span>
                    </button>
                    <div className="flex items-start justify-between gap-3 px-0.5 pt-3">
                      <button type="button" onClick={() => openProduct(product)} className="min-w-0 text-left">
                        <span className="block text-[9px] tracking-[.14em] text-white/50">{product.code} · {product.category.toUpperCase()}</span>
                        <span className="mt-1 block font-heading text-2xl italic leading-none tracking-tight text-white sm:text-[26px]">{product.name}</span>
                        <span className="mt-2 block text-xs text-white/70">{formatPrice(product.price)}</span>
                        <span className={`mt-1 block text-[11px] ${(stocks[product.id] ?? 0) > 0 ? 'text-emerald-200/80' : 'text-amber-100/75'}`}>{(stocks[product.id] ?? 0) > 0 ? `Tersedia ${new Intl.NumberFormat('id-ID').format(stocks[product.id])} butir` : 'Stok habis'}</span>
                      </button>
                      <button type="button" onClick={() => addToCart(product)} disabled={(stocks[product.id] ?? 0) < 1} className="liquid-glass mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35" aria-label={`Tambahkan ${product.name} ke keranjang`}>
                        <Icon name="plus" size={18} />
                      </button>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>

            <div id="tentang" className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-5 sm:mt-12 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-[11px] font-light leading-relaxed text-white/60 sm:text-xs">Pemesanan dilakukan melalui Shopee. Stok katalog mengikuti catatan admin pada perangkat ini.</p>
              <span className="shrink-0 text-[10px] tracking-[.16em] text-white/45">BUTIR PAGI · TELUR PILIHAN</span>
            </div>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {selectedProduct && (
          <ProductDialog product={selectedProduct} stock={stocks[selectedProduct.id] ?? 0} variant={selectedVariant} onVariantChange={setSelectedVariant} onAdd={() => addToCart(selectedProduct, selectedVariant)} onClose={() => setSelectedProduct(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cartOpen && (
          <CartDrawer lines={cartDetails} subtotal={subtotal} onClose={() => setCartOpen(false)} onUpdate={updateQuantity} onRemove={removeLine} onCheckout={enterOrderReview} onShop={() => { setCartOpen(false); startShopping(); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {checkoutStep && (
          <CheckoutDialog step={checkoutStep} lines={cartDetails} subtotal={subtotal} onClose={() => setCheckoutStep(null)} onComplete={clearCartAfterOrder} onReturn={() => { setCheckoutStep(null); setCartOpen(true); }} onReset={() => { setCheckoutStep(null); setCartOpen(false); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {announcement && (
          <motion.div initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: 8 }} role="status" className="liquid-glass fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 rounded-full px-4 py-3 text-center text-xs text-white shadow-2xl">
            {announcement}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}

type ProductDialogProps = {
  product: Product;
  stock: number;
  variant: string;
  onVariantChange: (variant: string) => void;
  onAdd: () => void;
  onClose: () => void;
};

function ProductDialog({ product, stock, variant, onVariantChange, onAdd, onClose }: ProductDialogProps) {
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.div role="dialog" aria-modal="true" aria-labelledby="product-title" initial={{ opacity: 0, y: 22, scale: 0.985, filter: 'blur(12px)' }} animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, y: 14, scale: 0.985 }} transition={{ duration: 0.35, ease: easeOut }} className="liquid-glass-strong overlay-scroll relative grid max-h-[min(88vh,780px)] w-full max-w-4xl grid-cols-1 overflow-y-auto rounded-[1.5rem] md:grid-cols-2">
        <button type="button" onClick={onClose} aria-label="Tutup detail produk" className="liquid-glass absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full"><Icon name="close" size={18} /></button>
        <div className="product-photo relative min-h-[280px] md:min-h-[540px]">
          <img src={product.image} alt={product.imageAlt} className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute bottom-4 left-4 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[9px] tracking-[.14em] text-white/85 backdrop-blur-md">TELUR PILIHAN</span>
        </div>
        <div className="flex flex-col justify-center p-6 sm:p-8 md:p-10">
          <p className="text-[10px] tracking-[.15em] text-white/55">{product.code} · {product.category.toUpperCase()}</p>
          <h2 id="product-title" className="mt-3 font-heading text-4xl italic leading-[.92] tracking-tight sm:text-5xl">{product.name}</h2>
          <p className="mt-4 text-base text-white/85">{formatPrice(product.price)}</p>
          <p className={`mt-2 text-xs ${stock > 0 ? 'text-emerald-200/80' : 'text-amber-100/75'}`}>{stock > 0 ? `Tersedia ${new Intl.NumberFormat('id-ID').format(stock)} butir` : 'Stok habis'}</p>
          <p className="mt-5 text-sm font-light leading-relaxed text-white/70">{product.description}</p>
          <div className="mt-7">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs text-white/75" htmlFor="sample-variant">Pilihan produk</label>
              <span className="text-[10px] tracking-[.12em] text-white/45">PILIHAN</span>
            </div>
            <select id="sample-variant" value={variant} onChange={(event) => onVariantChange(event.target.value)} className="w-full appearance-none rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/50">
              {product.variants.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <button type="button" onClick={onAdd} disabled={stock < 1} className="liquid-glass-strong mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-medium transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40">
            Tambahkan ke keranjang <Icon name="arrow-up-right" size={16} />
          </button>
          <a href={product.shopeeUrl} target="_blank" rel="noreferrer" className="liquid-glass mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-medium transition-colors hover:bg-white/10">Lihat produk di Shopee <Icon name="arrow-up-right" size={16} /></a>
          <p className="mt-3 text-center text-[10px] leading-relaxed text-white/45">Keranjang toko ini belum meneruskan pilihan ke checkout Shopee.</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

type CartDrawerProps = {
  lines: (CartLine & { product: Product })[];
  subtotal: number;
  onClose: () => void;
  onUpdate: (productId: string, variant: string, change: number) => void;
  onRemove: (productId: string, variant: string) => void;
  onCheckout: () => void;
  onShop: () => void;
};

function CartDrawer({ lines, subtotal, onClose, onUpdate, onRemove, onCheckout, onShop }: CartDrawerProps) {
  return (
    <motion.div className="fixed inset-0 z-[90] flex justify-end bg-black/65 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.aside role="dialog" aria-modal="true" aria-labelledby="bag-title" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.38, ease: easeOut }} className="liquid-glass-strong overlay-scroll flex h-full w-full max-w-[500px] flex-col overflow-y-auto border-l border-white/10 px-5 pb-5 pt-5 sm:px-7">
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div><p className="text-[10px] tracking-[.15em] text-white/55">RINGKASAN PESANAN</p><h2 id="bag-title" className="mt-1 font-heading text-3xl italic">Keranjang <span className="font-body text-sm not-italic text-white/55">({lines.reduce((count, line) => count + line.quantity, 0)})</span></h2></div>
          <button type="button" onClick={onClose} aria-label="Tutup keranjang" className="liquid-glass flex h-10 w-10 items-center justify-center rounded-full"><Icon name="close" size={18} /></button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
            <span className="liquid-glass flex h-16 w-16 items-center justify-center rounded-full text-white/75"><Icon name="bag" size={24} /></span>
            <h3 className="mt-5 font-heading text-3xl italic">Keranjangmu masih kosong.</h3>
            <p className="mt-2 max-w-xs text-sm font-light leading-relaxed text-white/60">Lihat pilihan telur untuk mulai berbelanja.</p>
            <button type="button" onClick={onShop} className="liquid-glass mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm">Lihat pilihan telur <Icon name="arrow-right" size={16} /></button>
          </div>
        ) : (
          <>
            <div className="overlay-scroll flex-1 space-y-5 overflow-y-auto py-5">
              {lines.map(({ product, variant, quantity }) => (
                <div key={`${product.id}-${variant}`} className="flex gap-4">
                  <div className="product-photo h-[118px] w-[92px] shrink-0 rounded-xl"><img src={product.image} alt={product.imageAlt} loading="lazy" /></div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                    <div className="flex justify-between gap-3"><div><p className="text-[9px] tracking-[.12em] text-white/50">{product.code} </p><p className="mt-1 font-heading text-xl italic leading-none">{product.name}</p><p className="mt-1 text-[11px] text-white/60">Varian: {variant}</p></div><span className="whitespace-nowrap text-xs text-white/80">{formatPrice(product.price * quantity)}</span></div>
                    <div className="flex items-center justify-between">
                      <div className="liquid-glass flex items-center rounded-full">
                        <button type="button" onClick={() => onUpdate(product.id, variant, -1)} aria-label={`Kurangi jumlah ${product.name}`} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"><Icon name="minus" size={14} /></button>
                        <span className="w-6 text-center text-xs" aria-live="polite">{quantity}</span>
                        <button type="button" onClick={() => onUpdate(product.id, variant, 1)} aria-label={`Tambah jumlah ${product.name}`} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"><Icon name="plus" size={14} /></button>
                      </div>
                      <button type="button" onClick={() => onRemove(product.id, variant)} className="inline-flex items-center gap-1.5 text-[10px] text-white/55 transition-colors hover:text-white"><Icon name="trash" size={13} /> Hapus</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 pt-5">
              <div className="flex items-center justify-between text-sm"><span className="text-white/65">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <p className="mt-2 text-[10px] leading-relaxed text-white/45">Subtotal ini hanya ringkasan. Checkout dan pembayaran dilakukan di Shopee.</p>
              <button type="button" onClick={onCheckout} className="liquid-glass-strong mt-5 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-medium">Buka etalase Shopee <Icon name="arrow-up-right" size={16} /></button>
            </div>
          </>
        )}
      </motion.aside>
    </motion.div>
  );
}

type CheckoutDialogProps = {
  step: Exclude<CheckoutStep, null>;
  lines: (CartLine & { product: Product })[];
  subtotal: number;
  onClose: () => void;
  onComplete: () => void;
  onReturn: () => void;
  onReset: () => void;
};

function CheckoutDialog({ step, lines, subtotal, onClose, onComplete, onReturn, onReset }: CheckoutDialogProps) {
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.div role="dialog" aria-modal="true" aria-labelledby="checkout-title" initial={{ opacity: 0, y: 18, scale: 0.985, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, y: 12, scale: 0.985 }} transition={{ duration: 0.32, ease: easeOut }} className="liquid-glass-strong overlay-scroll relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-[1.5rem] p-6 sm:p-9">
        <button type="button" onClick={onClose} aria-label="Tutup ringkasan pesanan" className="liquid-glass absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full"><Icon name="close" size={18} /></button>
        {step === 'complete' ? (
          <div className="py-4 text-center">
            <span className="liquid-glass mx-auto flex h-16 w-16 items-center justify-center rounded-full"><Icon name="check" size={26} /></span>
            <p className="mt-6 text-[10px] tracking-[.16em] text-white/55">PESANAN</p>
            <h2 id="checkout-title" className="mt-3 font-heading text-4xl italic leading-[.92]">Pesanan<br />disiapkan.</h2>
            <p className="mx-auto mt-4 max-w-sm text-sm font-light leading-relaxed text-white/65">Periksa kembali pilihanmu sebelum melanjutkan ke toko Shopee Butir Pagi.</p>
            <button type="button" onClick={onReset} className="liquid-glass-strong mt-7 rounded-full px-6 py-3 text-sm">Kembali ke pilihan telur</button>
          </div>
        ) : (
          <>
            <p className="pr-12 text-[10px] tracking-[.16em] text-white/55">RINGKASAN PESANAN</p>
            <h2 id="checkout-title" className="mt-3 font-heading text-4xl italic leading-[.92]">Tinjau keranjang.</h2>
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[.025] p-4">
              <p className="text-sm font-medium">Pemesanan Shopee</p>
              <p className="mt-1.5 text-xs font-light leading-relaxed text-white/65">Pesanan, pembayaran, dan pengiriman diproses melalui etalase Shopee Butir Pagi.</p>
            </div>
            {lines.length > 0 ? (
              <div className="overlay-scroll mt-5 max-h-48 space-y-3 overflow-y-auto pr-1">
                {lines.map(({ product, variant, quantity }) => (
                  <div key={`${product.id}-${variant}`} className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 text-sm">
                    <span className="min-w-0 truncate text-white/75">{product.name} <span className="text-white/40">· {variant} × {quantity}</span></span>
                    <span className="shrink-0">{formatPrice(product.price * quantity)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="mt-5 text-sm text-white/55">Keranjangmu kosong.</p>}
            <div className="mt-4 flex justify-between border-t border-white/10 pt-4 text-sm"><span className="text-white/65">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="mt-6 flex flex-col gap-2.5">
              {lines.length > 0 && <button type="button" onClick={onComplete} className="liquid-glass-strong inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-medium">Selesai <Icon name="check" size={16} /></button>}
              <button type="button" onClick={onReturn} className="rounded-full border border-white/15 px-5 py-3 text-sm text-white/80 transition-colors hover:bg-white/[.05]">Kembali ke keranjang</button>
            </div>
            <p className="mt-4 text-center text-[10px] text-white/40">Tidak diminta data kartu atau informasi pribadi.</p>
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




