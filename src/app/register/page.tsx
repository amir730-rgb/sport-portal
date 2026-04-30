"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";
import { POSITION_LABELS, POSITION_ICONS, encodePositions } from "@/lib/teams";
import clsx from "clsx";

const positions = ["goalkeeper", "defender", "midfielder", "forward", "any"];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    skillLevel: 3,
  });
  const [selectedPositions, setSelectedPositions] = useState<string[]>(["any"]);
  const [loading, setLoading] = useState(false);

  const set = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, position: encodePositions(selectedPositions) }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "שגיאה בהרשמה");
        setLoading(false);
        return;
      }

      // Auto-login after register
      await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      toast.success("ברוך הבא! 🎉");
      router.push("/");
    } catch {
      toast.error("שגיאת שרת");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">⚽</div>
          <h1 className="text-3xl font-bold text-slate-800">הצטרפות לקבוצה</h1>
          <p className="text-slate-500 mt-2">צור פרופיל שחקן</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">שם מלא</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="ישראל ישראלי"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">אימייל</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="your@email.com"
                required
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">סיסמה</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="לפחות 6 תווים"
                minLength={6}
                required
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                טלפון <span className="text-slate-400">(אופציונלי)</span>
              </label>
              <input
                type="tel"
                className="input"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="050-0000000"
                dir="ltr"
              />
            </div>

            {/* Position - multi-select */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                עמדה מועדפת
              </label>
              <p className="text-xs text-slate-400 mb-2">ניתן לבחור יותר מעמדה אחת</p>
              <div className="grid grid-cols-5 gap-1.5">
                {positions.map((pos) => {
                  const isSelected = selectedPositions.includes(pos);
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => togglePosition(pos)}
                      className={clsx(
                        "flex flex-col items-center p-2 rounded-xl border-2 text-xs font-medium transition-all cursor-pointer select-none",
                        isSelected
                          ? "border-green-500 bg-green-50 text-green-700 shadow-sm"
                          : "border-slate-200 bg-white text-slate-500 hover:border-green-300 hover:bg-green-50"
                      )}
                    >
                      <span className="text-xl mb-0.5">{POSITION_ICONS[pos]}</span>
                      <span className="leading-tight text-center">{POSITION_LABELS[pos]}</span>
                      {isSelected && (
                        <span className="mt-0.5 text-green-600">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedPositions.filter(p => p !== "any").length > 0 && (
                <p className="text-xs text-green-600 mt-1.5 font-medium">
                  ✅ {selectedPositions.map(p => POSITION_LABELS[p]).join(" + ")}
                </p>
              )}
            </div>

            {/* Skill Level */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                רמת משחק שלך
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => set("skillLevel", level)}
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
                {[1, 2, 3, 4, 5].map((level) => (
                  <div key={level} className="flex-1 flex justify-center">
                    <span className={clsx(
                      "text-sm",
                      form.skillLevel >= level ? "text-yellow-400" : "text-slate-200"
                    )}>⭐</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1 px-1">
                <span>מתחיל</span>
                <span>מקצוען</span>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "נרשם..." : "הצטרף לקבוצה ⚽"}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-slate-500">
            כבר רשום?{" "}
            <Link href="/login" className="text-green-600 font-semibold hover:underline">
              כניסה לאתר
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
