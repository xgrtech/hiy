import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: 'hiy.ai — a twin that talks like you, and knows when to say "I don\'t know"',
  description:
    "Point hiy.ai at your writing, talks, and videos. Get an AI twin that answers like you — cites its sources, admits what it doesn't know, and is available to everyone, always.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
