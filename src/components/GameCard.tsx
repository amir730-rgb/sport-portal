"use client";

import { useState } from "react";
import Link from "next/link";
import { format, isToday, isTomorrow } from "date-fns";
import { he } from "date-fns/locale";
import toast from "react-hot-toast";
import clsx from "clsx";
import { POSITION_ICONS, TEAM_COLORS, positionsIcon } from "@/lib/teams";
import DutyBadges from "./DutyBadges";

type Game = {
  id: string;
  date: string;
  location: string;
  maxPlayers: number;
  status: string;
  notes: string | null;
  rsvps: Array<{
    id: string;
    status: string;
    user: { id: string; name: string | null; image: string | null; position: string; skillLevel: number };
  }>;
  teams: Array<{
    id: string;
    name: string;
    color: string;
    players: Array<{ user: { id: string; name: string | null; image: string | null; position: string } }>;
  }>;
  survey: { id: string; isOpen: boolean; isDraw: boolean; winnerTeamId: string | null } | null;
  duties: Array<{ type: string; user: { id: string; name: string | null } }>;
  _count: { posts: number; photos: number };
};

type Props = {
  game: Game;
  userId: string;
  onUpdate: () => void;
  isPast?: boolean;
};

export default function GameCard({ game, userId, onUpdate, isPast = false }: Props) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const confirmed = game.rsvps.filter((r) => r.status === "confirmed");
  const waitlist = game.rsvps.filter((r) => r.status === "waitlist");
  const myRsvp = game.rsvps.find((r) => r.user.id === userId);
  const isFull = confirmed.length >= game.maxPlayers;

  const dateObj = new Date(game.date);
  const dateLabel = isToday(dateObj)
    ? "היום"
    : isTomorrow(dateObj)
    ? "מחר"
    : format(dateObj, "EEEE, d בMMM", { locale: he });

  async function handleRsvp(status: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/games/${game.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
      } else {
        if (data.isWaitlist) {
          toast.success("נוספת לרשימת ההמתנה ✋");
        } else if (status === "confirmed") {
          toast.success("אישרת הגעה! 🙌");
        } else {
          toast.success("ביטלת את ההגעה");
        }
        onUpdate();
      }
    } catch {
      toast.error("שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    try {
      const res = await fetch(`/api/games/${game.id}/rsvp`, { method: "DELETE" });
      if (res.ok) {
        toast.success("ביטלת את ההגעה");
        onUpdate();
      }
    } catch {
      toast.error("שגיאה");
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    open: "bg-green-100 text-green-700",
    closed: "bg-orange-100 text-orange-700",
    completed: "bg-slate-100 text-slate-600",
  };

  const statusLabels: Record<string, string> = {
    open: "פתוח להרשמה",
    closed: "הרשמה סגורה",
    completed: "הסתיים",
  };

  return (
    <div className={clsx("card", isPast && "opacity-80")}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx("badge", statusColors[game.status])}>
              {statusLabels[game.status]}
            </span>
            {isToday(dateObj) && (
              <span className="badge bg-red-100 text-red-600 animate-pulse">היום!</span>
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-800 mt-2">{dateLabel}</h3>
          <p className="text-slate-500 text-sm flex items-center gap-1 mt-0.5">
            <span>🕐</span> {format(dateObj, "HH:mm")}
            <span className="mx-1">·</span>
            <span>📍</span> {game.location}
          </p>

          {game.notes && (
            <p className="text-sm text-slate-500 mt-2 bg-slate-50 rounded-lg px-3 py-2">
              💬 {game.notes}
            </p>
          )}
        </div>

        {/* Player count */}
        <div className="text-center min-w-[60px]">
          <div className={clsx(
            "text-2xl font-bold",
            confirmed.length >= game.maxPlayers ? "text-red-500" : "text-green-600"
          )}>
            {confirmed.length}
          </div>
          <div className="text-xs text-slate-400">/{game.maxPlayers}</div>
          <div className="text-xs text-slate-400">שחקנים</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={clsx(
            "h-full rounded-full transition-all",
            isFull ? "bg-red-400" : "bg-green-400"
          )}
          style={{ width: `${Math.min((confirmed.length / game.maxPlayers) * 100, 100)}%` }}
        />
      </div>

      {/* RSVP Buttons */}
      {!isPast && game.status === "open" && (
        <div className="mt-4 flex gap-2">
          {!myRsvp ? (
            <>
              <button
                onClick={() => handleRsvp("confirmed")}
                disabled={loading}
                className={clsx(
                  "flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all",
                  isFull
                    ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                    : "bg-green-500 text-white hover:bg-green-600"
                )}
              >
                {isFull ? "✋ הצטרף להמתנה" : "✅ אני מגיע!"}
              </button>
              <button
                onClick={() => handleRsvp("declined")}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
              >
                ❌ לא אגיע
              </button>
            </>
          ) : (
            <div className="flex-1 flex items-center gap-3">
              <div className={clsx(
                "flex-1 py-2.5 rounded-xl text-center font-semibold text-sm",
                myRsvp.status === "confirmed" ? "bg-green-50 text-green-700" :
                myRsvp.status === "waitlist" ? "bg-orange-50 text-orange-700" :
                "bg-red-50 text-red-600"
              )}>
                {myRsvp.status === "confirmed" ? "✅ אישרת הגעה" :
                 myRsvp.status === "waitlist" ? "✋ ברשימת המתנה" :
                 "❌ לא מגיע"}
              </div>
              {myRsvp.status !== "declined" && (
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="text-sm text-slate-400 hover:text-red-500 transition-colors"
                >
                  ביטול
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 w-full text-sm text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1"
      >
        {expanded ? "▲ סגור" : `▼ פרטים (${confirmed.length} שחקנים${game.teams.length > 0 ? ", קבוצות" : ""})`}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          {/* Duty assignments */}
          {game.duties.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-2">🔄 תורנויות</h4>
              <DutyBadges duties={game.duties} currentUserId={userId} />
            </div>
          )}

          {/* Teams display */}
          {game.teams.length > 0 ? (
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-3">⚽ חלוקת קבוצות</h4>
              <div className="grid grid-cols-2 gap-3">
                {game.teams.map((team) => {
                  const colorInfo = TEAM_COLORS.find((c) => c.color === team.color);
                  return (
                    <div
                      key={team.id}
                      className={clsx(
                        "rounded-xl p-3 border-2",
                        colorInfo?.light || "bg-slate-50",
                        colorInfo?.border || "border-slate-200"
                      )}
                    >
                      <div className={clsx("font-bold text-sm mb-2", colorInfo?.text)}>
                        {team.name}
                      </div>
                      <div className="space-y-1">
                        {team.players.map((p) => (
                          <div key={p.user.id} className="flex items-center gap-1.5 text-sm">
                            <span className="text-xs">{positionsIcon(p.user.position)}</span>
                            <span className="text-slate-700">{p.user.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-3">
                ✅ מגיעים ({confirmed.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {confirmed.map((r) => (
                  <div
                    key={r.user.id}
                    className="flex items-center gap-1.5 bg-green-50 text-green-800 px-3 py-1.5 rounded-full text-sm"
                  >
                    <span>{positionsIcon(r.user.position)}</span>
                    <span>{r.user.name}</span>
                  </div>
                ))}
              </div>

              {waitlist.length > 0 && (
                <>
                  <h4 className="text-sm font-bold text-slate-700 mt-3 mb-2">
                    ✋ רשימת המתנה ({waitlist.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {waitlist.map((r) => (
                      <div
                        key={r.user.id}
                        className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-sm"
                      >
                        {r.user.name}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Survey result for past games */}
          {game.survey && !game.survey.isOpen && (
            <div className="bg-slate-50 rounded-xl p-3">
              <h4 className="text-sm font-bold text-slate-700 mb-1">📋 תוצאת ההצבעה</h4>
              {game.survey.isDraw ? (
                <p className="text-slate-600 text-sm">🤝 תיקו</p>
              ) : game.survey.winnerTeamId ? (
                <p className="text-slate-600 text-sm">
                  🏆 {game.teams.find((t) => t.id === game.survey?.winnerTeamId)?.name || "קבוצה לא ידועה"} ניצחה
                </p>
              ) : null}
            </div>
          )}

          {/* Quick links */}
          <div className="flex gap-2">
            <Link
              href={`/games/${game.id}`}
              className="flex-1 text-center py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              💬 {game._count.posts} הודעות
            </Link>
            <Link
              href={`/games/${game.id}?tab=photos`}
              className="flex-1 text-center py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              📸 {game._count.photos} תמונות
            </Link>
            {game.survey && game.survey.isOpen && (
              <Link
                href={`/games/${game.id}?tab=survey`}
                className="flex-1 text-center py-2 rounded-xl bg-purple-100 text-purple-700 text-sm font-semibold hover:bg-purple-200 transition-colors animate-pulse"
              >
                🗳️ סקר פתוח!
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
