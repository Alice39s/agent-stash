/** 本插件的类名前缀，也用于标在输入框卡片上的属性。 */
export const K = "dsh-enhance";
/** 改写进行中标在输入框卡片上，样式据此让草稿变淡。 */
export const BUSY = `data-${K}-busy`;
/** 增强菜单卡片的类名；快捷键据它认出最上层的菜单是不是自己的。 */
export const MENU_CLASS = `${K}-menu`;

/** 与 Agent Stash 框架一致的强 ease-out 曲线。 */
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/**
 * 增强按钮、状态提示、菜单行与配置页的样式。按钮 28px 见方，圆角与同一行的模型选择框一样取
 * `--dsw-radius-sm`，平时只用三级文字色；动画按框架的 `motion` 设置分档，减少动态效果时只保留淡入。
 */
export function enhanceCss(): string {
  const p = `.${K}`;
  return `
${p}-root {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
${p}-button {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}
@media (hover: hover) {
  ${p}-button:hover {
    background: var(--dsw-alias-interactive-bg-hover);
    color: var(--dsw-alias-label-secondary);
  }
}
${p}-button[aria-expanded="true"],
${p}-button[data-state="running"],
${p}-button[data-state="done"] {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
}
${p}-button[aria-disabled="true"] {
  opacity: 0.4;
  cursor: default;
}
${p}-button:focus-visible {
  outline-style: solid;
  outline-offset: 1px;
}
${p}-button:active:not([aria-disabled="true"]) {
  transform: scale(0.94);
}
${p}-icon {
  display: grid;
  place-items: center;
}
${p}-running {
  display: grid;
}
${p}-running > span {
  display: grid;
  place-items: center;
  grid-area: 1 / 1;
}
${p}-spin svg {
  animation: ${K}-spin 900ms linear infinite;
}
${p}-stop {
  opacity: 0;
}
@media (hover: hover) {
  ${p}-button:hover ${p}-spin {
    opacity: 0;
  }
  ${p}-button:hover ${p}-stop {
    opacity: 1;
  }
}
${p}-button:focus-visible ${p}-spin {
  opacity: 0;
}
${p}-button:focus-visible ${p}-stop {
  opacity: 1;
}
${p}-root[data-motion="lively"] ${p}-button {
  animation: ${K}-pop 200ms ${EASE_OUT};
}
${p}-root[data-motion="lively"] ${p}-icon {
  animation: ${K}-icon 180ms ${EASE_OUT};
}
${p}-root[data-motion="subtle"] ${p}-button {
  animation: ${K}-fade 140ms ease;
}
${p}-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 240px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
}
${p}-status svg {
  flex: none;
}
${p}-status[data-tone="error"] {
  color: var(--dsw-alias-state-error-primary);
}
${p}-status-text {
  overflow: hidden;
  text-overflow: ellipsis;
}
${p}-root[data-motion="lively"] ${p}-status {
  animation: ${K}-status 180ms ${EASE_OUT};
}
${p}-root[data-motion="subtle"] ${p}-status {
  animation: ${K}-fade 140ms ease;
}
${p}-dismiss {
  display: grid;
  place-items: center;
  flex: none;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  opacity: 0.7;
  cursor: pointer;
}
@media (hover: hover) {
  ${p}-dismiss:hover {
    opacity: 1;
    background: var(--dsw-alias-interactive-bg-hover);
  }
}
${p}-dismiss:focus-visible {
  outline-style: solid;
}
@container (max-width: 480px) {
  ${p}-status {
    max-width: 120px;
  }
}
${p}-menu {
  min-width: 248px;
}
${p}-row {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
${p}-row-title {
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
}
${p}-row-hint {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
[data-composer-card][${BUSY}] [contenteditable="true"] {
  animation: ${K}-dim 200ms ease forwards;
  cursor: progress;
}
@keyframes ${K}-spin {
  to { transform: rotate(360deg); }
}
@keyframes ${K}-pop {
  from { opacity: 0; transform: scale(0.8); filter: blur(2px); }
}
@keyframes ${K}-icon {
  from { opacity: 0; transform: scale(0.6); filter: blur(2px); }
}
@keyframes ${K}-status {
  from { opacity: 0; transform: translateX(4px); filter: blur(1px); }
}
@keyframes ${K}-fade {
  from { opacity: 0; }
}
@keyframes ${K}-dim {
  to { opacity: 0.45; }
}
@media (prefers-reduced-motion: reduce) {
  ${p}-root[data-motion] ${p}-button,
  ${p}-root[data-motion] ${p}-status {
    animation: ${K}-fade 140ms ease;
  }
  ${p}-root[data-motion] ${p}-icon {
    animation: none;
  }
  ${p}-button:active:not([aria-disabled="true"]) {
    transform: none;
  }
}
${settingsCss(p)}`;
}

