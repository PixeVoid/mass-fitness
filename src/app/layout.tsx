import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Reveal from "@/components/Reveal";

// Editorial display face. Ships regular + italic only — the italic is a true
// cut, so it is safe to use for emphasis.
const instrument = localFont({
  src: [
    {
      path: "../../public/fonts/InstrumentSerif-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/InstrumentSerif-Italic.ttf",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-instrument",
  display: "swap",
});

// Inter and JetBrains Mono are both variable (fvar-verified), so every
// font-weight resolves to a real master rather than a synthesised fake.
const inter = localFont({
  src: "../../public/fonts/Inter-Regular.ttf",
  variable: "--font-inter",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "../../public/fonts/JetBrainsMono-Variable.ttf",
  variable: "--font-jetbrains",
  weight: "100 800",
  style: "normal",
  display: "swap",
});

const siteUrl = "https://massfitness.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Mass Fitness — Live Online Fitness Classes & Home Workouts",
    template: "%s | Mass Fitness",
  },
  description:
    "Train live from home. Mass Fitness brings coach-led online fitness classes, structured home workout plans, and real-time feedback — no gym required.",
  keywords: [
    "online fitness classes",
    "live workout classes app",
    "home fitness subscription",
    "fitness from home",
    "live online fitness classes India",
  ],
  authors: [{ name: "PixeVoid" }],
  openGraph: {
    title: "Mass Fitness — Live Online Fitness Classes & Home Workouts",
    description:
      "Train live from home. Coach-led classes, structured plans, real-time feedback — no gym required.",
    url: siteUrl,
    siteName: "Mass Fitness",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mass Fitness — Live Online Fitness Classes & Home Workouts",
    description:
      "Train live from home. Coach-led classes, structured plans, real-time feedback — no gym required.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0e" },
  ],
};

/**
 * Runs before first paint so a saved theme is applied without the page
 * flashing the opposite one. Deliberately tiny and dependency-free — anything
 * that waits for React hydration is already too late to prevent the flash.
 */
const themeScript = `
(function(){try{
  var t = localStorage.getItem('mf-theme');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${instrument.variable} ${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <Reveal />
        {children}
      </body>
    </html>
  );
}
