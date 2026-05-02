"use client";

import { useEffect, useState, useCallback } from "react";
import clsx from "clsx";
import { X, Loader2, Users, ChevronDown, Plus, Trash2, Send, ArrowRight, Eye, Pencil, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { TEAM_COLORS, POSITION_LABELS } from "@/lib/teams";

const POSITIONS = ["goalkeeper", "defender", "midfielder", "forward"];

type AdminPlayer = {
  id: string;
  name: string | null;
  adminSkillRating: number;
  adminFitnessRating: number;
  adminPositions: string;
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

type SavedDraftTeam = {
  id: string;
  name: string;
  color: string;
  draftLabel: string;
  players: Array<{
    userId: string;
    slotNote: string | null;
    user: {
      id: string;
      name: string | null;
      adminSkillRating: number;
      adminFitnessRating: number;
      adminPositions: string;
    };
  }>;
};

type SavedDraft = {
  label: string;
  isPublished: boolean;
  teams: SavedDraftTeam[];
};

function playerStrength(skill: number, fit: number): number {
  return skill * 0.6 + fit * 0.4;
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

function teamStrength(team: TeamDraft, allPlayers: AdminPlayer[]): number {
  if (team.players.length === 0) return 0;
  const total = team.players.reduce((sum, slot) => {
    const p = allPlayers.find((ap) => ap.id === slot.userId);
    return sum + (p ? playerStrength(p.adminSkillRating, p.adminFitnessRating) : 0);
  }, 0);
  return total / team.players.length;
}

function parsePositions(raw: string): string[] {
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p)) return p;
  } catch {}
  return [];
}

