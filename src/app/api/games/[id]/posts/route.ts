import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: gameId } = await params;

    const posts = await prisma.post.findMany({
      where: { gameId },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(posts);
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { id: gameId } = await params;
    const { content } = await req.json();
    const userId = (session.user as { id?: string }).id!;

    if (!content?.trim()) {
      return NextResponse.json({ error: "תוכן ההודעה ריק" }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: { gameId, userId, content: content.trim() },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json(post);
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
