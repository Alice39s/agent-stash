import { Link } from "fumadocs-core/link";
import type { HTMLAttributes, ReactNode } from "react";
import { routeHref } from "@/lib/shared";

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  href?: string;
  external?: boolean;
}

/** design.md 的卡片：大圆角、细边框、无阴影、16px 内边距；图标用 muted 色放在标题旁，没有底板。 */
export function Card({
  icon,
  title,
  description,
  href,
  external,
  className,
  children,
  ...props
}: CardProps) {
  const content = (
    <>
      <h3 className="not-prose mb-1 flex items-center gap-2 text-card-title text-fd-card-foreground">
        {icon && (
          <span aria-hidden="true" className="text-fd-muted-foreground [&_svg]:size-4">
            {icon}
          </span>
        )}
        {title}
      </h3>
      {description && <p className="my-0! text-body text-fd-muted-foreground">{description}</p>}
      <div className="prose-no-margin text-body text-fd-muted-foreground empty:hidden">
        {children}
      </div>
    </>
  );
  const surface = `block rounded-(--radius-card) border bg-fd-card p-4 no-underline @max-lg:col-span-full ${className ?? ""}`;
  if (href === undefined) {
    return (
      <div {...props} data-card className={surface}>
        {content}
      </div>
    );
  }
  return (
    <Link
      {...props}
      href={routeHref(href)}
      external={external}
      data-card
      className={`${surface} transition-colors hover:border-fd-primary/40 hover:bg-fd-accent/60`}
    >
      {content}
    </Link>
  );
}
