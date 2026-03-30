export type GeometryKind = "point" | "polygon" | "polyline" | "bounds";

export interface GeometryPoint {
  x: number;
  y: number;
}

export interface GeometryData {
  type: GeometryKind;
  points: GeometryPoint[];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizePoint(value: unknown): GeometryPoint | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (!isFiniteNumber(candidate.x) || !isFiniteNumber(candidate.y)) {
    return null;
  }

  return {
    x: candidate.x,
    y: candidate.y
  };
}

function normalizeType(value: unknown): GeometryKind | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.toLowerCase();
  if (normalized === "point" || normalized === "polygon" || normalized === "polyline" || normalized === "bounds") {
    return normalized;
  }

  if (normalized === "linestring") {
    return "polyline";
  }

  return null;
}

function parseStructuredGeometry(value: Record<string, unknown>): GeometryData | null {
  const type = normalizeType(value.type);
  const points = Array.isArray(value.points) ? value.points.map(normalizePoint).filter((point): point is GeometryPoint => point !== null) : null;

  if (!type || !points || points.length === 0) {
    return null;
  }

  return {
    type,
    points
  };
}

function parseGeoJsonGeometry(value: Record<string, unknown>): GeometryData | null {
  const type = normalizeType(value.type);
  if (!type) {
    return null;
  }

  if (type === "point") {
    const coordinates = Array.isArray(value.coordinates) ? value.coordinates : null;
    if (!coordinates || !isFiniteNumber(coordinates[0]) || !isFiniteNumber(coordinates[1])) {
      return null;
    }

    return {
      type: "point",
      points: [{ x: coordinates[0], y: coordinates[1] }]
    };
  }

  const coordinates = Array.isArray(value.coordinates) ? value.coordinates : null;
  if (!coordinates) {
    return null;
  }

  const rawPoints =
    type === "polygon" && Array.isArray(coordinates[0]) ? coordinates[0] : coordinates;

  const points = Array.isArray(rawPoints)
    ? rawPoints
        .map((entry) => {
          if (!Array.isArray(entry) || !isFiniteNumber(entry[0]) || !isFiniteNumber(entry[1])) {
            return null;
          }

          return { x: entry[0], y: entry[1] };
        })
        .filter((point): point is GeometryPoint => point !== null)
    : [];

  if (points.length === 0) {
    return null;
  }

  return {
    type,
    points
  };
}

function pointsForBounds(points: GeometryPoint[]) {
  if (points.length < 2) {
    return points;
  }

  const [start, end] = points;
  if (!start || !end) {
    return points;
  }

  return [
    { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y) },
    { x: Math.max(start.x, end.x), y: Math.min(start.y, end.y) },
    { x: Math.max(start.x, end.x), y: Math.max(start.y, end.y) },
    { x: Math.min(start.x, end.x), y: Math.max(start.y, end.y) }
  ];
}

export function createGeometry(type: GeometryKind): GeometryData {
  return {
    type,
    points: []
  };
}

export function parseGeometry(value: unknown): GeometryData | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return parseStructuredGeometry(value as Record<string, unknown>) ?? parseGeoJsonGeometry(value as Record<string, unknown>);
}

export function stringifyGeometry(value: GeometryData | null | undefined) {
  if (!value) {
    return "";
  }

  return JSON.stringify(value, null, 2);
}

export function geometryLabel(value: GeometryData | null | undefined) {
  if (!value || value.points.length === 0) {
    return "Not mapped";
  }

  const type = value.type === "bounds" ? "Bounds" : `${value.type.charAt(0).toUpperCase()}${value.type.slice(1)}`;
  return `${type} (${value.points.length} point${value.points.length === 1 ? "" : "s"})`;
}

export function geometryAnchor(value: GeometryData | null | undefined): GeometryPoint | null {
  if (!value || value.points.length === 0) {
    return null;
  }

  if (value.type === "point") {
    return value.points[0] ?? null;
  }

  const points = value.type === "bounds" ? pointsForBounds(value.points) : value.points;
  const total = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y
    }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length
  };
}

export function geometryPath(value: GeometryData | null | undefined) {
  if (!value || value.points.length === 0) {
    return "";
  }

  const points = value.type === "bounds" ? pointsForBounds(value.points) : value.points;
  if (points.length === 0) {
    return "";
  }

  const [first, ...rest] = points;
  if (!first) {
    return "";
  }

  const segments = [`M ${first.x} ${first.y}`, ...rest.map((point) => `L ${point.x} ${point.y}`)];

  if (value.type === "polygon" || value.type === "bounds") {
    segments.push("Z");
  }

  return segments.join(" ");
}
