export const inventoryStorageKey = 'butir-pagi-admin-stock-v2';
export const inventoryUpdateEvent = 'butir-pagi:inventory-updated';

export const defaultStocks: Record<string, number> = {
  'telur-ayam-kampung': 150,
};

export function readInventory(): Record<string, number> {
  try {
    const raw = localStorage.getItem(inventoryStorageKey);
    if (!raw) {
      localStorage.setItem(inventoryStorageKey, JSON.stringify(defaultStocks));
      return defaultStocks;
    }
    const parsed = JSON.parse(raw) as Record<string, number>;
    return { ...defaultStocks, ...parsed };
  } catch {
    return defaultStocks;
  }
}
