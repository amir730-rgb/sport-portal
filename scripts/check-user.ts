import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const adapter = new PrismaBetterSqlite3({ url: `file:${path.resolve("./dev.db")}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "amir730@gmail.com" },
    select: { id: true, name: true, email: true, role: true, password: true, createdAt: true },
  });

  if (!user) {
    console.log("❌ משתמש לא נמצא במסד הנתונים");
    return;
  }

  console.log("✅ משתמש נמצא:");
  console.log(`  שם: ${user.name}`);
  console.log(`  אימייל: ${user.email}`);
  console.log(`  תפקיד: ${user.role}`);
  console.log(`  יש סיסמה: ${!!user.password}`);
  console.log(`  נוצר: ${user.createdAt}`);

  if (!user.password) {
    console.log("❌ אין סיסמה שמורה! המשתמש נרשם דרך OAuth אולי?");
  }
}

main().finally(() => prisma.$disconnect());
