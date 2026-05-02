"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { he } from "date-fns/locale";
import GameCard from "@/components/GameCard";
import { Calendar, Clock, MapPin, Loader2, AlertTriangle, Banknote } from "lucide-react";

type Game = {
  id: string;
  date: string;
  location: string;
  maxPlayers: number;
  status: string;
  notes: string | null;
  teamsPublished: boolean;
  publishedDraft: string | null;
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

type PaymentEntry = {
  gameId: string;
  paid: boolean;
  paidAt: string | null;
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [paymentMap, setPaymentMap] = useState<Record<string, boolean>>({});
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchGames();
      fetchMyPayments();
    }
  }, [session]);

  async function fetchGames() {
    try {
      const res  = await fetch("/api/games");
      const data = await res.json();
      setGames(Array.isArray(data) ? data : []);
    } catch {
      setGames([]);
    }
    setLoading(false);
  }

  async function fetchMyPayments() {
    try {
      const res = await fetch("/api/my-payments");
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<string, boolean> = {};
      (data.payments as PaymentEntry[]).forEach((p) => { map[p.gameId] = p.paid; });
      setPaymentMap(map);
      setUnpaidCount(data.unpaidCount ?? 0);
      setTotalDebt(data.totalDebt ?? 0);
    } catch {
      // silently ignore — payment data is optional
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <Loader2 size={28} className="text-green-500 animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const userId   = (session.user as { id?: string }).id!;
  const firstName = session.user?.name?.split(" ")[0] ?? "";
  const upcoming = games.filter((g) => !isPast(new Date(g.date)) || isToday(new Date(g.date)));
  const past     = games.filter((g) => isPast(new Date(g.date)) && !isToday(new Date(g.date)));

  const nextGame = upcoming[0];

  return (
    <div className="space-y-6">

      {/* ── Debt warning banner ── */}
      {unpaidCount > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700">
              יש לך חוב של{" "}
              <span className="text-base font-black">₪{totalDebt}</span>
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              {unpaidCount} {unpaidCount === 1 ? "משחק" : "משחקים"} × ₪35 — עדכן את המנהל לאחר שתשלם
            </p>
          </div>
          <Banknote size={16} className="text-red-400 shrink-0 mt-0.5" />
        </div>
      )}

      {/* ── Hero banner ── */}
      <div className="relative bg-[#0f172a] rounded-2xl overflow-hidden">
        {/* green glow accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative px-6 pt-6 pb-5">
          <p className="text-slate-400 text-sm font-medium mb-0.5">שלום,</p>
          <h1 className="text-xl font-bold text-white">{firstName}</h1>

          {nextGame ? (
            <div className="mt-4 bg-white/8 border border-white/10 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-green-400 uppercase tracking-widest mb-1.5">המשחק הבא</p>
              <p className="font-bold text-white text-base">
                {isToday(new Date(nextGame.date))     ? "היום"
                : isTomorrow(new Date(nextGame.date))  ? "מחר"
                : format(new Date(nextGame.date), "EEEE, d בMMM", { locale: he })}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-400">
                <span className="flex items-center gap-1"><Clock size={12} />{format(new Date(nextGame.date), "HH:mm")}</span>
                <span className="text-slate-600">·</span>
                <span className="flex items-center gap-1 truncate"><MapPin size={12} /><span className="truncate">{nextGame.location}</span></span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-slate-400 text-sm">אין משחקים קרובים בינתיים</p>
          )}
        </div>
      </div>

      {/* ── Upcoming games ── */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">
            <Calendar size={14} />
            משחקים קרובים
          </h2>
          <div className="space-y-3">
            {upcoming.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                userId={userId}
                onUpdate={fetchGames}
                paymentStatus={game.id in paymentMap ? paymentMap[game.id] : null}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Past games ── */}
      {past.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">
            <Clock size={14} />
            משחקים אחרונים
          </h2>
          <div className="space-y-3">
            {past.slice(0, 5).map((game) => (
              <GameCard
                key={game.id}
                game={game}
                userId={userId}
                onUpdate={fetchGames}
                isPast
                paymentStatus={game.id in paymentMap ? paymentMap[game.id] : null}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Empty state ── */}
      {games.length === 0 && (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-600 font-semibold">אין משחקים מתוכננים</p>
          <p className="text-slate-400 text-sm mt-1">המנהל יפרסם משחקים בקרוב</p>
        </div>
      )}

    </div>
  );
}
