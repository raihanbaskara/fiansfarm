export type ProductCategory = 'Semua telur' | 'Ayam negeri' | 'Ayam kampung' | 'Bebek' | 'Puyuh';

export interface Product {
  id: string;
  name: string;
  category: Exclude<ProductCategory, 'Semua telur'>;
  code: string;
  price: number;
  image: string;
  imageAlt: string;
  description: string;
  variants: string[];
  shopeeUrl: string;
}

const shopeeShopUrl = 'https://shopee.co.id/shop/47713769';

export const productCategories: ProductCategory[] = ['Semua telur', 'Ayam negeri', 'Ayam kampung', 'Bebek', 'Puyuh'];

export const products: Product[] = [
  {
    id: 'telur-ayam-negeri',
    name: 'Telur Ayam Negeri',
    category: 'Ayam negeri',
    code: 'AYAM 01',
    price: 28000,
    image: '/images/products/ayam-negeri.webp',
    imageAlt: 'Foto telur ayam negeri bercangkang cokelat dalam karton',
    description: 'Telur ayam untuk stok dapur dan kebutuhan memasak sehari-hari.',
    variants: ['Cangkang cokelat', 'Cangkang putih'],
    shopeeUrl: shopeeShopUrl,
  },
  {
    id: 'telur-ayam-kampung',
    name: 'Telur Ayam Kampung',
    category: 'Ayam kampung',
    code: 'AYAM 02',
    price: 35000,
    image: '/images/products/ayam-kampung.webp',
    imageAlt: 'Foto telur ayam kampung berwarna krem dan cokelat dalam karton',
    description: 'Telur ayam kampung dengan karakter rasa yang khas untuk berbagai hidangan.',
    variants: ['Warna krem', 'Campur warna'],
    shopeeUrl: 'https://id.shp.ee/stj6wri7',
  },
  {
    id: 'telur-bebek',
    name: 'Telur Bebek',
    category: 'Bebek',
    code: 'BEBEK 03',
    price: 32000,
    image: '/images/products/bebek.webp',
    imageAlt: 'Foto telur bebek berwarna gading dalam karton',
    description: 'Telur bebek dengan ukuran lebih besar, cocok untuk aneka olahan.',
    variants: ['Kemasan kecil', 'Kemasan besar'],
    shopeeUrl: shopeeShopUrl,
  },
  {
    id: 'telur-puyuh',
    name: 'Telur Puyuh',
    category: 'Puyuh',
    code: 'PUYUH 04',
    price: 22000,
    image: '/images/products/puyuh.webp',
    imageAlt: 'Foto telur puyuh kecil bercorak bintik dalam karton',
    description: 'Telur puyuh bercorak khas, praktis untuk lauk dan camilan.',
    variants: ['Bintik halus', 'Bintik kontras'],
    shopeeUrl: shopeeShopUrl,
  },
];




