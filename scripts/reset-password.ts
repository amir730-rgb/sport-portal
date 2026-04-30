import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const adapter = new PrismaBetterSqlite3({ url: `file:${path.resolve("./dev.db")}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const newPassword = "Amir1234!";
  const hashed = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { email: "amir730@gmail.com" },
    data: { password: hashed },
  });

  console.log("✅ סיסמה אופסה בהצלחה");
  console.log(`   אימייל: amir730@gmail.com`);
  console.log(`   סיסמה חדשה: ${newPassword}`);
  console.log("\n⚠️  שנה את הסיסמה בפרופיל שלך אחרי הכניסה!");
}

main().finally(() => prisma.$disconnect());
