import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Life OS",
  description: "Dashboard personal para gestionar la vida.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} bg-black text-white min-h-screen pb-24`}>
        <div className="max-w-md mx-auto relative px-4">
          {children}
        </div>
        <Navigation />
        <Toaster position="bottom-center" theme="dark" toastOptions={{ className: 'rounded-2xl border-white/10 bg-card text-white' }} />
      </body>
    </html>
  );
}
