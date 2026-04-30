"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format, isPast } from "date-fns";
import { he } from "date-fns/locale";
import clsx from "clsx";

type DutyRecord = {
  id: string;
  type: string;
  user: { id: string; name: string | null };
  game: { id: string; date: string; location: string; status: string };
};

type Tally = { id: string; name: string | null; count: number };

type History = {
  laundry: DutyRecord[];
  fieldPayment: DutyRecord[];
  tallies: {
    laundry: Tally[];
    fieldPayment: Tally[];
  };
};

const DUTY_CONFIG = {
  laundry: {
    label: "כביסת חולצות",
    emoji: "👕",
    headerBg: "bg-blue-500",
    light: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
  fieldPayment: {
    label: "תשלום מגרש",
    emoji: "💵",
    headerBg: "bg-amber-500",
    light: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
  },
};

export default function DutiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [history, setHistory] = useState<History | null>(null);
  const [activeType, setActiveType] = useState<"laundry" | "fieldPayment">("laundry");

  const userId = (session?.user as { id?: string })?.id;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/duties/history")
        .then((r) => r.json())
        .then(setHistory);
    }
  }, [session]);

  if (!history) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-4xl animate-bounce">👕</div>
      </div>
    );
  }

  const records = activeType === "laundry" ? history.laundry : history.fieldPayment;
  const tallies = activeType === "laundry" ? history.tallies.laundry : history.tallies.fieldPayment;
  const cfg = DUTY_CONFIG[activeType];

  const upcoming = records.filter((d) => !isPast(new Date(d.game.date)));
  const past = records.filter((d) => isPast(new Date(d.game.date)));

  // My total counts
  const myLaundry = history.tallies.laundry.find((t) => t.id === userId)?.count ?? 0;
  const myFieldPayment = history.tallies.fieldPayment.find((t) => t.id === userId)?.count ?? 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🔄 היסטוריית תורנויות</h1>
        <p className="text-slate-500 text-sm mt-1">מי עשה מה ומתי</p>
      </div>

      {/* My summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <div className="text-3xl mb-1">👕</div>
          <div className="text-2xl font-bold text-blue-600">{myLaundry}</div>
          <div className="text-xs text-slate-500 mt-0.5">כביסות שלי</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-1">💵</div>
          <div className="text-2xl font-bold text-amber-600">{myFieldPayment}</div>
          <div className="text-xs text-slate-500 mt-0.5">תשלומי מגרש שלי</div>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex bg-white rounded-2xl border border-slate-100 p-1 gap-1">
        {(["laundry", "fieldPayment"] as const).map((type) => {
          const c = DUTY_CONFIG[type];
          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={clsx(
                "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2",
                activeType === type
                  ? `${c.headerBg} text-white shadow-sm`
                  : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Leaderboard */}
      {tallies.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-slate-700 mb-3 text-sm">
            {cfg.emoji} כמה פעמים כל אחד — {cfg.label}
          </h2>
          <div className="space-y-2">
            {tallies.map((t, idx) => (
              <div
                key={t.id}
                className={clsx(
                  "flex items-center gap-3 p-2.5 rounded-xl",
                  t.id === userId ? `${cfg.light} ${cfg.border} border` : "hover:bg-slate-50"
                )}
              >
                <div className={clsx(
                  "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                  idx === 0 ? "bg-yellow-400 text-white" :
                  idx === 1 ? "bg-slate-300 text-white" :
                  idx === 2 ? "bg-orange-400 text-white" :
                  "bg-slate-100 text-slate-500"
                )}>
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                </div>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {t.name?.[0] || "?"}
                </div>
                <span className={clsx("flex-1 font-medium", t.id === userId ? cfg.text : "text-slate-700")}>
                  {t.name}
                  {t.id === userId && <span className="text-xs mr-1 opacity-75">(אתה)</span>}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={clsx("text-xl font-bold", cfg.text)}>{t.count}</span>
                  <span className="text-xs text-slate-400">פעם{t.count !== 1 ? "ים" : ""}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming duties */}
      {upcoming.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2">
            <span className={clsx("px-2 py-0.5 rounded-full text-xs font-bold text-white", cfg.headerBg)}>
              קרוב
            </span>
            {cfg.emoji} {cfg.label} — משחקים קרובים
          </h2>
          <div className="space-y-2">
            {upcoming.map((d) => (
              <DutyRow key={d.id} record={d} userId={userId} cfg={cfg} />
            ))}
          </div>
        </div>
      )}

      {/* Past duties */}
      <div className="card">
        <h2 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-600">
            היסטוריה
          </span>
          {cfg.emoji} {cfg.label} — משחקים שעברו
        </h2>
        {past.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">אין היסטוריה עדיין</p>
        ) : (
          <div className="space-y-2">
            {past.map((d) => (
              <DutyRow key={d.id} record={d} userId={userId} cfg={cfg} isPast />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DutyRow({
  record,
  userId,
  cfg,
  isPast = false,
}: {
  record: DutyRecord;
  userId?: string;
  cfg: (typeof DUTY_CONFIG)[keyof typeof DUTY_CONFIG];
  isPast?: boolean;
}) {
  const isMe = record.user.id === userId;
  return (
    <div className={clsx(
      "flex items-center gap-3 p-3 rounded-xl border transition-colors",
      isMe
        ? `${cfg.light} ${cfg.border}`
        : "border-slate-100 hover:bg-slate-50",
      isPast && "opacity-75"
    )}>
      <div className={clsx(
        "w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0",
        "bg-gradient-to-br from-green-400 to-green-600"
      )}>
        {record.user.name?.[0] || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx("font-semibold text-sm", isMe ? cfg.text : "text-slate-800")}>
          {record.user.name}
          {isMe && <span className="text-xs mr-1 font-normal opacity-75">(אתה)</span>}
        </p>
        <p className="text-xs text-slate-400">
          {format(new Date(record.game.date), "EEEE, d בMMM yyyy · HH:mm", { locale: he })}
        </p>
        <p className="text-xs text-slate-400">📍 {record.game.location}</p>
      </div>
      {!isPast && (
        <span className="badge bg-green-100 text-green-700 text-xs shrink-0">קרוב</span>
      )}
    </div>
  );
}