/** 配置页的样式：行的排版与 Agent Stash 框架的配置页一致。 */
function settingsCss(p: string): string {
  return `
${p}-settings {
  padding: 4px 0 8px;
}
${p}-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 12px 0;
  border-top: 0.5px solid var(--dsw-alias-border-l2);
}
${p}-field-stack {
  flex-direction: column;
  align-items: stretch;
}
${p}-field-text {
  display: flex;
  flex: 1 1 220px;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
${p}-field-label {
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
}
${p}-field-hint,
${p}-notice {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
${p}-invalid,
${p}-catalog-error {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-state-error-primary);
}
${p}-catalog-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
${p}-number {
  width: 96px;
}
${p}-models {
  display: grid;
  gap: 2px;
  min-width: 0;
  max-height: 300px;
  margin: 0;
  padding: 6px;
  overflow: auto;
  border: 0.5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-lg);
}
${p}-model-group {
  display: grid;
  gap: 2px;
}
${p}-model-group + ${p}-model-group {
  margin-top: 4px;
  padding-top: 6px;
  border-top: 0.5px solid var(--dsw-alias-border-l3);
}
${p}-provider {
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 500;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
}
${p}-model {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 6px;
  border-radius: var(--dsw-radius-md);
  cursor: pointer;
}
@media (hover: hover) {
  ${p}-model:hover {
    background: var(--dsw-alias-interactive-bg-hover);
  }
}
${p}-model-name,
${p}-model-route {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
${p}-model-name {
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
}
${p}-model-route {
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
}
${p}-presets {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 0;
  border-top: 0.5px solid var(--dsw-alias-border-l2);
}
${p}-preset-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
${p}-preset {
  border: 0.5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-lg);
}
${p}-preset-head {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 6px 8px 6px 12px;
}
${p}-preset-index {
  flex: none;
  width: 16px;
  font-size: 12px;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-tertiary);
}
${p}-preset-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
${p}-preset-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
}
${p}-preset-title-text,
${p}-preset-hint {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
${p}-preset-tag {
  flex: none;
  padding: 0 5px;
  border-radius: var(--dsw-radius-xs);
  background: var(--dsw-alias-interactive-bg-hover);
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-secondary);
}
${p}-preset-hint {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
${p}-preset-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 2px;
}
${p}-icon-button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
@media (hover: hover) {
  ${p}-icon-button:hover:not(:disabled) {
    background: var(--dsw-alias-interactive-bg-hover);
  }
}
${p}-icon-button:disabled {
  opacity: 0.35;
  cursor: default;
}
${p}-icon-button:focus-visible {
  outline-style: solid;
}
${p}-preset-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 2px 12px 12px;
}
${p}-preset-label {
  margin-top: 4px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary);
}
${p}-preset-form > span {
  width: 100%;
  box-sizing: border-box;
}
${p}-textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 132px;
  padding: 8px;
  border: 0.5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md);
  outline: none;
  background: var(--dsw-alias-bg-layer-1);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
  resize: vertical;
}
${p}-textarea:focus {
  border-color: var(--dsw-alias-state-business-primary);
}
${p}-textarea[aria-invalid="true"] {
  border-color: var(--dsw-alias-state-error-primary);
}
${p}-textarea::placeholder {
  color: var(--dsw-alias-label-dimmed);
}
${p}-preset-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
${p}-add {
  align-self: flex-start;
}
`;
}
