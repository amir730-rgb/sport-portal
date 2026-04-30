"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import toast from "react-hot-toast";
import clsx from "clsx";
import {
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  AlertCircle,
  Loader2,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */

type PlayerRecord = {
  userId: string;
  userName: string | null;
  paid: boolean;
  paidAt: string | null;
  note: string | null;
};

type GamePayment = {
  id: string;
  date: string;
  location: string;
  status: string;
  players: PlayerRecord[];
  paidCount: number;
  totalCount: number;
};

type PlayerHistory = {
  gameId: string;
  date: string;
  location: string;
  paid: boolean;
  paidAt: string | null;
  note: string | null;
};

type PlayerPayment = {
  userId: string;
  userName: string | null;
  totalGames: number;
  paidGames: number;
  history: PlayerHistory[];
};

type PaymentsData = {
  byGame: GamePayment[];
  byPlayer: PlayerPayment[];
};

/* ── Component ───────────────────────────────────────────────── */

export default function PaymentsTab() {
  const [data, setData] = useState<PaymentsData | null>(null);
  const [view, setView] = useState<"game" | "player">("game");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  const fetchPayments = useCallback(async () => {
    const res = await fetch("/api/admin/payments");
    if (res.ok) setData(await res.json());
    setFetching(false);
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  async function togglePayment(gameId: string, userId: string, currentPaid: boolean) {
    const key = `${gameId}-${userId}`;
    setLoadingKey(key);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, userId, paid: !currentPaid }),
      });
      if (res.ok) {
        toast.success(!currentPaid ? "סומן כשולם ✓" : "סומן כלא שולם");
        await fetchPayments();
      } else {
        toast.error("שגיאה בעדכון");
      }
    } finally {
      setLoadingKey(null);
    }
  }

  /* ── Loading ── */
  if (fetching) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 size={24} className="text-green-500 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const noData = data.byGame.length === 0;

  /* ── Summary bar ── */
  const totalExpected = data.byGame.reduce((s, g) => s + g.totalCount, 0);
  const totalPaid     = data.byGame.reduce((s, g) => s + g.paidCount, 0);
  const totalDebt     = totalExpected - totalPaid;

  return (
    <div className="space-y-4">

      {/* ── Summary ── */}
      {!noData && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "סה״כ צפויים",    value: totalExpected, cls: "text-slate-700" },
            { label: "שילמו",          value: totalPaid,     cls: "text-green-600" },
            { label: "ממתינים לתשלום", value: totalDebt,     cls: totalDebt > 0 ? "text-red-500" : "text-slate-400" },
          ].map((s) => (
            <div key={s.label} className="card text-center py-3">
              <div className={clsx("text-2xl font-black", s.cls)}>{s.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── View toggle ── */}
      <div className="flex bg-white rounded-2xl border border-slate-200 p-1 gap-1">
        <button
          onClick={() => { setView("game"); setExpanded(null); }}
          className={clsx(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all",
            view === "game" ? "bg-green-600 text-white" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          <Calendar size={14} /> לפי משחק
        </button>
        <button
          onClick={() => { setView("player"); setExpanded(null); }}
          className={clsx(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all",
            view === "player" ? "bg-green-600 text-white" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          <User size={14} /> לפי שחקן
        </button>
      </div>

      {/* ── Empty state ── */}
      {noData && (
        <div className="text-center py-16">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <AlertCircle size={22} className="text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">אין נתוני תשלום עדיין</p>
          <p className="text-slate-400 text-sm mt-1">
            תשלומים יופיעו כאשר שחקנים יאשרו הגעה למשחקים
          </p>
        </div>
      )}

      {/* ══ BY GAME ══════════════════════════════════════════ */}
      {view === "game" && (
        <div className="space-y-3">
          {data.byGame.map((game) => {
            const dateObj = new Date(game.date);
            const isOpen  = expanded === game.id;
            const allPaid = game.paidCount === game.totalCount;

            return (
              <div key={game.id} className="card">
                <button
                  onClick={() => setExpanded(isOpen ? null : game.id)}
                  className="w-full flex items-center justify-between gap-3"
                >
                  <div className="text-right flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">
                      {format(dateObj, "EEEE, d בMMM", { locale: he })}
                      <span className="text-slate-400 font-normal"> · {format(dateObj, "HH:mm")}</span>
                    </p>
                    <p className="text-xs text-slate-500 truncate">{game.location}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Progress pill */}
                    <div className="flex flex-col items-center min-w-[52px]">
                      <div className="flex items-end gap-0.5">
                        <span className={clsx("text-xl font-black tabular-nums", allPaid ? "text-green-600" : "text-amber-500")}>
                          {game.paidCount}
                        </span>
                        <span className="text-slate-400 text-sm mb-0.5">/{game.totalCount}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1 mt-0.5">
                        <div
                          className={clsx("h-full rounded-full transition-all", allPaid ? "bg-green-500" : "bg-amber-400")}
                          style={{ width: `${(game.paidCount / game.totalCount) * 100}%` }}
                        />
                      </div>
                    </div>
                    {isOpen
                      ? <ChevronUp size={15} className="text-slate-400" />
                      : <ChevronDown size={15} className="text-slate-400" />}
                  </div>
                </button>

                {/* Player list */}
                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                    {game.players.map((player) => {
                      const key = `${game.id}-${player.userId}`;
                      const busy = loadingKey === key;
                      return (
                        <div key={player.userId} className="flex items-center justify-between gap-2 py-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                              {player.userName?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">{player.userName}</p>
                              {player.paid && player.paidAt && (
                                <p className="text-xs text-slate-400">
                                  {format(new Date(player.paidAt), "d/M/yyyy · HH:mm")}
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => togglePayment(game.id, player.userId, player.paid)}
                            disabled={busy}
                            className={clsx(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 shrink-0",
                              player.paid
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                          >
                            {busy
                              ? <Loader2 size={12} className="animate-spin" />
                              : player.paid
                                ? <><CheckCircle2 size={12} /> שילם</>
                                : <><Clock size={12} /> לא שילם</>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ BY PLAYER ════════════════════════════════════════ */}
      {view === "player" && (
        <div className="space-y-3">
          {data.byPlayer.map((player) => {
            const isOpen = expanded === `p-${player.userId}`;
            const debt   = player.totalGames - player.paidGames;
            const pct    = player.totalGames > 0
              ? Math.round((player.paidGames / player.totalGames) * 100)
              : 0;

            return (
              <div key={player.userId} className="card">
                <button
                  onClick={() => setExpanded(isOpen ? null : `p-${player.userId}`)}
                  className="w-full flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-green-100 text-green-700 flex items-center justify-center font-bold shrink-0 text-sm">
                    {player.userName?.[0]?.toUpperCase() || "?"}
                  </div>

                  <div className="flex-1 text-right min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{player.userName}</p>
                    <p className="text-xs text-slate-400">
                      {player.paidGames}/{player.totalGames} משחקים שולמו · {pct}%
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {debt > 0 && (
                      <span className="badge-red text-[11px] px-2 py-0.5">{debt} חוב</span>
                    )}
                    {debt === 0 && player.totalGames > 0 && (
                      <span className="badge-green text-[11px] px-2 py-0.5">מעודכן</span>
                    )}
                    {isOpen
                      ? <ChevronUp size={14} className="text-slate-400" />
                      : <ChevronDown size={14} className="text-slate-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                    {player.history.map((h) => {
                      const key  = `${h.gameId}-${player.userId}`;
                      const busy = loadingKey === key;
                      return (
                        <div key={h.gameId} className="flex items-center justify-between gap-2 py-0.5">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700">
                              {format(new Date(h.date), "EEEE, d בMMM", { locale: he })}
                            </p>
                            <p className="text-xs text-slate-400 truncate">{h.location}</p>
                            {h.paid && h.paidAt && (
                              <p className="text-xs text-green-600">
                                שולם: {format(new Date(h.paidAt), "d/M/yyyy")}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => togglePayment(h.gameId, player.userId, h.paid)}
                            disabled={busy}
                            className={clsx(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 shrink-0",
                              h.paid
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                          >
                            {busy
                              ? <Loader2 size={12} className="animate-spin" />
                              : h.paid
                                ? <><CheckCircle2 size={12} /> שילם</>
                                : <><Clock size={12} /> לא שילם</>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
