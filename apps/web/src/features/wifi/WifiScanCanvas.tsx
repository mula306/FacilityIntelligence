export interface WifiPoint {
  x: number;
  y: number;
}

export interface WifiSamplePoint {
  id: string;
  label: string;
  rssi: number;
  coordinate: WifiPoint | null;
}

export interface WifiAccessPointPoint {
  id: string;
  label: string;
  geometry: unknown;
}

export interface WifiScanCanvasProps {
  width: number;
  height: number;
  backgroundImageUrl: string | null | undefined;
  samples: WifiSamplePoint[];
  accessPoints?: WifiAccessPointPoint[];
  selectedSampleId?: string | null;
  title?: string;
  subtitle?: string;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function pointFromGeometry(value: unknown): WifiPoint | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.type === "point" && Array.isArray(candidate.points)) {
    const point = candidate.points[0] as Record<string, unknown> | undefined;
    if (point && isFiniteNumber(point.x) && isFiniteNumber(point.y)) {
      return { x: point.x, y: point.y };
    }
  }

  if (Array.isArray(candidate.coordinates) && isFiniteNumber(candidate.coordinates[0]) && isFiniteNumber(candidate.coordinates[1])) {
    return {
      x: candidate.coordinates[0],
      y: candidate.coordinates[1]
    };
  }

  return null;
}

function rssiTone(rssi: number) {
  if (rssi >= -55) {
    return { stroke: "#166534", fill: "rgba(34, 197, 94, 0.2)", label: "#166534" };
  }
  if (rssi >= -65) {
    return { stroke: "#0f766e", fill: "rgba(20, 184, 166, 0.2)", label: "#0f766e" };
  }
  if (rssi >= -75) {
    return { stroke: "#b45309", fill: "rgba(245, 158, 11, 0.18)", label: "#b45309" };
  }
  return { stroke: "#b91c1c", fill: "rgba(239, 68, 68, 0.18)", label: "#b91c1c" };
}

function clampPoint(point: WifiPoint, width: number, height: number) {
  return {
    x: Math.min(Math.max(point.x, 0), width),
    y: Math.min(Math.max(point.y, 0), height)
  };
}

function labelForPoint(label: string) {
  return label.length > 28 ? `${label.slice(0, 25)}...` : label;
}

export function WifiScanCanvas({
  width,
  height,
  backgroundImageUrl,
  samples,
  accessPoints = [],
  selectedSampleId,
  title,
  subtitle
}: WifiScanCanvasProps) {
  const viewBox = `0 0 ${width} ${height}`;

  return (
    <div
      className="fi-scan-canvas"
      style={{
        border: "1px solid rgba(15, 23, 42, 0.12)",
        borderRadius: 16,
        overflow: "hidden",
        background: "linear-gradient(180deg, rgba(248, 250, 252, 1), rgba(241, 245, 249, 1))"
      }}
    >
      {title || subtitle ? (
        <div style={{ padding: "0.85rem 1rem 0.65rem" }}>
          {title ? <strong style={{ display: "block", fontSize: "0.95rem" }}>{title}</strong> : null}
          {subtitle ? <p style={{ margin: "0.15rem 0 0", color: "#475569", fontSize: "0.88rem" }}>{subtitle}</p> : null}
        </div>
      ) : null}

      <svg
        viewBox={viewBox}
        width="100%"
        height="100%"
        role="img"
        aria-label="Wi-Fi scan floor preview"
        style={{
          display: "block",
          width: "100%",
          aspectRatio: `${width} / ${height}`,
          maxHeight: "72vh",
          background: "#f8fafc"
        }}
      >
        <defs>
          <pattern id="wifi-grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(148, 163, 184, 0.25)" strokeWidth="1" />
          </pattern>
          <marker id="wifi-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M 0 0 L 8 4 L 0 8 z" fill="#0f766e" />
          </marker>
        </defs>
        <rect x="0" y="0" width={width} height={height} fill="url(#wifi-grid)" />
        {backgroundImageUrl ? (
          <image href={backgroundImageUrl} x="0" y="0" width={width} height={height} preserveAspectRatio="none" opacity="0.32" />
        ) : (
          <rect x="0" y="0" width={width} height={height} fill="rgba(255, 255, 255, 0.55)" />
        )}
        {accessPoints.map((accessPoint) => renderAccessPoint(accessPoint, width, height))}
        {samples.map((sample) => renderSample(sample, width, height, sample.id === selectedSampleId))}
      </svg>
    </div>
  );
}

function renderAccessPoint(accessPoint: WifiAccessPointPoint, width: number, height: number) {
  const point = pointFromGeometry(accessPoint.geometry);
  if (!point) {
    return null;
  }

  const safePoint = clampPoint(point, width, height);
  return (
    <g key={accessPoint.id}>
      <circle cx={safePoint.x} cy={safePoint.y} r="14" fill="rgba(255,255,255,0.92)" stroke="#0f766e" strokeWidth="3" />
      <circle cx={safePoint.x} cy={safePoint.y} r="4" fill="#0f766e" />
      {renderLabel(safePoint, accessPoint.label, "#0f766e")}
    </g>
  );
}

function renderSample(sample: WifiSamplePoint, width: number, height: number, selected: boolean) {
  if (!sample.coordinate) {
    return null;
  }

  const tone = rssiTone(sample.rssi);
  const safePoint = clampPoint(sample.coordinate, width, height);
  const radius = selected ? 14 : 11;

  return (
    <g key={sample.id}>
      <circle cx={safePoint.x} cy={safePoint.y} r={radius} fill={tone.fill} stroke={selected ? "#1d4ed8" : tone.stroke} strokeWidth="3" />
      <circle cx={safePoint.x} cy={safePoint.y} r="4" fill={selected ? "#1d4ed8" : tone.stroke} />
      {renderLabel(safePoint, `${labelForPoint(sample.label)} - ${sample.rssi} dBm`, selected ? "#1d4ed8" : tone.label)}
    </g>
  );
}

function renderLabel(point: WifiPoint, label: string, fill: string) {
  return (
    <g>
      <rect x={point.x + 10} y={point.y - 24} width={Math.max(label.length * 6.2 + 16, 88)} height={22} rx={11} fill="rgba(255, 255, 255, 0.92)" />
      <text x={point.x + 18} y={point.y - 9} fill={fill} fontSize="12" fontWeight={700}>
        {label}
      </text>
    </g>
  );
}
