const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Querying database sales...");
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      items: true
    }
  });
  console.log(`Found ${sales.length} sales:`);
  for (const s of sales) {
    console.log(`ID: ${s.id}, Total: ${s.total}, Type: ${s.type}, CreatedAt: ${s.createdAt.toISOString()}`);
  }
}

main();
