import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { role?: string } | undefined;
  if (!session || sessionUser?.role !== "admin") return null;
  return session;
}

// Admin adds a manual duty entry (optionally with a custom date)
export async function POST(req: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { userId, type, note, date } = await req.json();

    if (!["laundry", "field_payment"].includes(type)) {
      return NextResponse.json({ error: "סוג תורנות לא חוקי" }, { status: 400 });
    }

    const duty = await prisma.duty.create({
      data: {
        userId,
        type,
        gameId: null,
        note: note?.trim() || "סומן ידנית על ידי מנהל",
        performedAt: date ? new Date(date) : new Date(),
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json(duty);
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// Admin updates a duty entry's date and/or note
export async function PATCH(req: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { dutyId, date, note } = await req.json();

    if (!dutyId) {
      return NextResponse.json({ error: "חסר מזהה רשומה" }, { status: 400 });
    }

    const updated = await prisma.duty.update({
      where: { id: dutyId },
      data: {
        ...(date !== undefined ? { performedAt: new Date(date) } : {}),
        ...(note !== undefined ? { note: note?.trim() || null } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// Admin removes a duty entry (any entry)
export async function DELETE(req: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { dutyId } = await req.json();
    await prisma.duty.delete({ where: { id: dutyId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
