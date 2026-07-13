const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'sanjaiprakash075@gmail.com';
  console.log(`🚀 Upgrading user: ${email} to THREE_PLUS plan...`);

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  const updatedUser = await prisma.user.update({
    where: { email },
    data: {
      subscriptionPlan: 'THREE_PLUS',
      subscriptionEnds: oneYearFromNow,
    },
  });

  console.log(`✅ Upgraded successfully!`);
  console.log(`Plan: ${updatedUser.subscriptionPlan}`);
  console.log(`Ends At: ${updatedUser.subscriptionEnds.toISOString()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
