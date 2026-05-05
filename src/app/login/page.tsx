"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Mail, Lock, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.ok) {
      router.push("/");
    } else {
      toast.error("אימייל או סיסמה שגויים");
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0f172a]">
      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 bg-[#0a0f1e] border-l border-white/5 p-10">
        <div>
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">KL</span>
            </div>
            <span className="font-bold text-white text-lg tracking-tight">KickList</span>
          </div>
          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            ניהול משחקים.<br />
            <span className="text-green-400">בלי בלגן.</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            אשר הגעה, צפה בהרכבים, עקוב אחר תורנויות — הכל במקום אחד.
          </p>
        </div>
        <div className="text-slate-600 text-xs">
          © 2026 KickList
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">KL</span>
            </div>
            <span className="font-bold text-white text-lg tracking-tight">KickList</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">כניסה לחשבון</h1>
            <p className="text-slate-400 text-sm">הכנס את פרטי ההתחברות שלך</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                אימייל
              </label>
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-300">
                  סיסמה
                </label>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-9 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/50 transition-all"
                  placeholder="••••••••"
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
                  מתחבר...
                </span>
              ) : (
                <>
                  כניסה
                  <ArrowLeft size={15} />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-slate-400 hover:text-green-400 transition-colors underline underline-offset-2"
            >
              שכחתי סיסמה
            </Link>
          </div>

          <p className="mt-4 text-center text-sm text-slate-500">
            אין לך חשבון?{" "}
            <Link href="/register" className="text-green-400 font-semibold hover:text-green-300 transition-colors">
              הרשמה
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
