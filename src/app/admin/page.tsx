"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import toast from "react-hot-toast";
import clsx from "clsx";
import { positionsLabel } from "@/lib/teams";
import DutyPicker from "@/components/DutyPicker";
import { Pencil, X, Users, MapPin, Calendar, Shield, Trash2, Users2, ClipboardCheck, Lock } from "lucide-react";

type Game = {
  id: string;
  date: string;
  location: string;
  maxPlayers: number;
  status: string;
  notes: string | null;
  rsvps: Array<{ status: string; user: { id: string; name: string | null } }>;
  teams: Array<{ id: string; name: string; color: string }>;
  survey: { id: string; isOpen: boolean } | null;
  duties: Array<{ type: string; user: { id: string; name: string | null } }>;
};

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  position: string;
  skillLevel: number;
  createdAt: string;
  _count: { rsvps: number };
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"games" | "players">("games");
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showNewGame, setShowNewGame] = useState(false);
  const [newGame, setNewGame] = useState({
    date: "",
    time: "19:00",
    location: "מגרש הכדורגל",
    maxPlayers: 14,
    notes: "",
  });
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [editGame, setEditGame] = useState({
    date: "",
    time: "",
    location: "",
    maxPlayers: 14,
    notes: "",
    status: "open",
  });
  const [loading, setLoading] = useState(false);

  const sessionUser = session?.user as { role?: string } | undefined;
  const isAdmin = sessionUser?.role === "admin";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !isAdmin) router.push("/");
  }, [status, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchGames();
      fetchUsers();
    }
  }, [isAdmin]);

  async function fetchGames() {
    const res = await fetch("/api/games");
    const data = await res.json();
    setGames(Array.isArray(data) ? data : []);
  }

  async function fetchUsers() {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
  }

  async function createGame(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const dateTime = `${newGame.date}T${newGame.time}:00`;
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: dateTime,
        location: newGame.location,
        maxPlayers: newGame.maxPlayers,
        notes: newGame.notes,
      }),
    });
    if (res.ok) {
              toast.success("משחק נוצר");
      setShowNewGame(false);
      setNewGame({ date: "", time: "19:00", location: "מגרש הכדורגל", maxPlayers: 14, notes: "" });
      fetchGames();
    } else {
      toast.error("שגיאה ביצירת משחק");
    }
    setLoading(false);
  }

  async function generateTeams(gameId: string) {
    setLoading(true);
    const res = await fetch(`/api/games/${gameId}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numTeams: 2 }),
    });
    if (res.ok) {
              toast.success("קבוצות נוצרו");
      fetchGames();
    } else {
      toast.error("שגיאה ביצירת קבוצות");
    }
    setLoading(false);
  }

  async function openSurvey(gameId: string) {
    setLoading(true);
    const res = await fetch(`/api/games/${gameId}/survey`, {
      method: "POST",
    });
    if (res.ok) {
      toast.success("סקר נפתח! שחקנים יכולים להצביע");
      fetchGames();
    } else {
      const data = await res.json();
      toast.error(data.error || "שגיאה");
    }
    setLoading(false);
  }

  async function closeGame(gameId: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/games/${gameId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    if (res.ok) {
      toast.success("הרשמה נסגרה");
      fetchGames();
    }
    setLoading(false);
  }

  async function deleteGame(gameId: string) {
    if (!confirm("האם למחוק את המשחק?")) return;
    const res = await fetch(`/api/admin/games/${gameId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("משחק נמחק");
      fetchGames();
    }
  }

  async function updateUserRole(userId: string, role: string) {
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (res.ok) {
      toast.success("הרשאות עודכנו");
      fetchUsers();
    }
  }

  async function deleteUser(userId: string, userName: string | null) {
    if (!confirm(`האם למחוק את המשתמש "${userName || "משתמש זה"}"?\nכל הנתונים שלו יימחקו לצמיתות.`)) return;
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(`${userName} נמחק`);
      fetchUsers();
    } else {
      toast.error(data.error || "שגיאה במחיקה");
    }
  }

  function startEditGame(game: Game) {
    const d = new Date(game.date);
    const pad = (n: number) => String(n).padStart(2, "0");
    setEditGame({
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      location: game.location,
      maxPlayers: game.maxPlayers,
      notes: game.notes || "",
      status: game.status,
    });
    setEditingGameId(game.id);
  }

  async function saveEditGame(e: React.FormEvent, gameId: string) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/admin/games/${gameId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: `${editGame.date}T${editGame.time}:00`,
        location: editGame.location,
        maxPlayers: Number(editGame.maxPlayers),
        notes: editGame.notes,
        status: editGame.status,
      }),
    });
    if (res.ok) {
      toast.success("המשחק עודכן");
      setEditingGameId(null);
      fetchGames();
    } else {
      toast.error("שגיאה בעדכון");
    }
    setLoading(false);
  }

  if (!isAdmin) return null;

  const statusColors: Record<string, string> = {
    open: "bg-green-100 text-green-700",
    closed: "bg-orange-100 text-orange-700",
    completed: "bg-slate-100 text-slate-600",
  };

  const statusLabels: Record<string, string> = {
    open: "פתוח",
    closed: "סגור",
    completed: "הסתיים",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Shield size={20} className="text-green-600" /> לוח ניהול
        </h1>
        <p className="text-slate-500 text-sm mt-1">ניהול משחקים ושחקנים</p>
      </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-2xl border border-slate-100 p-1 gap-1">
        <button
          onClick={() => setActiveTab("games")}
          className={clsx(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all",
            activeTab === "games" ? "bg-green-600 text-white" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          <Calendar size={14} /> משחקים ({games.length})
        </button>
        <button
          onClick={() => setActiveTab("players")}
          className={clsx(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all",
            activeTab === "players" ? "bg-green-600 text-white" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          <Users size={14} /> שחקנים ({users.length})
        </button>
      </div>

      {/* Games Tab */}
      {activeTab === "games" && (
        <div className="space-y-4">
          {/* New Game Button */}
          <button
            onClick={() => setShowNewGame(!showNewGame)}
            className="btn-primary w-full"
          >
            + יצירת משחק חדש
          </button>

          {/* New Game Form */}
          {showNewGame && (
            <div className="card">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Calendar size={16} className="text-green-600" /> משחק חדש</h3>
              <form onSubmit={createGame} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">תאריך</label>
                    <input
                      type="date"
                      className="input"
                      value={newGame.date}
                      onChange={(e) => setNewGame(p => ({ ...p, date: e.target.value }))}
                      required
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">שעה</label>
                    <input
                      type="time"
                      className="input"
                      value={newGame.time}
                      onChange={(e) => setNewGame(p => ({ ...p, time: e.target.value }))}
                      required
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">מיקום</label>
                  <input
                    className="input"
                    value={newGame.location}
                    onChange={(e) => setNewGame(p => ({ ...p, location: e.target.value }))}
                    placeholder="מגרש הכדורגל"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    מספר שחקנים מקסימלי
                  </label>
                  <input
                    type="number"
                    min="4"
                    max="30"
                    className="input"
                    value={newGame.maxPlayers}
                    onChange={(e) => setNewGame(p => ({ ...p, maxPlayers: +e.target.value }))}
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    הערות <span className="text-slate-400">(אופציונלי)</span>
                  </label>
                  <textarea
                    className="input resize-none"
                    rows={2}
                    value={newGame.notes}
                    onChange={(e) => setNewGame(p => ({ ...p, notes: e.target.value }))}
                    placeholder="הערות למשחק..."
                  />
                </div>

                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="btn-primary flex-1">
                    {loading ? "יוצר..." : "צור משחק"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewGame(false)}
                    className="btn-secondary"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Games List */}
          {games.map((game) => {
            const confirmed = game.rsvps.filter(r => r.status === "confirmed");
            const dateObj = new Date(game.date);
            const isEditing = editingGameId === game.id;

            return (
              <div key={game.id} className="card space-y-0">
                {/* ── Game header ── */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={clsx("badge", statusColors[game.status])}>
                        {statusLabels[game.status]}
                      </span>
                      {game.survey?.isOpen && (
                        <span className="badge bg-purple-100 text-purple-700 animate-pulse">
                          סקר פתוח
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-800">
                      {format(dateObj, "EEEE, d בMMM", { locale: he })} · {format(dateObj, "HH:mm")}
                    </p>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} /> {game.location}
                    </p>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                      <Users2 size={12} /> {confirmed.length}/{game.maxPlayers} מאושרים
                    </p>
                    {game.teams.length > 0 && (
                      <p className="text-xs text-green-600 mt-1 font-medium">
                        קבוצות חולקו ({game.teams.length})
                      </p>
                    )}
                  </div>

                  {/* Actions column */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {/* Edit toggle */}
                    <button
                      onClick={() => isEditing ? setEditingGameId(null) : startEditGame(game)}
                      className={clsx(
                        "flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                        isEditing
                          ? "bg-slate-200 text-slate-600 hover:bg-slate-300"
                          : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                      )}
                    >
                      {isEditing ? <><X size={12} /> ביטול</> : <><Pencil size={12} /> עריכה</>}
                    </button>
                    {game.status === "open" && (
                      <>
                        <button
                          onClick={() => generateTeams(game.id)}
                          disabled={loading || confirmed.length < 2}
                          className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          <Users size={12} /> חלק
                        </button>
                        <button
                          onClick={() => closeGame(game.id)}
                          disabled={loading}
                          className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                        >
                          <Lock size={12} /> סגור
                        </button>
                      </>
                    )}
                    {(game.status === "closed" || game.status === "open") && !game.survey && (
                      <button
                        onClick={() => openSurvey(game.id)}
                        disabled={loading}
                        className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        <ClipboardCheck size={12} /> סקר
                      </button>
                    )}
                    <button
                      onClick={() => deleteGame(game.id)}
                      className="flex items-center gap-1 text-xs bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      <Trash2 size={12} /> מחק
                    </button>
                  </div>
                </div>

                {/* ── Inline Edit Form ── */}
                {isEditing && (
                  <form onSubmit={(e) => saveEditGame(e, game.id)} className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Pencil size={11} /> עריכת פרטי המשחק
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="input-label">תאריך</label>
                        <input
                          type="date"
                          className="input"
                          value={editGame.date}
                          onChange={(e) => setEditGame(p => ({ ...p, date: e.target.value }))}
                          required
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="input-label">שעה</label>
                        <input
                          type="time"
                          className="input"
                          value={editGame.time}
                          onChange={(e) => setEditGame(p => ({ ...p, time: e.target.value }))}
                          required
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="input-label">מיקום</label>
                      <input
                        className="input"
                        value={editGame.location}
                        onChange={(e) => setEditGame(p => ({ ...p, location: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="input-label">מקסימום שחקנים</label>
                        <input
                          type="number"
                          min="4"
                          max="30"
                          className="input"
                          value={editGame.maxPlayers}
                          onChange={(e) => setEditGame(p => ({ ...p, maxPlayers: +e.target.value }))}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="input-label">סטטוס</label>
                        <select
                          className="input"
                          value={editGame.status}
                          onChange={(e) => setEditGame(p => ({ ...p, status: e.target.value }))}
                        >
                          <option value="open">פתוח</option>
                          <option value="closed">סגור</option>
                          <option value="completed">הסתיים</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="input-label">הערות <span className="text-slate-400 font-normal">(אופציונלי)</span></label>
                      <textarea
                        className="input resize-none"
                        rows={2}
                        value={editGame.notes}
                        onChange={(e) => setEditGame(p => ({ ...p, notes: e.target.value }))}
                        placeholder="הערות..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={loading} className="btn-primary flex-1 text-sm py-2">
                        {loading ? "שומר..." : "שמור שינויים"}
                      </button>
                      <button type="button" onClick={() => setEditingGameId(null)} className="btn-secondary text-sm py-2">
                        ביטול
                      </button>
                    </div>
                  </form>
                )}

                {/* Confirmed players list */}
                {confirmed.length > 0 && !isEditing && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="section-title">שחקנים מאושרים</p>
                    <div className="flex flex-wrap gap-1.5">
                      {confirmed.map((r) => (
                        <span key={r.user.id} className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full border border-green-100">
                          {r.user.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Duty assignments */}
                {!isEditing && (
                  <DutyPicker
                    gameId={game.id}
                    players={confirmed.map((r) => r.user)}
                    duties={game.duties}
                    onUpdate={fetchGames}
                  />
                )}
              </div>
            );
          })}

          {games.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-8">אין משחקים. צור משחק ראשון!</p>
          )}
        </div>
      )}

      {/* Players Tab */}
      {activeTab === "players" && (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="card flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold shrink-0">
                {user.name?.[0] || "?"}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800 truncate">{user.name || "ללא שם"}</p>
                  {user.role === "admin" && (
                    <span className="badge bg-purple-100 text-purple-700 text-xs flex items-center gap-1"><Shield size={10} /> מנהל</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
                <p className="text-xs text-slate-400">
                  {positionsLabel(user.position)} · רמה {user.skillLevel} · {user._count.rsvps} הרשמות
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => updateUserRole(user.id, user.role === "admin" ? "player" : "admin")}
                  className={clsx(
                    "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                    user.role === "admin"
                      ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {user.role === "admin" ? "הסר מנהל" : "הפוך למנהל"}
                </button>
                <button
                  onClick={() => deleteUser(user.id, user.name)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={12} /> מחק
                </button>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-8">אין שחקנים רשומים</p>
          )}
        </div>
      )}
    </div>
  );
}
