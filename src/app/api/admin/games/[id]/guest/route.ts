import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Admin: add an unregistered guest player to a game
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { role?: string } | undefined;
    if (!session || sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { id: gameId } = await params;
    const { firstName, lastName } = await req.json();

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: "שם פרטי ושם משפחה נדרשים" }, { status: 400 });
    }

    // Create guest user with auto-generated unique email
    const guestEmail = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}@guest.kicklist`;

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return NextResponse.json({ error: "משחק לא נמצא" }, { status: 404 });

    const confirmedCount = await prisma.rSVP.count({
      where: { gameId, status: "confirmed" },
    });
    const status = confirmedCount >= game.maxPlayers ? "waitlist" : "confirmed";

    // Create the guest user and their RSVP in one transaction
    const [guestUser, rsvp] = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: fullName,
          email: guestEmail,
          role: "guest",
          position: "midfielder",
          skillLevel: 3,
          adminSkillRating: 3,
          adminFitnessRating: 3,
        },
      });
      const r = await tx.rSVP.create({
        data: { userId: user.id, gameId, status },
      });
      return [user, r];
    });

    return NextResponse.json({
      user: guestUser,
      rsvp,
      isWaitlist: status === "waitlist",
    });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// Admin: delete a guest user entirely (removes them from this and all games)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { role?: string } | undefined;
    if (!session || sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    await params; // consume params
    const { userId } = await req.json();

    // Verify the user is actually a guest before deleting
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "guest") {
      return NextResponse.json({ error: "לא נמצא משתמש אורח" }, { status: 404 });
    }

    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
