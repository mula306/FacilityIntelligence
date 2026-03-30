import type { MouseEvent } from "react";
import type { GeometryData, GeometryPoint } from "./geometry";
import { geometryAnchor, geometryPath } from "./geometry";

export interface FloorCanvasLayer {
  id: string;
  label: string;
  tone: "zone" | "room" | "annotation" | "selected";
  geometry: GeometryData | null;
}

export interface FloorCanvasProps {
  width: number;
  height: number;
  backgroundImageUrl: string | null | undefined;
  layers: FloorCanvasLayer[];
  title?: string;
  subtitle?: string;
}

export interface GeometryCanvasEditorProps {
  width: number;
  height: number;
  backgroundImageUrl: string | null | undefined;
  value: GeometryData;
  layers?: FloorCanvasLayer[];
  onChange: (geometry: GeometryData) => void;
  title: string;
  hint?: string;
}

const TONE_STYLE: Record<FloorCanvasLayer["tone"], { stroke: string; fill: string; label: string }> = {
  zone: {
    stroke: "#0f766e",
    fill: "rgba(15, 118, 110, 0.12)",
    label: "#0f766e"
  },
  room: {
    stroke: "#b45309",
    fill: "rgba(180, 83, 9, 0.14)",
    label: "#b45309"
  },
  annotation: {
    stroke: "#b91c1c",
    fill: "rgba(185, 28, 28, 0.12)",
    label: "#b91c1c"
  },
  selected: {
    stroke: "#1d4ed8",
    fill: "rgba(29, 78, 216, 0.12)",
    label: "#1d4ed8"
  }
};

export function FloorCanvas({
  width,
  height,
  backgroundImageUrl,
  layers,
  title,
  subtitle
}: FloorCanvasProps) {
  return (
    <div
      className="fi-floor-canvas"
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
      <SvgCanvas width={width} height={height} backgroundImageUrl={backgroundImageUrl} layers={layers} />
    </div>
  );
}

export function GeometryCanvasEditor({
  width,
  height,
  backgroundImageUrl,
  value,
  layers = [],
  onChange,
  title,
  hint
}: GeometryCanvasEditorProps) {
  return (
    <div
      className="fi-geometry-editor"
      style={{
        border: "1px solid rgba(15, 23, 42, 0.12)",
        borderRadius: 16,
        overflow: "hidden",
        background: "#fff"
      }}
    >
      <div style={{ padding: "0.85rem 1rem 0.25rem" }}>
        <strong style={{ display: "block", fontSize: "0.95rem" }}>{title}</strong>
        {hint ? <p style={{ margin: "0.2rem 0 0", color: "#475569", fontSize: "0.88rem" }}>{hint}</p> : null}
      </div>
      <div style={{ padding: "0 1rem 1rem" }}>
        <Toolbar value={value} onChange={onChange} />
      </div>
      <InteractiveCanvas
        width={width}
        height={height}
        backgroundImageUrl={backgroundImageUrl}
        layers={layers}
        value={value}
        onChange={onChange}
      />
      <div style={{ padding: "0.85rem 1rem 1rem", borderTop: "1px solid rgba(15, 23, 42, 0.08)" }}>
        <div style={{ display: "grid", gap: "0.35rem" }}>
          {value.points.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>Click the canvas to add points.</p>
          ) : (
            <p style={{ margin: 0, color: "#0f172a", fontSize: "0.88rem" }}>
              {value.type} with {value.points.length} point{value.points.length === 1 ? "" : "s"}.
            </p>
          )}
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.82rem" }}>
            Use point mode for exact markers and polygon or polyline mode for room, zone, or annotation outlines.
          </p>
        </div>
      </div>
    </div>
  );
}

function Toolbar({
  value,
  onChange
}: {
  value: GeometryData;
  onChange: (geometry: GeometryData) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
      <button type="button" className="fi-button fi-button--secondary" onClick={() => onChange({ ...value, type: "point" })}>
        Point
      </button>
      <button type="button" className="fi-button fi-button--secondary" onClick={() => onChange({ ...value, type: "polyline" })}>
        Polyline
      </button>
      <button type="button" className="fi-button fi-button--secondary" onClick={() => onChange({ ...value, type: "polygon" })}>
        Polygon
      </button>
      <button
        type="button"
        className="fi-button fi-button--secondary"
        onClick={() =>
          onChange({
            ...value,
            points: value.points.slice(0, Math.max(0, value.points.length - 1))
          })
        }
      >
        Undo
      </button>
      <button type="button" className="fi-button fi-button--secondary" onClick={() => onChange({ ...value, points: [] })}>
        Clear
      </button>
    </div>
  );
}

