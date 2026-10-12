import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '../components/Icon';
import { products } from '../data/products';
import { inventoryStorageKey, inventoryUpdateEvent, readInventory } from '../data/inventory';

type Section = 'ringkasan' | 'stok' | 'aktivitas' | 'perangkat';
type Source = 'sensor' | 'shopee' | 'manual';
type Movement = {
  id: string;
  productId: string;
  delta: number;
  source: Source;
  note: string;
  createdAt: string;
};

const activityKey = 'butir-pagi-admin-activity-v2';

const sections: { id: Section; label: string; icon: 'grid' | 'boxes' | 'history' | 'wifi' }[] = [
  { id: 'ringkasan', label: 'Ringkasan', icon: 'grid' },
  { id: 'stok', label: 'Kelola stok', icon: 'boxes' },
  { id: 'aktivitas', label: 'Aktivitas', icon: 'history' },
  { id: 'perangkat', label: 'Perangkat IoT', icon: 'wifi' },
];

function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function formatCount(value: number) {
  return new Intl.NumberFormat('id-ID').format(value);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function sourceLabel(source: Source) {
  if (source === 'sensor') return 'Sensor IR';
  if (source === 'shopee') return 'Penjualan Shopee';
  return 'Penyesuaian manual';
}

function AdminDashboard() {
  const [section, setSection] = useState<Section>('ringkasan');
  const [stocks, setStocks] = useState<Record<string, number>>(() => readInventory());
  const [movements, setMovements] = useState<Movement[]>(() => readLocal(activityKey, []));
  const [saleProduct, setSaleProduct] = useState(products[0]?.id ?? '');
  const [saleQuantity, setSaleQuantity] = useState('1');
  const [notice, setNotice] = useState('');
  const [activityFilter, setActivityFilter] = useState<'semua' | Source>('semua');

  useEffect(() => {
    localStorage.setItem(inventoryStorageKey, JSON.stringify(stocks));
    window.dispatchEvent(new Event(inventoryUpdateEvent));
  }, [stocks]);

  useEffect(() => {
    localStorage.setItem(activityKey, JSON.stringify(movements));
  }, [movements]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const totalStock = products.reduce((total, product) => total + (stocks[product.id] ?? 0), 0);
  const todayMovements = movements.filter((item) => new Date(item.createdAt).toDateString() === new Date().toDateString());
  const countedToday = todayMovements.filter((item) => item.source === 'sensor').reduce((total, item) => total + item.delta, 0);
  const soldToday = todayMovements.filter((item) => item.source === 'shopee').reduce((total, item) => total + Math.abs(item.delta), 0);
  const lowStockCount = products.filter((product) => (stocks[product.id] ?? 0) <= 25).length;
  const recentMovements = movements.slice(0, 5);
  const filteredMovements = useMemo(
    () => activityFilter === 'semua' ? movements : movements.filter((item) => item.source === activityFilter),
    [activityFilter, movements],
  );

  const recordChange = (productId: string, delta: number, source: Source, note: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product || !Number.isInteger(delta) || delta === 0) return false;
    const current = stocks[productId] ?? 0;
    if (current + delta < 0) {
      setNotice('Stok tidak cukup untuk mencatat pengurangan ini.');
      return false;
    }

    const movement: Movement = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId,
      delta,
      source,
      note,
      createdAt: new Date().toISOString(),
    };
    setStocks((currentStocks) => ({ ...currentStocks, [productId]: current + delta }));
    setMovements((currentMovements) => [movement, ...currentMovements].slice(0, 50));
    setNotice(`${product.name}: stok ${delta > 0 ? 'bertambah' : 'berkurang'} ${formatCount(Math.abs(delta))} butir.`);
    return true;
  };

  const recordShopeeSale = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = Number(saleQuantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setNotice('Masukkan jumlah butir lebih dari nol.');
      return;
    }
    if (recordChange(saleProduct, -quantity, 'shopee', `Pesanan Shopee · ${quantity} butir`)) setSaleQuantity('1');
  };

  const navButtons = (mobile = false) => sections.map((item) => (
    <button
      key={item.id}
      type="button"
      onClick={() => setSection(item.id)}
      aria-current={section === item.id ? 'page' : undefined}
      className={`group flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm transition-colors ${section === item.id ? 'bg-white/[.1] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]' : 'text-white/60 hover:bg-white/[.06] hover:text-white'} ${mobile ? 'min-w-max' : 'w-full'}`}
    >
      <Icon name={item.icon} size={18} className={section === item.id ? 'text-white' : 'text-white/50 group-hover:text-white/85'} />
      {item.label}
      {item.id === 'perangkat' && <span className="ml-auto h-2 w-2 rounded-full bg-amber-300" aria-label="Belum terhubung" />}
    </button>
  ));

  return (
    <div data-theme="dark" className="admin-shell app-shell min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1760px]">
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-white/[.08] px-5 py-6 lg:flex">
          <a href="/" className="flex items-center gap-3 px-2 text-white" aria-label="Kembali ke Butir Pagi">
            <span className="liquid-glass flex h-11 w-11 items-center justify-center rounded-full"><Icon name="egg" size={21} /></span>
            <span><span className="block font-heading text-2xl italic leading-none">Butir Pagi</span><span className="mt-1 block text-[9px] tracking-[.18em] text-white/45">PANEL TOKO</span></span>
          </a>

          <p className="mb-3 mt-12 px-3 text-[9px] font-medium tracking-[.18em] text-white/35">MENU UTAMA</p>
          <nav aria-label="Navigasi admin" className="flex flex-col gap-1.5">{navButtons()}</nav>

          <div className="liquid-glass mt-auto rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs"><span className="h-2 w-2 rounded-full bg-amber-300" /><span className="text-white/85">Sensor belum tersambung</span></div>
            <p className="mt-2 text-[10px] leading-relaxed text-white/55">Perubahan tersimpan di browser ini. Login admin dan sinkronisasi server belum aktif.</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-white/[.08] bg-[#050706]/75 px-4 py-3 backdrop-blur-2xl sm:px-6 lg:px-10">
            <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3 lg:hidden">
                <span className="liquid-glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full"><Icon name="egg" size={19} /></span>
                <span className="font-heading text-xl italic">Butir Pagi <span className="font-body text-[10px] not-italic tracking-[.12em] text-white/45">ADMIN</span></span>
              </div>
              <div className="hidden text-xs text-white/45 lg:block">Butir Pagi <span className="px-1.5 text-white/25">/</span> Admin <span className="px-1.5 text-white/25">/</span> <span className="text-white/80">{sections.find((item) => item.id === section)?.label}</span></div>
              <div className="ml-auto flex items-center gap-2">
                <span className="hidden rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-[10px] tracking-[.08em] text-white/65 sm:inline-flex">DATA LOKAL</span>
                <a href="/" className="liquid-glass inline-flex items-center gap-2 rounded-full px-3.5 py-2.5 text-xs text-white/85 transition-colors hover:bg-white/10"><Icon name="arrow-left" size={15} /> <span className="hidden sm:inline">Lihat etalase</span><span className="sm:hidden">Etalase</span></a>
              </div>
            </div>
            <nav aria-label="Navigasi admin seluler" className="mx-auto mt-3 flex max-w-[1480px] gap-1 overflow-x-auto pb-0.5 lg:hidden">{navButtons(true)}</nav>
          </header>

          <main className="mx-auto max-w-[1480px] px-4 pb-12 pt-7 sm:px-6 sm:pt-9 lg:px-10">
            <div className="mb-7 flex flex-col gap-3 sm:mb-8 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
              <div>
                <p className="mb-2 flex items-center gap-2 text-[10px] tracking-[.16em] text-white/55"><span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> BUTIR PAGI <span className="text-white/25">/</span> OPERASIONAL</p>
                <h1 className="font-heading text-4xl italic leading-none sm:text-5xl">{sections.find((item) => item.id === section)?.label}</h1>
                <p className="mt-2 max-w-xl text-sm font-light text-white/55">Pantau persediaan telur per butir dan catat perubahan stok tokomu.</p>
              </div>
              <p className="text-xs text-white/45">Stok dan aktivitas tersimpan di perangkat ini</p>
            </div>

            {section === 'ringkasan' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
                  <MetricCard label="Stok tersedia" value={formatCount(totalStock)} unit="butir" icon="boxes" detail="Jumlah semua jenis telur" />
                  <MetricCard label="Masuk dari sensor hari ini" value={formatCount(countedToday)} unit="butir" icon="activity" detail="Menunggu koneksi perangkat" />
                  <MetricCard label="Penjualan Shopee hari ini" value={formatCount(soldToday)} unit="butir" icon="bag" detail="Dicatat manual oleh admin" />
                  <MetricCard label="Stok perlu dicek" value={formatCount(lowStockCount)} unit="produk" icon="sparkle" detail="Batas rendah: 25 butir" />
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.8fr)]">
                  <section className="liquid-glass-strong rounded-[1.35rem] p-4 sm:p-6" aria-labelledby="inventory-summary-heading">
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div><h2 id="inventory-summary-heading" className="font-heading text-2xl italic">Persediaan telur</h2><p className="mt-1 text-xs text-white/45">Stok yang dapat dijual, dihitung per butir.</p></div>
                      <button type="button" onClick={() => setSection('stok')} className="rounded-full border border-white/10 px-3 py-2 text-[11px] text-white/70 transition-colors hover:bg-white/[.06]">Kelola stok</button>
                    </div>
                    <InventoryTable stocks={stocks} onChange={recordChange} compact />
                  </section>

                  <div className="space-y-5">
                    <section className="liquid-glass-strong rounded-[1.35rem] p-5 sm:p-6" aria-labelledby="device-summary-heading">
                      <div className="flex items-start justify-between gap-3">
                        <div><p className="text-[9px] tracking-[.16em] text-white/40">CONVEYOR · SENSOR IR</p><h2 id="device-summary-heading" className="mt-1 font-heading text-2xl italic">Perangkat IoT</h2></div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/15 bg-amber-200/[.07] px-2.5 py-1.5 text-[10px] text-amber-100/80"><span className="h-1.5 w-1.5 rounded-full bg-amber-300" />Belum terhubung</span>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-white/55">Saat perangkat terhubung, satu telur yang terdeteksi akan menambah stok satu butir.</p>
                      <button type="button" onClick={() => setSection('perangkat')} className="mt-4 inline-flex items-center gap-2 text-xs text-white/75 transition-colors hover:text-white">Lihat status perangkat <Icon name="arrow-right" size={14} /></button>
                    </section>

                    <section className="liquid-glass-strong rounded-[1.35rem] p-5 sm:p-6" aria-labelledby="recent-activity-heading">
                      <div className="mb-4 flex items-center justify-between gap-3"><div><h2 id="recent-activity-heading" className="font-heading text-2xl italic">Aktivitas terbaru</h2><p className="mt-1 text-xs text-white/45">Perubahan stok terakhir.</p></div><button type="button" onClick={() => setSection('aktivitas')} className="text-[11px] text-white/60 hover:text-white">Semua</button></div>
                      <ActivityList movements={recentMovements} emptyMessage="Belum ada perubahan stok. Penyesuaian dan penjualan yang dicatat akan muncul di sini." />
                    </section>
                  </div>
                </div>
              </div>
            )}

            {section === 'stok' && (
              <div className="space-y-5">
                <section className="liquid-glass-strong rounded-[1.35rem] p-4 sm:p-6" aria-labelledby="inventory-heading">
                  <div className="mb-5"><h2 id="inventory-heading" className="font-heading text-2xl italic">Stok per produk</h2><p className="mt-1 text-xs text-white/45">Gunakan tombol untuk penyesuaian satu butir. Setiap perubahan masuk ke riwayat.</p></div>
                  <InventoryTable stocks={stocks} onChange={recordChange} />
                </section>

                <section className="liquid-glass-strong rounded-[1.35rem] p-4 sm:p-6" aria-labelledby="shopee-sale-heading">
                  <div className="mb-5 flex items-start gap-3"><span className="liquid-glass flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"><Icon name="bag" size={19} /></span><div><h2 id="shopee-sale-heading" className="font-heading text-2xl italic">Catat penjualan Shopee</h2><p className="mt-1 text-xs leading-relaxed text-white/50">Kurangi stok website setelah pesanan Shopee terkonfirmasi. Ini belum tersinkron otomatis.</p></div></div>
                  <form onSubmit={recordShopeeSale} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-end">
                    <label className="block text-xs text-white/65">Produk
                      <select value={saleProduct} onChange={(event) => setSaleProduct(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 text-sm text-white outline-none transition-colors focus:border-white/35">
                        {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs text-white/65">Jumlah (butir)
                      <input type="number" min="1" step="1" value={saleQuantity} onChange={(event) => setSaleQuantity(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 text-sm text-white outline-none transition-colors focus:border-white/35" />
                    </label>
                    <button type="submit" className="liquid-glass-strong inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-transform hover:-translate-y-0.5"><Icon name="check" size={16} /> Catat penjualan</button>
                  </form>
                </section>
              </div>
            )}

            {section === 'aktivitas' && (
              <section className="liquid-glass-strong rounded-[1.35rem] p-4 sm:p-6" aria-labelledby="activity-heading">
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="activity-heading" className="font-heading text-2xl italic">Riwayat perubahan stok</h2><p className="mt-1 text-xs text-white/45">Catatan tersimpan di browser ini dan belum dikirim ke server.</p></div><label className="text-xs text-white/55">Sumber
                  <select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value as 'semua' | Source)} className="ml-2 rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-white outline-none focus:border-white/35"><option value="semua">Semua aktivitas</option><option value="sensor">Sensor IR</option><option value="shopee">Penjualan Shopee</option><option value="manual">Penyesuaian manual</option></select>
                </label></div>
                <ActivityList movements={filteredMovements} emptyMessage="Belum ada aktivitas untuk filter ini. Perubahan stok akan muncul di sini." detailed />
              </section>
            )}

            {section === 'perangkat' && (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,.9fr)]">
                <section className="liquid-glass-strong rounded-[1.35rem] p-5 sm:p-7" aria-labelledby="sensor-heading">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] tracking-[.16em] text-white/40">PERANGKAT #CONVEYOR-01</p><h2 id="sensor-heading" className="mt-2 font-heading text-3xl italic">Conveyor telur</h2></div><span className="inline-flex items-center gap-2 rounded-full border border-amber-200/15 bg-amber-200/[.07] px-3 py-2 text-[10px] text-amber-100/80"><span className="h-1.5 w-1.5 rounded-full bg-amber-300" />Offline · menunggu koneksi</span></div>
                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    <DeviceInfo label="Sensor" value="IR counter" />
                    <DeviceInfo label="Pengendali" value="ESP32 · rencana" />
                    <DeviceInfo label="Koneksi" value="Wi-Fi / MQTT · rencana" />
                    <DeviceInfo label="Hitungan terakhir" value="Belum ada data" />
                  </div>
                  <div className="mt-6 rounded-xl border border-white/[.08] bg-white/[.025] p-4"><p className="text-xs font-medium text-white/80">Alur ketika perangkat siap</p><p className="mt-1.5 text-xs leading-relaxed text-white/50">Sensor mendeteksi telur → perangkat mengirim event → backend mencatat event satu kali → stok bertambah satu butir dan aktivitas tersimpan.</p></div>
                  <div className="mt-5 rounded-xl border border-amber-200/10 bg-amber-100/[.035] p-4"><p className="text-xs font-medium text-amber-100/80">Perangkat belum terhubung</p><p className="mt-1 text-xs leading-relaxed text-white/55">Hitungan telur akan masuk otomatis setelah conveyor mengirim data ke server.</p></div>
                </section>
                <section className="liquid-glass-strong rounded-[1.35rem] p-5 sm:p-7" aria-labelledby="iot-activity-heading">
                  <h2 id="iot-activity-heading" className="font-heading text-2xl italic">Event sensor terakhir</h2><p className="mt-1 text-xs text-white/45">Data hitungan yang diterima dari perangkat.</p>
                  <div className="mt-5"><ActivityList movements={movements.filter((item) => item.source === 'sensor').slice(0, 6)} emptyMessage="Belum ada event sensor yang diterima." /></div>
                </section>
              </div>
            )}
          </main>
        </div>
      </div>

      <AnimatePresence>
        {notice && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} role="status" className="liquid-glass fixed bottom-5 left-1/2 z-[100] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl px-4 py-3 text-center text-xs text-white shadow-2xl">{notice}</motion.div>}
      </AnimatePresence>
    </div>
  );
}

