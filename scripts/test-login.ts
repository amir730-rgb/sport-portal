import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const adapter = new PrismaBetterSqlite3({ url: `file:${path.resolve("./dev.db")}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "amir730@gmail.com";
  const password = "Amir1234!";

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true, password: true },
  });

  if (!user) { console.log("❌ משתמש לא נמצא"); return; }
  console.log(`✅ משתמש נמצא: ${user.name} (${user.role})`);

  if (!user.password) { console.log("❌ אין סיסמה שמורה"); return; }

  const match = await bcrypt.compare(password, user.password);
  console.log(`🔐 בדיקת סיסמה "${password}": ${match ? "✅ נכונה" : "❌ שגויה"}`);

  if (!match) {
    // Try to show what hash is stored
    console.log(`   hash שמור: ${user.password.substring(0, 20)}...`);
  }
}

main().finally(() => prisma.$disconnect());
