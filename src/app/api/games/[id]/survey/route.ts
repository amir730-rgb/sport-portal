import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: gameId } = await params;

    const survey = await prisma.survey.findUnique({
      where: { gameId },
      include: {
        winnerTeam: true,
        votes: {
          include: { user: { select: { id: true, name: true } } },
        },
        mvpVotes: {
          include: {
            voter: { select: { id: true, name: true } },
            receiver: { select: { id: true, name: true, image: true } },
          },
        },
        game: {
          include: {
            teams: { include: { players: { include: { user: { select: { id: true, name: true } } } } } },
          },
        },
      },
    });

    return NextResponse.json(survey);
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { role?: string } | undefined;

    if (!session || sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { id: gameId } = await params;

    const existing = await prisma.survey.findUnique({ where: { gameId } });
    if (existing) {
      return NextResponse.json({ error: "סקר כבר קיים למשחק זה" }, { status: 400 });
    }

    const survey = await prisma.survey.create({
      data: { gameId },
    });

    await prisma.game.update({
      where: { id: gameId },
      data: { status: "completed" },
    });

    return NextResponse.json(survey);
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { id: gameId } = await params;
    const { winnerTeamId, isDraw, enjoyment, mvpUserId } = await req.json();
    const userId = (session.user as { id?: string }).id!;

    const survey = await prisma.survey.findUnique({ where: { gameId } });
    if (!survey || !survey.isOpen) {
      return NextResponse.json({ error: "הסקר לא פתוח" }, { status: 400 });
    }

    // Upsert the survey vote
    await prisma.surveyVote.upsert({
      where: { surveyId_userId: { surveyId: survey.id, userId } },
      update: { winnerTeamId: isDraw ? null : winnerTeamId, isDraw, enjoyment },
      create: { surveyId: survey.id, userId, winnerTeamId: isDraw ? null : winnerTeamId, isDraw, enjoyment },
    });

    // Upsert MVP vote
    if (mvpUserId) {
      await prisma.mVPVote.upsert({
        where: { surveyId_voterId: { surveyId: survey.id, voterId: userId } },
        update: { receiverId: mvpUserId },
        create: { surveyId: survey.id, voterId: userId, receiverId: mvpUserId },
      });
    }

    // Tally results: if >50% agree on winner/draw, close survey and set result
    const allVotes = await prisma.surveyVote.findMany({ where: { surveyId: survey.id } });
    const totalVoters = allVotes.length;

    if (totalVoters >= 3) {
      const drawVotes = allVotes.filter((v) => v.isDraw).length;
      if (drawVotes / totalVoters > 0.5) {
        await prisma.survey.update({
          where: { id: survey.id },
          data: { isDraw: true, isOpen: false, closedAt: new Date() },
        });
      } else {
        const teamVoteCounts: Record<string, number> = {};
        allVotes.filter((v) => !v.isDraw && v.winnerTeamId).forEach((v) => {
          if (v.winnerTeamId) teamVoteCounts[v.winnerTeamId] = (teamVoteCounts[v.winnerTeamId] || 0) + 1;
        });
        const winnerEntry = Object.entries(teamVoteCounts).sort((a, b) => b[1] - a[1])[0];
        if (winnerEntry && winnerEntry[1] / totalVoters > 0.5) {
          await prisma.survey.update({
            where: { id: survey.id },
            data: { winnerTeamId: winnerEntry[0], isOpen: false, closedAt: new Date() },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
