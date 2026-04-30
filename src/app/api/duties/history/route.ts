import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const duties = await prisma.duty.findMany({
      include: {
        user: { select: { id: true, name: true } },
        game: { select: { id: true, date: true, location: true, status: true } },
      },
      orderBy: { game: { date: "desc" } },
    });

    // Group by type
    const laundry = duties.filter((d) => d.type === "laundry");
    const fieldPayment = duties.filter((d) => d.type === "field_payment");

    // Count per user for each type
    function tally(list: typeof duties) {
      const counts: Record<string, { name: string | null; count: number }> = {};
      list.forEach((d) => {
        if (!counts[d.user.id]) counts[d.user.id] = { name: d.user.name, count: 0 };
        counts[d.user.id].count++;
      });
      return Object.entries(counts)
        .map(([id, v]) => ({ id, name: v.name, count: v.count }))
        .sort((a, b) => b.count - a.count);
    }

    return NextResponse.json({
      laundry,
      fieldPayment,
      tallies: {
        laundry: tally(laundry),
        fieldPayment: tally(fieldPayment),
      },
    });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
