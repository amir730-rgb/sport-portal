import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import MainWrapper from "@/components/MainWrapper";

export const metadata: Metadata = {
  title: "KickList — ניהול משחקי כדורגל",
  description: "ניהול משחקי כדורגל לקבוצות חברים",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-slate-50">
        <Providers>
          <Navbar />
          <MainWrapper>{children}</MainWrapper>
          <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        </Providers>
      </body>
    </html>
  );
}
