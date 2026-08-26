import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hub",
  description: "Window-Cool's payroll, budget and company hub — CPF, overtime, leave, bank payout and cashflow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Progressive enhancement only — the app looks and works fine
            offline / if this request is blocked; it just falls back to
            the system serif/mono fonts declared in globals.css. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
