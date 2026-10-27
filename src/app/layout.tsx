import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { Analytics } from "@/components/Analytics";
import { OfflineBanner } from "@/components/OfflineBanner";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SyncUp! — Stop debating. SyncUp!",
  description:
    "Swipe with the people you're with. SyncUp finds what everyone actually wants to watch or eat.",
  manifest: "/manifest.json",
  // Setting `icons` replaces Next's file-based icon detection, so the
  // favicon has to be listed here too.
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    // Transparent status bar over our own background (we already pad for
    // the notch below) instead of a white/black strip.
    statusBarStyle: "black-translucent",
    title: "SyncUp!",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Needed for env(safe-area-inset-*) to be non-zero.
  viewportFit: "cover",
  // Android's keyboard shrinks the layout like iOS's does.
  interactiveWidget: "resizes-content",
  colorScheme: "light dark",
  // Browser chrome matches each theme's --background, like an installed app.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e9" },
    { media: "(prefers-color-scheme: dark)", color: "#2b2d42" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} h-dvh antialiased`}
      // The theme script below sets data-theme before hydration.
      suppressHydrationWarning
    >
      {/* Nothing scrolls at the document level (see globals.css); a screen
          with more content than fits provides its own scroll region.
          Safe-area padding lives here once for every page. */}
      <body className="flex h-dvh flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {/* Applies the saved theme before first paint (no flash). Shares
            ThemeToggle's storage key. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('syncup-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`,
          }}
        />
        {children}
        <OfflineBanner />
        <ThemeToggle />
        <ServiceWorkerRegister />
        {/* Keeps useSearchParams from making every route dynamic. */}
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
