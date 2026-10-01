import type { Metadata } from "next";
import type { ReactNode } from "react";
import { APP_NAME, APP_TAGLINE } from "@/lib/app";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
