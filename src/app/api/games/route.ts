import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const games = await prisma.game.findMany({
      orderBy: { date: "asc" },
      include: {
        rsvps: {
          include: {
            user: {
              select: { id: true, name: true, image: true, position: true, skillLevel: true },
            },
          },
        },
        teams: {
          include: {
            players: {
              include: {
                user: { select: { id: true, name: true, image: true, position: true } },
              },
            },
          },
        },
        survey: true,
        duties: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        _count: { select: { posts: true, photos: true } },
      },
    });

    return NextResponse.json(games);
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string } | undefined;

    if (!session || user?.role !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { date, location, maxPlayers, notes } = await req.json();

    const game = await prisma.game.create({
      data: {
        date: new Date(date),
        location: location || "מגרש הכדורגל",
        maxPlayers: maxPlayers || 14,
        notes: notes || null,
      },
    });

    return NextResponse.json(game);
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
