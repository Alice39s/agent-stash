---
name: agent-stash-docs-design
description: 用于 Agent Stash 文档站（docs/）的长文文档页、页面末尾的贡献者与页面历史、语言入口页、未找到页、页面内的截图与录屏展示，以及构建生成的链接预览图。读者是给 Coding Agent 安装插件和技能的开发者，在桌面上对照命令、按键和配置操作，也会在手机上查阅；目标是沿用 DeepSeek Harness 界面的中性色与系统字体、插件图标的蓝色作为唯一强调色、Apple 式的截图展示板，中英双语，浅色与深色主题。
version: 2026-10-31.1
---

## 1. 范围与优先级

- [MUST] 本文件约束 `docs/` 的全部页面与浮层、页面内的截图与录屏展示，以及文档构建生成的链接预览图。
- [MUST] 本文件不约束 DSH 插件在宿主里渲染的浮层与设置页（由仓库根目录的 `design.md` 约束）、README 和 GitHub 仓库页面。
- [MUST] 冲突时按以下顺序取舍：用户要求、无障碍与可用性、读者当前的任务、本项目已有约定（DSH 插件的外观）、品牌表达、装饰细节。
- [MUST] 页面写什么、有哪些页、命令与配置的取值，以文档内容和代码为准；本文件只规定它们的呈现方式。

## 2. 品牌与读者

读者一边读一边在终端、Agent 的输入框或插件页里操作，需要快速找到命令、按键、路径和取值；中英文混排，代码与原文保持原样。

- [SHOULD] 文档站沿用 DeepSeek Harness 界面的视觉：表面和文字用 DSH 的中性蓝灰色阶，字体用同一套系统字体，卡片圆角与 DSH 菜单相同（16px）。读者从截图里的 DSH 界面看回正文时，不感到换了一套视觉。（决策：插件运行在 DSH 里，截图占据页面的主要视觉。来源：2026-10-26 文档站初版设计决策。）
- [SHOULD] 表面、文字和边框只用灰阶 token；`primary` 蓝色（插件图标的 `#4d6bfe` 系列）只出现在链接、焦点环、当前导航、主要按钮和信息提示的图标上。正文链接为正文色文字加 primary 下划线。
- [MUST] 截图与录屏是功能说明的主要证据：每段展示的界面来自真实运行的插件，放在展示板 `Showcase` 里，配一句说明。
- [MUST] 按键帽是唯一的品牌装饰：入口页、未找到页和链接预览图使用 `KeyStrip`；正文里提到按键时用 `Kbd`。
- [SHOULD] 页面高度由内容决定，不放全屏宣传区、插画或背景图。（决策：这是查阅型文档。来源：2026-10-26 文档站初版设计决策。）
- [MUST] 文案语气直接、克制：写条件、步骤和结果，不写夸张的形容词。
- [MUST] 状态同时用文字和颜色表达，不只靠颜色。

## 3. 页面结构与构图

### 站点外壳

- [MUST] 所有文档页共用顶栏 `SiteHeader`：高 64px，吸顶，底部 1px 边框，背景为 70% 不透明的 background 加背景模糊；内容区最大宽度 1280px，左右内边距 640px 以下 16px、640px 起 24px。
- [MUST] 顶栏左侧是品牌标识：24px 的 `BrandMark`（插件图标蓝 `#4d6bfe` 底色圆角方块上三条白色横线，取自插件图标，两种主题相同），右侧依次为粗体站名、16px 高的 1px 竖线、muted 小号的站点名“文档 / Docs”。品牌标识链接到当前语言的首页。
- [SHOULD] 顶栏右侧依次为仓库入口（lucide `GitBranch`，640px 起后接“GitHub”文字）、语言切换（`Languages`）和主题菜单（显示当前选项的 `Sun`、`Moon` 或 `Monitor`）；图标 18px，按钮带可读名称。
- [MUST] 语言切换保持当前页面，只替换路径中的语言段。
- [MUST] 主题菜单是“浅色 / 深色 / 跟随系统”三项单选，标出当前项，默认跟随系统。
- [MUST] 768px 以下，顶栏右侧的图标按钮至少 44×44px。

