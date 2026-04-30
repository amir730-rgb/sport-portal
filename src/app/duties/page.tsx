"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import clsx from "clsx";
import toast from "react-hot-toast";
import { Shirt, Banknote, CheckCircle2, Clock, ArrowRight, RotateCcw, Loader2, Trash2 } from "lucide-react";

type RosterRow = {
  id: string;
  name: string | null;
  laundryCount: number;
  fieldPayCount: number;
};

type HistoryEntry = {
  id: string;
  userId: string;
  userName: string | null;
  date: string;
  location: string | null;
  gameId: string | null;
  note: string | null;
};

type RosterData = {
  roster: RosterRow[];
  nextLaundryId: string | null;
  nextFieldPayId: string | null;
  laundryHistory: HistoryEntry[];
  fieldPayHistory: HistoryEntry[];
};

const DUTY_CONFIG = {
  laundry: {
    label: "כביסת חולצות",
    Icon: Shirt,
    nextId: "nextLaundryId" as const,
    history: "laundryHistory" as const,
    count: "laundryCount" as const,
    color: "blue",
    bg: "bg-blue-600",
    light: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
    nextBg: "bg-blue-600",
  },
  field_payment: {
    label: "תשלום מגרש",
    Icon: Banknote,
    nextId: "nextFieldPayId" as const,
    history: "fieldPayHistory" as const,
    count: "fieldPayCount" as const,
    color: "amber",
    bg: "bg-amber-500",
    light: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
    nextBg: "bg-amber-500",
  },
} as const;

type DutyType = keyof typeof DUTY_CONFIG;

