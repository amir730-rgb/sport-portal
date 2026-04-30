"use client";

import clsx from "clsx";

type PlayerInfo = {
  id: string;
  name: string | null;
  position: string; // user-set position field
};

type TeamPlayerData = {
  slotNote: string | null;
  user: PlayerInfo;
};

export type LineupTeam = {
  id: string;
  name: string;
  color: string;
  players: TeamPlayerData[];
};

// ─── helpers ────────────────────────────────────────────────────────────────

const TEAM_HEX: Record<string, string> = {
  red:    "#EF4444",
  blue:   "#3B82F6",
  green:  "#22C55E",
  yellow: "#EAB308",
};

const TEAM_BG: Record<string, string> = {
  red:    "bg-red-500",
  blue:   "bg-blue-500",
  green:  "bg-green-600",
  yellow: "bg-yellow-400",
};

type PosGroup = { gk: TeamPlayerData[]; def: TeamPlayerData[]; mid: TeamPlayerData[]; fwd: TeamPlayerData[] };

function parsePositions(posStr: string): string[] {
  try {
    const arr = JSON.parse(posStr);
    if (Array.isArray(arr)) return arr;
  } catch {}
  return posStr ? [posStr] : [];
}

function groupByPosition(players: TeamPlayerData[]): PosGroup {
  const group: PosGroup = { gk: [], def: [], mid: [], fwd: [] };
  players.forEach((p) => {
    if (p.slotNote === "שוער") { group.gk.push(p); return; }
    const pos = parsePositions(p.user.position);
    if (pos.includes("goalkeeper"))  { group.gk.push(p);  return; }
    if (pos.includes("defender"))    { group.def.push(p); return; }
    if (pos.includes("forward"))     { group.fwd.push(p); return; }
    group.mid.push(p); // midfielder / any / unset → mid
  });
  return group;
}

// ─── player badge on the pitch ──────────────────────────────────────────────

function PlayerBadge({ player, color }: { player: TeamPlayerData; color: string }) {
  const hex = TEAM_HEX[color] ?? "#22C55E";
  const firstName = (player.user.name ?? "?").split(" ")[0];
  const initial   = (player.user.name ?? "?")[0].toUpperCase();

  return (
    <div className="flex flex-col items-center gap-0.5 mx-1.5">
      <div
        className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-sm font-black shadow-md"
        style={{ border: `2.5px solid ${hex}`, color: hex }}
      >
        {initial}
      </div>
      <span
        className="text-white text-xs font-semibold text-center leading-tight max-w-[52px] truncate"
        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
      >
        {firstName}
      </span>
      {player.slotNote && (
        <span
          className="text-white text-[10px] bg-black/40 px-1 rounded"
          style={{ textShadow: "none" }}
        >
          {player.slotNote}
        </span>
      )}
    </div>
  );
}

// ─── one row of players ──────────────────────────────────────────────────────

function PlayerRow({
  players,
  color,
  label,
}: {
  players: TeamPlayerData[];
  color: string;
  label?: string;
}) {
  if (players.length === 0) return null;
  return (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <span className="text-white/60 text-[10px] uppercase tracking-widest">{label}</span>
      )}
      <div className="flex justify-center flex-wrap gap-1">
        {players.map((p) => (
          <PlayerBadge key={p.user.id} player={p} color={color} />
        ))}
      </div>
    </div>
  );
}

// ─── single-team half-pitch ──────────────────────────────────────────────────

