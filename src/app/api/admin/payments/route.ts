import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string } | undefined;
    if (!session || user?.role !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    // All games with confirmed RSVPs and any existing payment records
    const games = await prisma.game.findMany({
      orderBy: { date: "desc" },
      include: {
        rsvps: {
          where: { status: "confirmed" },
          include: { user: { select: { id: true, name: true } } },
        },
        payments: true,
      },
    });

    // Only games that have at least one confirmed player
    const gamesWithPlayers = games.filter((g) => g.rsvps.length > 0);

    // ── byGame ──────────────────────────────────────────────
    const byGame = gamesWithPlayers.map((game) => {
      const players = game.rsvps.map((rsvp) => {
        const payment = game.payments.find((p) => p.userId === rsvp.userId);
        return {
          userId: rsvp.userId,
          userName: rsvp.user.name,
          paid: payment?.paid ?? false,
          paidAt: payment?.paidAt?.toISOString() ?? null,
          note: payment?.note ?? null,
        };
      });

      return {
        id: game.id,
        date: game.date.toISOString(),
        location: game.location,
        status: game.status,
        players,
        paidCount: players.filter((p) => p.paid).length,
        totalCount: players.length,
      };
    });

    // ── byPlayer ─────────────────────────────────────────────
    const userMap = new Map<
      string,
      {
        userId: string;
        userName: string | null;
        history: Array<{
          gameId: string;
          date: string;
          location: string;
          paid: boolean;
          paidAt: string | null;
          note: string | null;
        }>;
      }
    >();

    for (const game of gamesWithPlayers) {
      for (const rsvp of game.rsvps) {
        if (!userMap.has(rsvp.userId)) {
          userMap.set(rsvp.userId, {
            userId: rsvp.userId,
            userName: rsvp.user.name,
            history: [],
          });
        }
        const payment = game.payments.find((p) => p.userId === rsvp.userId);
        userMap.get(rsvp.userId)!.history.push({
          gameId: game.id,
          date: game.date.toISOString(),
          location: game.location,
          paid: payment?.paid ?? false,
          paidAt: payment?.paidAt?.toISOString() ?? null,
          note: payment?.note ?? null,
        });
      }
    }

    const byPlayer = Array.from(userMap.values())
      .map((player) => ({
        ...player,
        totalGames: player.history.length,
        paidGames: player.history.filter((h) => h.paid).length,
      }))
      .sort((a, b) => (a.userName ?? "").localeCompare(b.userName ?? ""));

    return NextResponse.json({ byGame, byPlayer });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// Toggle a payment (upsert)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string } | undefined;
    if (!session || user?.role !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { gameId, userId, paid, note } = await req.json();

    const payment = await prisma.payment.upsert({
      where: { gameId_userId: { gameId, userId } },
      update: {
        paid,
        paidAt: paid ? new Date() : null,
        ...(note !== undefined && { note }),
      },
      create: {
        gameId,
        userId,
        paid,
        paidAt: paid ? new Date() : null,
        note: note ?? null,
      },
    });

    return NextResponse.json(payment);
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
