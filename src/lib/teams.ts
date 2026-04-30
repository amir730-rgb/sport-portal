// Parse position field - supports both legacy single string and new JSON array
export function parsePositions(position: string): string[] {
  if (!position) return ["any"];
  try {
    const parsed = JSON.parse(position);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // Not JSON - legacy single value
  }
  return [position];
}

// Encode positions array back to storage string
export function encodePositions(positions: string[]): string {
  if (positions.length === 1) return positions[0]; // backward compat
  return JSON.stringify(positions);
}

// Returns true if player can play as goalkeeper
export function isGoalkeeper(position: string): boolean {
  return parsePositions(position).includes("goalkeeper");
}

// Human-readable label for a position field (handles arrays)
export function positionsLabel(position: string): string {
  const positions = parsePositions(position);
  return positions.map((p) => POSITION_LABELS[p] ?? p).join(" / ");
}

// Primary icon for a position field
export function positionsIcon(position: string): string {
  const positions = parsePositions(position);
  return positions.map((p) => POSITION_ICONS[p] ?? "⚽").join("");
}

// Smart team balancing algorithm
type Player = {
  id: string;
  name: string | null;
  position: string;
  skillLevel: number;
};

type Team = {
  players: Player[];
  totalSkill: number;
  positions: Record<string, number>;
};

export function divideTeams(
  players: Player[],
  numTeams: number = 2
): Player[][] {
  const shuffled = [...players].sort(() => Math.random() - 0.5);

  // Separate goalkeepers first (players whose positions include "goalkeeper")
  const goalkeepers = shuffled.filter((p) => isGoalkeeper(p.position));
  const outfield = shuffled.filter((p) => !isGoalkeeper(p.position));

  // Sort outfield by skill descending for snake draft
  outfield.sort((a, b) => b.skillLevel - a.skillLevel);

  const teams: Team[] = Array.from({ length: numTeams }, () => ({
    players: [],
    totalSkill: 0,
    positions: { goalkeeper: 0, defender: 0, midfielder: 0, forward: 0, any: 0 },
  }));

  // Distribute goalkeepers evenly
  goalkeepers.forEach((gk, i) => {
    const teamIdx = i % numTeams;
    teams[teamIdx].players.push(gk);
    teams[teamIdx].totalSkill += gk.skillLevel;
    teams[teamIdx].positions.goalkeeper++;
  });

  // Snake draft for outfield players (balances skill across teams)
  let direction = 1;
  let teamIdx = 0;

  outfield.forEach((player) => {
    teams[teamIdx].players.push(player);
    teams[teamIdx].totalSkill += player.skillLevel;
    const primaryPos = parsePositions(player.position)[0];
    teams[teamIdx].positions[primaryPos] = (teams[teamIdx].positions[primaryPos] || 0) + 1;

    teamIdx += direction;
    if (teamIdx >= numTeams || teamIdx < 0) {
      direction *= -1;
      teamIdx += direction;
    }
  });

  return teams.map((t) => t.players);
}

export const TEAM_COLORS = [
  { name: "קבוצה אדומה", color: "red", bg: "bg-red-500", text: "text-red-600", border: "border-red-500", light: "bg-red-50" },
  { name: "קבוצה כחולה", color: "blue", bg: "bg-blue-500", text: "text-blue-600", border: "border-blue-500", light: "bg-blue-50" },
  { name: "קבוצה ירוקה", color: "green", bg: "bg-green-500", text: "text-green-600", border: "border-green-500", light: "bg-green-50" },
  { name: "קבוצה צהובה", color: "yellow", bg: "bg-yellow-500", text: "text-yellow-600", border: "border-yellow-500", light: "bg-yellow-50" },
];

export const POSITION_LABELS: Record<string, string> = {
  goalkeeper: "שוער",
  defender: "בלם",
  midfielder: "קשר",
  forward: "חלוץ",
  any: "כל עמדה",
};

export const POSITION_ICONS: Record<string, string> = {
  goalkeeper: "🧤",
  defender: "🛡️",
  midfielder: "⚙️",
  forward: "⚡",
  any: "⚽",
};