function TeamHalf({
  team,
  flip,
}: {
  team: LineupTeam;
  flip: boolean; // flip = bottom team (their FWD faces center)
}) {
  const g = groupByPosition(team.players);
  const hex = TEAM_HEX[team.color] ?? "#22C55E";
  const bg  = TEAM_BG[team.color]  ?? "bg-green-600";

  // For the top team: GK → DEF → MID → FWD (GK is at the top goal, FWD faces center)
  // For the bottom team (flip): FWD → MID → DEF → GK (FWD faces center, GK at bottom goal)
  const rows: { players: TeamPlayerData[]; label: string }[] = flip
    ? [
        { players: g.fwd,  label: "חלוצים" },
        { players: g.mid,  label: "קישור" },
        { players: g.def,  label: "הגנה" },
        { players: g.gk,   label: "שוער" },
      ]
    : [
        { players: g.gk,   label: "שוער" },
        { players: g.def,  label: "הגנה" },
        { players: g.mid,  label: "קישור" },
        { players: g.fwd,  label: "חלוצים" },
      ];

  // If ALL players have no position set, just show them in one row
  const allUnpositioned = g.gk.length + g.def.length + g.mid.length + g.fwd.length === 0;
  if (allUnpositioned) {
    return (
      <div className="flex flex-col items-center justify-around py-4 gap-4" style={{ minHeight: 220 }}>
        <div className="flex items-center gap-2">
          <div className={clsx("w-3 h-3 rounded-full", bg)} />
          <span className="text-white font-bold text-sm" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
            {team.name}
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-1 px-2">
          {team.players.map((p) => (
            <PlayerBadge key={p.user.id} player={p} color={team.color} />
          ))}
        </div>
      </div>
    );
  }

  const content = (
    <div className="flex flex-col items-center justify-around gap-4 py-3 px-2" style={{ minHeight: 220 }}>
      {rows.map((row, i) => (
        <PlayerRow key={i} players={row.players} color={team.color} label={row.label} />
      ))}
    </div>
  );

  const teamLabel = (
    <div className="flex justify-center py-1">
      <div
        className="flex items-center gap-2 px-4 py-1 rounded-full bg-black/30 backdrop-blur-sm"
        style={{ border: `1px solid ${hex}40` }}
      >
        <div className={clsx("w-2.5 h-2.5 rounded-full", bg)} />
        <span className="text-white font-bold text-sm" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
          {team.name}
        </span>
        <span className="text-white/60 text-xs">{team.players.length} שחקנים</span>
      </div>
    </div>
  );

  return (
    <div>
      {!flip && teamLabel}
      {content}
      {flip && teamLabel}
    </div>
  );
}

// ─── field markings (SVG overlay) ───────────────────────────────────────────

function FieldMarkings() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Outer border */}
      <div className="absolute inset-2 border-2 border-white/20 rounded" />
      {/* Center line */}
      <div className="absolute left-4 right-4 h-[2px] bg-white/25" style={{ top: "50%" }} />
      {/* Center circle */}
      <div
        className="absolute rounded-full border-2 border-white/20"
        style={{
          width: 80,
          height: 80,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Center spot */}
      <div
        className="absolute rounded-full bg-white/30"
        style={{ width: 6, height: 6, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
      />
      {/* Top penalty area */}
      <div
        className="absolute border-2 border-white/20 border-t-0"
        style={{ top: 0, left: "50%", transform: "translateX(-50%)", width: "44%", height: "18%" }}
      />
      {/* Bottom penalty area */}
      <div
        className="absolute border-2 border-white/20 border-b-0"
        style={{ bottom: 0, left: "50%", transform: "translateX(-50%)", width: "44%", height: "18%" }}
      />
      {/* Top goal box */}
      <div
        className="absolute border-2 border-white/15 border-t-0"
        style={{ top: 0, left: "50%", transform: "translateX(-50%)", width: "20%", height: "7%" }}
      />
      {/* Bottom goal box */}
      <div
        className="absolute border-2 border-white/15 border-b-0"
        style={{ bottom: 0, left: "50%", transform: "translateX(-50%)", width: "20%", height: "7%" }}
      />
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function FootballLineup({ teams }: { teams: LineupTeam[] }) {
  if (teams.length === 0) return null;

  // Two-team full pitch view
  if (teams.length === 2) {
    return (
      <div
        className="relative rounded-2xl overflow-hidden w-full"
        style={{
          background: "linear-gradient(to bottom, #1a7a0a 0%, #1e8f0e 48%, #1e8f0e 52%, #1a7a0a 100%)",
          border: "3px solid rgba(255,255,255,0.15)",
          minHeight: 480,
        }}
      >
        <FieldMarkings />
        <div className="relative z-10 flex flex-col h-full">
          {/* Team A — top half */}
          <div className="flex-1">
            <TeamHalf team={teams[0]} flip={false} />
          </div>
          {/* Divider label */}
          <div className="flex justify-center py-1">
            <span className="text-white/40 text-xs tracking-widest uppercase">— קו אמצע —</span>
          </div>
          {/* Team B — bottom half */}
          <div className="flex-1">
            <TeamHalf team={teams[1]} flip={true} />
          </div>
        </div>
      </div>
    );
  }

  // 3+ teams: show a grid of smaller cards (no full pitch)
  return (
    <div className={clsx("grid gap-3", teams.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2")}>
      {teams.map((team) => {
        const hex = TEAM_HEX[team.color] ?? "#22C55E";
        const bg  = TEAM_BG[team.color]  ?? "bg-green-600";
        return (
          <div
            key={team.id}
            className="rounded-2xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, #1a7a0a, #1e8f0e)", border: `2px solid ${hex}40` }}
          >
            <div className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className={clsx("w-3 h-3 rounded-full", bg)} />
                <span className="text-white font-bold text-sm">{team.name}</span>
                <span className="text-white/50 text-xs mr-auto">{team.players.length}</span>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {team.players.map((p) => (
                  <PlayerBadge key={p.user.id} player={p} color={team.color} />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
