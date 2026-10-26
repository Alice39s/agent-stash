import { darkPalette } from "./palette";
import { STRIP_KEYS } from "./strip-keys";

export interface OgPage {
  title: string;
  description: string | undefined;
  section: string | undefined;
  byline: string;
  host: string;
}

export const ogSize = { width: 1200, height: 630 };

const clamp = (lines: number) =>
  ({
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineClamp: lines,
  }) as const;

function BrandGlyph({ size }: { size: number }) {
  const bar = (width: number, opacity: number) => (
    <div
      style={{
        width: (size * width) / 40,
        height: size / 10,
        borderRadius: size / 20,
        backgroundColor: "#ffffff",
        opacity,
      }}
    />
  );
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: size / 10,
        width: size,
        height: size,
        padding: `0 ${String(size / 5)}px`,
        borderRadius: size / 4,
        backgroundColor: darkPalette.brand,
      }}
    >
      {bar(24, 0.6)}
      {bar(24, 1)}
      {bar(16, 0.6)}
    </div>
  );
}

export function OgImage(page: OgPage) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: darkPalette.background,
        color: darkPalette.foreground,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "56px 64px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <BrandGlyph size={40} />
          <span style={{ fontSize: 30, fontWeight: 700 }}>Agent Stash</span>
          <span style={{ fontSize: 24, color: darkPalette.muted }}>{page.byline}</span>
        </div>
        <span style={{ fontSize: 22, color: darkPalette.muted }}>{page.host}</span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flexGrow: 1,
          gap: 20,
          padding: "0 64px",
        }}
      >
        {page.section && (
          <span style={{ fontSize: 24, lineHeight: 1.4, color: darkPalette.muted }}>
            {page.section}
          </span>
        )}
        <span
          style={{
            ...clamp(2),
            fontSize: 68,
            lineHeight: 1.12,
            fontWeight: 700,
            textWrap: "balance",
          }}
        >
          {page.title}
        </span>
        {page.description && (
          <span
            style={{
              ...clamp(2),
              fontSize: 30,
              lineHeight: 1.5,
              color: darkPalette.muted,
              textWrap: "pretty",
            }}
          >
            {page.description}
          </span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          height: 112,
          padding: "0 64px",
          borderTop: `2px solid ${darkPalette.divider}`,
          maskImage: "linear-gradient(90deg, transparent 10%, #000 60%)",
        }}
      >
        {STRIP_KEYS.map((key, index) => (
          <div
            key={`${String(index)}-${key}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 56,
              height: 56,
              padding: "0 16px",
              borderRadius: 12,
              border: `2px solid ${darkPalette.divider}`,
              borderBottomWidth: 4,
              backgroundColor: darkPalette.keycap,
              color: darkPalette.foreground,
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            {key}
          </div>
        ))}
      </div>
    </div>
  );
}