### 长文文档

- [SHOULD] 顶栏下为 1280px 框架：768px 起左侧为页面树侧栏（顶部是搜索框），中间为正文，1280px 起右侧为本页目录。768px 以下页面树改为抽屉，顶栏下方 48px 的 `DocsBar` 放目录和搜索按钮，本页目录收为可展开的条。（决策：侧栏在 Fumadocs 切换抽屉的同一宽度出现，任何宽度下都能打开页面树。来源：2026-10-26 文档站评审。）
- [SHOULD] 正文自上而下：`text-h1` 标题、`text-body` muted 描述、页面操作行（复制 Markdown、打开方式菜单，底部 1px 分隔线和 24px 间距）、正文、最后更新时间。插件页与技能页把最后更新时间换成贡献者与页面历史。
- [SHOULD] 打开方式菜单按页面来源、网页对话、桌面应用、编程 Agent 分组，分组之间有分隔线；菜单文案按页面语言显示，交给 AI 的 Prompt 里写发布站点上的页面地址。
- [SHOULD] 介绍单个界面功能的页面，第一屏在描述之后先放这个功能的 `Showcase`，再写按键与配置。（决策：读者先看到效果，再决定要不要读细节。来源：2026-10-26 文档站初版设计决策。）
- [SHOULD] 页面标题用 `text-h1`；描述、卡片描述和提示框正文用 `text-body`；h2 用 `text-section-title`，h3 用 `text-card-title`；正文段落 15px、行高 1.75；行内代码和代码块用等宽字体。层级由侧栏的页面树表达，页面不显示面包屑。
- [SHOULD] `Card` 为 `--radius-card` 圆角、1px 边框、16px 内边距、无阴影，卡片间隔 16px；图标用 muted-foreground 放在标题左侧，不放图标底板。可点击的卡片悬停时边框变为 40% primary，底色变为 60% accent。
- [SHOULD] `Callout` 为 `--radius-card` 圆角、1px 边框：info 与 idea 用 primary 图标；warn 用 warning 的 10% 底色和 40% 边框；error 用 destructive 的 10% 底色和 40% 边框；success 用 success 图标。标题 600 字重，正文 muted。
- [SHOULD] 代码块为 `--radius` 圆角、细边框、无阴影；Tabs 的标签栏和面板是同一张 `--radius-card` 卡片，面板内不再嵌套卡片。
- [SHOULD] 同一操作有多种安装方式或多个 Agent 的写法时，用标签页展示。
- [SHOULD] 表格撑满正文宽度，表头 600 字重、muted 底色；列宽之和超过正文时，表格在外层容器内横向滚动，字号不变。
- [SHOULD] 表头不换行；某列所有正文单元格都不超过 8 个汉字或 16 个拉丁字符时，整列不换行。（决策：自动表格布局会把短表头挤成一字一行。来源：2026-10-26 文档站初版设计决策。）
- [SHOULD] 图片可点击放大查看。

### 截图与录屏展示

