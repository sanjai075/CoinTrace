const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'sanjaiprakash075@gmail.com';
  
  const updated = await prisma.user.updateMany({
    where: { email },
    data: {
      subscriptionPlan: 'THREE_PLUS',
      subscriptionEnds: new Date('2030-01-01'), // Active until 2030
      role: 'OWNER' // Ensure they have the owner role
    }
  });
  console.log(`Upgraded user ${email}: modified ${updated.count} records.`);
  
  // Print updated info
  const users = await prisma.user.findMany({ where: { email } });
  for (const u of users) {
    console.log(`User Info: ${u.email}`);
    console.log(`  Role: ${u.role}`);
    console.log(`  Plan: ${u.subscriptionPlan}`);
    console.log(`  Ends: ${u.subscriptionEnds}`);
  }
}

main().catch(console.error);
