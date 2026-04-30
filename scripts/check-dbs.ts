import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

async function checkDb(label: string, dbPath: string) {
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  const p = new PrismaClient({ adapter });
  try {
    const u = await p.user.findUnique({
      where: { email: "amir730@gmail.com" },
      select: { name: true, role: true, password: true },
    });
    if (!u) { console.log(`${label}: ❌ משתמש לא נמצא`); return; }
    const match = u.password ? await bcrypt.compare("Amir1234!", u.password) : false;
    console.log(`${label}: ✅ נמצא - ${u.name} (${u.role}) | סיסמה: ${match ? "✅" : "❌"}`);
  } catch (e: any) {
    console.log(`${label}: ⚠️ שגיאה - ${e.message}`);
  } finally {
    await p.$disconnect();
  }
}

async function main() {
  await checkDb("ROOT/dev.db      ", path.resolve("./dev.db"));
  await checkDb("prisma/dev.db    ", path.resolve("./prisma/dev.db"));
}
main();