- [MUST] `Showcase` 是一块展示板：浅色主题底色 `#f5f5f7`、深色主题 `#1d1d1f`，`--radius-card` 圆角，内边距 640px 以下 12px、640px 起 28px。展示板中间是截图或录屏的画框：10px 圆角、裁掉溢出，阴影为 `0 0 0 0.5px` 描边加三层柔和投影（取值见第 5 章）。展示板下方 8px 是 `text-meta` muted 的说明。
- [MUST] 截图与录屏按 2 倍像素拍摄，以原始宽度的一半显示，不超过正文宽度；宽高比由素材决定，不裁切、不拉伸。
- [MUST] 录屏静音、循环、行内播放，进入视口时播放、离开视口时暂停；系统开启减少动态效果时不自动播放，显示封面图和播放控件。
- [MUST] 录屏的封面图是同一场景的截图，加载前占住同样的宽高，页面不跳动。
- [SHOULD] 一个展示板只放一段素材；同一功能的录屏和截图不并排重复展示。
- [MUST] 素材里的界面语言、主题和数据如实来自拍摄时的程序，说明里不描述素材里没有的效果。
- [MUST] 录屏在用全新 DSH_HOME 启动的 dsh web 里拍摄，会话只含演示用的 Prompt；画面里有指针（点击时指尖扩散一圈波纹）和按键提示，操作从指针点击输入框或控件开始。封面图不带指针和按键提示。（来源：2026-10-26 文档站素材重拍。）
- [MUST] 每段录屏和它的封面图都烧录同一层仓库水印，内容是 `github.com/Alice39s/agent-stash`，读者下载、转发或全屏播放时都能看到出处。截图不加水印。（来源：2026-10-31 用户要求。）
- [MUST] 水印分两层，按 CSS 像素排版、以 2 倍像素渲染：
  - 右下角角标：离右边和底边各 12px；8px 圆角，内边距 5px 10px 5px 8px，底色 `rgb(15 17 21 / 0.64)`，0.5px `rgb(255 255 255 / 0.16)` 描边，投影 `0 2px 8px rgb(0 0 0 / 0.24)`；左侧 13px 白色 GitHub 标志（90% 不透明），间隔 6px 后是 12px、行高 1.4、500 字重、`rgb(255 255 255 / 0.88)` 的仓库地址。
  - 全屏平铺：仓库地址 14px、600 字重、5% 不透明的白色，逆时针旋转 24°，横向每 300px、纵向约每 120px 一条，相邻两行错开半格，铺满整个画面。
- [SHOULD] 平铺层只在深色界面上隐约可见，不遮挡界面文字；读者辨认出处靠角标。（决策：录屏全部在深色主题下拍摄，界面元素占满画面底部，角标不可避免地压在界面上，所以用半透明深色底保证可读。来源：2026-10-31 录屏角落取样。）

### 贡献者与页面历史

- [MUST] 只出现在插件页与技能页，放在正文之后、翻页卡片之前，代替最后更新时间；“贡献者”和“页面历史”两个分节也列在本页目录末尾。
- [MUST] 记录来自构建时的 Git 历史。还没有提交的新页面不显示这一块，仍显示最后更新时间。
- [SHOULD] 与正文之间是一条 1px 分隔线，正文到分隔线、分隔线到第一个分节、两个分节之间都是 24px；分节标题与文档 h2 相同，用 `text-section-title`，标题下 12px。
- [SHOULD] 贡献者一行排开：28px 圆形头像加 `text-body` 名字，名字为正文色，悬停时出现 primary 下划线；悬停整项显示提交次数。
- [SHOULD] 页面历史是一张折叠卡片：`--radius-card` 圆角、1px 边框、card 表面、无阴影。折叠按钮占满卡片宽度，离卡片边缘 6px，圆角为卡片圆角减去这 6px，与卡片同心；按钮左侧是 muted 的历史图标和 600 字重的“最后编辑于”与相对时间，右侧是“查看完整历史”和箭头。默认收起。
- [SHOULD] 展开后按时间倒序列出提交，右上角的图标按钮切换先后顺序：每行是等宽字体的短哈希（链接到提交）、提交说明和 `text-meta` muted 的日期。提交说明里的链接与正文链接相同。
- [MUST] 日期按页面语言和读者所在时区显示；页面加载前用 UTC 渲染，相对时间在加载后出现。
- [MUST] 640px 以下隐藏提交图标、分隔符和“查看完整历史”文字，短哈希保留；768px 以下折叠按钮与排序按钮至少 44px。

### 语言入口页

- [SHOULD] 站点根路径是语言入口：页面加载后按浏览器首选语言跳到中文或英文首页，首选语言不是中文时进入英文。
- [SHOULD] 不执行脚本时显示居中的窄栏（最大宽度 448px）：`KeyStrip`、站名 `text-h1`、两张语言卡片（`text-card-title`，卡片表面与 `Card` 相同）。

### 未找到页

- [SHOULD] 居中窄栏（最大宽度 576px）：`KeyStrip`、`text-meta` muted 的“404”、中英文并列的 `text-h1` 标题、两行 muted 说明、两个返回按钮（中文为 primary 实心按钮，英文为描边按钮）。
- [MUST] 未找到页同时使用中英文，因为托管平台对所有不存在的路径返回同一个页面。

