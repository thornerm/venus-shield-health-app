// Recharts writes SVG presentation attributes, which cannot resolve CSS custom
// properties — so chart colours must be literal hex values kept in step with
// the design tokens in index.css.

export const VERDICT_COLORS = {
  allow: "#10B981",
  approval_required: "#F59E0B",
  blocked: "#EF4444",
};

export const RISK_COLORS = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981",
};

export const CHART = {
  grid: "#253246",
  axis: "#94A3B8",
  tooltip: {
    background: "#101D2D",
    border: "1px solid #253246",
    borderRadius: 10,
    fontSize: 12,
    color: "#F7F8FA",
  },
  tooltipLabel: { color: "#94A3B8", marginBottom: 4 },
};