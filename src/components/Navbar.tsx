"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = session?.user as { role?: string; name?: string | null } | undefined;
  const isAdmin = user?.role === "admin";

  const links = [
    { href: "/", label: "🏠 ראשי" },
    { href: "/stats", label: "📊 סטטיסטיקות" },
    { href: "/duties", label: "🔄 תורנויות" },
    { href: "/profile", label: "👤 הפרופיל שלי" },
    ...(isAdmin ? [{ href: "/admin", label: "⚙️ ניהול" }] : []),
  ];

  if (!session) return null;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-green-600 text-lg">
            <span className="text-2xl">⚽</span>
            <span className="hidden sm:block">Sport Portal</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-green-50 text-green-700"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-slate-500">
              שלום, {user?.name?.split(" ")[0]}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-slate-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              יציאה
            </button>
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-slate-100"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <div className="w-5 h-0.5 bg-slate-600 mb-1" />
              <div className="w-5 h-0.5 bg-slate-600 mb-1" />
              <div className="w-5 h-0.5 bg-slate-600" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden pb-3 border-t border-slate-100 pt-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={clsx(
                  "block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors mb-1",
                  pathname === link.href
                    ? "bg-green-50 text-green-700"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