export default function DutiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<RosterData | null>(null);
  const [activeTab, setActiveTab] = useState<DutyType>("laundry");
  const [marking, setMarking] = useState<string | null>(null); // userId being marked
  const [deleting, setDeleting] = useState<string | null>(null);

  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  const isAdmin = sessionUser?.role === "admin";
  const myId = sessionUser?.id;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session) load();
  }, [session]);

  async function load() {
    try {
      const res = await fetch("/api/duties/roster");
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
  }

  async function markDone(userId: string, type: DutyType) {
    setMarking(userId + type);
    try {
      const res = await fetch("/api/admin/duties/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type }),
      });
      if (res.ok) {
        const name = data?.roster.find(r => r.id === userId)?.name ?? "שחקן";
        toast.success(`${name} — סומן כביצוע`);
        await load();
      } else {
        toast.error("שגיאה");
      }
    } catch { toast.error("שגיאה"); }
    finally { setMarking(null); }
  }

  async function removeEntry(dutyId: string) {
    setDeleting(dutyId);
    try {
      const res = await fetch("/api/admin/duties/mark", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dutyId }),
      });
      if (res.ok) { toast.success("רשומה הוסרה"); await load(); }
      else toast.error("שגיאה — ניתן למחוק רק רשומות ידניות");
    } catch { toast.error("שגיאה"); }
    finally { setDeleting(null); }
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <Loader2 size={28} className="text-green-500 animate-spin" />
      </div>
    );
  }

  const cfg = DUTY_CONFIG[activeTab];
  const nextId = data[cfg.nextId];
  const history = data[cfg.history];
  const myCount = activeTab === "laundry"
    ? (data.roster.find(r => r.id === myId)?.laundryCount ?? 0)
    : (data.roster.find(r => r.id === myId)?.fieldPayCount ?? 0);

  return (
    <div className="space-y-5">

      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <RotateCcw size={20} className="text-green-600" /> תורנויות
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">רוטציה + היסטוריה</p>
      </div>

      {/* My summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center py-3">
          <Shirt size={20} className="text-blue-500 mx-auto mb-1" />
          <div className="text-2xl font-bold text-blue-600">
            {data.roster.find(r => r.id === myId)?.laundryCount ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">כביסות שלי</div>
        </div>
        <div className="card text-center py-3">
          <Banknote size={20} className="text-amber-500 mx-auto mb-1" />
          <div className="text-2xl font-bold text-amber-600">
            {data.roster.find(r => r.id === myId)?.fieldPayCount ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">תשלומי מגרש שלי</div>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex bg-white rounded-2xl border border-slate-100 p-1 gap-1">
        {(Object.entries(DUTY_CONFIG) as [DutyType, typeof cfg][]).map(([type, c]) => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={clsx(
              "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2",
              activeTab === type ? `${c.bg} text-white shadow-sm` : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <c.Icon size={14} /> {c.label}
          </button>
        ))}
      </div>

      {/* Next-in-line hero card */}
      {nextId && (
        <div className={clsx("rounded-2xl p-4 flex items-center gap-3", cfg.light, "border", cfg.border)}>
          <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0", cfg.bg)}>
            <ArrowRight size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">הבא בתור</p>
            <p className={clsx("font-black text-lg", cfg.text)}>
              {data.roster.find(r => r.id === nextId)?.name ?? "—"}
            </p>
            <p className="text-xs text-slate-400">
              {activeTab === "laundry"
                ? `${data.roster.find(r => r.id === nextId)?.laundryCount ?? 0} ביצועים עד כה`
                : `${data.roster.find(r => r.id === nextId)?.fieldPayCount ?? 0} ביצועים עד כה`}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => markDone(nextId, activeTab)}
              disabled={!!marking}
              className={clsx(
                "mr-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors",
                cfg.bg, "text-white hover:opacity-90 disabled:opacity-50"
              )}
            >
              {marking === nextId + activeTab
                ? <Loader2 size={12} className="animate-spin" />
                : <CheckCircle2 size={12} />}
              סמן כביצוע
            </button>
          )}
        </div>
      )}

      {/* Rotation list */}
      <div className="card">
        <p className="section-title flex items-center gap-1.5 mb-3">
          <cfg.Icon size={11} /> רשימת רוטציה — {cfg.label}
        </p>
        <div className="space-y-1.5">
          {data.roster.map((row, idx) => {
            const count = activeTab === "laundry" ? row.laundryCount : row.fieldPayCount;
            const isNext = row.id === nextId;
            const isMe = row.id === myId;
            return (
              <div
                key={row.id}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                  isNext ? clsx(cfg.light, "border", cfg.border) :
                  isMe ? "bg-green-50 border border-green-100" :
                  "hover:bg-slate-50"
                )}
              >
                {/* Rank */}
                <div className="w-6 text-center text-xs font-bold text-slate-400 shrink-0">
                  {idx + 1}
                </div>

                {/* Avatar */}
                <div className={clsx(
                  "w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0",
                  "bg-gradient-to-br from-green-400 to-green-600"
                )}>
                  {row.name?.[0] || "?"}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={clsx(
                    "font-semibold text-sm truncate",
                    isNext ? cfg.text : isMe ? "text-green-700" : "text-slate-800"
                  )}>
                    {row.name}
                    {isMe && <span className="text-xs font-normal text-slate-400 mr-1">(אתה)</span>}
                  </p>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-2 shrink-0">
                  {isNext && (
                    <span className={clsx("text-[11px] font-bold px-2 py-0.5 rounded-full text-white", cfg.bg)}>
                      הבא בתור
                    </span>
                  )}
                  {count > 0 ? (
                    <span className={clsx("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", cfg.badge)}>
                      <CheckCircle2 size={10} /> {count}×
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 px-2 py-0.5 rounded-full bg-slate-100">
                      <Clock size={10} /> טרם ביצע
                    </span>
                  )}
                </div>

                {/* Admin mark button */}
                {isAdmin && !isNext && (
                  <button
                    onClick={() => markDone(row.id, activeTab)}
                    disabled={!!marking}
                    title="סמן כביצוע"
                    className="text-slate-300 hover:text-green-600 transition-colors disabled:opacity-40 p-1"
                  >
                    {marking === row.id + activeTab
                      ? <Loader2 size={13} className="animate-spin" />
                      : <CheckCircle2 size={13} />}
                  </button>
                )}
              </div>
            );
          })}

          {data.roster.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-6">אין שחקנים רשומים</p>
          )}
        </div>
      </div>

      {/* History log */}
      <div className="card">
        <p className="section-title flex items-center gap-1.5 mb-3">
          <Clock size={11} /> היסטוריה — {cfg.label}
          <span className="mr-auto text-slate-400 font-normal">
            {history.length} רשומות
          </span>
        </p>

        {history.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">אין היסטוריה עדיין</p>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {entry.userName?.[0] || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 truncate">{entry.userName}</p>
                  <p className="text-xs text-slate-400">
                    {format(new Date(entry.date), "EEEE, d בMMM yyyy", { locale: he })}
                    {entry.location && ` · ${entry.location}`}
                    {entry.note && (
                      <span className="text-slate-300"> · {entry.note}</span>
                    )}
                  </p>
                </div>
                {/* Admin: delete standalone (manual) entries */}
                {isAdmin && !entry.gameId && (
                  <button
                    onClick={() => removeEntry(entry.id)}
                    disabled={deleting === entry.id}
                    className="text-slate-300 hover:text-red-500 transition-colors p-1"
                    title="הסר רשומה ידנית"
                  >
                    {deleting === entry.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Trash2 size={13} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
