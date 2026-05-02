import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Admin: confirm attendance on behalf of a player
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { role?: string } | undefined;
    if (!session || sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { id: gameId } = await params;
    const { userId, forceWaitlist } = await req.json();

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return NextResponse.json({ error: "משחק לא נמצא" }, { status: 404 });

    const confirmedCount = await prisma.rSVP.count({
      where: { gameId, status: "confirmed" },
    });

    const finalStatus = forceWaitlist
      ? "waitlist"
      : confirmedCount >= game.maxPlayers
        ? "waitlist"
        : "confirmed";

    const rsvp = await prisma.rSVP.upsert({
      where: { userId_gameId: { userId, gameId } },
      update: { status: finalStatus },
      create: { userId, gameId, status: finalStatus },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ rsvp, isWaitlist: finalStatus === "waitlist" });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// Admin: remove a player's RSVP
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { role?: string } | undefined;
    if (!session || sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { id: gameId } = await params;
    const { userId } = await req.json();

    await prisma.rSVP.delete({
      where: { userId_gameId: { userId, gameId } },
    });

    // Promote first waitlist person if a confirmed slot opened up
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    const confirmedCount = await prisma.rSVP.count({ where: { gameId, status: "confirmed" } });

    if (game && confirmedCount < game.maxPlayers) {
      const nextWaiting = await prisma.rSVP.findFirst({
        where: { gameId, status: "waitlist" },
        orderBy: { createdAt: "asc" },
      });
      if (nextWaiting) {
        await prisma.rSVP.update({
          where: { id: nextWaiting.id },
          data: { status: "confirmed" },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
