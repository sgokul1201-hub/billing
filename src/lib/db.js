import Dexie from 'dexie';

export const db = new Dexie('InvoiceTrackerDB');

// Define database schema with migrations
db.version(2).stores({
  shop: 'id', // Shop details & configuration (id: 1)
  sales: '++id, invoiceNumber, date, timestamp, customerName, customerPhone, grandTotal', // Billing history
  items: '++id, name, price, taxPercent', // Inventory list
  expenses: '++id, category, amount, date, timestamp' // Operational expenses ledger
});

// Helper functions for seeding/defaults
export async function initDefaultItems() {
  const count = await db.items.count();
  if (count === 0) {
    await db.items.bulkAdd([
      { name: 'Standard Service', price: 100, taxPercent: 18 },
      { name: 'Consulting Fee', price: 150, taxPercent: 18 },
      { name: 'Product A', price: 50, taxPercent: 12 },
      { name: 'Product B', price: 200, taxPercent: 5 },
    ]);
  }
}
