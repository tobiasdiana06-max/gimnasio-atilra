import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gimnasio ATILRA General Rodríguez",
  description: "Credencial digital del Gimnasio ATILRA.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mi Credencial ATILRA",
  },
  icons: {
    icon: [
      { url: "/icons/atilra-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/atilra-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/atilra-192.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
