/** 「历史回溯提炼」统计页用的图表（design.md 4.8）：组件、类型、配色与数字格式。 */
export {
  BulletChart,
  type BulletChartProps,
  type BulletItem,
  type BulletNames,
} from "./bullet-chart.tsx";
export { formatCompact, formatDay, formatNumber, formatPercent } from "./format.ts";
export type { TooltipRow } from "./primitives.tsx";
export { RadialGauge, type RadialGaugeProps } from "./radial-gauge.tsx";
export {
  RankedList,
  type RankedItem,
  type RankedListProps,
  type RankedSelect,
} from "./ranked-list.tsx";
export { ShareBar, type ShareBarProps, type ShareSegment } from "./share-bar.tsx";
export { Sparkline, type SparklineProps, type SparkPoint } from "./sparkline.tsx";
export {
  StackedBarArea,
  type ChartSeries,
  type DayRow,
  type StackedBarAreaProps,
} from "./stacked-bar-area.tsx";
export {
  ACCENT_COLOR,
  COVERAGE_COLORS,
  IDEA_COLORS,
  IDEA_ORDER,
  LEAD_COLORS,
  LEAD_ORDER,
  OUTCOME_COLORS,
  OUTCOME_ORDER,
  OVERLAY_COLOR,
  USAGE_COLORS,
  USAGE_ORDER,
  type CoverageState,
  type IdeaState,
  type LeadState,
  type Outcome,
  type UsageKind,
} from "./theme.ts";
