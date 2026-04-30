import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, position, skillLevel, phone } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "שם, אימייל וסיסמה הם שדות חובה" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "אימייל זה כבר רשום במערכת" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        position: position || "any",
        skillLevel: skillLevel || 3,
        phone: phone || null,
      },
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
