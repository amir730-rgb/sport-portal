import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Admin marks a user as having performed a duty (standalone, not tied to a game)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { role?: string } | undefined;
    if (!session || sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { userId, type, note } = await req.json();

    if (!["laundry", "field_payment"].includes(type)) {
      return NextResponse.json({ error: "סוג תורנות לא חוקי" }, { status: 400 });
    }

    const duty = await prisma.duty.create({
      data: {
        userId,
        type,
        gameId: null, // standalone entry
        note: note ?? "סומן ידנית על ידי מנהל",
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json(duty);
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// Admin removes a standalone duty entry
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { role?: string } | undefined;
    if (!session || sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { dutyId } = await req.json();
    await prisma.duty.delete({ where: { id: dutyId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
