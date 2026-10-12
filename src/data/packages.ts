export interface EggPackage {
  id: string;
  name: string;
  code: string;
  count: number;
  price: number;
  image: string;
  badge?: string;
  description: string;
  idealFor: string;
}

export const eggPackages: EggPackage[] = [
  {
    id: 'pack-10',
    name: 'Kotak Segar 10 Butir',
    code: 'KAMPUNG 02 · KOTAK 10 BUTIR',
    count: 10,
    price: 25000,
    image: '/images/products/ayam-negeri.webp',
    badge: 'PILIHAN',
    description: 'Kemasan karton bersekat ramah lingkungan. Melindungi telur dari benturan saat pengiriman.',
    idealFor: 'Kebutuhan konsumsi mingguan keluarga kecil.',
  },
  {
    id: 'tray-30',
    name: 'Tray Keluarga 30 Butir',
    code: 'KAMPUNG 03 · TRAY 30 BUTIR',
    count: 30,
    price: 75000,
    image: '/images/products/puyuh.webp',
    badge: 'PILIHAN',
    description: 'Satu tray karton kokoh isi 30 butir. Siap simpan di rak dapur atau chiller kulkas.',
    idealFor: 'Keluarga rutin, penikmat jamu, dan menu telur setengah matang.',
  },
];

export const quickEggCounts = [1, 5, 10, 15, 30] as const;
