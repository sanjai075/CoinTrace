const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== USERS ===");
  const users = await prisma.user.findMany();
  for (const u of users) {
    console.log(`User: ${u.email} (ID: ${u.id})`);
    console.log(`  Role: ${u.role}`);
    console.log(`  Plan: ${u.subscriptionPlan}`);
    console.log(`  Subscription Ends: ${u.subscriptionEnds}`);
    console.log(`  Trial Ends: ${u.trialEndsAt}`);
  }

  console.log("=== SHOPS ===");
  const shops = await prisma.shop.findMany();
  for (const s of shops) {
    console.log(`Shop: ${s.name} (ID: ${s.id})`);
    console.log(`  Owner ID: ${s.ownerId}`);
  }
}

main();
