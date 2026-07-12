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

const SPLASH_CRITICAL_CSS = [
  "@media (max-width:767px),(display-mode:standalone){",
  "html.splash-gate:not(.app-ready),html.splash-gate:not(.app-ready) body{background-color:#1a365d!important}",
  "html.splash-gate:not(.app-ready) body{overflow:hidden!important}",
  "html.splash-gate:not(.app-ready):not(.app-splash-exiting) body>*:not(#app-splash-blocker){visibility:hidden!important;pointer-events:none!important}",
  "html.splash-gate:not(.app-ready) #app-splash-blocker{display:block!important}",
  "}",
  "#app-splash-blocker{display:none;position:fixed;inset:0;z-index:100000;background:#1a365d;color:#fff;width:100vw;height:100dvh;min-height:-webkit-fill-available;box-sizing:border-box}",
  ".app-splash-stage{position:relative;display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:100%;height:100%;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}",
  "html.app-splash-active,html.app-splash-active body{background-color:#1a365d!important;overflow:hidden!important}",
  "html.app-splash-exiting,html.app-splash-exiting body{background-color:#1a365d!important}",
  "html.app-ready #app-splash-blocker{display:none!important;visibility:hidden!important;pointer-events:none!important}",
  "html.app-splash-active body>*:not(#app-splash-blocker){visibility:hidden!important;pointer-events:none!important}",
  "html.splash-gate.app-splash-exiting body>*:not(#app-splash-blocker){visibility:visible!important;pointer-events:auto!important}",
  "html.app-splash-exiting body{overflow:hidden!important}",
  "html.app-splash-exiting #app-splash-blocker{opacity:0;transition:opacity 1.4s cubic-bezier(.4,0,.2,1);pointer-events:none}",
  "html.app-splash-active #app-splash-blocker .app-splash-footer{animation:splash-footer-enter 1s cubic-bezier(.22,1,.36,1) forwards;opacity:0}",
  "@keyframes splash-footer-enter{to{opacity:1}}",
  ".app-splash-brand{display:flex;flex-direction:column;align-items:center;text-align:center;contain:layout style}",
  ".app-splash-title{margin:0;font-size:3rem;font-weight:700;letter-spacing:.35em;padding-left:.35em;line-height:1.1;color:#fff;min-height:1.1em;font-family:ui-sans-serif,system-ui,sans-serif}",
  ".app-splash-subtitle{margin:1.5rem 0 0;font-size:.875rem;font-weight:600;letter-spacing:.28em;padding-left:.28em;line-height:1.4;color:rgba(214,227,255,.9);min-height:1.4em;font-family:ui-sans-serif,system-ui,sans-serif}",
  ".app-splash-footer{position:absolute;right:0;bottom:0;left:0;display:flex;flex-direction:column;align-items:center;gap:.75rem;padding:0 1rem max(1.5rem,env(safe-area-inset-bottom)) 1rem;box-sizing:border-box}",
  ".app-splash-connecting{font-size:.875rem;font-weight:600;letter-spacing:.05em;color:#adc7f7}",
  ".app-splash-progress-track{position:relative;width:12rem;height:2px;overflow:hidden;border-radius:9999px;background:rgba(255,255,255,.25)}",
  ".app-splash-progress-shimmer-bar{position:absolute;inset-block:0;width:33.333%;border-radius:9999px;background:#ffb866}",
].join("");

// Keep in sync with SPLASH_KEY in @/lib/app-splash.ts
const SPLASH_BOOT_SCRIPT = `(function(){try{var html=document.documentElement;var k="app-splash-seen-v2";var mobile=matchMedia("(max-width:767px)").matches;var standalone=matchMedia("(display-mode:standalone)").matches||("standalone" in navigator&&navigator.standalone);if(!(mobile||standalone)||sessionStorage.getItem(k)==="1"){html.classList.add("app-ready");return}html.classList.add("app-splash-active")}catch(e){document.documentElement.classList.add("app-ready")}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" suppressHydrationWarning className="app-root splash-gate">
      <head>
        <script dangerouslySetInnerHTML={{ __html: SPLASH_BOOT_SCRIPT }} />
        <style dangerouslySetInnerHTML={{ __html: SPLASH_CRITICAL_CSS }} />
      </head>
      <body>
        <div id="app-splash-blocker" aria-hidden="true">
          <div className="app-splash-stage">
            <div className="app-splash-brand">
              <h1 className="app-splash-title">F.A.M.</h1>
              <p className="app-splash-subtitle">FAMILY ADVENTURE MANAGER</p>
            </div>
            <div className="app-splash-footer" aria-hidden="true">
              <span className="app-splash-connecting splash-connecting-pulse">Connecting...</span>
              <div className="app-splash-progress-track">
                <div className="app-splash-progress-shimmer-bar splash-progress-shimmer" />
              </div>
            </div>
          </div>
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
