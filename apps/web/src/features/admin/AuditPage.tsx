import { useEffect, useState } from "react";
import { Badge, DataTable, EmptyState, PageHeader, SectionCard } from "@facility/ui";
import { apiRequest } from "../../app/api";

interface AuditRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  createdAt: string;
  actorUserId: string | null;
}

export function AuditPage({ token }: { token: string }) {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ data: AuditRecord[]; meta: { total: number } }>("/api/admin/audit-logs?page=1&pageSize=50", {}, token)
      .then((response: { data: AuditRecord[]; meta: { total: number } }) => setRecords(response.data))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="fi-page-stack">
      <PageHeader title="Audit Timeline" description="Recent authentication and hierarchy changes." />
      <SectionCard title="Recent Events" description="Latest 50 audit records">
        <DataTable
          rows={records}
          empty={
            <EmptyState
              title="No audit records found"
              description="Actions taken in the platform will appear here."
            />
          }
          columns={[
            { key: "createdAt", header: "Time", render: (row) => new Date(row.createdAt).toLocaleString(), width: "16rem" },
            { key: "action", header: "Action", render: (row) => <Badge tone="info">{row.action}</Badge>, width: "14rem" },
            { key: "entityType", header: "Entity", render: (row) => row.entityType, width: "10rem" },
            { key: "summary", header: "Summary", render: (row) => row.summary }
          ]}
        />
        {loading ? <p className="fi-muted">Loading audit records...</p> : null}
      </SectionCard>
    </div>
  );
}
