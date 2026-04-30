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
            // Include confirmed RSVPs for MVP player list
            rsvps: {
              where: { status: "confirmed" },
              include: { user: { select: { id: true, name: true } } },
            },
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
    // isBalanced: true = "כן, היו מאוזנים", false = "לא, לא מאוזנים"
    const { isBalanced, mvpUserId } = await req.json();
    const userId = (session.user as { id?: string }).id!;

    const survey = await prisma.survey.findUnique({ where: { gameId } });
    if (!survey || !survey.isOpen) {
      return NextResponse.json({ error: "הסקר לא פתוח" }, { status: 400 });
    }

    // Store isBalanced as isDraw field (reuse existing column), enjoyment defaulted to 3
    await prisma.surveyVote.upsert({
      where: { surveyId_userId: { surveyId: survey.id, userId } },
      update: { isDraw: isBalanced === true, winnerTeamId: null, enjoyment: 3 },
      create: { surveyId: survey.id, userId, isDraw: isBalanced === true, winnerTeamId: null, enjoyment: 3 },
    });

    // Upsert MVP vote
    if (mvpUserId) {
      await prisma.mVPVote.upsert({
        where: { surveyId_voterId: { surveyId: survey.id, voterId: userId } },
        update: { receiverId: mvpUserId },
        create: { surveyId: survey.id, voterId: userId, receiverId: mvpUserId },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
