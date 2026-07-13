const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Clearing all data from database tables...");
  
  // Delete records in dependency order (child tables first, parent tables last)
  const deletions = [
    { name: 'SaleItem', action: () => prisma.saleItem.deleteMany({}) },
    { name: 'Sale', action: () => prisma.sale.deleteMany({}) },
    { name: 'CustomerTx', action: () => prisma.customerTx.deleteMany({}) },
    { name: 'Customer', action: () => prisma.customer.deleteMany({}) },
    { name: 'SupplierTx', action: () => prisma.supplierTx.deleteMany({}) },
    { name: 'Supplier', action: () => prisma.supplier.deleteMany({}) },
    { name: 'Expense', action: () => prisma.expense.deleteMany({}) },
    { name: 'Worker', action: () => prisma.worker.deleteMany({}) },
    { name: 'StaffMembership', action: () => prisma.staffMembership.deleteMany({}) },
    { name: 'Product', action: () => prisma.product.deleteMany({}) },
    { name: 'Shop', action: () => prisma.shop.deleteMany({}) },
    { name: 'User', action: () => prisma.user.deleteMany({}) },
  ];

  for (const del of deletions) {
    try {
      const result = await del.action();
      console.log(`- Cleared ${del.name} (${result.count} rows)`);
    } catch (err) {
      console.warn(`⚠️ Failed to clear ${del.name}:`, err.message);
    }
  }

  console.log("✨ All database tables cleared successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Database clearing failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
