import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Field,
  PageHeader,
  PanelMessage,
  SectionCard,
  SelectInput,
  StatStrip,
  TextInput,
  TextareaInput
} from "@facility/ui";
import { ApiError, apiRequest } from "../../app/api";

const CONTACTS_READ_PERMISSION = "contacts:read";
const CONTACTS_WRITE_PERMISSION = "contacts:write";

interface Summary {
  contacts: number;
  roles: number;
  assignments: number;
  facilities: number;
  buildings: number;
  floors: number;
  zones: number;
  rooms: number;
}

interface ContactRecord {
  id: string;
  name: string;
  code: string | null;
  firstName: string;
  lastName: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  mobilePhone: string | null;
  organization: string | null;
  notes: string | null;
  status: string;
  assignmentCount: number;
}

interface ContactRoleRecord {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  notes: string | null;
  status: string;
  assignmentCount: number;
}

interface AssignmentRecord {
  id: string;
  facilityId: string;
  buildingId: string | null;
  floorId: string | null;
  zoneId: string | null;
  roomId: string | null;
  contactId: string;
  contactRoleId: string;
  contactName: string;
  contactRoleName: string;
  facilityName: string;
  buildingName: string | null;
  floorName: string | null;
  zoneName: string | null;
  roomName: string | null;
  escalationPriority: number | null;
  isPrimary: boolean;
  status: string;
}

interface FacilityRecord {
  id: string;
  name: string;
  code: string | null;
}

interface BuildingRecord {
  id: string;
  facilityId: string;
  name: string;
  code: string | null;
}

interface FloorRecord {
  id: string;
  facilityId: string;
  buildingId: string;
  name: string;
  code: string | null;
  floorNumber: number;
}

interface ZoneRecord {
  id: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  name: string;
  code: string | null;
}

interface RoomRecord {
  id: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  zoneId: string | null;
  name: string;
  code: string | null;
  roomNumber: string | null;
}

interface BootstrapPayload {
  summary: Summary;
  lists: {
    contacts: ContactRecord[];
    roles: ContactRoleRecord[];
    assignments: AssignmentRecord[];
    facilities: FacilityRecord[];
    buildings: BuildingRecord[];
    floors: FloorRecord[];
    zones: ZoneRecord[];
    rooms: RoomRecord[];
  };
}

interface ContactFormState {
  name: string;
  code: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  mobilePhone: string;
  organization: string;
  notes: string;
  status: string;
}

interface RoleFormState {
  name: string;
  code: string;
  description: string;
  notes: string;
  status: string;
}

interface AssignmentFormState {
  facilityId: string;
  buildingId: string;
  floorId: string;
  zoneId: string;
  roomId: string;
  contactId: string;
  contactRoleId: string;
  escalationPriority: string;
  isPrimary: boolean;
  status: string;
}

const blankContactForm: ContactFormState = {
  name: "",
  code: "",
  firstName: "",
  lastName: "",
  title: "",
  email: "",
  phone: "",
  mobilePhone: "",
  organization: "",
  notes: "",
  status: "active"
};

const blankRoleForm: RoleFormState = {
  name: "",
  code: "",
  description: "",
  notes: "",
  status: "active"
};

