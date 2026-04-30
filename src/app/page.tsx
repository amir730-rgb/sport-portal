"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { he } from "date-fns/locale";
import toast from "react-hot-toast";
import GameCard from "@/components/GameCard";

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

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) fetchGames();
  }, [session]);

  async function fetchGames() {
    try {
      const res = await fetch("/api/games");
      const data = await res.json();
      setGames(Array.isArray(data) ? data : []);
    } catch {
      setGames([]);
    }
    setLoading(false);
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-4xl animate-bounce">⚽</div>
      </div>
    );
  }

  if (!session) return null;

  const userId = (session.user as { id?: string }).id!;
  const upcoming = games.filter((g) => !isPast(new Date(g.date)) || isToday(new Date(g.date)));
  const past = games.filter((g) => isPast(new Date(g.date)) && !isToday(new Date(g.date)));

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">שלום, {session.user?.name?.split(" ")[0]}! 👋</h1>
            <p className="text-green-100 mt-1">
              {upcoming.length > 0
                ? `יש ${upcoming.length} משחק${upcoming.length > 1 ? "ים" : ""} קרוב${upcoming.length > 1 ? "ים" : ""}`
                : "אין משחקים קרובים בינתיים"}
            </p>
          </div>
          <div className="text-5xl">⚽</div>
        </div>

        {/* Next game highlight */}
        {upcoming[0] && (
          <div className="mt-4 bg-white/20 rounded-xl p-4">
            <p className="text-green-100 text-sm font-medium">המשחק הבא</p>
            <p className="font-bold text-lg mt-1">
              {isToday(new Date(upcoming[0].date))
                ? "היום!"
                : isTomorrow(new Date(upcoming[0].date))
                ? "מחר"
                : format(new Date(upcoming[0].date), "EEEE, d בMMM", { locale: he })}
              {" · "}
              {format(new Date(upcoming[0].date), "HH:mm")}
            </p>
            <p className="text-green-100 text-sm">{upcoming[0].location}</p>
          </div>
        )}
      </div>

      {/* Upcoming Games */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            📅 משחקים קרובים
          </h2>
          <div className="space-y-4">
            {upcoming.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                userId={userId}
                onUpdate={fetchGames}
              />
            ))}
          </div>
        </section>
      )}

      {/* Past Games */}
      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            🕐 משחקים אחרונים
          </h2>
          <div className="space-y-4">
            {past.slice(0, 5).map((game) => (
              <GameCard
                key={game.id}
                game={game}
                userId={userId}
                onUpdate={fetchGames}
                isPast
              />
            ))}
          </div>
        </section>
      )}

      {games.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <div className="text-6xl mb-4">🏟️</div>
          <p className="text-lg font-medium">עדיין אין משחקים מתוכננים</p>
          <p className="text-sm mt-1">המנהל יפרסם משחקים בקרוב</p>
        </div>
      )}
    </div>
  );
}
