export type ProductCategory = 'Ayam kampung';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  code: string;
  price: number;
  image: string;
  imageAlt: string;
  description: string;
  variants: string[];
  shopeeUrl: string;
}

export const products: Product[] = [
  {
    id: 'telur-ayam-kampung',
    name: 'Telur Ayam Kampung',
    category: 'Ayam kampung',
    code: 'AYAM KAMPUNG 01',
    price: 2500,
    image: '/images/products/bebek.webp',
    imageAlt: 'Foto representatif telur ayam kampung dalam kemasan.',
    description: 'Satu jenis produk, dengan harga Rp2.500 per butir. Stok, pengemasan, dan ongkir dikonfirmasi saat pemesanan.',
    variants: ['Per butir'],
    shopeeUrl: 'https://id.shp.ee/stj6wri7',
  },
];
