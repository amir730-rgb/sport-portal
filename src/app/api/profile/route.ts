import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const userId = (session.user as { id?: string }).id!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        rsvps: {
          include: { game: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        mvpReceived: { include: { survey: { include: { game: true } } } },
      },
    });

    if (!user) return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const userId = (session.user as { id?: string }).id!;
    const { name, position, skillLevel, phone, image } = await req.json();

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(position && { position }),
        ...(skillLevel && { skillLevel }),
        ...(phone !== undefined && { phone }),
        ...(image !== undefined && { image }),
      },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
