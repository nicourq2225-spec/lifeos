import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { Toaster } from "sonner";
import PinLock from "@/components/PinLock";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Life OS",
  description: "Dashboard personal para gestionar la vida.",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
    shortcut: "/icon-192.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} bg-black text-white min-h-screen pb-24`}>
        <PinLock>
          <div className="max-w-md mx-auto relative px-4">
            {children}
          </div>
          <Navigation />
        </PinLock>
        <Toaster position="bottom-center" theme="dark" toastOptions={{ className: 'rounded-2xl border-white/10 bg-card text-white' }} />
      </body>
    </html>
  );
}
