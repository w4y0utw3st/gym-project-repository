import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config(); // also loads .env

import { readFile } from "node:fs/promises";
import { put } from "@vercel/blob";
import { prisma } from "./lib/prisma";

async function main() {
  const [, , email, filePath] = process.argv;
  if (!email || !filePath) {
    throw new Error("Usage: npx tsx upload-test.ts <email> <path-to-image>");
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const file = await readFile(filePath);

  const blob = await put(`avatars/${user.id}.jpg`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: "image/jpeg",
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { profilePicUrl: blob.url },
  });

  console.log("Uploaded:", blob.url);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());