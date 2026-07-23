import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const DESCRIPTION =
  "Turn your writing, talks, and videos into an honest AI twin at hiy.ai/you. It answers your audience's repeat questions in your voice — cites the exact source, and says \"I don't know\" instead of guessing.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "hiy.ai — an AI twin that answers like you, and cites its sources",
  description: DESCRIPTION,
  openGraph: {
    title: "hiy.ai — an AI twin that answers like you, and cites its sources",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "hiy.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "hiy.ai — an honest, cited AI twin",
    description: DESCRIPTION,
  },
};

/* AEO: structured data so answer engines can quote hard facts about hiy
   instead of inferring them. Static, hand-authored JSON — no user input. */
const STRUCTURED_DATA = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "hiy.ai",
      url: SITE_URL,
      email: "hello@hiy.ai",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#site`,
      name: "hiy.ai",
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#org` },
    },
    {
      "@type": "SoftwareApplication",
      name: "hiy.ai",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description:
        "hiy.ai turns a creator's content into a hosted AI twin that answers in their voice, cites the exact source passage behind every grounded answer, and says \"I don't know\" instead of guessing.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free while launching; paid tiers add scale, never honesty.",
      },
    },
  ],
});

/* Set the theme before first paint so there's no light→dark flash. Reads
   the saved choice, else the OS preference. Mirrors src/lib/theme.ts. */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('hiy-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* Static hand-authored JSON-LD (no user input) for answer engines. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: STRUCTURED_DATA }}
        />
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
