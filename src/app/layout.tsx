import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SyncUp — Stop debating. SyncUp.",
  description:
    "Swipe with the people you're with. SyncUp finds what everyone actually wants to watch or eat.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // viewportFit lets the page draw under the notch/Dynamic Island — without
  // it every env(safe-area-inset-*) value below is just 0px, so this has to
  // come first. interactiveWidget makes the on-screen keyboard shrink the
  // layout viewport on Android the same way it already does on iOS, so
  // 100dvh and bottom-pinned buttons react to it correctly there too.
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  colorScheme: "light dark",
  // Matches the actual background color at the top of the page in each
  // theme (globals.css's --background), not the brand orange — this drives
  // the phone's status bar / browser chrome color, and using the brand
  // color there looks like a mismatched, unfinished web page rather than
  // an installed app.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#15131c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} h-dvh antialiased`}>
      {/* The one hard boundary: nothing scrolls at the document level, ever
          — see globals.css's comment on why. Any screen with more content
          than fits provides its own internal scroll region instead of
          letting the whole page grow past the viewport (the scroll/swipe
          gesture conflict flagged during Sprint 5 testing). Safe-area
          padding lives here once, so no individual page has to remember
          it. */}
      <body className="flex h-dvh flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {children}
      </body>
    </html>
  );
}