function InteractiveCanvas({
  width,
  height,
  backgroundImageUrl,
  layers,
  value,
  onChange
}: {
  width: number;
  height: number;
  backgroundImageUrl: string | null | undefined;
  layers: FloorCanvasLayer[];
  value: GeometryData;
  onChange: (geometry: GeometryData) => void;
}) {
  const viewBox = `0 0 ${width} ${height}`;

  function handleClick(event: MouseEvent<SVGSVGElement>) {
    const target = event.currentTarget;
    const bounds = target.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * width;
    const y = ((event.clientY - bounds.top) / bounds.height) * height;
    const point: GeometryPoint = {
      x: Math.min(Math.max(x, 0), width),
      y: Math.min(Math.max(y, 0), height)
    };

    if (value.type === "point") {
      onChange({ ...value, points: [point] });
      return;
    }

    onChange({ ...value, points: [...value.points, point] });
  }

  return (
    <div style={{ borderTop: "1px solid rgba(15, 23, 42, 0.08)", background: "#f8fafc" }}>
      <svg
        viewBox={viewBox}
        width="100%"
        height="100%"
        role="img"
        aria-label="Floor canvas geometry editor"
        onClick={handleClick}
        style={{
          display: "block",
          width: "100%",
          aspectRatio: `${width} / ${height}`,
          maxHeight: "70vh",
          cursor: "crosshair",
          background: "#f8fafc"
        }}
      >
        <defs>
          <pattern id="fi-grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(148, 163, 184, 0.25)" strokeWidth="1" />
          </pattern>
          <marker id="fi-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M 0 0 L 8 4 L 0 8 z" fill="#1d4ed8" />
          </marker>
        </defs>
        <rect x="0" y="0" width={width} height={height} fill="url(#fi-grid)" />
        {backgroundImageUrl ? (
          <image href={backgroundImageUrl} x="0" y="0" width={width} height={height} preserveAspectRatio="none" opacity="0.35" />
        ) : (
          <rect x="0" y="0" width={width} height={height} fill="rgba(255, 255, 255, 0.55)" />
        )}
        {layers.map((layer) => renderLayer(layer))}
        {value.points.length > 0 ? renderEditableGeometry(value) : null}
      </svg>
    </div>
  );
}

function SvgCanvas({
  width,
  height,
  backgroundImageUrl,
  layers
}: {
  width: number;
  height: number;
  backgroundImageUrl: string | null | undefined;
  layers: FloorCanvasLayer[];
}) {
  const viewBox = `0 0 ${width} ${height}`;

  return (
    <svg
      viewBox={viewBox}
      width="100%"
      height="100%"
      role="img"
      aria-label="Floor canvas preview"
      style={{
        display: "block",
        width: "100%",
        aspectRatio: `${width} / ${height}`,
        maxHeight: "70vh",
        background: "#f8fafc"
      }}
    >
      <defs>
        <pattern id="fi-grid-preview" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="url(#fi-grid-preview)" />
      {backgroundImageUrl ? (
        <image href={backgroundImageUrl} x="0" y="0" width={width} height={height} preserveAspectRatio="none" opacity="0.4" />
      ) : null}
      {layers.map((layer) => renderLayer(layer))}
    </svg>
  );
}

function renderLayer(layer: FloorCanvasLayer) {
  if (!layer.geometry) {
    return null;
  }

  const style = TONE_STYLE[layer.tone];
  const anchor = geometryAnchor(layer.geometry);
  const path = geometryPath(layer.geometry);

  if (layer.geometry.type === "point") {
    const point = layer.geometry.points[0];
    if (!point) {
      return null;
    }

    return (
      <g key={layer.id}>
        <circle cx={point.x} cy={point.y} r="12" fill={style.fill} stroke={style.stroke} strokeWidth="3" />
        <circle cx={point.x} cy={point.y} r="4" fill={style.stroke} />
        {anchor ? renderLabel(anchor, layer.label, style.label) : null}
      </g>
    );
  }

  return (
    <g key={layer.id}>
      <path
        d={path}
        fill={layer.geometry.type === "polygon" ? style.fill : "none"}
        stroke={style.stroke}
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
        markerEnd={layer.geometry.type === "polyline" ? "url(#fi-arrow)" : undefined}
      />
      {anchor ? renderLabel(anchor, layer.label, style.label) : null}
      {layer.geometry.points.map((point, index) => (
        <circle key={`${layer.id}-${index}`} cx={point.x} cy={point.y} r="4" fill={style.stroke} />
      ))}
    </g>
  );
}

function renderEditableGeometry(geometry: GeometryData) {
  const style = TONE_STYLE.selected;

  if (geometry.type === "point") {
    const point = geometry.points[0];
    if (!point) {
      return null;
    }

    return (
      <g>
        <circle cx={point.x} cy={point.y} r="12" fill={style.fill} stroke={style.stroke} strokeWidth="3" />
        <circle cx={point.x} cy={point.y} r="4" fill={style.stroke} />
      </g>
    );
  }

  const path = geometryPath(geometry);
  return (
    <g>
      <path
        d={path}
        fill={geometry.type === "polygon" ? style.fill : "none"}
        stroke={style.stroke}
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray="8 6"
      />
      {geometry.points.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="5" fill={style.stroke} />
      ))}
    </g>
  );
}

function renderLabel(point: GeometryPoint, label: string, fill: string) {
  return (
    <g>
      <rect x={point.x + 10} y={point.y - 24} width={Math.max(label.length * 7 + 16, 72)} height={22} rx={11} fill="rgba(255, 255, 255, 0.92)" />
      <text x={point.x + 18} y={point.y - 9} fill={fill} fontSize="12" fontWeight={700}>
        {label}
      </text>
    </g>
  );
}
