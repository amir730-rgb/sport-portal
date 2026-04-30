import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: gameId } = await params;

    const duties = await prisma.duty.findMany({
      where: { gameId },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json(duties);
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// Admin sets a duty assignment for a game
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { role?: string } | undefined;

    if (!session || sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { id: gameId } = await params;
    // type: "laundry" | "field_payment", userId: string | null (null = remove assignment)
    const { type, userId } = await req.json();

    if (!["laundry", "field_payment"].includes(type)) {
      return NextResponse.json({ error: "סוג תורנות לא חוקי" }, { status: 400 });
    }

    if (!userId) {
      // Remove assignment
      await prisma.duty.deleteMany({ where: { gameId, type } });
      return NextResponse.json({ success: true });
    }

    const duty = await prisma.duty.upsert({
      where: { gameId_type: { gameId, type } },
      update: { userId },
      create: { gameId, type, userId },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json(duty);
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
