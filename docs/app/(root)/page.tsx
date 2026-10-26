import type { Metadata } from "next";
import Link from "next/link";
import { KeyStrip } from "@/components/key-strip";
import { siteText } from "@/lib/layout.shared";
import { absoluteUrl, basePath, siteName } from "@/lib/shared";

export const metadata: Metadata = {
  title: `${siteName} ${siteText.zh.byline}`,
  alternates: { canonical: absoluteUrl("/zh/") },
};

/** 浏览器首选语言不是中文的读者进入英文文档，其余进入中文文档。 */
const redirect = `(() => {
  const first = (navigator.languages[0] ?? navigator.language ?? '').toLowerCase();
  location.replace('${basePath}/' + (first === '' || first.startsWith('zh') ? 'zh/' : 'en/'));
})();`;

const languageCard =
  "rounded-(--radius-card) border bg-fd-card p-4 text-card-title transition-colors hover:bg-fd-accent";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md grow flex-col justify-center gap-6 px-6 py-16">
      <script dangerouslySetInnerHTML={{ __html: redirect }} />
      <KeyStrip />
      <h1 className="text-h1">{siteName}</h1>
      <nav
        aria-label={`${siteText.zh.chooseLanguage} / ${siteText.en.chooseLanguage}`}
        className="flex flex-col gap-2"
      >
        <Link href="/zh" hrefLang="zh-CN" className={languageCard}>
          简体中文文档
        </Link>
        <Link href="/en" hrefLang="en" className={languageCard}>
          English documentation
        </Link>
      </nav>
    </main>
  );
}
