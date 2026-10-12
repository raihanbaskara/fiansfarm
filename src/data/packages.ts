export interface EggPackage {
  id: string;
  name: string;
  count: number;
  price: number;
  badge?: string;
  description: string;
  idealFor: string;
}

export const eggPackages: EggPackage[] = [
  {
    id: 'pack-10',
    name: 'Kotak Segar 10 Butir',
    count: 10,
    price: 25000,
    badge: 'Praktis Harian',
    description: 'Kemasan karton bersekat ramah lingkungan. Melindungi telur dari benturan saat pengiriman.',
    idealFor: 'Kebutuhan konsumsi mingguan keluarga kecil.',
  },
  {
    id: 'tray-30',
    name: 'Tray Keluarga 30 Butir',
    count: 30,
    price: 75000,
    badge: 'Paling Hemat',
    description: 'Satu tray karton kokoh isi 30 butir. Siap simpan di rak dapur atau chiller kulkas.',
    idealFor: 'Keluarga rutin, penikmat jamu, dan menu telur setengah matang.',
  },
];

export const quickEggCounts = [1, 5, 10, 15, 30] as const;
