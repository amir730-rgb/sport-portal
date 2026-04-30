import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { role: "player" },
      include: {
        rsvps: true,
        mvpReceived: {
          include: { survey: { include: { game: true } } },
        },
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
      const declined = user.rsvps.filter((r) => r.status === "declined").length;

      // Count wins: games where user's team won
      const wins = user.teamPlayers.filter((tp) => {
        const survey = tp.team.game.survey;
        return survey && tp.team.wonSurveys.some((ws) => ws.id === survey.id);
      }).length;

      const gamesPlayed = user.teamPlayers.length;
      const mvpCount = user.mvpReceived.length;
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

    // Sort by MVP count for leaderboard
    stats.sort((a, b) => b.mvpCount - a.mvpCount || b.wins - a.wins);

    // Fun titles
    const mostAttendant = [...stats].sort((a, b) => b.gamesPlayed - a.gamesPlayed)[0];
    const mostCanceled = [...stats].filter(s => s.declined > 0).sort((a, b) => b.declined - a.declined)[0];
    const topWinner = [...stats].sort((a, b) => b.wins - a.wins)[0];
    const topMvp = stats[0];

    return NextResponse.json({
      players: stats,
      awards: {
        mostAttendant: mostAttendant ? { player: mostAttendant, title: "🪨 הסלע", desc: "הנוכחות הגבוהה ביותר" } : null,
        mostCanceled: mostCanceled ? { player: mostCanceled, title: "💨 הקישקוש", desc: "הביטולים הכי הרבה" } : null,
        topWinner: topWinner ? { player: topWinner, title: "🏆 הנשר", desc: "הכי הרבה ניצחונות" } : null,
        topMvp: topMvp ? { player: topMvp, title: "⭐ כוכב העונה", desc: "שחקן המשחק הכי הרבה פעמים" } : null,
      },
    });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
