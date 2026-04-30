import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL ?? "";
  console.log("[seed] DATABASE_URL prefix:", dbUrl.substring(0, 20));

  if (dbUrl.startsWith("postgres")) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaPg } = require("@prisma/adapter-pg");
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path");
  const dbPath = path.resolve(process.cwd(), "./dev.db");
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@sport.local" },
    update: {},
    create: {
      name: "מנהל המשחקים",
      email: "admin@sport.local",
      password: adminPassword,
      role: "admin",
      position: "any",
      skillLevel: 3,
    },
  });

  console.log(`✅ Admin created: ${admin.email} / password: admin123`);

  // Create sample players
  const players = [
    { name: "יוסי כהן", position: "forward", skillLevel: 4 },
    { name: "מיכאל לוי", position: "midfielder", skillLevel: 3 },
    { name: "דוד ישראלי", position: "defender", skillLevel: 4 },
    { name: "אמיר ברק", position: "goalkeeper", skillLevel: 5 },
    { name: "רון אבי", position: "midfielder", skillLevel: 3 },
    { name: "נתן גל", position: "forward", skillLevel: 2 },
    { name: "אריאל שמש", position: "defender", skillLevel: 4 },
    { name: "ירון מלכה", position: "midfielder", skillLevel: 3 },
  ];

  for (const p of players) {
    const pw = await bcrypt.hash("player123", 12);
    const emailBase = p.name.replace(/\s/g, "").toLowerCase();
    // Remove Hebrew chars for email
    const emailEn = emailBase.replace(/[^\x00-\x7F]/g, "");
    const email = `player_${players.indexOf(p) + 1}@sport.local`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: p.name,
        email,
        password: pw,
        role: "player",
        position: p.position,
        skillLevel: p.skillLevel,
      },
    });
    console.log(`✅ Player: ${p.name} (${email} / player123)`);
  }

  // Create a sample upcoming game
  const inTwoDays = new Date();
  inTwoDays.setDate(inTwoDays.getDate() + 2);
  inTwoDays.setHours(19, 0, 0, 0);

  const existingGame = await prisma.game.findFirst({ where: { id: "sample-game-1" } });
  if (!existingGame) {
    await prisma.game.create({
      data: {
        id: "sample-game-1",
        date: inTwoDays,
        location: "מגרש העירוני, תל אביב",
        maxPlayers: 14,
        notes: "להביא כדור + אוויר 🙂",
        status: "open",
      },
    });
    console.log("✅ Sample game created");
  }

  console.log("\n🎉 Done! Login credentials:");
  console.log("   Admin:  admin@sport.local / admin123");
  console.log("   Player: player_1@sport.local / player123");
  console.log("   (players: player_1 through player_8)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
