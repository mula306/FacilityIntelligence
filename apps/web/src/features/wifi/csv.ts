import type { WifiScanSampleImportRowInput } from "@facility/contracts";
import { wifiBandValues } from "@facility/domain";

const HEADER_ALIASES: Record<string, keyof WifiScanSampleImportRowInput | "coordinateX" | "coordinateY"> = {
  ssid: "ssid",
  bssid: "bssid",
  rssi: "rssi",
  frequencymhz: "frequencyMHz",
  frequency: "frequencyMHz",
  channel: "channel",
  band: "band",
  sampledat: "sampledAt",
  sampled_at: "sampledAt",
  zoneid: "zoneId",
  roomid: "roomId",
  accesspointid: "accessPointId",
  status: "status",
  x: "coordinateX",
  coordx: "coordinateX",
  coordinatex: "coordinateX",
  y: "coordinateY",
  coordy: "coordinateY",
  coordinatey: "coordinateY"
};

export interface WifiCsvParseResult {
  rows: WifiScanSampleImportRowInput[];
  issues: string[];
  columns: string[];
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function unquote(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }

  return trimmed;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const next = line[index + 1];
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);
  return values.map(unquote);
}

function coerceInteger(value: string) {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

function coerceDecimal(value: string) {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBand(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "2.4" || normalized === "2.4ghz" || normalized === "2_4ghz" || normalized === "2g" || normalized === "2.4g") {
    return "2.4ghz";
  }
  if (normalized === "5" || normalized === "5ghz" || normalized === "5g") {
    return "5ghz";
  }
  if (normalized === "6" || normalized === "6ghz" || normalized === "6g") {
    return "6ghz";
  }
  if (normalized === "" || normalized === "unknown") {
    return "unknown";
  }
  return (wifiBandValues as readonly string[]).includes(normalized) ? normalized : null;
}

export function parseWifiScanCsv(text: string): WifiCsvParseResult {
  const issues: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { rows: [], issues: ["Paste CSV content before previewing rows."], columns: [] };
  }

  const headers = parseCsvLine(lines[0] ?? "").map(normalizeHeader);
  if (headers.length === 0) {
    return { rows: [], issues: ["CSV must include a header row."], columns: [] };
  }

  const rows: WifiScanSampleImportRowInput[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const rawValues = parseCsvLine(lines[lineIndex] ?? "");
    if (rawValues.length === 1 && rawValues[0] === "") {
      continue;
    }

    const row: Partial<Record<keyof WifiScanSampleImportRowInput | "coordinateX" | "coordinateY", string>> = {};
    headers.forEach((header, headerIndex) => {
      const mapped = HEADER_ALIASES[header];
      if (!mapped) {
        return;
      }

      row[mapped] = rawValues[headerIndex] ?? "";
    });

    const missing: string[] = [];
    const ssid = row.ssid?.trim() ?? "";
    const bssid = row.bssid?.trim() ?? "";
    const rssiText = row.rssi?.trim() ?? "";
    const sampledAtText = row.sampledAt?.trim() ?? "";
    const bandText = row.band?.trim() ?? "";

    if (!ssid) {
      missing.push("ssid");
    }
    if (!bssid) {
      missing.push("bssid");
    }
    if (!rssiText) {
      missing.push("rssi");
    }
    if (!sampledAtText) {
      missing.push("sampledAt");
    }
    if (!bandText) {
      missing.push("band");
    }

    if (missing.length > 0) {
      issues.push(`Row ${lineIndex + 1} is missing required fields: ${missing.join(", ")}.`);
      continue;
    }

    const rssi = coerceInteger(rssiText);
    const frequencyMHz = coerceInteger(row.frequencyMHz ?? "");
    const channel = coerceInteger(row.channel ?? "");
    const band = normalizeBand(bandText);
    const coordinateX = coerceDecimal(row.coordinateX ?? "");
    const coordinateY = coerceDecimal(row.coordinateY ?? "");
    const sampledAt = new Date(sampledAtText);

    if (rssi === null) {
      issues.push(`Row ${lineIndex + 1} has an invalid RSSI value.`);
      continue;
    }

    if (!band) {
      issues.push(`Row ${lineIndex + 1} has an invalid band value.`);
      continue;
    }

    if (Number.isNaN(sampledAt.getTime())) {
      issues.push(`Row ${lineIndex + 1} has an invalid sampledAt value.`);
      continue;
    }

    const coordinate = coordinateX !== null && coordinateY !== null ? { x: coordinateX, y: coordinateY } : null;

    rows.push({
      ssid,
      bssid,
      rssi,
      frequencyMHz,
      channel,
      band: band as WifiScanSampleImportRowInput["band"],
      sampledAt: sampledAt.toISOString(),
      coordinate,
      zoneId: row.zoneId?.trim() ? row.zoneId.trim() : undefined,
      roomId: row.roomId?.trim() ? row.roomId.trim() : undefined,
      accessPointId: row.accessPointId?.trim() ? row.accessPointId.trim() : undefined,
      status: row.status?.trim() ? (row.status.trim() as WifiScanSampleImportRowInput["status"]) : "active"
    });
  }

  return {
    rows,
    issues,
    columns: headers
  };
}
