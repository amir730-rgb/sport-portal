"use client";

import { useState } from "react";
import Link from "next/link";
import { format, isToday, isTomorrow } from "date-fns";
import { he } from "date-fns/locale";
import toast from "react-hot-toast";
import clsx from "clsx";
import { TEAM_COLORS, positionsIcon } from "@/lib/teams";
import DutyBadges from "./DutyBadges";
import FootballLineup from "./FootballLineup";
import {
  Clock,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock4,
  MessageSquare,
  Camera,
  ClipboardCheck,
  Trophy,
  RotateCcw,
  Banknote,
  AlertCircle,
} from "lucide-react";

type Game = {
  id: string;
  date: string;
  location: string;
  maxPlayers: number;
  status: string;
  notes: string | null;
  teamsPublished: boolean;
  rsvps: Array<{
    id: string;
    status: string;
    user: { id: string; name: string | null; image: string | null; position: string; skillLevel: number };
  }>;
  teams: Array<{
    id: string;
    name: string;
    color: string;
    players: Array<{ slotNote: string | null; user: { id: string; name: string | null; image: string | null; position: string } }>;
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
  paymentStatus?: boolean | null; // true=paid, false=unpaid, null/undefined=no info
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  open:      { label: "פתוח",          cls: "badge-green",  dot: "bg-green-500" },
  closed:    { label: "הרשמה סגורה",   cls: "badge-yellow", dot: "bg-amber-400" },
  completed: { label: "הסתיים",        cls: "badge-slate",  dot: "bg-slate-400" },
};

export default function GameCard({ game, userId, onUpdate, isPast = false, paymentStatus }: Props) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const confirmed = game.rsvps.filter((r) => r.status === "confirmed");
  const waitlist  = game.rsvps.filter((r) => r.status === "waitlist");
  const declined  = game.rsvps.filter((r) => r.status === "declined");
  const myRsvp    = game.rsvps.find((r) => r.user.id === userId);
  const isFull    = confirmed.length >= game.maxPlayers;
  const pct       = Math.min((confirmed.length / game.maxPlayers) * 100, 100);

  const dateObj   = new Date(game.date);
  const dateLabel = isToday(dateObj)   ? "היום"
                  : isTomorrow(dateObj) ? "מחר"
                  : format(dateObj, "EEEE, d בMMM", { locale: he });

  const status = STATUS_CONFIG[game.status] ?? STATUS_CONFIG.open;

  async function handleRsvp(s: string) {
    setLoading(true);
    try {
      const res  = await fetch(`/api/games/${game.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: s }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); }
      else {
        toast.success(
          data.isWaitlist ? "נוספת לרשימת ההמתנה" :
          s === "confirmed" ? "אישרת הגעה" :
          "סומנת כלא מגיע"
        );
        onUpdate();
      }
    } catch { toast.error("שגיאה"); }
    finally { setLoading(false); }
  }

  async function handleCancel() {
    setLoading(true);
    try {
      const res = await fetch(`/api/games/${game.id}/rsvp`, { method: "DELETE" });
      if (res.ok) { toast.success("ביטלת את ההגעה"); onUpdate(); }
    } catch { toast.error("שגיאה"); }
    finally { setLoading(false); }
  }

  return (
    <div className={clsx("card transition-all", isPast && "opacity-75")}>
      {/* ── Header row ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">

          {/* Status + today badge */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={clsx("badge", status.cls)}>
              <span className={clsx("w-1.5 h-1.5 rounded-full", status.dot)} />
              {status.label}
            </span>
            {game.teamsPublished && game.teams.length > 0 && (
              <span className="badge bg-indigo-100 text-indigo-700 border-indigo-200 text-[11px] font-bold px-2">
                הרכב פורסם
              </span>
            )}
            {isToday(dateObj) && (
              <span className="badge bg-red-500 text-white animate-pulse border-0 text-[11px] font-bold px-2">
                היום
              </span>
            )}
            {/* Payment status badge — only for confirmed players */}
            {myRsvp?.status === "confirmed" && paymentStatus === true && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                <Banknote size={10} /> שולם ₪35
              </span>
            )}
            {myRsvp?.status === "confirmed" && paymentStatus === false && (
              <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-600 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                <AlertCircle size={10} /> חוב ₪35
              </span>
            )}
          </div>

          {/* Date */}
          <h3 className="text-base font-bold text-slate-900 capitalize">{dateLabel}</h3>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Clock size={13} className="shrink-0" />
              {format(dateObj, "HH:mm")}
            </span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1 truncate">
              <MapPin size={13} className="shrink-0" />
              <span className="truncate">{game.location}</span>
            </span>
          </div>

          {/* Notes */}
          {game.notes && (
            <p className="text-sm text-slate-500 mt-2.5 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 leading-relaxed">
              {game.notes}
            </p>
          )}
        </div>

        {/* Player count */}
        <div className="flex flex-col items-center shrink-0">
          <div className={clsx(
            "text-2xl font-black tabular-nums",
            isFull ? "text-red-500" : "text-green-600"
          )}>
            {confirmed.length}
          </div>
          <div className="text-xs text-slate-400 font-medium">/{game.maxPlayers}</div>
          <Users size={13} className="text-slate-300 mt-0.5" />
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="mt-3.5 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all duration-500", isFull ? "bg-red-400" : "bg-green-500")}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* ── RSVP buttons ── */}
      {!isPast && game.status === "open" && (
        <div className="mt-4 flex gap-2">
          {!myRsvp ? (
            <>
              <button
                onClick={() => handleRsvp("confirmed")}
                disabled={loading}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50",
                  isFull
                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    : "bg-green-600 text-white hover:bg-green-700"
                )}
              >
                {isFull ? <Clock4 size={15} /> : <CheckCircle2 size={15} />}
                {isFull ? "רשימת המתנה" : "אני מגיע"}
              </button>
              <button
                onClick={() => handleRsvp("declined")}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all active:scale-95"
              >
                <XCircle size={15} />
                לא אגיע
              </button>
            </>
          ) : (
            <div className="flex-1 flex items-center gap-2.5">
              {myRsvp.status === "declined" ? (
                <>
                  <div className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-semibold text-sm bg-red-50 text-red-600 border border-red-200">
                    <XCircle size={14} /> לא מגיע
                  </div>
                  <button
                    onClick={() => handleRsvp("confirmed")}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm bg-green-600 text-white hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} /> שיניתי דעתי
                  </button>
                </>
              ) : (
                <>
                  <div className={clsx(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm",
                    myRsvp.status === "confirmed" ? "bg-green-50 text-green-700 border border-green-200" :
                    "bg-amber-50 text-amber-700 border border-amber-200"
                  )}>
                    {myRsvp.status === "confirmed" ? <><CheckCircle2 size={14} /> אישרת הגעה</> :
                     <><Clock4 size={14} /> רשימת המתנה</>}
                  </div>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1"
                  >
                    ביטול
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Expand toggle ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3.5 w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
      >
        {expanded ? <><ChevronUp size={14} /> סגור</> : <><ChevronDown size={14} /> פרטים ({confirmed.length} שחקנים{game.teams.length > 0 ? ", הרכבים" : ""})</>}
      </button>

      {/* ── Expanded content ── */}
      {expanded && (
        <div className="mt-3 space-y-4 border-t border-slate-100 pt-4">

          {/* Duties */}
          {game.duties.length > 0 && (
            <div>
              <p className="section-title flex items-center gap-1.5"><RotateCcw size={11} /> תורנויות</p>
              <DutyBadges duties={game.duties} currentUserId={userId} />
            </div>
          )}

          {/* Teams / Lineup / Player list */}
          {game.teamsPublished && game.teams.length > 0 ? (
            <div>
              <p className="section-title mb-3">הרכבי הקבוצות</p>
              <FootballLineup teams={game.teams} />
            </div>
          ) : (
            <div>
              <p className="section-title flex items-center gap-1.5"><Users size={11} /> מגיעים ({confirmed.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {confirmed.map((r) => (
                  <span key={r.user.id} className="inline-flex items-center gap-1 bg-green-50 border border-green-100 text-green-800 px-2.5 py-1 rounded-full text-xs font-medium">
                    <span className="text-[11px]">{positionsIcon(r.user.position)}</span>
                    {r.user.name}
                  </span>
                ))}
              </div>

              {waitlist.length > 0 && (
                <div className="mt-3">
                  <p className="section-title flex items-center gap-1.5"><Clock4 size={11} /> המתנה ({waitlist.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {waitlist.map((r) => (
                      <span key={r.user.id} className="inline-flex items-center badge-yellow text-xs px-2.5 py-1 rounded-full">
                        {r.user.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {declined.length > 0 && (
                <div className="mt-3">
                  <p className="section-title flex items-center gap-1.5 text-red-500"><XCircle size={11} /> לא מגיעים ({declined.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {declined.map((r) => (
                      <span key={r.user.id} className="inline-flex items-center gap-1 bg-red-50 border border-red-100 text-red-600 px-2.5 py-1 rounded-full text-xs font-medium">
                        {r.user.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Survey result */}
          {game.survey && !game.survey.isOpen && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-2.5">
              <Trophy size={16} className="text-amber-500 shrink-0" />
              <span className="text-sm text-slate-700 font-medium">
                {game.survey.isDraw
                  ? "תיקו"
                  : `${game.teams.find((t) => t.id === game.survey?.winnerTeamId)?.name || "לא ידוע"} ניצחה`}
              </span>
            </div>
          )}

          {/* Quick links */}
          <div className="flex gap-2">
            <Link href={`/games/${game.id}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors">
              <MessageSquare size={13} /> {game._count.posts} הודעות
            </Link>
            <Link href={`/games/${game.id}?tab=photos`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors">
              <Camera size={13} /> {game._count.photos} תמונות
            </Link>
            {game.survey?.isOpen && (
              <Link href={`/games/${game.id}?tab=survey`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-purple-100 text-purple-700 text-xs font-semibold hover:bg-purple-200 transition-colors">
                <ClipboardCheck size={13} /> הצבעה
              </Link>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
