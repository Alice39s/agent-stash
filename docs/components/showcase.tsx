"use client";

import { ImageZoom } from "fumadocs-ui/components/image-zoom";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { media, type MediaName } from "@/lib/media";
import { assetPath } from "@/lib/shared";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const reducedMotionNow = () => window.matchMedia(REDUCED_MOTION).matches;
/** 服务端渲染时按减少动效处理：先显示封面与控件，客户端再决定是否自动播放。 */
const reducedMotionOnServer = () => true;

/** 播放被打断（元素离开文档、紧接着暂停）是正常情况，其余错误照常抛出。 */
function playQuietly(video: HTMLVideoElement): void {
  video.play().catch((error: unknown) => {
    if (error instanceof DOMException && error.name === "AbortError") return;
    throw error;
  });
}

interface ShowcaseProps {
  /** `lib/media.ts` 里的场景名。 */
  name: MediaName;
  /** 截图的替代文字；录屏时也作为它的可读名称。 */
  alt: string;
  caption: string;
}

/**
 * design.md「截图与录屏展示」：浅灰或深灰展示板上一张带圆角和阴影的画框。录屏静音循环，进入视口时播放、离开时
 * 暂停；减少动效时不自动播放，显示封面和播放控件。
 */
export function Showcase({ name, alt, caption }: ShowcaseProps) {
  const entry = media[name];
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionNow,
    reducedMotionOnServer,
  );
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = video.current;
    if (element === null || reducedMotion) return undefined;
    const observer = new IntersectionObserver(
      ([visible]) => {
        if (visible?.isIntersecting === true) playQuietly(element);
        else element.pause();
      },
      { threshold: 0.4 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      element.pause();
    };
  }, [reducedMotion]);

  const frame = { maxWidth: entry.width };
  return (
    <figure className="not-prose my-6">
      <div className="rounded-(--radius-card) bg-(--showcase-board) p-3 sm:p-7">
        <div
          className="mx-auto overflow-hidden rounded-(--radius-frame) shadow-(--shadow-frame)"
          style={frame}
        >
          {entry.video === undefined ? (
            <ImageZoom
              src={assetPath(entry.image)}
              alt={alt}
              width={entry.width}
              height={entry.height}
              className="block h-auto w-full"
            />
          ) : (
            <video
              ref={video}
              className="block h-auto w-full"
              src={assetPath(entry.video)}
              poster={assetPath(entry.image)}
              width={entry.width}
              height={entry.height}
              aria-label={alt}
              muted
              loop
              playsInline
              preload="metadata"
              controls={reducedMotion}
            />
          )}
        </div>
      </div>
      <figcaption className="mt-2 text-meta text-fd-muted-foreground">{caption}</figcaption>
    </figure>
  );
}
