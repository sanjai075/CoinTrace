const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'sanjaiprakash075@gmail.com';
  console.log(`📉 Downgrading user: ${email} to FREE (trial) plan...`);

  const updatedUser = await prisma.user.update({
    where: { email },
    data: {
      subscriptionPlan: 'FREE',
      subscriptionEnds: null,
    },
  });

  console.log(`✅ Downgraded successfully!`);
  console.log(`Plan: ${updatedUser.subscriptionPlan}`);
  console.log(`Subscription Ends: ${updatedUser.subscriptionEnds}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
