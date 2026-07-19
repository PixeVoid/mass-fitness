import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const anton = localFont({
  src: "../../public/fonts/Anton-Regular.ttf",
  variable: "--font-anton",
  weight: "400",
  display: "swap",
});

const inter = localFont({
  src: "../../public/fonts/Inter-Regular.ttf",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "../../public/fonts/JetBrainsMono-Regular.ttf",
  variable: "--font-jetbrains",
  weight: "400",
  display: "swap",
});

const siteUrl = "https://massfitness.app";

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
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#101012",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-canvas text-ink"
      >
        {children}
      </body>
    </html>
  );
}
