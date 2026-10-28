import "dotenv/config";
import { randomBytes } from "crypto";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

const username = "user";
const password = randomBytes(12).toString("base64url");

async function main() {
  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (existing) {
    await prisma.user.update({
      where: { username },
      data: {
        passwordHash: hashPassword(password),
        role: "USER",
      },
    });
    console.log("Updated existing field user password.");
  } else {
    await prisma.user.create({
      data: {
        name: "Field user",
        username,
        passwordHash: hashPassword(password),
        role: "USER",
      },
    });
    console.log("Created field user.");
  }

  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
  console.log("Sign in at /login");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
