"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Calendar,
  BarChart2,
  RotateCcw,
  Shield,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import clsx from "clsx";

const navLinks = [
  { href: "/", label: "משחקים", icon: Calendar },
  { href: "/stats", label: "סטטיסטיקות", icon: BarChart2 },
  { href: "/duties", label: "תורנויות", icon: RotateCcw },
];

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const role = (session?.user as { role?: string })?.role;
  const name = session?.user?.name ?? "";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!session) return null;

  return (
    <nav className="bg-[#0f172a] border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs tracking-tight">KL</span>
            </div>
            <span className="font-bold text-white text-base tracking-tight">KickList</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150",
                  pathname === href
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
            {role === "admin" && (
              <Link
                href="/admin"
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150",
                  pathname === "/admin"
                    ? "bg-green-500/20 text-green-400"
                    : "text-slate-400 hover:text-green-400 hover:bg-green-500/10"
                )}
              >
                <Shield size={15} />
                ניהול
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Profile dropdown */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">{initials || <User size={12} />}</span>
                </div>
                <span className="text-slate-300 text-sm font-medium max-w-[120px] truncate">{name}</span>
                <ChevronDown size={14} className="text-slate-500" />
              </button>

              {profileOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50">
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <User size={15} className="text-slate-400" />
                    פרופיל
                  </Link>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => { setProfileOpen(false); signOut({ callbackUrl: "/login" }); }}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-right"
                  >
                    <LogOut size={15} />
                    התנתקות
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/5 bg-[#0f172a] px-4 py-3 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
          {role === "admin" && (
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                pathname === "/admin"
                  ? "bg-green-500/20 text-green-400"
                  : "text-slate-400 hover:text-green-400"
              )}
            >
              <Shield size={17} />
              ניהול
            </Link>
          )}
          <div className="border-t border-white/5 pt-2 mt-2">
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <User size={17} />
              פרופיל — {name}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full text-right"
            >
              <LogOut size={17} />
              התנתקות
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
