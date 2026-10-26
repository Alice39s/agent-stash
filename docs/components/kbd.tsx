import { Fragment, type ReactNode } from "react";

/** design.md 的按键帽：等宽字体，底边加厚的细边框，muted 底色。 */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-(--radius) border border-b-2 bg-fd-muted px-1.5 align-[0.1em] font-mono text-xs leading-none font-medium text-fd-foreground">
      {children}
    </kbd>
  );
}

/** 一组可以互相替换的按键，用 muted 的“/”分开，例如 Tab / →。 */
export function Keys({ keys }: { keys: readonly string[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1 whitespace-nowrap">
      {keys.map((key, index) => (
        <Fragment key={`${String(index)}-${key}`}>
          {index > 0 && (
            <span aria-hidden="true" className="text-fd-muted-foreground">
              /
            </span>
          )}
          <Kbd>{key}</Kbd>
        </Fragment>
      ))}
    </span>
  );
}
