/**
 * 插件用到的图标，SVG 取自宿主 `ui-primitives/src/icons/index.tsx` 的 Regular 字重（1px 描边）。
 * 颜色一律跟随 `currentColor`。
 */
import type { ReactNode } from "react";

export interface IconProps {
  readonly size: number;
}

/** 图标组件：只接收渲染尺寸。 */
export type Icon = (props: IconProps) => ReactNode;

function Glyph({ size, children }: IconProps & { readonly children: ReactNode }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      strokeWidth={1}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** `IconEditOutlineRegular` */
export function IconEdit({ size }: IconProps): ReactNode {
  return (
    <Glyph size={size}>
      <path
        d="M8.85596 2.69971H4.19971C3.37141 2.69971 2.69992 3.37146 2.69971 4.19971V11.8003C2.69992 12.6285 3.37141 13.3003 4.19971 13.3003H11.8003C12.6283 13.2999 13.3001 12.6283 13.3003 11.8003V7.89893H14.3003V11.8003C14.3001 13.1806 13.1806 14.2999 11.8003 14.3003H4.19971C2.81913 14.3003 1.69992 13.1808 1.69971 11.8003V4.19971C1.69992 2.81918 2.81913 1.69971 4.19971 1.69971H8.85596V2.69971Z"
        fill="currentColor"
      />
      <path d="M7.7849 8.23878L13.888 2.13574" stroke="currentColor" />
    </Glyph>
  );
}

/** `IconRefreshOutlineRegular` */
export function IconRefresh({ size }: IconProps): ReactNode {
  return (
    <Glyph size={size}>
      <path
        d="M14.5001 8C14.5 9.28552 14.1188 10.5422 13.4045 11.611C12.6903 12.6799 11.6752 13.5129 10.4875 14.0049C9.29982 14.4968 7.99295 14.6255 6.73212 14.3747C5.4713 14.124 4.31314 13.505 3.4041 12.596C2.49514 11.687 1.87614 10.5288 1.62537 9.26798C1.37459 8.00716 1.50331 6.70028 1.99525 5.51261C2.48719 4.32494 3.32025 3.30981 4.3891 2.59557C5.45795 1.88134 6.71458 1.50008 8.0001 1.5C9.9001 1.5 11.7001 2.3 13.0001 3.6L14.5001 5.1"
        stroke="currentColor"
      />
      <path d="M14.4999 1.5V5.1H10.8999" stroke="currentColor" />
    </Glyph>
  );
}

/** `IconChevronLeftOutlineRegular` */
export function IconChevronLeft({ size }: IconProps): ReactNode {
  return (
    <Glyph size={size}>
      <path
        d="M10 4L6.70711 7.29289C6.31658 7.68342 6.31658 8.31658 6.70711 8.70711L10 12"
        stroke="currentColor"
      />
    </Glyph>
  );
}

/** `IconChevronRightOutlineRegular` */
export function IconChevronRight({ size }: IconProps): ReactNode {
  return (
    <Glyph size={size}>
      <path
        d="M6 12L9.29289 8.70711C9.68342 8.31658 9.68342 7.68342 9.29289 7.29289L6 4"
        stroke="currentColor"
      />
    </Glyph>
  );
}

/** `IconCloseOutlineRegular` */
export function IconClose({ size }: IconProps): ReactNode {
  return (
    <Glyph size={size}>
      <path d="M2.5 2.5L13.5 13.5" stroke="currentColor" />
      <path d="M13.5 2.5L2.5 13.5" stroke="currentColor" />
    </Glyph>
  );
}
