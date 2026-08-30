import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeInitScript, ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast";
import { NavProgress } from "@/components/nav-progress";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { LocaleProvider } from "@/lib/i18n/context";
import { getLocale, getServerDictionary } from "@/lib/i18n/server";
import { getAppSettings } from "@/domain/branding/repository";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAppSettings();
  const t = getServerDictionary();
  return {
    title: settings.app_name,
    description: settings.app_tagline ?? t.meta.defaultDescription,
  };
}

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();

  return (
    <html lang={locale} className={inter.variable}>
      <head>
        <ThemeInitScript />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="application-name" content="Amigo Karting" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#F5B731" />
        <link rel="icon" type="image/png" href="/icon-pwa-192.png" />
        <link rel="apple-touch-icon" href="/icon-pwa-192.png" />
      </head>
      <body className="min-h-screen antialiased transition-colors duration-300">
        <NavProgress />
        <ServiceWorkerRegister />
        <ThemeProvider>
          <ToastProvider>
            <LocaleProvider locale={locale}>{children}</LocaleProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
