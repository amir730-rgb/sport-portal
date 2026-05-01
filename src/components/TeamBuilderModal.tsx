"use client";

import { useEffect, useState, useCallback } from "react";
import clsx from "clsx";
import { X, Loader2, Users, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { TEAM_COLORS, POSITION_LABELS } from "@/lib/teams";

const POSITIONS = ["goalkeeper", "defender", "midfielder", "forward"];

type AdminPlayer = {
  id: string;
  name: string | null;
  adminSkillRating: number;
  adminFitnessRating: number;
  adminPositions: string; // JSON string
};

type TeamSlot = {
  userId: string;
  slotNote: string | null;
};

type TeamDraft = {
  name: string;
  color: string;
  bg: string;
  text: string;
  border: string;
  light: string;
  players: TeamSlot[];
};

function playerStrength(p: AdminPlayer): number {
  return (p.adminSkillRating * 0.6 + p.adminFitnessRating * 0.4);
}

function teamStrength(team: TeamDraft, allPlayers: AdminPlayer[]): number {
  if (team.players.length === 0) return 0;
  const total = team.players.reduce((sum, slot) => {
    const p = allPlayers.find((ap) => ap.id === slot.userId);
    return sum + (p ? playerStrength(p) : 0);
  }, 0);
  return total / team.players.length;
}

function teamSkillTotal(team: TeamDraft, allPlayers: AdminPlayer[]): number {
  return team.players.reduce((sum, slot) => {
    const p = allPlayers.find((ap) => ap.id === slot.userId);
    return sum + (p?.adminSkillRating ?? 0);
  }, 0);
}

function teamFitnessTotal(team: TeamDraft, allPlayers: AdminPlayer[]): number {
  return team.players.reduce((sum, slot) => {
    const p = allPlayers.find((ap) => ap.id === slot.userId);
    return sum + (p?.adminFitnessRating ?? 0);
  }, 0);
}

function parsePositions(raw: string): string[] {
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p)) return p;
  } catch {}
  return [];
}

function StrengthBar({ value, className }: { value: number; className: string }) {
  const pct = Math.round((value / 5) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full transition-all", className)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-600 w-8 text-left">{value.toFixed(1)}</span>
    </div>
  );
}

function buildTeams(n: number): TeamDraft[] {
  return TEAM_COLORS.slice(0, n).map((c) => ({
    name: c.name,
    color: c.color,
    bg: c.bg,
    text: c.text,
    border: c.border,
    light: c.light,
    players: [],
  }));
}

const STRENGTH_COLORS = ["bg-red-400", "bg-blue-400", "bg-green-400", "bg-yellow-400"];

