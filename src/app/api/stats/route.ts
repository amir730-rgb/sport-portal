import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // ── MVP wins: per-survey majority-vote winner ─────────────────────────
    // For each survey, the player who received the MOST votes wins.
    // Ties produce no winner (no point awarded).
    const surveys = await prisma.survey.findMany({
      include: { mvpVotes: { select: { receiverId: true } } },
    });

    const mvpWins: Record<string, number> = {};
    for (const survey of surveys) {
      if (survey.mvpVotes.length === 0) continue;

      const tally: Record<string, number> = {};
      for (const v of survey.mvpVotes) {
        tally[v.receiverId] = (tally[v.receiverId] ?? 0) + 1;
      }
      const max = Math.max(...Object.values(tally));
      const winners = Object.keys(tally).filter((id) => tally[id] === max);

      if (winners.length === 1) {
        mvpWins[winners[0]] = (mvpWins[winners[0]] ?? 0) + 1;
      }
    }

    // ── Player stats ──────────────────────────────────────────────────────
    const users = await prisma.user.findMany({
      where: { role: "player" },
      include: {
        rsvps: true,
        teamPlayers: {
          include: {
            team: {
              include: {
                wonSurveys: true,
                game: { include: { survey: true } },
              },
            },
          },
        },
      },
    });

    const stats = users.map((user) => {
      const confirmed = user.rsvps.filter((r) => r.status === "confirmed").length;
      const declined  = user.rsvps.filter((r) => r.status === "declined").length;

      const wins = user.teamPlayers.filter((tp) => {
        const survey = tp.team.game.survey;
        return survey && tp.team.wonSurveys.some((ws) => ws.id === survey.id);
      }).length;

      const gamesPlayed    = user.teamPlayers.length;
      const mvpCount       = mvpWins[user.id] ?? 0;
      const attendanceRate = confirmed + declined > 0
        ? Math.round((confirmed / (confirmed + declined)) * 100)
        : 0;

      return {
        id: user.id,
        name: user.name,
        image: user.image,
        position: user.position,
        skillLevel: user.skillLevel,
        confirmed,
        declined,
        gamesPlayed,
        wins,
        mvpCount,
        attendanceRate,
      };
    });

    stats.sort((a, b) => b.mvpCount - a.mvpCount || b.wins - a.wins);

    // ── Awards — only "כוכב העונה" + "הקישקוש" ───────────────────────────
    const topMvp      = stats.find((s) => s.mvpCount > 0) ?? null;
    const mostCanceled = [...stats]
      .filter((s) => s.declined > 0)
      .sort((a, b) => b.declined - a.declined)[0] ?? null;

    return NextResponse.json({
      players: stats,
      awards: {
        topMvp:      topMvp      ? { player: topMvp,      title: "כוכב העונה", desc: `${topMvp.mvpCount} ${topMvp.mvpCount === 1 ? "זכייה" : "זכיות"} ב-MVP` } : null,
        mostCanceled: mostCanceled ? { player: mostCanceled, title: "הקישקוש",    desc: "הכי הרבה ביטולים"           } : null,
      },
    });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
