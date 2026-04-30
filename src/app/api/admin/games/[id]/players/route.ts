import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Returns confirmed RSVPs with admin ratings — admin only
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { role?: string } | undefined;
    if (!session || sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { id: gameId } = await params;

    const rsvps = await prisma.rSVP.findMany({
      where: { gameId, status: "confirmed" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            adminSkillRating: true,
            adminFitnessRating: true,
            adminPositions: true,
          },
        },
      },
    });

    return NextResponse.json(rsvps.map((r) => r.user));
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
