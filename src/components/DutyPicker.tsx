"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { DUTY_CONFIG } from "./DutyBadges";

type Player = { id: string; name: string | null };
type Duty = { type: string; user: { id: string; name: string | null } };

type Props = {
  gameId: string;
  players: Player[];        // confirmed players
  duties: Duty[];
  onUpdate: () => void;
};

export default function DutyPicker({ gameId, players, duties, onUpdate }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  async function assign(type: string, userId: string | "") {
    setLoading(type);
    try {
      const res = await fetch(`/api/games/${gameId}/duties`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, userId: userId || null }),
      });
      if (res.ok) {
        const cfg = DUTY_CONFIG[type as keyof typeof DUTY_CONFIG];
        if (userId) {
          const player = players.find((p) => p.id === userId);
          toast.success(`${cfg.emoji} ${player?.name} - ${cfg.label}`);
        } else {
          toast.success("תורנות הוסרה");
        }
        onUpdate();
      } else {
        toast.error("שגיאה");
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3 pt-3 border-t border-slate-100">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">🔄 תורנויות</p>
      {Object.entries(DUTY_CONFIG).map(([type, cfg]) => {
        const current = duties.find((d) => d.type === type);
        return (
          <div key={type} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-sm font-medium min-w-[130px] px-2.5 py-1.5 rounded-lg ${cfg.bg} ${cfg.text}`}>
              <span>{cfg.emoji}</span>
              <span>{cfg.label}</span>
            </div>
            <select
              value={current?.user.id || ""}
              onChange={(e) => assign(type, e.target.value)}
              disabled={loading === type}
              className="flex-1 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50"
            >
              <option value="">— ללא תורנות —</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