function fmt(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
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

function savedDraftToTeamDrafts(savedTeams: SavedDraftTeam[]): TeamDraft[] {
  return savedTeams.map((t) => {
    const colorDef = TEAM_COLORS.find((c) => c.color === t.color) ?? TEAM_COLORS[0];
    return {
      name: t.name,
      color: t.color,
      bg: colorDef.bg,
      text: colorDef.text,
      border: colorDef.border,
      light: colorDef.light,
      players: t.players.map((p) => ({ userId: p.userId, slotNote: p.slotNote })),
    };
  });
}

const STRENGTH_COLORS = ["bg-red-400", "bg-blue-400", "bg-green-400", "bg-yellow-400"];

export default function TeamBuilderModal({
  gameId,
  gameLabel,
  publishedDraft: initialPublishedDraft,
  onClose,
  onSaved,
}: {
  gameId: string;
  gameLabel: string;
  publishedDraft: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // ── Screen: "list" = draft overview, "builder" = editing a draft
  const [screen, setScreen] = useState<"list" | "builder">("list");

  // ── Shared data
  const [allPlayers, setAllPlayers] = useState<AdminPlayer[]>([]);
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>([]);
  const [publishedDraft, setPublishedDraft] = useState<string | null>(initialPublishedDraft);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  // ── Builder state
  const [currentDraftLabel, setCurrentDraftLabel] = useState("הרכב 1");
  const [numTeams, setNumTeams] = useState(2);
  const [teams, setTeams] = useState<TeamDraft[]>(buildTeams(2));
  const [activeTeamIdx, setActiveTeamIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [noteMenuFor, setNoteMenuFor] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [playersRes, draftsRes] = await Promise.all([
      fetch(`/api/admin/games/${gameId}/players`),
      fetch(`/api/admin/games/${gameId}/drafts`),
    ]);
    if (playersRes.ok) setAllPlayers(await playersRes.json());
    if (draftsRes.ok) {
      const data = await draftsRes.json();
      setSavedDrafts(data.drafts ?? []);
      setPublishedDraft(data.publishedDraft ?? null);
      // If no drafts, jump to builder for a new draft
      if (!data.drafts || data.drafts.length === 0) {
        setCurrentDraftLabel("הרכב 1");
        setTeams(buildTeams(2));
        setScreen("builder");
      }
    }
    setLoading(false);
  }, [gameId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Open builder for an existing draft
  function editDraft(draft: SavedDraft) {
    setCurrentDraftLabel(draft.label);
    const loaded = savedDraftToTeamDrafts(draft.teams);
    setNumTeams(loaded.length || 2);
    setTeams(loaded.length ? loaded : buildTeams(2));
    setActiveTeamIdx(0);
    setScreen("builder");
  }

  // ── Open builder for a brand-new draft
  function newDraft() {
    const existingLabels = savedDrafts.map((d) => d.label);
    let n = savedDrafts.length + 1;
    let label = `הרכב ${n}`;
    while (existingLabels.includes(label)) { n++; label = `הרכב ${n}`; }
    setCurrentDraftLabel(label);
    setNumTeams(2);
    setTeams(buildTeams(2));
    setActiveTeamIdx(0);
    setScreen("builder");
  }

  // ── Delete a draft
  async function deleteDraft(label: string) {
    if (!confirm(`למחוק את "${label}"?`)) return;
    setDeleting(label);
    const res = await fetch(`/api/admin/games/${gameId}/drafts`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftLabel: label }),
    });
    if (res.ok) { toast.success(`"${label}" נמחק`); await fetchAll(); onSaved(); }
    else toast.error("שגיאה במחיקה");
    setDeleting(null);
  }

  // ── Publish a draft
  async function publishDraft(label: string, doPublish: boolean) {
    setPublishing(label);
    const res = await fetch(`/api/admin/games/${gameId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publish: doPublish, draftLabel: label }),
    });
    if (res.ok) {
      const data = await res.json();
      setPublishedDraft(data.publishedDraft);
      toast.success(doPublish ? `"${label}" פורסם לשחקנים` : "פרסום בוטל");
      onSaved();
      await fetchAll();
    } else toast.error("שגיאה");
    setPublishing(null);
  }

  // ── Builder: change num teams
  const changeNumTeams = (n: number) => {
    setNumTeams(n);
    setTeams((prev) => {
      const next = buildTeams(n);
      prev.forEach((t, i) => { if (i < n) next[i].players = t.players; });
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
          ? { ...t, players: t.players.map((p) => p.userId === userId ? { ...p, slotNote: p.slotNote === note ? null : note } : p) }
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
        draftLabel: currentDraftLabel,
        teams: teams.map((t) => ({ name: t.name, color: t.color, players: t.players })),
      }),
    });
    if (res.ok) {
      toast.success(`"${currentDraftLabel}" נשמר`);
      onSaved();
      await fetchAll();
      setScreen("list");
    } else {
      toast.error("שגיאה בשמירה");
    }
    setSaving(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl my-4 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {screen === "builder" && savedDrafts.length > 0 && (
              <button
                onClick={() => setScreen("list")}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                title="חזור לרשימת הטיוטות"
              >
                <ArrowRight size={14} />
              </button>
            )}
            <div>
              <h2 className="font-bold text-slate-800 text-lg">
                {screen === "list" ? "הרכבים שמורים" : currentDraftLabel}
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">{gameLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-slate-400" size={28} />
            </div>
          ) : screen === "list" ? (
            /* ═══════════════ DRAFT LIST SCREEN ═══════════════ */
            <div className="space-y-4">
              {savedDrafts.length === 0 ? (
                <div className="text-center py-10">
                  <Users size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-semibold">אין הרכבים שמורים עדיין</p>
                  <p className="text-slate-400 text-sm mt-1">לחץ "הרכב חדש" כדי להתחיל</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedDrafts.map((draft) => {
                    const isPublished = draft.label === publishedDraft;
                    const totalPlayers = draft.teams.reduce((s, t) => s + t.players.length, 0);
                    const totalSkill = draft.teams.reduce((s, t) =>
                      s + t.players.reduce((ps, p) => ps + p.user.adminSkillRating, 0), 0);
                    const totalFit = draft.teams.reduce((s, t) =>
                      s + t.players.reduce((ps, p) => ps + p.user.adminFitnessRating, 0), 0);

                    return (
                      <div
                        key={draft.label}
                        className={clsx(
                          "rounded-2xl border-2 p-4 transition-all",
                          isPublished ? "border-green-400 bg-green-50" : "border-slate-200 bg-slate-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {/* Draft name + badge */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-slate-800">{draft.label}</span>
                              {isPublished && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                  <CheckCircle size={10} /> מפורסם
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span>{draft.teams.length} קבוצות · {totalPlayers} שחקנים</span>
                              <span className="text-amber-600 font-semibold">★{fmt(totalSkill)}</span>
                              <span className="text-blue-600 font-semibold">⚡{fmt(totalFit)}</span>
                            </div>
                            {/* Team mini-preview */}
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {draft.teams.map((t) => {
                                const colorDef = TEAM_COLORS.find((c) => c.color === t.color) ?? TEAM_COLORS[0];
                                return (
                                  <span
                                    key={t.id}
                                    className={clsx("text-xs px-2 py-0.5 rounded-full font-medium text-white", colorDef.bg)}
                                  >
                                    {t.name} ({t.players.length})
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button
                              onClick={() => editDraft(draft)}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors"
                            >
                              <Pencil size={11} /> ערוך
                            </button>
                            <button
                              onClick={() => publishDraft(draft.label, !isPublished)}
                              disabled={!!publishing}
                              className={clsx(
                                "flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50",
                                isPublished
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              )}
                            >
                              {publishing === draft.label
                                ? <Loader2 size={11} className="animate-spin" />
                                : isPublished ? <><Eye size={11} /> מפורסם</> : <><Send size={11} /> פרסם</>}
                            </button>
                            <button
                              onClick={() => deleteDraft(draft.label)}
                              disabled={!!deleting}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 font-medium transition-colors disabled:opacity-50"
                            >
                              {deleting === draft.label ? <Loader2 size={11} className="animate-spin" /> : <><Trash2 size={11} /> מחק</>}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={newDraft}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors font-medium text-sm"
              >
                <Plus size={16} /> הרכב חדש
              </button>
            </div>
          ) : (
            /* ═══════════════ BUILDER SCREEN ═══════════════ */
            <div className="space-y-5">
              {/* Num teams + player count */}
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
                <span className="text-sm text-slate-400 mr-2">{allPlayers.length} שחקנים</span>
              </div>

              {/* Teams grid */}
              <div className={clsx("grid gap-3", numTeams === 2 ? "grid-cols-2" : numTeams === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
                {teams.map((team, teamIdx) => {
                  const strength   = teamStrength(team, allPlayers);
                  const skillTotal = teamSkillTotal(team, allPlayers);
                  const fitTotal   = teamFitnessTotal(team, allPlayers);
                  const isActive   = activeTeamIdx === teamIdx;
                  return (
                    <div
                      key={team.color}
                      onClick={() => setActiveTeamIdx(teamIdx)}
                      className={clsx(
                        "rounded-2xl border-2 p-3 cursor-pointer transition-all",
                        isActive ? `${team.border} ${team.light}` : "border-slate-200 bg-slate-50 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={clsx("w-3 h-3 rounded-full", team.bg)} />
                        <span className={clsx("text-sm font-bold", isActive ? team.text : "text-slate-700")}>{team.name}</span>
                        <span className="text-xs text-slate-400 mr-auto"><Users size={12} className="inline" /> {team.players.length}</span>
                      </div>

                      {/* Skill + fitness totals */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          ★ {fmt(skillTotal)}<span className="font-normal text-amber-400">רמה</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          ⚡ {fmt(fitTotal)}<span className="font-normal text-blue-400">כושר</span>
                        </span>
                      </div>

                      <StrengthBar value={strength} className={STRENGTH_COLORS[teamIdx % STRENGTH_COLORS.length]} />

                      <div className="mt-2 space-y-1">
                        {team.players.map((slot) => {
                          const p = allPlayers.find((ap) => ap.id === slot.userId);
                          if (!p) return null;
                          const menuKey = `${teamIdx}-${slot.userId}`;
                          return (
                            <div key={slot.userId} className="flex items-center gap-1 group">
                              <div className="flex-1 flex items-center gap-1.5 bg-white rounded-lg px-2 py-1 border border-slate-200">
                                <span className="text-xs font-medium text-slate-700 truncate flex-1">{p.name}</span>
                                {slot.slotNote && (
                                  <span className={clsx("text-xs px-1 rounded font-medium", slot.slotNote === "שוער" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600")}>
                                    {slot.slotNote}
                                  </span>
                                )}
                              </div>
                              <div className="relative">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setNoteMenuFor(noteMenuFor === menuKey ? null : menuKey); }}
                                  className="w-5 h-5 rounded text-slate-400 hover:text-slate-600 flex items-center justify-center"
                                >
                                  <ChevronDown size={10} />
                                </button>
                                {noteMenuFor === menuKey && (
                                  <div className="absolute left-0 top-6 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[110px]" onClick={(e) => e.stopPropagation()}>
                                    {["שוער", "שחקן משלים"].map((note) => (
                                      <button
                                        key={note}
                                        onClick={() => setNote(teamIdx, slot.userId, note)}
                                        className={clsx("block w-full text-right px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors", slot.slotNote === note ? "font-bold text-slate-800" : "text-slate-600")}
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
                  <div className="space-y-1.5">
                    {teams.map((team, i) => {
                      const s = teamStrength(team, allPlayers);
                      const maxS = Math.max(...teams.map((t) => teamStrength(t, allPlayers)));
                      return (
                        <div key={team.color} className="flex items-center gap-2">
                          <div className={clsx("w-2.5 h-2.5 rounded-full shrink-0", team.bg)} />
                          <span className="text-xs text-slate-600 w-20 truncate">{team.name}</span>
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className={clsx("h-full rounded-full transition-all", STRENGTH_COLORS[i % STRENGTH_COLORS.length])} style={{ width: maxS > 0 ? `${(s / maxS) * 100}%` : "0%" }} />
                          </div>
                          <span className="text-xs font-bold text-slate-600 w-8 text-left">{s.toFixed(1)}</span>
                        </div>
                      );
                    })}
                  </div>
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
                            <div><div className="text-sm font-black text-amber-600">★{fmt(skill)}</div><div className="text-[10px] text-slate-400">רמה</div></div>
                            <div><div className="text-sm font-black text-blue-600">⚡{fmt(fit)}</div><div className="text-[10px] text-slate-400">כושר</div></div>
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
                  <p className="text-sm font-semibold text-slate-700">שחקנים לשיבוץ <span className="text-slate-400 font-normal">({pool.length})</span></p>
                  <span className="text-xs text-slate-400">— לחץ לשיבוץ ל<span className={clsx("font-bold", teams[activeTeamIdx]?.text)}>{" "}{teams[activeTeamIdx]?.name}</span></span>
                </div>
                {pool.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">כל השחקנים שובצו</p>
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
                              {positions.length > 0 && <span className="text-xs text-slate-300">·</span>}
                              <span className="text-xs text-slate-400 truncate">{positions.map((pos) => POSITION_LABELS[pos] ?? pos).join("/")}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Builder actions */}
              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => savedDrafts.length > 0 ? setScreen("list") : onClose()}
                  className="btn-secondary flex-1"
                >
                  {savedDrafts.length > 0 ? "← חזור לרשימה" : "ביטול"}
                </button>
                <button
                  onClick={saveTeams}
                  disabled={saving || teams.every((t) => t.players.length === 0)}
                  className="btn-primary flex-1"
                >
                  {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : `שמור "${currentDraftLabel}"`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
