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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k="app-splash-seen-v2",bg="#1a365d";var mobile=matchMedia("(max-width:767px)").matches;var standalone=matchMedia("(display-mode:standalone)").matches||("standalone" in navigator&&navigator.standalone);if(!(mobile||standalone)||sessionStorage.getItem(k)==="1")return;var html=document.documentElement;html.classList.add("app-splash-active");html.style.backgroundColor=bg;var css='html.app-splash-active,html.app-splash-active body{background-color:'+bg+'!important;overflow:hidden!important}html.app-splash-active body>*:not(.app-splash-root){visibility:hidden!important;pointer-events:none!important}#app-splash-blocker{position:fixed;inset:0;z-index:99998;background:'+bg+';width:100vw;height:100dvh;min-height:-webkit-fill-available}';var style=document.createElement("style");style.id="app-splash-prep-style";style.textContent=css;document.head.appendChild(style);function mountBlocker(){if(document.getElementById("app-splash-blocker"))return;var blocker=document.createElement("div");blocker.id="app-splash-blocker";blocker.setAttribute("aria-hidden","true");(document.body||html).appendChild(blocker);if(document.body){document.body.style.backgroundColor=bg;document.body.style.overflow="hidden"}}if(document.body)mountBlocker();else document.addEventListener("DOMContentLoaded",mountBlocker,{once:true})}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
