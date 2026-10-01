import type { Metadata } from "next";
import localFont from "next/font/local";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { APP_NAME, APP_TAGLINE } from "@/lib/app";
import { getCurrentBoard } from "@/lib/board/store";
import { getDb } from "@/lib/db/client";
import { getLanguage } from "@/lib/i18n/languages";
import "./globals.css";

// Pretendard(OFL): 한글·라틴을 한 글꼴로. 일본어·중국어·태국어 글자는 언어별 시스템 글꼴로 이어진다(globals.css).
const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  weight: "45 920",
  display: "swap",
  variable: "--font-pretendard",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // 언어는 보드에 저장되므로 요청마다 읽는다
  await connection();
  const language = getLanguage(getCurrentBoard(getDb())?.user_language);
  return (
    <html lang={language.code} className={pretendard.variable}>
      <body>{children}</body>
    </html>
  );
}
