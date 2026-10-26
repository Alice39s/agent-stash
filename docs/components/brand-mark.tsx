/** design.md「品牌标识」：primary 底色圆角方块上三条白色横线，取自 DSH 插件图标。尺寸由 `className` 决定。 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect width="24" height="24" rx="6" fill="#4d6bfe" />
      <rect x="5" y="6.5" width="14" height="2.4" rx="1.2" fill="#ffffff" opacity="0.6" />
      <rect x="5" y="10.8" width="14" height="2.4" rx="1.2" fill="#ffffff" />
      <rect x="5" y="15.1" width="9" height="2.4" rx="1.2" fill="#ffffff" opacity="0.6" />
    </svg>
  );
}
