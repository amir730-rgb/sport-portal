import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Returns the current user's payment status for every game they confirmed
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { id?: string } | undefined;
    if (!session || !sessionUser?.id) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const userId = sessionUser.id;

    // All games where this user confirmed attendance
    const rsvps = await prisma.rSVP.findMany({
      where: { userId, status: "confirmed" },
      include: {
        game: {
          select: { id: true, date: true, location: true, status: true },
        },
      },
      orderBy: { game: { date: "desc" } },
    });

    if (rsvps.length === 0) {
      return NextResponse.json({ payments: [], unpaidCount: 0 });
    }

    const gameIds = rsvps.map((r) => r.gameId);

    // Payment records for those games
    const paymentRecords = await prisma.payment.findMany({
      where: { userId, gameId: { in: gameIds } },
    });

    const paymentMap = new Map(paymentRecords.map((p) => [p.gameId, p]));

    const payments = rsvps.map((r) => {
      const p = paymentMap.get(r.gameId);
      return {
        gameId: r.gameId,
        date: r.game.date.toISOString(),
        location: r.game.location,
        gameStatus: r.game.status,
        paid: p?.paid ?? false,
        paidAt: p?.paidAt?.toISOString() ?? null,
        note: p?.note ?? null,
      };
    });

    const unpaidCount = payments.filter((p) => !p.paid).length;

    return NextResponse.json({ payments, unpaidCount });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
