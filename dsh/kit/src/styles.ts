/** 界面进出场共用的强 ease-out 曲线；面板外的元素（输入框）也要用，所以不放在面板的变量里。 */
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/**
 * 框架样式表。几何与宿主的 `/` 菜单一致：离输入框 4px、4px 内边距、34px 行高；
 * 标题、分组、行与页脚的内容左边线都落在输入框文字列的 14px 处。
 * 动画与材质由面板上的 `data-motion`、`data-glass`、`data-highlight`、`data-density` 决定。
 */
export function kitCss(k: string): string {
  const p = `.${k}`;
  const panel = `${p}-panel`;
  return `
${panel} {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 4px);
  z-index: 100;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 4px;
  border: 0;
  border-radius: var(--dsw-radius-lg);
  isolation: isolate;
  anchor-name: var(--dsh-stash-anchor);
  --dsw-elevation-stroke-color: var(--dsw-alias-border-l1);
  box-shadow: var(--dsw-elevation-prominent);
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 20px;
  cursor: default;
  transform-origin: 50% 100%;
}
${panel}[data-preview] {
  position: relative;
  left: auto;
  right: auto;
  bottom: auto;
  z-index: auto;
}
/*
 * 材质单独成层，只模糊背景，面板内容不受 backdrop-filter 影响。底色完全不透明：分组标题的填充色叠在页面底色上；
 * 毛玻璃档在此之上加背景模糊。
 */
${panel}::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background:
    linear-gradient(var(--dsw-alias-menu-group-header-fill), var(--dsw-alias-menu-group-header-fill)),
    var(--dsw-alias-bg-base);
  pointer-events: none;
}
${panel}[data-glass]::before {
  backdrop-filter: var(--dsw-menu-backdrop-filter);
}
${p}-backing {
  display: none;
}
html[data-platform="darwin"] ${p}-backing[data-glass] {
  display: block;
  position: fixed;
  position-anchor: var(--dsh-stash-anchor);
  top: anchor(top);
  left: anchor(left);
  width: anchor-size(width, 0px);
  height: anchor-size(height, 0px);
  z-index: -1;
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-base);
  pointer-events: none;
}

/* 进场：灵动档从输入框方向浮起并由模糊变清晰，轻柔档只做短淡入。 */
${panel}[data-motion="lively"][data-state="open"] {
  animation: ${k}-rise 200ms ${EASE_OUT} both;
}
${panel}[data-motion="subtle"][data-state="open"] {
  animation: ${k}-fade 140ms ${EASE_OUT} both;
}
${panel}[data-motion="lively"][data-state="closing"] {
  animation: ${k}-sink 140ms ${EASE_OUT} both;
  pointer-events: none;
}
${panel}[data-motion="subtle"][data-state="closing"] {
  animation: ${k}-fade-out 100ms ${EASE_OUT} both;
  pointer-events: none;
}
/* 刚打开时各行从贴近输入框的一行起依次浮现，错开的延迟写在每行的行内样式上。 */
${panel}[data-motion="lively"][data-fresh] ${p}-item {
  animation: ${k}-row 220ms ${EASE_OUT} both;
}
@keyframes ${k}-rise {
  from { opacity: 0; transform: translateY(8px) scale(0.97); filter: blur(4px); }
}
@keyframes ${k}-sink {
  to { opacity: 0; transform: translateY(6px) scale(0.98); filter: blur(2px); }
}
@keyframes ${k}-fade {
  from { opacity: 0; transform: translateY(3px); }
}
@keyframes ${k}-fade-out {
  to { opacity: 0; }
}
@keyframes ${k}-row {
  from { opacity: 0; transform: translateY(6px); }
}

${p}-header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 10px 6px;
  margin-bottom: 2px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
}
${p}-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary);
}
${p}-counter {
  flex: none;
  font-size: 11px;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-tertiary);
}
${p}-list {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2);
  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2);
  --dsh-scrollbar-width: 6px;
  --dsh-scrollbar-thumb-border: 2px;
  --dsh-scrollbar-track-margin: 4px;
}
${p}-section {
  box-sizing: border-box;
  min-height: 23px;
  padding: 5px 10px 2px;
  font-size: 11px;
  font-weight: 500;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
}
${p}-list > ${p}-item:not(:nth-child(1 of ${p}-item)) > ${p}-section {
  margin-top: 3px;
}
${p}-row {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 6px 10px;
  border-radius: var(--dsw-radius-md);
  cursor: pointer;
}
${panel}[data-density="compact"] ${p}-row {
  min-height: 28px;
  padding: 3px 10px;
}
${panel}[data-density="compact"] ${p}-section {
  min-height: 20px;
  padding-top: 3px;
}
${panel}[data-highlight="instant"] ${p}-row[data-active] {
  background: var(--dsw-alias-interactive-bg-hover);
}
/* 滑动高亮：一块共用的底色跟着高亮行移动，连续按键时从当前位置转向。 */
${p}-glide {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-interactive-bg-hover);
  pointer-events: none;
}
${panel}:not([data-motion="off"]) ${p}-glide[data-placed] {
  transition: transform 160ms ${EASE_OUT};
}
@media (hover: hover) and (pointer: fine) {
  ${panel}[data-hover-tint] ${p}-row:not([data-active]):hover {
    background: color-mix(in srgb, var(--dsw-alias-interactive-bg-hover) 50%, transparent);
  }
}
${p}-icon {
  display: inline-flex;
  flex: none;
  width: 14px;
  height: 14px;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-menu-icon);
}
${p}-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
${p}-meta {
  flex: none;
  max-width: 40%;
  padding-left: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-tertiary);
}
${p}-footer {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 2px;
  padding: 6px 10px 4px;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
}
${p}-hints {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  overflow: hidden;
}
${p}-hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
${p}-keys {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
${p}-slash {
  color: var(--dsw-alias-label-caption);
}
${p}-kbd {
  box-sizing: border-box;
  display: inline-grid;
  place-items: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: var(--dsw-radius-xs);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font-family: inherit;
  font-size: 10px;
  line-height: 16px;
}

/* 回溯切换草稿：新草稿从翻看的方向滑入，由模糊变清晰。 */
[data-composer-card] [contenteditable="true"][data-${k}-swap="older"] {
  animation: ${k}-swap-older 160ms ${EASE_OUT};
}
[data-composer-card] [contenteditable="true"][data-${k}-swap="newer"] {
  animation: ${k}-swap-newer 160ms ${EASE_OUT};
}
[data-composer-card] [contenteditable="true"][data-${k}-swap="restore"] {
  animation: ${k}-swap-restore 160ms ${EASE_OUT};
}
@keyframes ${k}-swap-older {
  from { opacity: 0.2; transform: translateY(-5px); filter: blur(2px); }
}
@keyframes ${k}-swap-newer {
  from { opacity: 0.2; transform: translateY(5px); filter: blur(2px); }
}
@keyframes ${k}-swap-restore {
  from { opacity: 0.2; filter: blur(2px); }
}

@media (prefers-reduced-motion: reduce) {
  ${panel}:not([data-motion="off"])[data-state="open"] {
    animation: ${k}-fade-out 140ms ease reverse both;
  }
  ${panel}:not([data-motion="off"])[data-state="closing"] {
    animation: ${k}-fade-out 100ms ease both;
  }
  ${panel}[data-motion="lively"][data-fresh] ${p}-item {
    animation: none;
  }
  ${panel} ${p}-glide[data-placed] {
    transition: none;
  }
  [data-composer-card] [contenteditable="true"][data-${k}-swap] {
    animation: none;
  }
}
`;
}
