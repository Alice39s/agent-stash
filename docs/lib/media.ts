/**
 * `public/media/` 下的截图与录屏。素材按 2 倍像素拍摄，`width` 与 `height` 是 CSS 像素（原始尺寸的一半），
 * 页面据此占位，加载前后不跳动。录屏场景的 `image` 是同一裁剪区域的封面截图。
 * 以 `-en` 结尾的场景是同一段操作在英文界面下的录制，供英文页面使用。
 */
export const media = {
  init: { image: "/media/init.png", video: "/media/init.mp4", width: 760, height: 520 },
  "init-en": { image: "/media/init-en.png", video: "/media/init-en.mp4", width: 760, height: 520 },
  recall: { image: "/media/recall.png", video: "/media/recall.mp4", width: 760, height: 496 },
  "recall-en": {
    image: "/media/recall-en.png",
    video: "/media/recall-en.mp4",
    width: 760,
    height: 496,
  },
  autosuggest: {
    image: "/media/autosuggest.png",
    video: "/media/autosuggest.mp4",
    width: 760,
    height: 496,
  },
  "autosuggest-en": {
    image: "/media/autosuggest-en.png",
    video: "/media/autosuggest-en.mp4",
    width: 760,
    height: 496,
  },
  enhance: { image: "/media/enhance.png", video: "/media/enhance.mp4", width: 760, height: 496 },
  "enhance-en": {
    image: "/media/enhance-en.png",
    video: "/media/enhance-en.mp4",
    width: 760,
    height: 496,
  },
  "enhance-settings-page": {
    image: "/media/enhance-settings-page.png",
    video: undefined,
    width: 758,
    height: 1166,
  },
  "enhance-settings-page-en": {
    image: "/media/enhance-settings-page-en.png",
    video: undefined,
    width: 758,
    height: 1184,
  },
  "kit-settings": {
    image: "/media/kit-settings.png",
    video: "/media/kit-settings.mp4",
    width: 758,
    height: 656,
  },
  "kit-settings-en": {
    image: "/media/kit-settings-en.png",
    video: "/media/kit-settings-en.mp4",
    width: 758,
    height: 656,
  },
  "kit-settings-page": {
    image: "/media/kit-settings-page.png",
    video: undefined,
    width: 758,
    height: 923,
  },
  "kit-settings-page-en": {
    image: "/media/kit-settings-page-en.png",
    video: undefined,
    width: 758,
    height: 945,
  },
  "message-edit": {
    image: "/media/message-edit.png",
    video: "/media/message-edit.mp4",
    width: 960,
    height: 720,
  },
  "message-edit-en": {
    image: "/media/message-edit-en.png",
    video: "/media/message-edit-en.mp4",
    width: 960,
    height: 720,
  },
  "message-edit-timeline": {
    image: "/media/message-edit-timeline.png",
    video: undefined,
    width: 1000,
    height: 800,
  },
  "message-edit-timeline-en": {
    image: "/media/message-edit-timeline-en.png",
    video: undefined,
    width: 1000,
    height: 800,
  },
  "skill-scout": {
    image: "/media/skill-scout.png",
    video: "/media/skill-scout.mp4",
    width: 960,
    height: 720,
  },
  "skill-scout-en": {
    image: "/media/skill-scout-en.png",
    video: "/media/skill-scout-en.mp4",
    width: 960,
    height: 720,
  },
  "skill-scout-drafting": {
    image: "/media/skill-scout-drafting.png",
    video: undefined,
    width: 960,
    height: 720,
  },
  "skill-scout-drafting-en": {
    image: "/media/skill-scout-drafting-en.png",
    video: undefined,
    width: 960,
    height: 720,
  },
  "skill-scout-settings": {
    image: "/media/skill-scout-settings.png",
    video: undefined,
    width: 952,
    height: 1329,
  },
  "skill-scout-settings-en": {
    image: "/media/skill-scout-settings-en.png",
    video: undefined,
    width: 952,
    height: 1326,
  },
} as const satisfies Record<
  string,
  { image: string; video: string | undefined; width: number; height: number }
>;

export type MediaName = keyof typeof media;
