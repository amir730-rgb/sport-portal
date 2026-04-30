"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";
import { POSITION_LABELS, encodePositions } from "@/lib/teams";
import clsx from "clsx";
import { User, Mail, Lock, Phone, Star, CheckCircle } from "lucide-react";

const positions = ["goalkeeper", "defender", "midfielder", "forward", "any"];

const POSITION_SHORT: Record<string, string> = {
  goalkeeper: "שוער",
  defender: "בלם",
  midfielder: "קשר",
  forward: "חלוץ",
  any: "כל עמדה",
};

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

      await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      toast.success("ברוך הבא!");
      router.push("/");
    } catch {
      toast.error("שגיאת שרת");
    } finally {
      setLoading(false);
    }
  }

  const skillLabels: Record<number, string> = { 1: "מתחיל", 2: "בסיסי", 3: "בינוני", 4: "מתקדם", 5: "מקצוען" };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">KL</span>
          </div>
          <span className="font-bold text-white text-lg tracking-tight">KickList</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">הצטרפות לקבוצה</h1>
          <p className="text-slate-400 text-sm">צור פרופיל שחקן</p>
        </div>

        <div className="bg-[#1e293b] rounded-2xl border border-white/8 p-6">
          <form onSubmit={handleRegister} className="space-y-4">

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">שם מלא</label>
              <div className="relative">
                <User size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-9 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/50 transition-all"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="ישראל ישראלי"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">אימייל</label>
              <div className="relative">
                <Mail size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-9 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/50 transition-all"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="your@email.com"
                  required
                  dir="ltr"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">סיסמה</label>
              <div className="relative">
                <Lock size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-9 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/50 transition-all"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="לפחות 6 תווים"
                  minLength={6}
                  required
                  dir="ltr"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                טלפון <span className="text-slate-500 font-normal">(אופציונלי)</span>
              </label>
              <div className="relative">
                <Phone size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="tel"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-9 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/50 transition-all"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="050-0000000"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Positions */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">עמדה מועדפת</label>
              <p className="text-xs text-slate-500 mb-2">ניתן לבחור יותר מאחת</p>
              <div className="grid grid-cols-5 gap-1.5">
                {positions.map((pos) => {
                  const isSelected = selectedPositions.includes(pos);
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => togglePosition(pos)}
                      className={clsx(
                        "relative flex flex-col items-center py-2.5 px-1 rounded-xl border text-xs font-medium transition-all cursor-pointer select-none",
                        isSelected
                          ? "border-green-500 bg-green-500/15 text-green-400"
                          : "border-white/10 bg-white/5 text-slate-400 hover:border-green-500/40 hover:text-green-400"
                      )}
                    >
                      {isSelected && (
                        <CheckCircle size={10} className="absolute top-1 left-1 text-green-500" />
                      )}
                      <span className="leading-tight text-center text-[11px]">{POSITION_SHORT[pos]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Skill Level */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                רמת משחק
                <span className="text-green-400 font-normal mr-2">{skillLabels[form.skillLevel]}</span>
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => set("skillLevel", level)}
                    className={clsx(
                      "flex-1 flex items-center justify-center py-2.5 rounded-xl border transition-all cursor-pointer",
                      form.skillLevel >= level
                        ? "border-yellow-500/60 bg-yellow-500/15 text-yellow-400"
                        : "border-white/10 bg-white/5 text-slate-600 hover:border-yellow-500/30"
                    )}
                  >
                    <Star size={15} fill={form.skillLevel >= level ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1.5 px-0.5">
                <span>מתחיל</span>
                <span>מקצוען</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 text-sm mt-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> נרשם...</>
              ) : "הצטרף לקבוצה"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            כבר רשום?{" "}
            <Link href="/login" className="text-green-400 font-semibold hover:text-green-300 transition-colors">
              כניסה
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
