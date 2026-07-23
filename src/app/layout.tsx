import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: 'hiy.ai — a twin that talks like you, and knows when to say "I don\'t know"',
  description:
    "Point hiy.ai at your writing, talks, and videos. Get an AI twin that answers like you — cites its sources, admits what it doesn't know, and is available to everyone, always.",
};

/* Set the theme before first paint so there's no light→dark flash. Reads
   the saved choice, else the OS preference. Mirrors src/lib/theme.ts. */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('hiy-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
