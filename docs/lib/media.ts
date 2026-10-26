/**
 * `public/media/` 下的截图与录屏。素材按 2 倍像素拍摄，`width` 与 `height` 是 CSS 像素（原始尺寸的一半），
 * 页面据此占位，加载前后不跳动。录屏场景的 `image` 是同一裁剪区域的封面截图。
 */
export const media = {
  recall: { image: "/media/recall.png", video: "/media/recall.mp4", width: 760, height: 496 },
  autosuggest: {
    image: "/media/autosuggest.png",
    video: "/media/autosuggest.mp4",
    width: 760,
    height: 496,
  },
  "kit-settings": {
    image: "/media/kit-settings.png",
    video: "/media/kit-settings.mp4",
    width: 758,
    height: 656,
  },
  "kit-settings-page": {
    image: "/media/kit-settings-page.png",
    video: undefined,
    width: 758,
    height: 923,
  },
} as const satisfies Record<
  string,
  { image: string; video: string | undefined; width: number; height: number }
>;

export type MediaName = keyof typeof media;
