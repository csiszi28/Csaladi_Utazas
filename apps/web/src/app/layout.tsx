import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

const APP_NAME = "Családi Utazástervező";
const APP_DEFAULT_TITLE = "Családi Utazás";
const APP_DESCRIPTION = "Családi utazások tervezése és követése";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: `%s · ${APP_DEFAULT_TITLE}`,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#1a365d",
};

const SPLASH_CRITICAL_CSS = `@media (max-width:767px),(display-mode:standalone){html.app-root:not(.app-ready),html.app-root:not(.app-ready) body{background-color:#1a365d!important}}#app-splash-blocker{display:none}html.app-splash-active,html.app-splash-active body{background-color:#1a365d!important;overflow:hidden!important}html.app-splash-active body>*:not(.app-splash-root):not(#app-splash-blocker){visibility:hidden!important;pointer-events:none!important}html.app-splash-active #app-splash-blocker{display:flex}html.app-splash-exiting body>*:not(.app-splash-root){visibility:visible!important;pointer-events:auto!important}html.app-splash-exiting body{overflow:hidden!important}#app-splash-blocker{position:fixed;inset:0;z-index:99999;flex-direction:column;align-items:center;justify-content:center;background:#1a365d;color:#fff;width:100vw;height:100dvh;min-height:-webkit-fill-available;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);box-sizing:border-box}.app-splash-blocker-title{font-size:2.25rem;font-weight:700;letter-spacing:.35em;text-indent:.35em}.app-splash-blocker-subtitle{margin-top:1.5rem;font-size:.875rem;font-weight:600;letter-spacing:.28em;text-indent:.28em;color:rgba(214,227,255,.9)}`;

// Keep in sync with SPLASH_KEY in @/lib/app-splash.ts
const SPLASH_BOOT_SCRIPT = `(function(){try{var html=document.documentElement;html.classList.add("app-root");var k="app-splash-seen-v2";var mobile=matchMedia("(max-width:767px)").matches;var standalone=matchMedia("(display-mode:standalone)").matches||("standalone" in navigator&&navigator.standalone);if(!(mobile||standalone)||sessionStorage.getItem(k)==="1"){html.classList.add("app-ready");return}html.classList.add("app-splash-active")}catch(e){document.documentElement.classList.add("app-ready")}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" suppressHydrationWarning className="app-root">
      <head>
        <script dangerouslySetInnerHTML={{ __html: SPLASH_BOOT_SCRIPT }} />
        <style dangerouslySetInnerHTML={{ __html: SPLASH_CRITICAL_CSS }} />
      </head>
      <body>
        <div id="app-splash-blocker" aria-hidden="true">
          <div className="app-splash-blocker-title">F.A.M.</div>
          <div className="app-splash-blocker-subtitle">FAMILY ADVENTURE MANAGER</div>
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
