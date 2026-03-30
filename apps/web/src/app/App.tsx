import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AppShell, Badge, Button } from "@facility/ui";
import { AuthProvider, useAuth } from "../features/auth/AuthContext";
import { LoginPage } from "../features/auth/LoginPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { UsersPage } from "../features/admin/UsersPage";
import { AuditPage } from "../features/admin/AuditPage";
import { ContactsPage } from "../features/contacts/ContactsPage";
import { CoveragePage } from "../features/coverage/CoveragePage";
import { HoursPage } from "../features/hours/HoursPage";
import { InventoryPage } from "../features/inventory/InventoryPage";
import { LocationsPage } from "../features/locations/LocationsPage";
import { MappingPage } from "../features/mapping/MappingPage";
import { NetworkPage } from "../features/network/NetworkPage";
import { ReadinessPage } from "../features/readiness/ReadinessPage";
import { WifiPage } from "../features/wifi/WifiPage";

function LoginRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="fi-screen-center">Loading session...</div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <LoginPage />;
}

function ProtectedLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, loading, hasPermission, token } = useAuth();

  if (loading) {
    return <div className="fi-screen-center">Loading workspace...</div>;
  }

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  const permissions = Array.from(new Set(user.roles.flatMap((role) => role.permissions)));
  const navItems = [
    { label: "Dashboard", href: "/" },
    { label: "Locations", href: "/locations" },
    ...(hasPermission("hours:read") ? [{ label: "Hours", href: "/hours" }] : []),
    ...(hasPermission("contacts:read") ? [{ label: "Contacts", href: "/contacts" }] : []),
    ...(hasPermission("inventory:read") ? [{ label: "Inventory", href: "/inventory" }] : []),
    ...(hasPermission("network:read") ? [{ label: "Network", href: "/network" }] : []),
    ...(hasPermission("mapping:read") ? [{ label: "Mapping", href: "/mapping" }] : []),
    ...(hasPermission("wifi:read") ? [{ label: "Wi-Fi", href: "/wifi" }] : []),
    ...(hasPermission("coverage:read") ? [{ label: "Coverage", href: "/coverage" }] : []),
    ...(hasPermission("readiness:read") ? [{ label: "Readiness", href: "/readiness" }] : []),
    ...(hasPermission("platform:*") ? [{ label: "Users", href: "/admin/users" }] : []),
    ...(hasPermission("audit:read") ? [{ label: "Audit", href: "/admin/audit" }] : [])
  ];

  return (
    <AppShell
      title="Facility Intelligence"
      subtitle="Healthcare operations and connectivity"
      navItems={navItems}
      activePath={location.pathname}
      headerActions={
        <div className="fi-user-menu">
          <div>
            <strong>{user.displayName}</strong>
            <div className="fi-user-menu__meta">
              {user.roles.map((role) => (
                <Badge key={role.id} tone="info">
                  {role.name}
                </Badge>
              ))}
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Sign Out
          </Button>
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<DashboardPage token={token} />} />
        <Route path="/locations" element={<LocationsPage token={token} hasWriteAccess={hasPermission("location:write")} />} />
        <Route
          path="/hours"
          element={hasPermission("hours:read") ? <HoursPage token={token} hasWriteAccess={hasPermission("hours:write")} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/contacts"
          element={hasPermission("contacts:read") ? <ContactsPage token={token} permissions={permissions} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/inventory"
          element={
            hasPermission("inventory:read") ? (
              <InventoryPage token={token} hasReadAccess={hasPermission("inventory:read")} hasWriteAccess={hasPermission("inventory:write")} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/network"
          element={hasPermission("network:read") ? <NetworkPage token={token} hasWriteAccess={hasPermission("network:write")} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/mapping"
          element={hasPermission("mapping:read") ? <MappingPage token={token} hasWriteAccess={hasPermission("mapping:write")} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/wifi"
          element={hasPermission("wifi:read") ? <WifiPage token={token} hasWriteAccess={hasPermission("wifi:write")} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/coverage"
          element={
            hasPermission("coverage:read") ? (
              <CoveragePage token={token} hasWriteAccess={hasPermission("coverage:write")} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/readiness"
          element={
            hasPermission("readiness:read") ? (
              <ReadinessPage token={token} hasWriteAccess={hasPermission("readiness:write")} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/admin/users"
          element={hasPermission("platform:*") ? <UsersPage token={token} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/admin/audit"
          element={hasPermission("audit:read") ? <AuditPage token={token} /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </AuthProvider>
  );
}
