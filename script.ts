import { prisma } from "./lib/prisma";

async function main() {
  const user = await prisma.user.create({
    data: {
      fullName: "Test User",
      email: "test@example.com",
      passwordHash: "not-a-real-hash",
    },
  });
  console.log("Created:", user);
  console.log("Total users:", await prisma.user.count());
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());