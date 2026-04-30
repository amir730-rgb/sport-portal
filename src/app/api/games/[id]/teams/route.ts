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
    const { numTeams = 2 } = await req.json();

    const rsvps = await prisma.rSVP.findMany({
      where: { gameId, status: "confirmed" },
      include: {
        user: { select: { id: true, name: true, position: true, skillLevel: true } },
      },
    });

    const players = rsvps.map((r) => r.user);
    const teamGroups = divideTeams(players, numTeams);

    // Delete old teams
    await prisma.team.deleteMany({ where: { gameId } });

    // Create new teams
    const createdTeams = await Promise.all(
      teamGroups.map(async (group, i) => {
        const teamColor = TEAM_COLORS[i % TEAM_COLORS.length];
        const team = await prisma.team.create({
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
        return team;
      })
    );

    return NextResponse.json(createdTeams);
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
