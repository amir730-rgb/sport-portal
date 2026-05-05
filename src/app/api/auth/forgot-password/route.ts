import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ ok: true });

    // Remove any existing tokens for this user
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    // Create a new token valid for 1 hour
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    const appUrl = process.env.NEXTAUTH_URL ?? "https://kicklist.vercel.app";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    const firstName = user.name?.split(" ")[0] ?? "שחקן";

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: mailError } = await resend.emails.send({
      from: "KickList <onboarding@resend.dev>",
      to: [email],
      subject: "איפוס סיסמה — KickList",
      html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:28px 36px;text-align:right;">
            <span style="background:#16a34a;color:#fff;font-weight:900;font-size:13px;padding:6px 12px;border-radius:8px;letter-spacing:1px;">KL</span>
            <span style="color:#fff;font-weight:700;font-size:18px;margin-right:10px;vertical-align:middle;">KickList</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px;text-align:right;">
            <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">שלום ${firstName},</h1>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
              קיבלנו בקשה לאיפוס הסיסמה שלך ב-KickList.<br/>
              לחץ על הכפתור למטה כדי לבחור סיסמה חדשה.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
              <tr>
                <td align="center" style="border-radius:12px;background:#16a34a;">
                  <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;border-radius:12px;">
                    אפס סיסמה
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">
              הקישור תקף לשעה אחת בלבד.
            </p>
            <p style="margin:0;color:#94a3b8;font-size:13px;">
              אם לא ביקשת לאפס סיסמה, ניתן להתעלם מהמייל הזה.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 36px;border-top:1px solid #e2e8f0;text-align:right;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              © 2026 KickList · ניהול משחקי כדורגל
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    if (mailError) {
      console.error("Resend error:", mailError);
      return NextResponse.json({ error: "שגיאה בשליחת המייל" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("forgot-password error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
