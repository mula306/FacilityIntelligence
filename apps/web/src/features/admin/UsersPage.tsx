import { useEffect, useState } from "react";
import { Badge, DataTable, EmptyState, PageHeader, SectionCard } from "@facility/ui";
import { apiRequest } from "../../app/api";
import type { AuthUser } from "../auth/AuthContext";

interface RoleRecord {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
}

export function UsersPage({ token }: { token: string }) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest<{ data: AuthUser[] }>("/api/admin/users", {}, token),
      apiRequest<{ data: RoleRecord[] }>("/api/admin/roles", {}, token)
    ])
      .then(([usersResponse, rolesResponse]) => {
        setUsers(usersResponse.data);
        setRoles(rolesResponse.data);
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="fi-page-stack">
      <PageHeader
        title="Users and Roles"
        description="Bootstrap identity records and role-based access controls."
      />
      <SectionCard title="Users" description="Local placeholder identities for the current phase">
        <DataTable
          rows={users}
          empty={
            <EmptyState
              title="No users available"
              description="Seed the local database to load the bootstrap identities."
            />
          }
          columns={[
            { key: "displayName", header: "User", render: (user) => user.displayName },
            { key: "email", header: "Email", render: (user) => user.email },
            {
              key: "roles",
              header: "Roles",
              render: (user) => (
                <div className="fi-badge-row">
                  {user.roles.map((role) => (
                    <Badge key={role.id} tone="info">
                      {role.name}
                    </Badge>
                  ))}
                </div>
              )
            },
            {
              key: "lastLoginAt",
              header: "Last Login",
              render: (user) => user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"
            }
          ]}
        />
        {loading ? <p className="fi-muted">Loading users...</p> : null}
      </SectionCard>
      <SectionCard title="Roles" description="Current permission bundles">
        <DataTable
          rows={roles}
          empty={<EmptyState title="No roles configured" description="Roles will appear after seed data loads." />}
          columns={[
            { key: "name", header: "Role", render: (role) => role.name },
            { key: "description", header: "Description", render: (role) => role.description ?? "No description" },
            {
              key: "permissions",
              header: "Permissions",
              render: (role) => (
                <div className="fi-badge-row">
                  {role.permissions.map((permission) => (
                    <Badge key={permission}>{permission}</Badge>
                  ))}
                </div>
              )
            }
          ]}
        />
      </SectionCard>
    </div>
  );
}
