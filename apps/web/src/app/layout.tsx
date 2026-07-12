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
  themeColor: "#001b3c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var mobile=window.matchMedia("(max-width:767px)").matches;var standalone=window.matchMedia("(display-mode:standalone)").matches||("standalone" in navigator&&navigator.standalone);if((mobile||standalone)&&sessionStorage.getItem("app-splash-seen")!=="1"){document.documentElement.style.backgroundColor="#001b3c";document.documentElement.classList.add("app-splash-active");if(document.body){document.body.style.backgroundColor="#001b3c";}}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
