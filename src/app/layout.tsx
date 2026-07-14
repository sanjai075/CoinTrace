import type { Metadata } from "next";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "../stack/client";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import UserSync from "@/components/UserSync";
import { Suspense } from "react";
import Loading from "./loading";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CoinTrace - Daily Register",
  description: "Simple Digital Khata + Daily Register for Small Retail Shops",
  manifest: "/manifest.json", // Automatically hooks up manifest link
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "ta";

  let messages = {};
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch (err) {
    console.error("Failed to load translation messages for locale:", locale, err);
  }

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900 text-white`}
      >
        <StackProvider app={stackClientApp}>
          <StackTheme>
            <NextIntlClientProvider messages={messages} locale={locale}>
              <Suspense fallback={<Loading />}>
                <UserSync />
                <PwaInstallPrompt />
                {children}
              </Suspense>
            </NextIntlClientProvider>
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
