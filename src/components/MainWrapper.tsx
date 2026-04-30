"use client";

import { usePathname } from "next/navigation";

const AUTH_PATHS = ["/login", "/register"];

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_PATHS.includes(pathname);

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
  );
}
