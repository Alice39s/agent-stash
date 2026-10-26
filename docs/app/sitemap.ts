import type { MetadataRoute } from "next";
import { htmlLang, i18n } from "@/lib/i18n";
import { absoluteUrl, pagePath } from "@/lib/shared";
import { source } from "@/lib/source";

export const dynamic = "force-static";

/** 两种语言的全部页面，每条列出它的其他语言版本。 */
export default function sitemap(): MetadataRoute.Sitemap {
  return source.getLanguages().flatMap(({ pages }) =>
    pages.map((page) => ({
      url: absoluteUrl(pagePath(page.url)),
      lastModified: page.data.lastModified,
      alternates: {
        languages: Object.fromEntries(
          i18n.languages.flatMap((language) => {
            const twin = source.getPage(page.slugs, language);
            return twin === undefined
              ? []
              : [[htmlLang[language], absoluteUrl(pagePath(twin.url))]];
          }),
        ),
      },
    })),
  );
}
