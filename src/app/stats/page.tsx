"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { positionsIcon, positionsLabel } from "@/lib/teams";

type PlayerStat = {
  id: string;
  name: string | null;
  image: string | null;
  position: string;
  skillLevel: number;
  confirmed: number;
  declined: number;
  gamesPlayed: number;
  wins: number;
  mvpCount: number;
  attendanceRate: number;
};

type Award = {
  player: PlayerStat;
  title: string;
  desc: string;
} | null;

type Stats = {
  players: PlayerStat[];
  awards: {
    mostAttendant: Award;
    mostCanceled: Award;
    topWinner: Award;
    topMvp: Award;
  };
};

export default function StatsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [sortBy, setSortBy] = useState<"mvp" | "wins" | "attendance" | "games">("mvp");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/stats").then(r => r.json()).then(setStats);
    }
  }, [session]);

  if (!stats) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-4xl animate-bounce">⚽</div>
      </div>
    );
  }

  const sortedPlayers = [...stats.players].sort((a, b) => {
    if (sortBy === "mvp") return b.mvpCount - a.mvpCount || b.wins - a.wins;
    if (sortBy === "wins") return b.wins - a.wins;
    if (sortBy === "attendance") return b.attendanceRate - a.attendanceRate;
    return b.gamesPlayed - a.gamesPlayed;
  });

  const awards = [
    stats.awards.topMvp,
    stats.awards.topWinner,
    stats.awards.mostAttendant,
    stats.awards.mostCanceled,
  ].filter(Boolean) as NonNullable<Award>[];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">📊 סטטיסטיקות</h1>
        <p className="text-slate-500 text-sm mt-1">טבלת הדירוג של הקבוצה</p>
      </div>

      {/* Awards Wall */}
      {awards.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-700 mb-3">🏅 תארי הכבוד</h2>
          <div className="grid grid-cols-2 gap-3">
            {awards.map((award) => (
              <div key={award.title} className="card text-center">
                <div className="text-3xl mb-1">{award.title.split(" ")[0]}</div>
                <div className="font-bold text-slate-800 text-sm">{award.title.split(" ").slice(1).join(" ")}</div>
                <div className="text-lg font-bold text-green-600 mt-1">{award.player.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{award.desc}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sort tabs */}
      <div className="flex bg-white rounded-2xl border border-slate-100 p-1 gap-1">
        {[
          { id: "mvp", label: "⭐ MVP" },
          { id: "wins", label: "🏆 ניצחונות" },
          { id: "attendance", label: "📊 נוכחות" },
          { id: "games", label: "⚽ משחקים" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSortBy(tab.id as typeof sortBy)}
            className={clsx(
              "flex-1 py-2 rounded-xl text-xs font-medium transition-all",
              sortBy === tab.id
                ? "bg-green-500 text-white"
                : "text-slate-500 hover:bg-slate-50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="card">
        <div className="space-y-2">
          {sortedPlayers.map((player, idx) => (
            <div
              key={player.id}
              className={clsx(
                "flex items-center gap-3 p-3 rounded-xl transition-colors",
                idx === 0 ? "bg-yellow-50" : idx === 1 ? "bg-slate-50" : idx === 2 ? "bg-orange-50" : "hover:bg-slate-50"
              )}
            >
              {/* Rank */}
              <div className={clsx(
                "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                idx === 0 ? "bg-yellow-400 text-white" :
                idx === 1 ? "bg-slate-300 text-white" :
                idx === 2 ? "bg-orange-400 text-white" :
                "bg-slate-100 text-slate-500"
              )}>
                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold shrink-0">
                {player.name?.[0] || "?"}
              </div>

              {/* Info */}
                <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800 truncate">{player.name}</p>
                  <span className="text-xs text-slate-400">{positionsIcon(player.position)}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-slate-400">{positionsLabel(player.position)}</span>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <span key={n} className={`text-xs ${n <= player.skillLevel ? "text-yellow-400" : "text-slate-200"}`}>★</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-4 text-center shrink-0">
                <div>
                  <div className="font-bold text-slate-800">{player.mvpCount}</div>
                  <div className="text-xs text-slate-400">MVP</div>
                </div>
                <div>
                  <div className="font-bold text-slate-800">{player.wins}</div>
                  <div className="text-xs text-slate-400">נצ'</div>
                </div>
                <div>
                  <div className="font-bold text-slate-800">{player.gamesPlayed}</div>
                  <div className="text-xs text-slate-400">משחקים</div>
                </div>
                <div>
                  <div className={clsx(
                    "font-bold",
                    player.attendanceRate >= 80 ? "text-green-600" :
                    player.attendanceRate >= 50 ? "text-orange-500" : "text-red-500"
                  )}>
                    {player.attendanceRate}%
                  </div>
                  <div className="text-xs text-slate-400">נוכחות</div>
                </div>
              </div>
            </div>
          ))}

          {sortedPlayers.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-8">
              אין שחקנים עדיין
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
