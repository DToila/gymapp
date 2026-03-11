import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GymApp - Membership Management",
  description: "Modern gym membership management system for teachers and students",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-dark-900 text-dark-50">{children}</body>
    </html>
  );
}