### 链接预览图

- [MUST] 1200×630，深色色板。顶部一行：左侧 40px 的 `BrandMark`、粗体站名（30px）加 muted 的“文档 / Docs”（24px），右侧主机名与路径前缀（22px，muted）。中间垂直居中依次为分组行、标题、描述。底部为 112px 高的按键帽条带，上边 2px 分隔线，向左渐隐（`linear-gradient(90deg, transparent 10%, #000 60%)` 遮罩）。
- [SHOULD] 字号只用于预览图：分组行 24px、行高 1.4、muted；标题 68px、行高 1.12、700 字重、`text-wrap: balance`，最多 2 行；描述 30px、行高 1.5、muted、`text-wrap: pretty`，最多 2 行。（决策：预览图在链接卡片里约缩小到 0.4 倍。来源：2026-10-26 文档站初版设计决策。）
- [MUST] 限制行数的文字同时使用 `lineClamp` 和 `textOverflow: ellipsis`。
- [MUST] 文字框离左右边缘至少 64px，文字框之间不重叠，按键帽条带不压在文字上。
- [SHOULD] 分组行显示页面所在的上级目录，用“ / ”连接；末级目录与标题相同时不显示它；没有分组或没有描述时，不输出对应的行。

## 4. 视觉规则

### 字体与颜色

- [SHOULD] 界面文字用 `--font-sans`，与 DSH 相同的系统字体栈：`-apple-system, system-ui, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif`；代码、命令、按键、变量名和文件路径用 `--font-mono`：`ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`。站点不下载网页字体。
- [SHOULD] 字号只用以下角色。例外：按钮与菜单项用 14px；`Kbd` 用 12px；Fumadocs 布局自带的侧栏、本页目录、页脚翻页卡片与页面操作按钮保持它们自己的字号与圆角。（决策：这些部件由 Fumadocs 维护，覆盖它们的内部类名会随升级失效。来源：2026-10-26 文档站评审。）

| 角色                 | 取值             | 用途                        |
| -------------------- | ---------------- | --------------------------- |
| `text-h1`            | 30px / 1.2 / 700 | 页面标题，每页一个          |
| `text-section-title` | 20px / 1.4 / 600 | 文档 h2                     |
| `text-card-title`    | 16px / 1.5 / 600 | 卡片标题、文档 h3、语言卡片 |
| `text-body`          | 15px / 1.6 / 400 | 描述、正文、表格            |
| `text-meta`          | 13px / 1.4 / 400 | 日期、计数、展示板说明      |

- [MUST] `text-meta` 不承载主要操作和限制说明。
- [SHOULD] 数值使用 tabular-nums（全局已开启）。
- [SHOULD] 颜色只用 `docs/app/tokens.css` 的 token；页面不写色值字面量（`Showcase` 展示板与预览图色板除外，取值在第 5 章）。语义如下：

| token              | 浅色      | 深色      | 含义                                       |
| ------------------ | --------- | --------- | ------------------------------------------ |
| `background`       | `#ffffff` | `#151517` | 页面底色（DSH `bg-base`）                  |
| `card`             | `#ffffff` | `#232324` | 卡片、浮层（DSH `bg-layer-1`）             |
| `foreground`       | `#0f1115` | `#f9fafb` | 正文（DSH `label-primary`）                |
| `muted-foreground` | `#61666b` | `#adb2b8` | 次要文字、图标                             |
| `primary`          | `#3654e6` | `#7a90ff` | 链接、焦点环、当前导航、主要按钮、信息提示 |
| `success`          | `#16a34a` | `#22c55e` | 完成、可用                                 |
| `warning`          | `#b45309` | `#f59e0b` | 需要注意                                   |
| `destructive`      | `#dc2626` | `#f25a5a` | 失败、错误                                 |
| `border`           | 10% 黑    | 12% 白    | 边框与分隔线（DSH `border-l2`）            |

