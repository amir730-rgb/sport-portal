"use client";

import { useEffect, useState, useCallback } from "react";
import clsx from "clsx";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";

const POSITIONS = [
  { key: "goalkeeper", label: "שוער" },
  { key: "defender", label: "בלם" },
  { key: "midfielder", label: "קשר" },
  { key: "forward", label: "חלוץ" },
];

type Player = {
  id: string;
  name: string | null;
  email: string;
  adminSkillRating: number;
  adminFitnessRating: number;
  adminPositions: string;
};

type Draft = {
  adminSkillRating: number;
  adminFitnessRating: number;
  adminPositions: string[];
};

function parseAdminPositions(raw: string): string[] {
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p)) return p;
  } catch {}
  return [];
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={clsx(
            "w-6 h-6 rounded text-sm transition-all",
            n <= value ? "text-yellow-400" : "text-slate-200 hover:text-yellow-200"
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function PlayerRatingsTab() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data: Player[] = await res.json();
      setPlayers(data);
      const initial: Record<string, Draft> = {};
      data.forEach((p) => {
        initial[p.id] = {
          adminSkillRating: p.adminSkillRating,
          adminFitnessRating: p.adminFitnessRating,
          adminPositions: parseAdminPositions(p.adminPositions),
        };
      });
      setDrafts(initial);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  const update = (id: string, field: keyof Draft, value: Draft[keyof Draft]) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const togglePosition = (id: string, pos: string) => {
    const current = drafts[id]?.adminPositions ?? [];
    const next = current.includes(pos) ? current.filter((p) => p !== pos) : [...current, pos];
    update(id, "adminPositions", next);
  };

  const save = async (id: string) => {
    const d = drafts[id];
    if (!d) return;
    setSaving(id);
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: id,
        adminSkillRating: d.adminSkillRating,
        adminFitnessRating: d.adminFitnessRating,
        adminPositions: JSON.stringify(d.adminPositions),
      }),
    });
    if (res.ok) {
      toast.success("נשמר");
    } else {
      toast.error("שגיאה");
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        הנתונים הבאים גלויים למנהל בלבד ומשמשים לבניית קבוצות מאוזנות.
      </p>

      <div className="space-y-3">
        {players.map((player) => {
          const d = drafts[player.id];
          if (!d) return null;
          const isDirty =
            d.adminSkillRating !== player.adminSkillRating ||
            d.adminFitnessRating !== player.adminFitnessRating ||
            JSON.stringify(d.adminPositions.sort()) !== JSON.stringify(parseAdminPositions(player.adminPositions).sort());

          return (
            <div key={player.id} className="bg-slate-50 rounded-2xl p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                    {player.name?.[0] ?? "?"}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{player.name}</p>
                    <p className="text-xs text-slate-400">{player.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => save(player.id)}
                  disabled={!isDirty || saving === player.id}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    isDirty
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-slate-200 text-slate-400 cursor-default"
                  )}
                >
                  {saving === player.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Save size={12} />
                  )}
                  שמור
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* Skill */}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">רמת משחק</p>
                  <StarPicker
                    value={d.adminSkillRating}
                    onChange={(v) => update(player.id, "adminSkillRating", v)}
                  />
                </div>

                {/* Fitness */}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">כושר גופני</p>
                  <StarPicker
                    value={d.adminFitnessRating}
                    onChange={(v) => update(player.id, "adminFitnessRating", v)}
                  />
                </div>

                {/* Positions */}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">עמדות</p>
                  <div className="flex flex-wrap gap-1">
                    {POSITIONS.map((pos) => (
                      <button
                        key={pos.key}
                        type="button"
                        onClick={() => togglePosition(player.id, pos.key)}
                        className={clsx(
                          "px-2 py-0.5 rounded-full text-xs font-medium border transition-all",
                          d.adminPositions.includes(pos.key)
                            ? "bg-blue-500 text-white border-blue-500"
                            : "bg-white text-slate-500 border-slate-300 hover:border-blue-300"
                        )}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
