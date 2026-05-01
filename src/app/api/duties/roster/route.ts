import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Sort by last name (last word of full name), then first name
function lastName(name: string | null): string {
  if (!name) return "ת"; // sort nameless last
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

function sortByLastName<T extends { name: string | null }>(arr: T[]): T[] {
  return [...arr].sort((a, b) =>
    lastName(a.name).localeCompare(lastName(b.name), "he")
  );
}

// For each duty type, find who is "next" in rotation:
// The user with the FEWEST duties. Ties broken by alphabetical last-name order.
function findNext(
  sortedUsers: { id: string; name: string | null }[],
  counts: Record<string, number>
): string | null {
  if (sortedUsers.length === 0) return null;
  const minCount = Math.min(...sortedUsers.map((u) => counts[u.id] ?? 0));
  const next = sortedUsers.find((u) => (counts[u.id] ?? 0) === minCount);
  return next?.id ?? null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    // All registered users (players + admins)
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true },
    });

    const sortedUsers = sortByLastName(allUsers);

    // All duty records (historical)
    const duties = await prisma.duty.findMany({
      include: {
        user: { select: { id: true, name: true } },
        game: { select: { id: true, date: true, location: true } },
      },
      orderBy: { createdAt: "desc" },
      // performedAt is selected automatically as it's a scalar field
    });

    const laundryDuties    = duties.filter((d) => d.type === "laundry");
    const fieldPayDuties   = duties.filter((d) => d.type === "field_payment");

    // Counts per user
    const laundryCounts:  Record<string, number> = {};
    const fieldPayCounts: Record<string, number> = {};

    for (const d of laundryDuties) {
      laundryCounts[d.userId]  = (laundryCounts[d.userId]  ?? 0) + 1;
    }
    for (const d of fieldPayDuties) {
      fieldPayCounts[d.userId] = (fieldPayCounts[d.userId] ?? 0) + 1;
    }

    // Roster rows (all users + their counts)
    const roster = sortedUsers.map((u) => ({
      id:               u.id,
      name:             u.name,
      laundryCount:     laundryCounts[u.id]  ?? 0,
      fieldPayCount:    fieldPayCounts[u.id] ?? 0,
    }));

    // Next-in-rotation
    const nextLaundryId    = findNext(sortedUsers, laundryCounts);
    const nextFieldPayId   = findNext(sortedUsers, fieldPayCounts);

    function dutyDate(d: { game: { date: Date; location: string | null } | null; performedAt: Date | null; createdAt: Date }): string {
      if (d.game) return d.game.date.toISOString();
      if (d.performedAt) return d.performedAt.toISOString();
      return d.createdAt.toISOString();
    }

    // History lists (with date/name)
    const laundryHistory = laundryDuties.map((d) => ({
      id:       d.id,
      userId:   d.userId,
      userName: d.user.name,
      date:     dutyDate(d),
      location: d.game ? d.game.location : null,
      gameId:   d.gameId,
      note:     d.note,
    }));

    const fieldPayHistory = fieldPayDuties.map((d) => ({
      id:       d.id,
      userId:   d.userId,
      userName: d.user.name,
      date:     dutyDate(d),
      location: d.game ? d.game.location : null,
      gameId:   d.gameId,
      note:     d.note,
    }));

    return NextResponse.json({
      roster,
      nextLaundryId,
      nextFieldPayId,
      laundryHistory,
      fieldPayHistory,
    });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