- [MUST] 文字与背景的对比度至少 4.5:1，包括 primary 文字在 10% primary 底色上（当前导航、标签页）。为此 `primary` 在浅色主题取插件图标蓝的加深档 `#3654e6`、深色主题取提亮档 `#7a90ff`；primary 表面上的文字浅色主题为白色、深色主题为 `#0f1115`。muted 文字不用 DSH 的 `label-tertiary`，它在白底上低于 4.5:1。
- [SHOULD] 代码高亮用 `github-light-default` 与 `github-dark-default` 主题。

### 布局与表面

- [SHOULD] 内容最大宽度 1280px。
- [SHOULD] 区块间隔 24px；卡片间隔和卡片内边距 16px；行内元素间隔 8px。
- [SHOULD] 卡片、提示框、Tabs、浮层和展示板用 `--radius-card`（16px，DSH `radius-lg`）；按钮、菜单项和代码块用 `--radius`（8px，DSH `radius-sm`）；边框为 1px `--border`。普通卡片不加阴影，只有浮层使用 `--shadow-overlay`，展示板画框使用 `--shadow-frame`。
- [SHOULD] 卡片里不再嵌套卡片；展示板放在正文里，不放进卡片。
- [MUST] 页面不横向溢出：长文本先换行或在自身区域内滚动（代码块、表格），不隐藏整页溢出。
- [MUST] 全局预留滚动条空间（`scrollbar-gutter: stable`），内容不随滚动条出现而横移。
- [SHOULD] 断点只用以下三个：640px（顶栏内边距、仓库文字、展示板内边距）、768px（触控尺寸、文档侧栏，与 Fumadocs 侧栏的 `(width < 768px)` 抽屉判断一致）、1280px（本页目录）。

### 控件与状态

- [SHOULD] 图标按钮 `iconButton`：36px 方形，muted 图标，悬停和菜单展开时为 accent 底色；768px 以下至少 44px。
- [SHOULD] 每个操作区最多一个 primary 实心按钮；其余操作用描边或 ghost 按钮。
- [SHOULD] 复制操作在按钮上给出完成状态（图标短暂变为对勾）。
- [MUST] 每个可聚焦元素有可见的焦点样式：全局 2px `--ring` outline，偏移 2px；第三方控件去掉 outline 或改用阴影环时，统一换回同样的 outline。代码块与表格的滚动区域在裁剪溢出的容器里，outline 向内偏移 2px。
- [SHOULD] `Kbd`：高 20px、最小宽 20px、左右内边距 6px、`--radius` 圆角、1px 边框、底边 2px 边框、muted 底色，12px 等宽字体；同一组可替换的按键之间用 muted 的“/”。

### 动效

- [SHOULD] 只用 Fumadocs 自带的浮层进出动画和颜色过渡；不加滚动触发动画、视差或逐字动画。录屏本身的动效不受此限。
- [SHOULD] 切换主题时不播放过渡（`disableTransitionOnChange`）。
- [MUST] 减少动效时：动画和 CSS 过渡立即完成，录屏不自动播放。
- [MUST] 动效不阻挡输入和键盘导航。

### 按键帽条

- [MUST] `KeyStrip` 是一行 `Kbd` 样式的按键帽：固定序列，取插件实际使用的按键，对辅助技术隐藏（`aria-hidden`），不可点击。它是纯装饰，透明度较低的按键帽不受文字对比度要求约束。
- [SHOULD] 页面中的 `KeyStrip` 按键帽高 28px、间隔 6px，从左到右透明度由 40% 升到 100%；预览图中高 56px、间隔 12px。

## 5. 可用原语

