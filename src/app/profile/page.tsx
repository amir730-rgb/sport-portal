"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import toast from "react-hot-toast";
import clsx from "clsx";
import { POSITION_LABELS, POSITION_ICONS, parsePositions, encodePositions, positionsLabel, positionsIcon } from "@/lib/teams";

const positions = ["goalkeeper", "defender", "midfielder", "forward", "any"];

type UserProfile = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  position: string;
  skillLevel: number;
  image: string | null;
  role: string;
  rsvps: Array<{
    id: string;
    status: string;
    createdAt: string;
    game: { id: string; date: string; location: string; status: string };
  }>;
  mvpReceived: Array<{
    id: string;
    survey: { game: { date: string } };
  }>;
};

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", skillLevel: 3 });
  const [selectedPositions, setSelectedPositions] = useState<string[]>(["any"]);
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);

  function togglePosition(pos: string) {
    setSelectedPositions((prev) => {
      if (pos === "any") return ["any"];
      const withoutAny = prev.filter((p) => p !== "any");
      if (withoutAny.includes(pos)) {
        const next = withoutAny.filter((p) => p !== pos);
        return next.length === 0 ? ["any"] : next;
      }
      return [...withoutAny, pos];
    });
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session) fetchProfile();
  }, [session]);

  async function fetchProfile() {
    const res = await fetch("/api/profile");
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setForm({
        name: data.name || "",
        phone: data.phone || "",
        skillLevel: data.skillLevel,
      });
      setSelectedPositions(parsePositions(data.position));
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, position: encodePositions(selectedPositions) }),
    });
    if (res.ok) {
      toast.success("הפרופיל עודכן! ✅");
      setEditing(false);
      fetchProfile();
      update({ name: form.name });
    } else {
      toast.error("שגיאה בשמירה");
    }
    setLoading(false);
  }

  if (!profile) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-4xl animate-bounce">⚽</div>
      </div>
    );
  }

  const confirmed = profile.rsvps.filter((r) => r.status === "confirmed").length;
  const declined = profile.rsvps.filter((r) => r.status === "declined").length;
  const gamesPlayed = profile.rsvps.filter(
    (r) => r.status === "confirmed" && r.game.status === "completed"
  ).length;
  const mvpCount = profile.mvpReceived.length;
  const attendanceRate = confirmed + declined > 0
    ? Math.round((confirmed / (confirmed + declined)) * 100)
    : 100;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Profile Header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-2xl font-bold text-white">
              {profile.name?.[0] || "?"}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{profile.name}</h1>
              <p className="text-slate-500 text-sm">{profile.email}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="badge bg-green-100 text-green-700">
                  {positionsIcon(profile.position)} {positionsLabel(profile.position)}
                </span>
                {profile.role === "admin" && (
                  <span className="badge bg-purple-100 text-purple-700">⚙️ מנהל</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="btn-secondary text-sm"
          >
            {editing ? "ביטול" : "✏️ עריכה"}
          </button>
        </div>

        {/* Skill level */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-slate-500">רמה:</span>
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(n => (
              <span key={n} className={n <= profile.skillLevel ? "text-yellow-400" : "text-slate-200"}>⭐</span>
            ))}
          </div>
          {profile.phone && (
            <span className="text-sm text-slate-400 mr-auto">📱 {profile.phone}</span>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {editing && (
        <div className="card">
          <h2 className="font-bold text-slate-800 mb-4">✏️ עריכת פרופיל</h2>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">שם</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">טלפון</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="050-0000000"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                עמדה מועדפת
              </label>
              <p className="text-xs text-slate-400 mb-2">ניתן לבחור יותר מעמדה אחת</p>
              <div className="grid grid-cols-5 gap-1.5">
                {positions.map(pos => {
                  const selected = selectedPositions.includes(pos);
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => togglePosition(pos)}
                      className={clsx(
                        "flex flex-col items-center p-2 rounded-xl border-2 text-xs font-medium transition-all relative",
                        selected
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-slate-200 hover:border-slate-300 text-slate-500"
                      )}
                    >
                      {selected && pos !== "any" && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
                      )}
                      <span className="text-lg">{POSITION_ICONS[pos]}</span>
                      <span>{POSITION_LABELS[pos]}</span>
                    </button>
                  );
                })}
              </div>
              {selectedPositions.length > 1 && (
                <p className="text-xs text-green-600 mt-1.5 font-medium">
                  ✅ נבחר: {selectedPositions.map(p => POSITION_LABELS[p]).join(" + ")}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                רמת משחק
              </label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, skillLevel: level }))}
                    className={clsx(
                      "flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer select-none",
                      form.skillLevel === level
                        ? "border-green-500 bg-green-500 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-400 hover:border-green-300"
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-1.5">
                {[1,2,3,4,5].map(level => (
                  <div key={level} className="flex-1 flex justify-center">
                    <span className={clsx(
                      "text-sm",
                      form.skillLevel >= level ? "text-yellow-400" : "text-slate-200"
                    )}>⭐</span>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "שומר..." : "שמור שינויים"}
            </button>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "משחקים ששיחקתי", value: gamesPlayed, icon: "⚽" },
          { label: "שחקן המשחק", value: mvpCount, icon: "⭐" },
          { label: "אישרתי הגעה", value: confirmed, icon: "✅" },
          { label: "אחוז נוכחות", value: `${attendanceRate}%`, icon: "📊" },
        ].map((stat) => (
          <div key={stat.label} className="card text-center">
            <div className="text-3xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800">🔐 שינוי סיסמה</h2>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            {showPasswordForm ? "ביטול" : "שנה סיסמה"}
          </button>
        </div>

        {showPasswordForm && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (passwordForm.next !== passwordForm.confirm) {
                toast.error("הסיסמאות החדשות אינן תואמות");
                return;
              }
              setPasswordLoading(true);
              const res = await fetch("/api/profile/password", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.next }),
              });
              const data = await res.json();
              setPasswordLoading(false);
              if (res.ok) {
                toast.success("הסיסמה שונתה בהצלחה ✅");
                setShowPasswordForm(false);
                setPasswordForm({ current: "", next: "", confirm: "" });
              } else {
                toast.error(data.error || "שגיאה");
              }
            }}
            className="mt-4 space-y-3"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">סיסמה נוכחית</label>
              <input
                type="password"
                className="input"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm(p => ({ ...p, current: e.target.value }))}
                placeholder="הסיסמה הנוכחית שלך"
                required
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">סיסמה חדשה</label>
              <input
                type="password"
                className="input"
                value={passwordForm.next}
                onChange={(e) => setPasswordForm(p => ({ ...p, next: e.target.value }))}
                placeholder="לפחות 6 תווים"
                minLength={6}
                required
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">אימות סיסמה חדשה</label>
              <input
                type="password"
                className="input"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                placeholder="הקלד שוב את הסיסמה החדשה"
                required
                dir="ltr"
              />
            </div>
            <button type="submit" disabled={passwordLoading} className="btn-primary w-full">
              {passwordLoading ? "משנה..." : "שנה סיסמה"}
            </button>
          </form>
        )}
      </div>

      {/* Recent RSVPs */}
      <div className="card">
        <h2 className="font-bold text-slate-800 mb-4">📅 היסטוריית משחקים</h2>
        {profile.rsvps.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">עוד לא נרשמת לאף משחק</p>
        ) : (
          <div className="space-y-2">
            {profile.rsvps.slice(0, 10).map((rsvp) => (
              <div key={rsvp.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {format(new Date(rsvp.game.date), "EEEE, d בMMM yyyy", { locale: he })}
                  </p>
                  <p className="text-xs text-slate-400">{rsvp.game.location}</p>
                </div>
                <span className={clsx(
                  "badge",
                  rsvp.status === "confirmed" ? "bg-green-100 text-green-700" :
                  rsvp.status === "waitlist" ? "bg-orange-100 text-orange-700" :
                  "bg-red-100 text-red-600"
                )}>
                  {rsvp.status === "confirmed" ? "✅ הגעתי" :
                   rsvp.status === "waitlist" ? "✋ המתנה" :
                   "❌ לא הגעתי"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
