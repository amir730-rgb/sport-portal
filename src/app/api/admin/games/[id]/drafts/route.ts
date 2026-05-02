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

// GET: return all saved drafts for a game (grouped by draftLabel)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { id: gameId } = await params;

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { publishedDraft: true },
    });

    const teams = await prisma.team.findMany({
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
    });

    // Group teams by draftLabel
    const draftMap = new Map<string, typeof teams>();
    for (const team of teams) {
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
