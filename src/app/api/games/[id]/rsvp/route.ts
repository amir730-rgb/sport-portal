import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { id: gameId } = await params;
    const { status } = await req.json();
    const userId = (session.user as { id?: string }).id!;

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return NextResponse.json({ error: "משחק לא נמצא" }, { status: 404 });
    if (game.status === "closed" || game.status === "completed") {
      return NextResponse.json({ error: "ההרשמה למשחק זה סגורה" }, { status: 400 });
    }

    // Count confirmed players to check if waitlist needed
    const confirmedCount = await prisma.rSVP.count({
      where: { gameId, status: "confirmed" },
    });

    let finalStatus = status;
    if (status === "confirmed" && confirmedCount >= game.maxPlayers) {
      finalStatus = "waitlist";
    }

    const rsvp = await prisma.rSVP.upsert({
      where: { userId_gameId: { userId, gameId } },
      update: { status: finalStatus },
      create: { userId, gameId, status: finalStatus },
    });

    return NextResponse.json({ rsvp, isWaitlist: finalStatus === "waitlist" });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { id: gameId } = await params;
    const userId = (session.user as { id?: string }).id!;

    await prisma.rSVP.delete({
      where: { userId_gameId: { userId, gameId } },
    });

    // Promote first waitlist person if exists
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

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
