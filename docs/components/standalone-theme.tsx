import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";

/**
 * 不挂文档布局的独立文档（语言入口页、未找到页）用的主题：与文档页同一个 Fumadocs 主题提供者，在 `html` 上切换
 * `dark` 类，默认跟随系统；这些页面没有搜索。
 */
export function StandaloneTheme({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      search={{ enabled: false }}
      theme={{ defaultTheme: "system", enableSystem: true, disableTransitionOnChange: true }}
    >
      {children}
    </RootProvider>
  );
}
