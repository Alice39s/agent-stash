import "../globals.css";
import type { ReactNode } from "react";
import { StandaloneTheme } from "@/components/standalone-theme";

/** 站点根路径的语言选择页有自己的文档；每种语言各是一个根布局。 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-fd-background font-sans text-fd-foreground">
        <StandaloneTheme>{children}</StandaloneTheme>
      </body>
    </html>
  );
}