const blankAssignmentForm: AssignmentFormState = {
  facilityId: "",
  buildingId: "",
  floorId: "",
  zoneId: "",
  roomId: "",
  contactId: "",
  contactRoleId: "",
  escalationPriority: "",
  isPrimary: false,
  status: "active"
};

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function nullableNumber(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

function statusTone(status: string): "neutral" | "success" | "warning" {
  if (status === "archived") {
    return "warning";
  }

  if (status === "active") {
    return "success";
  }

  return "neutral";
}

function buildScopeLabel(record: AssignmentRecord) {
  return [record.buildingName, record.floorName, record.zoneName, record.roomName].filter(Boolean).join(" / ") || "Facility-level";
}

export function ContactsPage({
  token,
  permissions
}: {
  token: string;
  permissions?: string[];
}) {
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [contactForm, setContactForm] = useState<ContactFormState>(blankContactForm);
  const [roleForm, setRoleForm] = useState<RoleFormState>(blankRoleForm);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>(blankAssignmentForm);

  const canRead = permissions ? permissions.includes(CONTACTS_READ_PERMISSION) : true;
  const canWrite = permissions ? permissions.includes(CONTACTS_WRITE_PERMISSION) : true;

  async function loadBootstrap() {
    const response = await apiRequest<{ data: BootstrapPayload }>("/api/contacts/bootstrap", {}, token);
    setData(response.data);
  }

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      setMessage("contacts:read is required to view this workspace.");
      return;
    }

    loadBootstrap()
      .catch((error) => {
        setMessage(error instanceof ApiError ? error.message : "Unable to load contacts.");
      })
      .finally(() => setLoading(false));
  }, [canRead, token]);

  const contacts = data?.lists.contacts ?? [];
  const roles = data?.lists.roles ?? [];
  const assignments = data?.lists.assignments ?? [];
  const facilities = data?.lists.facilities ?? [];
  const buildings = data?.lists.buildings ?? [];
  const floors = data?.lists.floors ?? [];
  const zones = data?.lists.zones ?? [];
  const rooms = data?.lists.rooms ?? [];

  const filteredBuildings = useMemo(
    () => buildings.filter((building) => building.facilityId === assignmentForm.facilityId),
    [buildings, assignmentForm.facilityId]
  );
  const filteredFloors = useMemo(
    () => floors.filter((floor) => floor.buildingId === assignmentForm.buildingId),
    [floors, assignmentForm.buildingId]
  );
  const filteredZones = useMemo(
    () => zones.filter((zone) => zone.floorId === assignmentForm.floorId),
    [zones, assignmentForm.floorId]
  );
  const filteredRooms = useMemo(
    () => rooms.filter((room) => room.floorId === assignmentForm.floorId),
    [rooms, assignmentForm.floorId]
  );

  const selectedContact = contacts.find((record) => record.id === selectedContactId) ?? null;
  const selectedRole = roles.find((record) => record.id === selectedRoleId) ?? null;
  const selectedAssignment = assignments.find((record) => record.id === selectedAssignmentId) ?? null;

  function resetWorkspace() {
    setSelectedContactId("");
    setSelectedRoleId("");
    setSelectedAssignmentId("");
    setContactForm(blankContactForm);
    setRoleForm(blankRoleForm);
    setAssignmentForm(blankAssignmentForm);
    setMessage("Editors reset.");
  }

  async function runMutation<T>(work: () => Promise<T>, successMessage: string) {
    try {
      await work();
      await loadBootstrap();
      setMessage(successMessage);
    } catch (error: unknown) {
      setMessage(error instanceof ApiError ? error.message : "Unable to save changes.");
    }
  }

  function selectContact(record: ContactRecord) {
    setSelectedContactId(record.id);
    setContactForm({
      name: record.name,
      code: record.code ?? "",
      firstName: record.firstName,
      lastName: record.lastName,
      title: record.title ?? "",
      email: record.email ?? "",
      phone: record.phone ?? "",
      mobilePhone: record.mobilePhone ?? "",
      organization: record.organization ?? "",
      notes: record.notes ?? "",
      status: record.status
    });
  }

  function selectRole(record: ContactRoleRecord) {
    setSelectedRoleId(record.id);
    setRoleForm({
      name: record.name,
      code: record.code ?? "",
      description: record.description ?? "",
      notes: record.notes ?? "",
      status: record.status
    });
  }

  function selectAssignment(record: AssignmentRecord) {
    setSelectedAssignmentId(record.id);
    setAssignmentForm({
      facilityId: record.facilityId,
      buildingId: record.buildingId ?? "",
      floorId: record.floorId ?? "",
      zoneId: record.zoneId ?? "",
      roomId: record.roomId ?? "",
      contactId: record.contactId,
      contactRoleId: record.contactRoleId,
      escalationPriority: record.escalationPriority ? String(record.escalationPriority) : "",
      isPrimary: record.isPrimary,
      status: record.status
    });
  }

  if (!canRead) {
    return (
      <div className="fi-page-stack">
        <PageHeader title="Contacts and Escalations" description="contacts:read / contacts:write guard assumptions for the main agent." />
        <PanelMessage tone="warning" title="Read access required">
          This workspace expects the {CONTACTS_READ_PERMISSION} permission before the module is mounted.
        </PanelMessage>
      </div>
    );
  }

  return (
    <div className="fi-page-stack">
      <PageHeader
        title="Contacts and Escalations"
        description="Manage contact records, escalation roles, and facility-linked assignments with contacts:read / contacts:write assumptions."
        actions={<Button variant="secondary" onClick={resetWorkspace}>Reset Editors</Button>}
      />

      {message ? (
        <PanelMessage tone="info" title="Workspace message">
          {message}
        </PanelMessage>
      ) : null}

      {!canWrite ? (
        <PanelMessage tone="info" title="Read-only mode">
          This view is read-only until {CONTACTS_WRITE_PERMISSION} is granted.
        </PanelMessage>
      ) : null}

      <StatStrip
        items={[
          { label: "Contacts", value: data?.summary.contacts ?? 0 },
          { label: "Roles", value: data?.summary.roles ?? 0 },
          { label: "Assignments", value: data?.summary.assignments ?? 0 },
          { label: "Facilities", value: data?.summary.facilities ?? 0 },
          { label: "Floors", value: data?.summary.floors ?? 0 }
        ]}
      />

      <SectionCard title="Contacts" description="Operational contact records and assignment counts">
        <div className="fi-admin-grid">
          <DataTable
            rows={contacts}
            onRowClick={selectContact}
            empty={<EmptyState title="No contacts yet" description="Create the first contact to begin tracking escalation coverage." />}
            columns={[
              { key: "name", header: "Contact", render: (row) => row.name },
              { key: "person", header: "Identity", render: (row) => `${row.firstName} ${row.lastName}` },
              { key: "contact", header: "Contact", render: (row) => row.email ?? row.phone ?? "No contact details" },
              { key: "assignments", header: "Assignments", render: (row) => <Badge tone={row.assignmentCount > 0 ? "info" : "neutral"}>{row.assignmentCount}</Badge> },
              { key: "status", header: "Status", render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> }
            ]}
          />
          <form
            className="fi-form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canWrite) {
                setMessage("contacts:write is required to save contacts.");
                return;
              }

              void runMutation(
                () =>
                  selectedContactId
                    ? apiRequest(
                        `/api/contacts/contacts/${selectedContactId}`,
                        {
                          method: "PATCH",
                          body: JSON.stringify({
                            name: contactForm.name,
                            code: nullableText(contactForm.code),
                            firstName: contactForm.firstName,
                            lastName: contactForm.lastName,
                            title: nullableText(contactForm.title),
                            email: nullableText(contactForm.email),
                            phone: nullableText(contactForm.phone),
                            mobilePhone: nullableText(contactForm.mobilePhone),
                            organization: nullableText(contactForm.organization),
                            notes: nullableText(contactForm.notes),
                            status: contactForm.status
                          })
                        },
                        token
                      )
                    : apiRequest(
                        "/api/contacts/contacts",
                        {
                          method: "POST",
                          body: JSON.stringify({
                            name: contactForm.name,
                            code: nullableText(contactForm.code),
                            firstName: contactForm.firstName,
                            lastName: contactForm.lastName,
                            title: nullableText(contactForm.title),
                            email: nullableText(contactForm.email),
                            phone: nullableText(contactForm.phone),
                            mobilePhone: nullableText(contactForm.mobilePhone),
                            organization: nullableText(contactForm.organization),
                            notes: nullableText(contactForm.notes),
                            status: contactForm.status
                          })
                        },
                        token
                      ),
                selectedContactId ? "Contact updated." : "Contact created."
              );
            }}
          >
            <Field label="Full Name"><TextInput value={contactForm.name} onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })} required disabled={!canWrite} /></Field>
            <Field label="First Name"><TextInput value={contactForm.firstName} onChange={(event) => setContactForm({ ...contactForm, firstName: event.target.value })} required disabled={!canWrite} /></Field>
            <Field label="Last Name"><TextInput value={contactForm.lastName} onChange={(event) => setContactForm({ ...contactForm, lastName: event.target.value })} required disabled={!canWrite} /></Field>
            <Field label="Title"><TextInput value={contactForm.title} onChange={(event) => setContactForm({ ...contactForm, title: event.target.value })} disabled={!canWrite} /></Field>
            <Field label="Email"><TextInput value={contactForm.email} onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })} type="email" disabled={!canWrite} /></Field>
            <Field label="Phone"><TextInput value={contactForm.phone} onChange={(event) => setContactForm({ ...contactForm, phone: event.target.value })} disabled={!canWrite} /></Field>
            <Field label="Mobile Phone"><TextInput value={contactForm.mobilePhone} onChange={(event) => setContactForm({ ...contactForm, mobilePhone: event.target.value })} disabled={!canWrite} /></Field>
            <Field label="Organization"><TextInput value={contactForm.organization} onChange={(event) => setContactForm({ ...contactForm, organization: event.target.value })} disabled={!canWrite} /></Field>
            <Field label="Code"><TextInput value={contactForm.code} onChange={(event) => setContactForm({ ...contactForm, code: event.target.value })} disabled={!canWrite} /></Field>
            <Field label="Notes"><TextareaInput value={contactForm.notes} onChange={(event) => setContactForm({ ...contactForm, notes: event.target.value })} rows={4} disabled={!canWrite} /></Field>
            <Field label="Status">
              <SelectInput value={contactForm.status} onChange={(event) => setContactForm({ ...contactForm, status: event.target.value })} disabled={!canWrite}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </Field>
            <div className="fi-form-actions">
              <Button type="submit" disabled={!canWrite}>{selectedContactId ? "Save Contact" : "Create Contact"}</Button>
              {selectedContactId ? (
                <Button type="button" variant="danger" disabled={!canWrite} onClick={() => {
                  if (window.confirm("Archive this contact? Assignments must be archived first.")) {
                    void runMutation(() => apiRequest(`/api/contacts/contacts/${selectedContactId}/archive`, { method: "POST" }, token), "Contact archived.");
                  }
                }}>Archive</Button>
              ) : null}
            </div>
          </form>
        </div>
      </SectionCard>

      <SectionCard title="Contact Roles" description="Role definitions used to order escalation assignments">
        <div className="fi-admin-grid">
          <DataTable
            rows={roles}
            onRowClick={selectRole}
            empty={<EmptyState title="No roles yet" description="Create roles like escalation lead or operations contact." />}
            columns={[
              { key: "name", header: "Role", render: (row) => row.name },
              { key: "description", header: "Description", render: (row) => row.description ?? "No description" },
              { key: "assignments", header: "Assignments", render: (row) => <Badge tone={row.assignmentCount > 0 ? "info" : "neutral"}>{row.assignmentCount}</Badge> },
              { key: "status", header: "Status", render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> }
            ]}
          />
          <form
            className="fi-form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canWrite) {
                setMessage("contacts:write is required to save roles.");
                return;
              }

              void runMutation(
                () =>
                  selectedRoleId
                    ? apiRequest(`/api/contacts/roles/${selectedRoleId}`, {
                        method: "PATCH",
                        body: JSON.stringify({
                          name: roleForm.name,
                          code: nullableText(roleForm.code),
                          description: nullableText(roleForm.description),
                          notes: nullableText(roleForm.notes),
                          status: roleForm.status
                        })
                      }, token)
                    : apiRequest("/api/contacts/roles", {
                        method: "POST",
                        body: JSON.stringify({
                          name: roleForm.name,
                          code: nullableText(roleForm.code),
                          description: nullableText(roleForm.description),
                          notes: nullableText(roleForm.notes),
                          status: roleForm.status
                        })
                      }, token),
                selectedRoleId ? "Role updated." : "Role created."
              );
            }}
          >
            <Field label="Role Name"><TextInput value={roleForm.name} onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })} required disabled={!canWrite} /></Field>
            <Field label="Code"><TextInput value={roleForm.code} onChange={(event) => setRoleForm({ ...roleForm, code: event.target.value })} disabled={!canWrite} /></Field>
            <Field label="Description"><TextInput value={roleForm.description} onChange={(event) => setRoleForm({ ...roleForm, description: event.target.value })} disabled={!canWrite} /></Field>
            <Field label="Notes"><TextareaInput value={roleForm.notes} onChange={(event) => setRoleForm({ ...roleForm, notes: event.target.value })} rows={4} disabled={!canWrite} /></Field>
            <Field label="Status">
              <SelectInput value={roleForm.status} onChange={(event) => setRoleForm({ ...roleForm, status: event.target.value })} disabled={!canWrite}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </Field>
            <div className="fi-form-actions">
              <Button type="submit" disabled={!canWrite}>{selectedRoleId ? "Save Role" : "Create Role"}</Button>
              {selectedRoleId ? (
                <Button type="button" variant="danger" disabled={!canWrite} onClick={() => {
                  if (window.confirm("Archive this role? Assignments must be archived first.")) {
                    void runMutation(() => apiRequest(`/api/contacts/roles/${selectedRoleId}/archive`, { method: "POST" }, token), "Role archived.");
                  }
                }}>Archive</Button>
              ) : null}
            </div>
          </form>
        </div>
      </SectionCard>

      <SectionCard title="Facility Assignments" description="Structured escalation links tied to facility and location context">
        <div className="fi-admin-grid">
          <DataTable
            rows={assignments}
            onRowClick={selectAssignment}
            empty={<EmptyState title="No assignments yet" description="Build the first facility-linked escalation path to capture ordering." />}
            columns={[
              { key: "facility", header: "Facility", render: (row) => row.facilityName },
              { key: "scope", header: "Scope", render: (row) => buildScopeLabel(row) },
              { key: "contact", header: "Contact", render: (row) => row.contactName },
              { key: "role", header: "Role", render: (row) => row.contactRoleName },
              { key: "priority", header: "Priority", render: (row) => <Badge tone="info">{row.escalationPriority ?? "Auto"}</Badge> },
              { key: "primary", header: "Primary", render: (row) => (row.isPrimary ? "Yes" : "No") }
            ]}
          />
          <form
            className="fi-form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canWrite) {
                setMessage("contacts:write is required to save assignments.");
                return;
              }

              void runMutation(
                () =>
                  selectedAssignmentId
                    ? apiRequest(`/api/contacts/assignments/${selectedAssignmentId}`, {
                        method: "PATCH",
                        body: JSON.stringify({
                          facilityId: assignmentForm.facilityId,
                          buildingId: nullableText(assignmentForm.buildingId),
                          floorId: nullableText(assignmentForm.floorId),
                          zoneId: nullableText(assignmentForm.zoneId),
                          roomId: nullableText(assignmentForm.roomId),
                          contactId: assignmentForm.contactId,
                          contactRoleId: assignmentForm.contactRoleId,
                          escalationPriority: nullableNumber(assignmentForm.escalationPriority),
                          isPrimary: assignmentForm.isPrimary,
                          status: assignmentForm.status
                        })
                      }, token)
                    : apiRequest("/api/contacts/assignments", {
                        method: "POST",
                        body: JSON.stringify({
                          facilityId: assignmentForm.facilityId,
                          buildingId: nullableText(assignmentForm.buildingId),
                          floorId: nullableText(assignmentForm.floorId),
                          zoneId: nullableText(assignmentForm.zoneId),
                          roomId: nullableText(assignmentForm.roomId),
                          contactId: assignmentForm.contactId,
                          contactRoleId: assignmentForm.contactRoleId,
                          escalationPriority: nullableNumber(assignmentForm.escalationPriority),
                          isPrimary: assignmentForm.isPrimary,
                          status: assignmentForm.status
                        })
                      }, token),
                selectedAssignmentId ? "Assignment updated." : "Assignment created."
              );
            }}
          >
            <Field label="Facility">
              <SelectInput value={assignmentForm.facilityId} onChange={(event) => setAssignmentForm({ ...assignmentForm, facilityId: event.target.value, buildingId: "", floorId: "", zoneId: "", roomId: "" })} required disabled={!canWrite}>
                <option value="">Select a facility</option>
                {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Building">
              <SelectInput value={assignmentForm.buildingId} onChange={(event) => setAssignmentForm({ ...assignmentForm, buildingId: event.target.value, floorId: "", zoneId: "", roomId: "" })} disabled={!canWrite || !assignmentForm.facilityId}>
                <option value="">Facility-level</option>
                {filteredBuildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Floor">
              <SelectInput value={assignmentForm.floorId} onChange={(event) => setAssignmentForm({ ...assignmentForm, floorId: event.target.value, zoneId: "", roomId: "" })} disabled={!canWrite || !assignmentForm.buildingId}>
                <option value="">No floor</option>
                {filteredFloors.map((floor) => <option key={floor.id} value={floor.id}>{floor.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Zone">
              <SelectInput value={assignmentForm.zoneId} onChange={(event) => setAssignmentForm({ ...assignmentForm, zoneId: event.target.value, roomId: "" })} disabled={!canWrite || !assignmentForm.floorId}>
                <option value="">No zone</option>
                {filteredZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Room">
              <SelectInput value={assignmentForm.roomId} onChange={(event) => setAssignmentForm({ ...assignmentForm, roomId: event.target.value })} disabled={!canWrite || !assignmentForm.floorId}>
                <option value="">No room</option>
                {filteredRooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Contact">
              <SelectInput value={assignmentForm.contactId} onChange={(event) => setAssignmentForm({ ...assignmentForm, contactId: event.target.value })} required disabled={!canWrite}>
                <option value="">Select a contact</option>
                {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Role">
              <SelectInput value={assignmentForm.contactRoleId} onChange={(event) => setAssignmentForm({ ...assignmentForm, contactRoleId: event.target.value })} required disabled={!canWrite}>
                <option value="">Select a role</option>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Escalation Priority" helper="Leave blank to auto-assign the next priority for this role and facility.">
              <TextInput value={assignmentForm.escalationPriority} onChange={(event) => setAssignmentForm({ ...assignmentForm, escalationPriority: event.target.value })} type="number" min={1} max={99} disabled={!canWrite} />
            </Field>
            <Field label="Primary Assignment">
              <SelectInput value={assignmentForm.isPrimary ? "true" : "false"} onChange={(event) => setAssignmentForm({ ...assignmentForm, isPrimary: event.target.value === "true" })} disabled={!canWrite}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput value={assignmentForm.status} onChange={(event) => setAssignmentForm({ ...assignmentForm, status: event.target.value })} disabled={!canWrite}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </Field>
            <div className="fi-form-actions">
              <Button type="submit" disabled={!canWrite}>{selectedAssignmentId ? "Save Assignment" : "Create Assignment"}</Button>
              {selectedAssignmentId ? (
                <Button type="button" variant="danger" disabled={!canWrite} onClick={() => {
                  if (window.confirm("Archive this assignment?")) {
                    void runMutation(() => apiRequest(`/api/contacts/assignments/${selectedAssignmentId}/archive`, { method: "POST" }, token), "Assignment archived.");
                  }
                }}>Archive</Button>
              ) : null}
            </div>
          </form>
        </div>
      </SectionCard>

      <SectionCard title="Selected Detail" description="Summary for the currently selected contact, role, or assignment">
        <div className="fi-two-column">
          <SectionCard title="Contact Detail" description="Currently selected contact metadata">
            {selectedContact ? (
              <EmptyState
                title={selectedContact.name}
                description={`${selectedContact.firstName} ${selectedContact.lastName} - ${selectedContact.assignmentCount} assignments`}
              />
            ) : (
              <EmptyState title="No contact selected" description="Select a contact row to inspect the detail summary." />
            )}
          </SectionCard>
          <SectionCard title="Role Detail" description="Currently selected role metadata">
            {selectedRole ? (
              <EmptyState
                title={selectedRole.name}
                description={`${selectedRole.assignmentCount} assignments - ${selectedRole.status}`}
              />
            ) : (
              <EmptyState title="No role selected" description="Select a role row to inspect the detail summary." />
            )}
          </SectionCard>
        </div>
        {selectedAssignment ? (
          <SectionCard title="Assignment Detail" description="Currently selected escalation link">
            <DataTable
              rows={[selectedAssignment]}
              columns={[
                { key: "facility", header: "Facility", render: (row) => row.facilityName },
                { key: "scope", header: "Scope", render: (row) => buildScopeLabel(row) },
                { key: "contact", header: "Contact", render: (row) => row.contactName },
                { key: "role", header: "Role", render: (row) => row.contactRoleName },
                { key: "priority", header: "Priority", render: (row) => row.escalationPriority ?? "Auto" }
              ]}
            />
          </SectionCard>
        ) : null}
      </SectionCard>

      {loading ? <p className="fi-muted">Loading contacts...</p> : null}
    </div>
  );
}
