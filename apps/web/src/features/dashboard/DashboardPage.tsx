import { useEffect, useState } from "react";
import { PageHeader, PanelMessage, SectionCard, StatStrip } from "@facility/ui";
import { apiRequest } from "../../app/api";

interface DashboardSummary {
  facilities: number;
  buildings: number;
  floors: number;
  zones: number;
  rooms: number;
}

export function DashboardPage({ token }: { token: string }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ data: { summary: DashboardSummary } }>("/api/locations/bootstrap", {}, token)
      .then((response: { data: { summary: DashboardSummary } }) => setSummary(response.data.summary))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="fi-page-stack">
      <PageHeader
        title="Program Dashboard"
        description="Current delivery baseline for the Facility IT Intelligence Platform."
      />
      <StatStrip
        items={[
          { label: "Facilities", value: loading ? "..." : summary?.facilities ?? 0 },
          { label: "Buildings", value: loading ? "..." : summary?.buildings ?? 0 },
          { label: "Floors", value: loading ? "..." : summary?.floors ?? 0 },
          { label: "Zones", value: loading ? "..." : summary?.zones ?? 0 },
          { label: "Rooms", value: loading ? "..." : summary?.rooms ?? 0 }
        ]}
      />
      <div className="fi-two-column">
        <SectionCard title="Active Tracks" description="Current implementation status in this scaffold">
          <ul className="fi-list">
            <li>T00 through T02 foundation, auth, audit, and location hierarchy are complete.</li>
            <li>T03 through T06 hours, contacts, inventory, and network operations are available.</li>
            <li>T07 through T09 mapping, Wi-Fi capture, and coverage analysis are now active in the shell.</li>
            <li>T10 risk, readiness, and operational reporting are now available with seeded triage baseline data.</li>
          </ul>
        </SectionCard>
        <SectionCard title="Next Delivery Wave" description="Staged next modules">
          <PanelMessage tone="info" title="T11 queued">
            Administration, import and export tooling, and portability hardening remain as the final planned delivery wave.
          </PanelMessage>
        </SectionCard>
      </div>
    </div>
  );
}
