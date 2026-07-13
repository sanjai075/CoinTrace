const { PrismaClient } = require('@prisma/client');

// Use direct (non-pooled) URL to test
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_qS6ocbZiJf8H@ep-divine-butterfly-ad1p5r0q.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
});

async function main() {
  console.log("Testing DIRECT database connection...");
  try {
    const users = await prisma.user.findMany();
    console.log("Database connection successful! Users count:", users.length);
  } catch (err) {
    console.error("Database connection failed:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
