"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { positionsLabel } from "@/lib/teams";
import { BarChart2, Trophy, Star, Users, Loader2, Medal, Crown } from "lucide-react";

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
    topMvp: Award;
    mostCanceled: Award;
  };
};

export default function StatsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [sortBy, setSortBy] = useState<"mvp" | "wins" | "attendance">("mvp");

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
        <Loader2 size={28} className="text-green-500 animate-spin" />
      </div>
    );
  }

  const sortedPlayers = [...stats.players].sort((a, b) => {
    if (sortBy === "mvp")        return b.mvpCount - a.mvpCount || b.wins - a.wins;
    if (sortBy === "wins")       return b.wins - a.wins;
    return b.attendanceRate - a.attendanceRate;
  });

  // MVP tab: only players who won at least once, sorted by wins
  const mvpWinners = [...stats.players]
    .filter((p) => p.mvpCount > 0)
    .sort((a, b) => b.mvpCount - a.mvpCount);

  const awards = [stats.awards.topMvp, stats.awards.mostCanceled].filter(Boolean) as NonNullable<Award>[];

  const AWARD_ICON: Record<string, React.ReactNode> = {
    "כוכב העונה": <Crown size={20} className="text-amber-400 mx-auto mb-1" />,
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <BarChart2 size={20} className="text-green-600" /> סטטיסטיקות
        </h1>
        <p className="text-slate-500 text-sm mt-1">טבלת הדירוג של הקבוצה</p>
      </div>

      {/* Awards Wall */}
      {awards.length > 0 && (
        <section>
          <h2 className="section-title flex items-center gap-1.5"><Medal size={11} /> תארי הכבוד</h2>
          <div className="grid grid-cols-2 gap-3">
            {awards.map((award) => (
              <div key={award.title} className="card text-center">
                {AWARD_ICON[award.title] ?? <Trophy size={20} className="text-amber-400 mx-auto mb-1" />}
                <div className="font-bold text-slate-800 text-sm">{award.title}</div>
                <div className="text-base font-bold text-green-600 mt-1">{award.player.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{award.desc}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sort tabs */}
      <div className="flex bg-white rounded-2xl border border-slate-100 p-1 gap-1">
        {[
          { id: "mvp",        label: "MVP",      icon: Crown },
          { id: "wins",       label: "ניצחונות", icon: Trophy },
          { id: "attendance", label: "נוכחות",   icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSortBy(tab.id as typeof sortBy)}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium transition-all",
              sortBy === tab.id ? "bg-green-600 text-white" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <tab.icon size={12} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── MVP Hall of Fame ── */}
      {sortBy === "mvp" && (
        <div className="space-y-3">
          {mvpWinners.length === 0 ? (
            <div className="card text-center py-10">
              <Crown size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 font-semibold text-sm">אין זוכי MVP עדיין</p>
              <p className="text-slate-400 text-xs mt-1">MVP נקבע ע"י הצבעה בסיום כל יום משחק</p>
            </div>
          ) : (
            <>
              {/* Top MVP card */}
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-5 text-center">
                <Crown size={28} className="text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-1">שחקן העונה</p>
                <p className="text-xl font-black text-slate-800">{mvpWinners[0].name}</p>
                <p className="text-sm text-amber-600 font-bold mt-1">
                  {mvpWinners[0].mvpCount} {mvpWinners[0].mvpCount === 1 ? "זכייה" : "זכיות"} ב-MVP
                </p>
                <p className="text-xs text-slate-500 mt-1">{positionsLabel(mvpWinners[0].position)}</p>
              </div>

              {/* Rest of MVP winners */}
              {mvpWinners.slice(1).length > 0 && (
                <div className="card">
                  <p className="section-title flex items-center gap-1.5 mb-3"><Star size={11} /> זוכי MVP נוספים</p>
                  <div className="space-y-2">
                    {mvpWinners.slice(1).map((player, idx) => (
                      <div key={player.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50">
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 2}
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {player.name?.[0] || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">{player.name}</p>
                          <p className="text-xs text-slate-400">{positionsLabel(player.position)}</p>
                        </div>
                        <div className="text-center shrink-0">
                          <div className="font-bold text-amber-600">{player.mvpCount}</div>
                          <div className="text-[10px] text-slate-400">זכיות</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All players with 0 MVP wins */}
              {stats.players.filter(p => p.mvpCount === 0).length > 0 && (
                <div className="card">
                  <p className="section-title mb-3">שחקנים ללא זכיית MVP</p>
                  <div className="flex flex-wrap gap-2">
                    {stats.players
                      .filter((p) => p.mvpCount === 0)
                      .map((player) => (
                        <span key={player.id} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-100 text-slate-600 px-2.5 py-1.5 rounded-full text-xs font-medium">
                          <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                            {player.name?.[0] || "?"}
                          </span>
                          {player.name}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Regular leaderboard (wins / attendance) ── */}
      {sortBy !== "mvp" && (
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
                  {idx + 1}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold shrink-0">
                  {player.name?.[0] || "?"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800 truncate">{player.name}</p>
                    <span className="text-xs text-slate-400">{positionsLabel(player.position)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <div className="flex gap-0.5 mt-0.5">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} size={10} fill={n <= player.skillLevel ? "#facc15" : "none"} stroke={n <= player.skillLevel ? "#facc15" : "#e2e8f0"} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 text-center shrink-0">
                  {sortBy === "wins" && (
                    <>
                      <div>
                        <div className="font-bold text-slate-800">{player.wins}</div>
                        <div className="text-xs text-slate-400">ניצחונות</div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{player.gamesPlayed}</div>
                        <div className="text-xs text-slate-400">משחקים</div>
                      </div>
                    </>
                  )}
                  {sortBy === "attendance" && (
                    <>
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
                      <div>
                        <div className="font-bold text-slate-800">{player.confirmed}</div>
                        <div className="text-xs text-slate-400">הגעות</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {sortedPlayers.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-8">אין שחקנים עדיין</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
