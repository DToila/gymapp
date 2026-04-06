import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GymApp — Gracie Barra",
  description: "Gestão de membros Gracie Barra Carnaxide & Queijas",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GymApp",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="apple-touch-icon" href="/gb-logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
