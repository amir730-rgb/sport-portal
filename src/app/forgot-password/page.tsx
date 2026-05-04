"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error ?? "שגיאה, נסה שוב");
      }
    } catch {
      setError("שגיאת רשת, נסה שוב");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0f172a]">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 bg-[#0a0f1e] border-l border-white/5 p-10">
        <div>
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">KL</span>
            </div>
            <span className="font-bold text-white text-lg tracking-tight">KickList</span>
          </div>
          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            שכחת סיסמה?<br />
            <span className="text-green-400">אין בעיה.</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            נשלח אליך קישור לאיפוס הסיסמה בתוך שניות.
          </p>
        </div>
        <div className="text-slate-600 text-xs">© 2026 KickList</div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">KL</span>
            </div>
            <span className="font-bold text-white text-lg tracking-tight">KickList</span>
          </div>

          {sent ? (
            /* Success state */
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">מייל נשלח!</h1>
              <p className="text-slate-400 text-sm mb-1">
                אם הכתובת <span className="text-white font-medium">{email}</span> רשומה במערכת,
              </p>
              <p className="text-slate-400 text-sm mb-8">
                תקבל קישור לאיפוס סיסמה תוך כמה שניות.
              </p>
              <p className="text-slate-500 text-xs mb-6">הקישור תקף לשעה אחת בלבד.</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-green-400 font-semibold hover:text-green-300 transition-colors text-sm"
              >
                <ArrowRight size={14} /> חזרה לכניסה
              </Link>
            </div>
          ) : (
            /* Form state */
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-1">שכחתי סיסמה</h1>
                <p className="text-slate-400 text-sm">הכנס את האימייל שלך ונשלח קישור לאיפוס</p>
              </div>

              {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">אימייל</label>
                  <div className="relative">
                    <Mail size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-9 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/50 transition-all"
                      placeholder="your@email.com"
                      required
                      dir="ltr"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      שולח...
                    </span>
                  ) : (
                    "שלח קישור לאיפוס"
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                נזכרת בסיסמה?{" "}
                <Link href="/login" className="text-green-400 font-semibold hover:text-green-300 transition-colors">
                  כניסה
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
