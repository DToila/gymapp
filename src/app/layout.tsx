import type { Metadata, Viewport } from "next";
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
  other: {
    "mobile-web-app-capable": "yes",
  },
};

// Defined via Next.js's dedicated viewport export (not a hand-written <meta>
// tag in <head>) so Next only ever emits one viewport tag — a manual one
// alongside App Router's own metadata system produced two conflicting
// <meta name="viewport"> tags in the rendered HTML, which is what was
// actually breaking mobile layout despite correct responsive CSS.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <head>
        <link rel="apple-touch-icon" href="/gb-logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