function MetricCard({ label, value, unit, icon, detail }: { label: string; value: string; unit: string; icon: 'boxes' | 'activity' | 'bag' | 'sparkle'; detail: string }) {
  return (
    <article className="admin-metric liquid-glass-strong flex flex-col rounded-[1.2rem] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2"><p className="max-w-[13rem] text-[11px] leading-snug text-white/65 sm:text-xs">{label}</p><span className="liquid-glass flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/80"><Icon name={icon} size={17} /></span></div>
      <p className="mt-auto pt-5 font-heading text-4xl italic leading-none sm:text-5xl">{value}<span className="ml-2 font-body text-xs not-italic text-white/55">{unit}</span></p>
      <p className="mt-2 text-[10px] text-white/50">{detail}</p>
    </article>
  );
}

function InventoryTable({ stocks, onChange, compact = false }: { stocks: Record<string, number>; onChange: (productId: string, delta: number, source: Source, note: string) => boolean; compact?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse text-left">
        <thead><tr className="border-b border-white/10 text-[9px] tracking-[.12em] text-white/40"><th className="pb-3 font-normal">PRODUK</th><th className="pb-3 font-normal">STOK</th><th className="pb-3 font-normal">STATUS</th><th className="pb-3 text-right font-normal">PENYESUAIAN MANUAL</th></tr></thead>
        <tbody>
          {products.map((product) => {
            const stock = stocks[product.id] ?? 0;
            const low = stock <= 25;
            return (
              <tr key={product.id} className="border-b border-white/[.06] last:border-0">
                <td className="py-4 pr-3"><div className="flex items-center gap-3"><span className="liquid-glass flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"><Icon name="egg" size={18} /></span><span><span className="block text-xs font-medium text-white/90">{product.name}</span><span className="mt-1 block text-[9px] tracking-[.1em] text-white/40">{product.code} · {product.category}</span></span></div></td>
                <td className="py-4 pr-3"><span className="font-heading text-2xl italic">{formatCount(stock)}</span><span className="ml-1 text-[10px] text-white/40">butir</span></td>
                <td className="py-4 pr-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[9px] ${stock === 0 ? 'bg-red-300/10 text-red-100/80' : low ? 'bg-amber-200/10 text-amber-100/80' : 'bg-emerald-200/[.08] text-emerald-100/75'}`}><span className={`h-1.5 w-1.5 rounded-full ${stock === 0 ? 'bg-red-300' : low ? 'bg-amber-300' : 'bg-emerald-300'}`} />{stock === 0 ? 'Habis' : low ? 'Stok menipis' : 'Tersedia'}</span></td>
                <td className="py-4 text-right"><div className="inline-flex items-center gap-1.5"><button type="button" aria-label={`Kurangi ${product.name} satu butir`} onClick={() => onChange(product.id, -1, 'manual', 'Penyesuaian stok manual')} className="liquid-glass flex h-10 w-10 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10"><Icon name="minus" size={14} /></button><button type="button" aria-label={`Tambah ${product.name} satu butir`} onClick={() => onChange(product.id, 1, 'manual', 'Penyesuaian stok manual')} className="liquid-glass flex h-10 w-10 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10"><Icon name="plus" size={14} /></button></div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {compact && <p className="mt-3 text-[10px] text-white/45">Tombol +/− menyesuaikan stok satu butir per langkah.</p>}
    </div>
  );
}

function ActivityList({ movements, emptyMessage, detailed = false }: { movements: Movement[]; emptyMessage: string; detailed?: boolean }) {
  if (!movements.length) return <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs leading-relaxed text-white/40">{emptyMessage}</div>;
  return (
    <ul className="divide-y divide-white/[.07]">
      {movements.map((movement) => {
        const product = products.find((item) => item.id === movement.productId);
        return <li key={movement.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${movement.delta > 0 ? 'bg-emerald-200/[.09] text-emerald-100/80' : 'bg-amber-200/[.08] text-amber-100/80'}`}><Icon name={movement.source === 'sensor' ? 'activity' : movement.source === 'shopee' ? 'bag' : 'boxes'} size={16} /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-xs text-white/85">{product?.name ?? 'Produk'} · {sourceLabel(movement.source)}</span><span className="mt-1 block truncate text-[10px] text-white/40">{movement.note}{detailed ? ` · ${formatTime(movement.createdAt)}` : ''}</span></span>
          <span className={`shrink-0 font-medium text-xs ${movement.delta > 0 ? 'text-emerald-100/80' : 'text-amber-100/80'}`}>{movement.delta > 0 ? '+' : '−'}{formatCount(Math.abs(movement.delta))} <span className="text-[9px] text-white/40">butir</span></span>
        </li>;
      })}
    </ul>
  );
}

function DeviceInfo({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/[.07] bg-white/[.025] px-4 py-3"><p className="text-[9px] tracking-[.12em] text-white/40">{label.toUpperCase()}</p><p className="mt-1.5 text-xs text-white/80">{value}</p></div>;
}

export { AdminDashboard };
export default AdminDashboard;


