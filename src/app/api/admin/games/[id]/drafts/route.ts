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

// GET: return all saved drafts for a game, filtered to confirmed RSVPs only
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { id: gameId } = await params;

    const [game, confirmedRsvps, teams] = await Promise.all([
      prisma.game.findUnique({ where: { id: gameId }, select: { publishedDraft: true } }),
      prisma.rSVP.findMany({ where: { gameId, status: "confirmed" }, select: { userId: true } }),
      prisma.team.findMany({
        where: { gameId },
        include: {
          players: {
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
          },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const confirmedIds = new Set(confirmedRsvps.map((r) => r.userId));

    // Proactively delete stale TeamPlayer entries (players removed from RSVP)
    const stalePlayerIds: string[] = [];
    for (const team of teams) {
      for (const p of team.players) {
        if (!confirmedIds.has(p.userId)) {
          stalePlayerIds.push(p.id);
        }
      }
    }
    if (stalePlayerIds.length > 0) {
      await prisma.teamPlayer.deleteMany({ where: { id: { in: stalePlayerIds } } });
    }

    // Filter teams in-memory so we return fresh data without stale players
    const cleanTeams = teams.map((team) => ({
      ...team,
      players: team.players.filter((p) => confirmedIds.has(p.userId)),
    }));

    // Group by draftLabel
    const draftMap = new Map<string, typeof cleanTeams>();
    for (const team of cleanTeams) {
      const label = team.draftLabel;
      if (!draftMap.has(label)) draftMap.set(label, []);
      draftMap.get(label)!.push(team);
    }

    const drafts = Array.from(draftMap.entries()).map(([label, draftTeams]) => ({
      label,
      isPublished: game?.publishedDraft === label,
      teams: draftTeams,
    }));

    return NextResponse.json({ drafts, publishedDraft: game?.publishedDraft ?? null });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// DELETE: remove all teams belonging to a specific draftLabel
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { id: gameId } = await params;
    const { draftLabel } = await req.json();

    await prisma.team.deleteMany({ where: { gameId, draftLabel } });

    // If the deleted draft was the published one, unpublish
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { publishedDraft: true },
    });
    if (game?.publishedDraft === draftLabel) {
      await prisma.game.update({
        where: { id: gameId },
        data: { teamsPublished: false, publishedDraft: null },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
