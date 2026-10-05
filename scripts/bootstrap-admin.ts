import "dotenv/config";
import { randomBytes } from "crypto";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

const username = "admin";
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
        role: "ADMIN",
      },
    });
    console.log("Updated existing admin password.");
  } else {
    await prisma.user.create({
      data: {
        name: "Admin",
        username,
        passwordHash: hashPassword(password),
        role: "ADMIN",
      },
    });
    console.log("Created admin user.");
  }

  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
  console.log("Sign in at /admin/login");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
