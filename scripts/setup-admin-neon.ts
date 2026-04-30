import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const dbUrl = process.env.DATABASE_URL ?? "";
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "amir730@gmail.com";
  const name = "אמיר גולן";
  const password = "Amir1234!";
  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashed, role: "admin", name },
    create: {
      email,
      name,
      password: hashed,
      role: "admin",
      position: "any",
      skillLevel: 3,
    },
  });

  console.log(`✅ Admin user ready: ${user.email} (${user.role})`);
  console.log(`   Password: ${password}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
