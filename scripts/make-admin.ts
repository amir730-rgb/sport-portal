import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const adapter = new PrismaBetterSqlite3({ url: `file:${path.resolve("./dev.db")}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.update({
    where: { id: "cmol912ol00004gflsokm0wmb" },
    data: { role: "admin" },
    select: { name: true, email: true, role: true },
  });
  console.log("✅ עודכן:", user);
}

main().finally(() => prisma.$disconnect());