export default function TeamBuilderModal({
  gameId,
  gameLabel,
  onClose,
  onSaved,
}: {
  gameId: string;
  gameLabel: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [numTeams, setNumTeams] = useState(2);
  const [teams, setTeams] = useState<TeamDraft[]>(buildTeams(2));
  const [allPlayers, setAllPlayers] = useState<AdminPlayer[]>([]);
  const [activeTeamIdx, setActiveTeamIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noteMenuFor, setNoteMenuFor] = useState<string | null>(null); // "teamIdx-userId"

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/games/${gameId}/players`);
    if (res.ok) setAllPlayers(await res.json());
    setLoading(false);
  }, [gameId]);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  // Reset teams when numTeams changes but keep existing assignments if possible
  const changeNumTeams = (n: number) => {
    setNumTeams(n);
    setTeams((prev) => {
      const next = buildTeams(n);
      prev.forEach((t, i) => {
        if (i < n) next[i].players = t.players;
      });
      return next;
    });
    setActiveTeamIdx(0);
  };

  const assignedIds = new Set(teams.flatMap((t) => t.players.map((p) => p.userId)));
  const pool = allPlayers.filter((p) => !assignedIds.has(p.id));

  const addToTeam = (playerId: string) => {
    setTeams((prev) =>
      prev.map((t, i) =>
        i === activeTeamIdx
          ? { ...t, players: [...t.players, { userId: playerId, slotNote: null }] }
          : t
      )
    );
  };

  const removeFromTeam = (teamIdx: number, userId: string) => {
    setTeams((prev) =>
      prev.map((t, i) =>
        i === teamIdx ? { ...t, players: t.players.filter((p) => p.userId !== userId) } : t
      )
    );
  };

  const setNote = (teamIdx: number, userId: string, note: string | null) => {
    setTeams((prev) =>
      prev.map((t, i) =>
        i === teamIdx
          ? {
              ...t,
              players: t.players.map((p) =>
                p.userId === userId ? { ...p, slotNote: p.slotNote === note ? null : note } : p
              ),
            }
          : t
      )
    );
    setNoteMenuFor(null);
  };

  const saveTeams = async () => {
    setSaving(true);
    const res = await fetch(`/api/games/${gameId}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manual: true,
        teams: teams.map((t) => ({
          name: t.name,
          color: t.color,
          players: t.players,
        })),
      }),
    });
    if (res.ok) {
      toast.success("הקבוצות נשמרו");
      onSaved();
      onClose();
    } else {
      toast.error("שגיאה בשמירה");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl my-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">בניית קבוצות</h2>
            <p className="text-sm text-slate-400 mt-0.5">{gameLabel}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Num teams selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">מספר קבוצות:</span>
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => changeNumTeams(n)}
                className={clsx(
                  "w-10 h-10 rounded-xl font-bold text-sm transition-all",
                  numTeams === n ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                {n}
              </button>
            ))}
            <span className="text-sm text-slate-400 mr-2">
              {allPlayers.length} שחקנים אישרו הגעה
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
          ) : (
            <>
              {/* Teams grid */}
              <div className={clsx("grid gap-3", numTeams === 2 ? "grid-cols-2" : numTeams === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
                {teams.map((team, teamIdx) => {
                  const strength    = teamStrength(team, allPlayers);
                  const skillTotal  = teamSkillTotal(team, allPlayers);
                  const fitTotal    = teamFitnessTotal(team, allPlayers);
                  const isActive    = activeTeamIdx === teamIdx;
                  return (
                    <div
                      key={team.color}
                      onClick={() => setActiveTeamIdx(teamIdx)}
                      className={clsx(
                        "rounded-2xl border-2 p-3 cursor-pointer transition-all",
                        isActive ? `${team.border} ${team.light}` : "border-slate-200 bg-slate-50 hover:border-slate-300"
                      )}
                    >
                      {/* Team header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className={clsx("w-3 h-3 rounded-full", team.bg)} />
                        <span className={clsx("text-sm font-bold", isActive ? team.text : "text-slate-700")}>
                          {team.name}
                        </span>
                        <span className="text-xs text-slate-400 mr-auto">
                          <Users size={12} className="inline" /> {team.players.length}
                        </span>
                      </div>

                      {/* Skill + Fitness totals */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          ★ {skillTotal % 1 === 0 ? skillTotal : skillTotal.toFixed(1)}
                          <span className="font-normal text-amber-400">רמה</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          ⚡ {fitTotal % 1 === 0 ? fitTotal : fitTotal.toFixed(1)}
                          <span className="font-normal text-blue-400">כושר</span>
                        </span>
                      </div>

                      {/* Overall strength bar */}
                      <StrengthBar
                        value={strength}
                        className={STRENGTH_COLORS[teamIdx % STRENGTH_COLORS.length]}
                      />

                      {/* Players in this team */}
                      <div className="mt-2 space-y-1">
                        {team.players.map((slot) => {
                          const p = allPlayers.find((ap) => ap.id === slot.userId);
                          if (!p) return null;
                          const menuKey = `${teamIdx}-${slot.userId}`;
                          return (
                            <div key={slot.userId} className="flex items-center gap-1 group">
                              <div className="flex-1 flex items-center gap-1.5 bg-white rounded-lg px-2 py-1 border border-slate-200">
                                <span className="text-xs font-medium text-slate-700 truncate flex-1">
                                  {p.name}
                                </span>
                                {slot.slotNote && (
                                  <span className={clsx(
                                    "text-xs px-1 rounded font-medium",
                                    slot.slotNote === "שוער" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"
                                  )}>
                                    {slot.slotNote}
                                  </span>
                                )}
                              </div>
                              {/* Note menu */}
                              <div className="relative">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setNoteMenuFor(noteMenuFor === menuKey ? null : menuKey); }}
                                  className="w-5 h-5 rounded text-slate-400 hover:text-slate-600 flex items-center justify-center"
                                  title="תיוג"
                                >
                                  <ChevronDown size={10} />
                                </button>
                                {noteMenuFor === menuKey && (
                                  <div className="absolute left-0 top-6 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[110px]" onClick={(e) => e.stopPropagation()}>
                                    {["שוער", "שחקן משלים"].map((note) => (
                                      <button
                                        key={note}
                                        onClick={() => setNote(teamIdx, slot.userId, note)}
                                        className={clsx(
                                          "block w-full text-right px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors",
                                          slot.slotNote === note ? "font-bold text-slate-800" : "text-slate-600"
                                        )}
                                      >
                                        {slot.slotNote === note ? "✓ " : ""}{note}
                                      </button>
                                    ))}
                                    <button
                                      onClick={() => { removeFromTeam(teamIdx, slot.userId); setNoteMenuFor(null); }}
                                      className="block w-full text-right px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors border-t border-slate-100"
                                    >
                                      הסר מקבוצה
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {isActive && (
                          <p className="text-xs text-slate-400 text-center pt-1 border-t border-dashed border-slate-200 mt-1">
                            לחץ שחקן מהרשימה להוסיף
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Balance comparison */}
              {teams.some((t) => t.players.length > 0) && (
                <div className="bg-slate-50 rounded-xl p-3 space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">מאזן כוחות</p>

                  {/* Overall strength bars */}
                  <div className="space-y-1.5">
                    {teams.map((team, i) => {
                      const s    = teamStrength(team, allPlayers);
                      const maxS = Math.max(...teams.map((t) => teamStrength(t, allPlayers)));
                      return (
                        <div key={team.color} className="flex items-center gap-2">
                          <div className={clsx("w-2.5 h-2.5 rounded-full shrink-0", team.bg)} />
                          <span className="text-xs text-slate-600 w-20 truncate">{team.name}</span>
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={clsx("h-full rounded-full transition-all", STRENGTH_COLORS[i % STRENGTH_COLORS.length])}
                              style={{ width: maxS > 0 ? `${(s / maxS) * 100}%` : "0%" }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-600 w-8 text-left">{s.toFixed(1)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Skill + Fitness totals grid */}
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${teams.length}, 1fr)` }}>
                    {teams.map((team) => {
                      const skill = teamSkillTotal(team, allPlayers);
                      const fit   = teamFitnessTotal(team, allPlayers);
                      return (
                        <div key={team.color} className="bg-white rounded-xl p-2 text-center border border-slate-200">
                          <div className="flex items-center justify-center gap-1.5 mb-1">
                            <div className={clsx("w-2 h-2 rounded-full", team.bg)} />
                            <span className="text-xs font-semibold text-slate-600">{team.name}</span>
                          </div>
                          <div className="flex justify-center gap-3">
                            <div title="סה&quot;כ רמת משחק">
                              <div className="text-sm font-black text-amber-600">★{skill % 1 === 0 ? skill : skill.toFixed(1)}</div>
                              <div className="text-[10px] text-slate-400">רמה</div>
                            </div>
                            <div title="סה&quot;כ כושר גופני">
                              <div className="text-sm font-black text-blue-600">⚡{fit % 1 === 0 ? fit : fit.toFixed(1)}</div>
                              <div className="text-[10px] text-slate-400">כושר</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Player pool */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-slate-700">
                    שחקנים לשיבוץ
                    <span className="text-slate-400 font-normal mr-1">({pool.length})</span>
                  </p>
                  <span className="text-xs text-slate-400">
                    — לחץ לשיבוץ ל
                    <span className={clsx("font-bold", teams[activeTeamIdx]?.text)}>
                      {" "}{teams[activeTeamIdx]?.name}
                    </span>
                  </span>
                </div>

                {pool.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">
                    כל השחקנים שובצו
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {pool.map((p) => {
                      const positions = parsePositions(p.adminPositions);
                      return (
                        <button
                          key={p.id}
                          onClick={() => addToTeam(p.id)}
                          className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-400 hover:shadow-sm transition-all text-right"
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
                            {p.name?.[0] ?? "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-slate-400">
                                ★{p.adminSkillRating % 1 === 0 ? p.adminSkillRating : p.adminSkillRating.toFixed(1)}{" "}
                                ⚡{p.adminFitnessRating % 1 === 0 ? p.adminFitnessRating : p.adminFitnessRating.toFixed(1)}
                              </span>
                              {positions.length > 0 && (
                                <span className="text-xs text-slate-300">·</span>
                              )}
                              <span className="text-xs text-slate-400 truncate">
                                {positions.map((pos) => POSITION_LABELS[pos] ?? pos).join("/")}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Save */}
              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button onClick={onClose} className="btn-secondary flex-1">
                  ביטול
                </button>
                <button
                  onClick={saveTeams}
                  disabled={saving || teams.every((t) => t.players.length === 0)}
                  className="btn-primary flex-1"
                >
                  {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : "שמור קבוצות"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
