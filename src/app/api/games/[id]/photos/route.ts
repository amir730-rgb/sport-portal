import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: gameId } = await params;

    const photos = await prisma.photo.findMany({
      where: { gameId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(photos);
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { id: gameId } = await params;
    const { url, caption } = await req.json();
    const userId = (session.user as { id?: string }).id!;

    if (!url) return NextResponse.json({ error: "נדרש URL לתמונה" }, { status: 400 });

    const photo = await prisma.photo.create({
      data: { gameId, userId, url, caption },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(photo);
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
