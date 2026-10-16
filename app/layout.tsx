import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/state/AppProvider";
import Sidebar from "@/components/layout/Sidebar";
import BoardLoading from "./board/[boardId]/loading";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Talenvo Workspace",
  description: "Manage boards, ideas, and collaborative work.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProvider>
          <Suspense fallback={null}>
            <Sidebar />
          </Suspense>
          {children}
          </AppProvider>
        </body>
    </html>
  );
}
