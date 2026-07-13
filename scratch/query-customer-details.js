const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Querying database customer & transactions...");
  const customer = await prisma.customer.findFirst({
    where: { name: { contains: 'ramesh', mode: 'insensitive' } },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!customer) {
    console.log("Customer not found.");
    return;
  }

  console.log(`Customer: ${customer.name}`);
  console.log(`Running Balance in DB: ${customer.runningBalance}`);
  console.log("Transactions:");
  for (const t of customer.transactions) {
    console.log(`- Type: ${t.type}, Amount: ${t.amount}, CreatedAt: ${t.createdAt.toISOString()}`);
  }
}

main();