| 原语                 | 位置                                        | 用途与变体                                                                                                |
| -------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `SiteHeader`         | `components/site-header.tsx`                | 顶栏；`locale`                                                                                            |
| `BrandMark`          | `components/brand-mark.tsx`                 | 品牌图形；`className` 决定尺寸                                                                            |
| `ThemeMenu`          | `components/theme-menu.tsx`                 | 主题单选菜单（Base UI `Menu`）；`locale`                                                                  |
| `DocsBar`            | `components/docs-bar.tsx`                   | 768px 以下的目录与搜索条，作为 `DocsLayout` 的 `header` 槽                                                |
| `iconButton`         | `components/icon-button.ts`                 | 图标按钮的类名                                                                                            |
| `Card`、`Cards`      | `components/card.tsx`、`components/mdx.tsx` | 卡片；`title`、`description`、`icon`、`href`、`external`                                                  |
| `Callout`            | `components/callout.tsx`                    | 提示框；`type`：`info`、`idea`、`warn`/`warning`、`error`、`success`；`title`                             |
| `Showcase`           | `components/showcase.tsx`                   | 截图与录屏展示板；`name`（`lib/media.ts` 里的场景名）、`alt`、`caption`                                   |
| `Kbd`、`Keys`        | `components/kbd.tsx`                        | 按键帽；`Keys` 的 `keys` 列出可替换的一组按键                                                             |
| `KeyStrip`           | `components/key-strip.tsx`                  | 品牌装饰                                                                                                  |
| `OgImage`            | `lib/og-image.tsx`                          | 链接预览图模板                                                                                            |
| `watermarkOverlay`   | `lib/watermark.ts`                          | 录屏水印的透明覆盖层；`watermarkStyle` 记录角标位置与平铺间距                                             |
| `ViewOptionsPopover` | `fumadocs-extras/page-actions`              | 页面操作行的打开方式菜单；`markdownUrl`、`githubUrl`、`pageUrl`、`locale`                                 |
| `GitChangelog`       | `fumadocs-page-history/ui`                  | 贡献者与页面历史；记录与本页目录条目来自 `lib/page-history.tsx`，样式类名 `as-page-history`               |
| Fumadocs 组件        | `components/mdx.tsx`                        | `Steps`/`Step`、`Tabs`/`Tab`、`Files`/`Folder`/`File`、`Accordions`/`Accordion`、`TypeTable`、`ImageZoom` |
| 图标                 | `lib/icons.tsx`                             | 侧栏与卡片可用的 lucide 图标；新图标先加入这张表                                                          |

`Showcase` 的固定取值：展示板浅色 `#f5f5f7`、深色 `#1d1d1f`；画框阴影 `--shadow-frame`，浅色为 `0 0 0 0.5px rgb(0 0 0 / 0.08), 0 2px 6px rgb(0 0 0 / 0.04), 0 12px 32px rgb(0 0 0 / 0.08), 0 32px 64px -16px rgb(0 0 0 / 0.14)`，深色把描边换成 `rgb(255 255 255 / 0.1)`、投影透明度翻倍。

```mdx
<Showcase
  name="recall"
  alt="在输入框开头按 ↑ 打开 Prompt 历史面板"
  caption="↑ 打开面板，↑↓ 切换，Esc 回到原来的草稿"
/>
```

扩展边界：

- [MUST] 页面只使用本章列出的原语和 Fumadocs 组件；页面自有样式写在 `docs/app/globals.css`，类名以 `as-` 开头。
- [MUST] 页面自有样式不改变原语的版式、字号、边框和表面。

## 6. 文案与数字格式

- [MUST] 界面文案按页面语言显示；命令、按键名、变量名、文件路径、日志和第三方产品名保持原文，不翻译。
- [SHOULD] 标题用名词短语；按钮用动词开头的短语；描述用一句话写这一页解决的问题，不重复标题。
- [SHOULD] 第三方平台与产品名称使用官方写法（DeepSeek Harness、Cline、Grok Build、goose、Aider、GitHub Pages）。
- [SHOULD] 展示板说明写素材里发生的操作和结果，按键用 `Kbd` 的同名字符（↑、↓、Tab、Esc、→）。
- [MUST] 示例中的密钥、令牌和私有地址使用占位值，不写真实值。
- [SHOULD] 最后更新时间按页面语言格式化。

## 7. 反模式

