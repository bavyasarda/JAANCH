import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Jaanch — Packet ki jaanch, aapki bhasha mein",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL("https://jaanch-delta.vercel.app"),
  openGraph: {
    title: "Jaanch — Packet ki jaanch, aapki bhasha mein",
    description: "An open-source AI agent that checks packaged-product labels against India's Legal Metrology rules and explains the result in your language.",
    url: "https://jaanch-delta.vercel.app",
    siteName: "Jaanch",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
    locale: "en_IN",
    type: "website",
  },
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  appleWebApp: { capable: true, title: "Jaanch", statusBarStyle: "default" },
  description:
    "Agentic AI that checks packaged-product labels against India's Legal Metrology (Packaged Commodities) Rules, 2011 and explains the result in your language.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfbf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Tamil:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700&family=Noto+Sans+Telugu:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <div className="tricolor-bar h-1 w-full no-print" />
          <SiteHeader />
          <main className="flex-1 flex flex-col">{children}</main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
