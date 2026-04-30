import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { divideTeams, TEAM_COLORS } from "@/lib/teams";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string } | undefined;

    if (!session || user?.role !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { id: gameId } = await params;
    const body = await req.json();

    // Delete old teams first
    await prisma.team.deleteMany({ where: { gameId } });

    // ── Manual team assignment ──
    if (body.manual && Array.isArray(body.teams)) {
      const createdTeams = await Promise.all(
        body.teams.map(async (t: { name: string; color: string; players: { userId: string; slotNote?: string | null }[] }) => {
          return prisma.team.create({
            data: {
              gameId,
              name: t.name,
              color: t.color,
              players: {
                create: t.players.map((p) => ({
                  userId: p.userId,
                  slotNote: p.slotNote ?? null,
                })),
              },
            },
            include: {
              players: {
                include: {
                  user: { select: { id: true, name: true, position: true, skillLevel: true } },
                },
              },
            },
          });
        })
      );
      return NextResponse.json(createdTeams);
    }

    // ── Auto team generation (existing logic) ──
    const { numTeams = 2 } = body;

    const rsvps = await prisma.rSVP.findMany({
      where: { gameId, status: "confirmed" },
      include: {
        user: { select: { id: true, name: true, position: true, skillLevel: true } },
      },
    });

    const players = rsvps.map((r) => r.user);
    const teamGroups = divideTeams(players, numTeams);

    const createdTeams = await Promise.all(
      teamGroups.map(async (group, i) => {
        const teamColor = TEAM_COLORS[i % TEAM_COLORS.length];
        return prisma.team.create({
          data: {
            gameId,
            name: teamColor.name,
            color: teamColor.color,
            players: {
              create: group.map((p) => ({ userId: p.id })),
            },
          },
          include: {
            players: {
              include: {
                user: { select: { id: true, name: true, position: true, skillLevel: true } },
              },
            },
          },
        });
      })
    );

    return NextResponse.json(createdTeams);
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
