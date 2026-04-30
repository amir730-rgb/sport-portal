import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { role?: string } | undefined;
    if (!session || sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { id: gameId } = await params;
    const { publish } = await req.json(); // true = publish, false = unpublish

    const game = await prisma.game.update({
      where: { id: gameId },
      data: { teamsPublished: publish },
    });

    return NextResponse.json({ teamsPublished: game.teamsPublished });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