- [SHOULD] 不使用居中宣传标题加卡片网格的首页结构。
- [SHOULD] 不在卡片里嵌套卡片。
- [SHOULD] 不放装饰性图标底板或彩色图标背景。
- [SHOULD] 不使用原语之外的字号、字重或色值字面量。
- [SHOULD] 主要信息不用小号、低对比度的文字。
- [SHOULD] 普通元数据不用胶囊标签。
- [SHOULD] 不使用渐变；`KeyStrip` 的透明度渐变、预览图条带的渐隐遮罩，以及 Fumadocs 侧栏与本页目录滚动区域边缘的渐隐遮罩除外。
- [MUST] 不在展示板里放示意图、合成图或与真实界面不符的素材；录屏水印是唯一叠加在素材上的内容。

## 8. 实现与接入

- [MUST] 颜色 token 与字号角色只在 `docs/app/tokens.css` 定义；`docs/app/globals.css` 在 `@import 'tailwindcss'` 之后导入它，再由 Fumadocs 的 `shadcn.css` 把颜色映射为 `fd-*`。
- [SHOULD] 预览图不读 CSS 变量，颜色取 `lib/palette.ts` 导出的深色色板；字体由 `lib/og.server.ts` 注册 `@fontsource-variable/noto-sans-sc` 的全部子集（预览图渲染器不读系统字体）。
- [MUST] 主题由 next-themes 在 `html` 上切换 `dark` 类，默认跟随系统；原生控件和滚动条使用当前主题的 color-scheme。
- [SHOULD] 文档站的 MDX 组件映射在 `components/mdx.tsx`；表头与短列由 `lib/remark-label-columns.ts` 标记为不换行；内容链接由 `lib/remark-content-links.ts` 改写为页面地址。
- [SHOULD] 截图与录屏放在 `docs/public/media/`，文件名用场景名（`recall.mp4`、`recall.png`），尺寸登记在 `lib/media.ts`；录屏为 H.264 MP4、60fps、无音轨。中文页用中文界面的录制，英文页用同一段操作在英文界面下的录制，场景名加 `-en`（`recall-en`）。
- [MUST] 录屏和封面图的水印由 `pnpm --filter agent-stash-docs media:watermark --source <目录>` 写入 `public/media/`：`--source` 目录放未加水印的原始文件（文件名与 `lib/media.ts` 相同，相对路径从运行 pnpm 的目录算起），覆盖层由 `lib/watermark.ts` 经预览图渲染器生成，ffmpeg 叠加后按 H.264 CRF 20 重新编码。加过水印的录屏在 `comment` 元数据里带标记，脚本拒绝把它当原始文件再加一次。
- [SHOULD] 浮层与菜单用 Base UI（Fumadocs 默认的组件库）；图标用 lucide-react。不引入另一套组件系统。
- [SHOULD] 打开方式菜单用 `fumadocs-extras`，贡献者与页面历史用 `fumadocs-page-history`；两者的样式预设在 `globals.css` 里紧跟 Fumadocs 的预设导入，页面历史的站点调整写在 `.as-page-history` 下。
- [MUST] 页面历史在构建时由 `lib/page-history.tsx` 从 Git 读取，哪些页面显示它也在这里决定；构建需要完整的提交历史，Pages 工作流检出时用 `fetch-depth: 0`。页面历史不进入 Markdown 副本、`llms-full.txt` 和站内搜索。

## 词汇表

| 概念                                 | 名称                    |
| ------------------------------------ | ----------------------- |
| 所有文档页共用的顶部条               | 顶栏 `SiteHeader`       |
| 顶栏左侧的图形与站名                 | 品牌标识                |
| 侧栏、正文、本页目录组成的页面类型   | 长文文档                |
| 768px 以下顶栏下方的目录与搜索条     | `DocsBar`               |
| 放截图或录屏的浅灰或深灰底板         | 展示板 `Showcase`       |
| 展示板中间带圆角和阴影的素材框       | 画框                    |
| 单个按键的方形标记                   | 按键帽 `Kbd`            |
| 一行按键帽组成的装饰                 | 按键帽条 `KeyStrip`     |
| 站点根路径的语言选择页               | 语言入口页              |
| 文档构建生成的 Open Graph 图片       | 链接预览图 `OgImage`    |
| 插件页与技能页末尾的贡献者与提交记录 | 页面历史 `GitChangelog` |
