import { Badge, Button, DataTable, DefinitionList, EmptyState, Field, PageHeader, PanelMessage, SectionCard, SelectInput, StatStrip, TextareaInput, TextInput } from "@facility/ui";
import { ApiError, apiRequest } from "../../app/api";
import {
  detailLocationLabel,
  facilityLabel,
  formatDateTime,
  formatScoreDetails,
  fromDateTimeLocal,
  nullableNumber,
  nullableString,
  scoreLabel,
  scoreTone,
  toIncidentForm,
  toRiskItemForm,
  toneForSeverity,
  toneForStatus,
  type BootstrapPayload,
  type IncidentFormState,
  type IncidentRecord,
  type LocationBootstrap,
  type ReadinessScoreRecord,
  type RiskItemFormState,
  type RiskItemRecord
} from "./readinessModels";

type Setter<T> = (value: T) => void;

interface Props {
  token: string;
  hasWriteAccess: boolean;
  message: string | null;
  setMessage: Setter<string | null>;
  locationData: LocationBootstrap | null;
  readinessData: BootstrapPayload | null;
  loadWorkspace: (selection?: { facilityId?: string; buildingId?: string; floorId?: string }) => Promise<void>;
  selectedFacilityId: string;
  setSelectedFacilityId: Setter<string>;
  selectedBuildingId: string;
  setSelectedBuildingId: Setter<string>;
  selectedFloorId: string;
  setSelectedFloorId: Setter<string>;
  selectedIncidentId: string;
  setSelectedIncidentId: Setter<string>;
  selectedRiskItemId: string;
  setSelectedRiskItemId: Setter<string>;
  selectedScoreId: string;
  setSelectedScoreId: Setter<string>;
  incidentForm: IncidentFormState;
  setIncidentForm: Setter<IncidentFormState>;
  riskItemForm: RiskItemFormState;
  setRiskItemForm: Setter<RiskItemFormState>;
  clearEditors: () => void;
}

function locationName(record: { code: string | null; name: string }) {
  return record.code ? `${record.name} (${record.code})` : record.name;
}

function roomLabel(record: { code: string | null; name: string; roomNumber: string | null }) {
  return record.roomNumber ? `${record.name} (${record.roomNumber})` : locationName(record);
}

function updateErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function scoreLocation(record: ReadinessScoreRecord) {
  return detailLocationLabel({
    facilityName: record.facilityName,
    buildingName: record.buildingName,
    floorName: record.floorName,
    zoneName: null,
    roomName: null,
    roomNumber: null
  });
}

function matchesScopedLocation(
  record: { facilityId: string; buildingId: string | null; floorId: string | null },
  selection: { facilityId: string; buildingId: string; floorId: string }
) {
  if (selection.facilityId && record.facilityId !== selection.facilityId) {
    return false;
  }

  if (selection.floorId) {
    return record.floorId === selection.floorId || (record.floorId === null && (!selection.buildingId || record.buildingId === selection.buildingId || record.buildingId === null));
  }

  if (selection.buildingId) {
    return record.buildingId === selection.buildingId || record.buildingId === null;
  }

  return true;
}

export function ReadinessWorkspace(props: Props) {
  const activeSelection = {
    facilityId: props.selectedFacilityId,
    buildingId: props.selectedBuildingId,
    floorId: props.selectedFloorId
  };
  const facilities = props.locationData?.lists.facilities ?? [];
  const buildings = props.locationData?.lists.buildings ?? [];
  const floors = props.locationData?.lists.floors ?? [];
  const zones = props.locationData?.lists.zones ?? [];
  const rooms = props.locationData?.lists.rooms ?? [];
  const incidents = props.readinessData?.lists.incidents ?? [];
  const riskItems = props.readinessData?.lists.riskItems ?? [];
  const readinessScores = props.readinessData?.lists.readinessScores ?? [];

  const selectedFacility = facilities.find((record) => record.id === props.selectedFacilityId) ?? null;
  const selectedBuilding = buildings.find((record) => record.id === props.selectedBuildingId) ?? null;
  const selectedFloor = floors.find((record) => record.id === props.selectedFloorId) ?? null;
  const selectedIncident = incidents.find((record) => record.id === props.selectedIncidentId) ?? null;
  const selectedRiskItem = riskItems.find((record) => record.id === props.selectedRiskItemId) ?? null;
  const selectedScore = readinessScores.find((record) => record.id === props.selectedScoreId) ?? props.readinessData?.latestReadinessScore ?? null;

  const filteredBuildings = buildings.filter((record) => !props.selectedFacilityId || record.facilityId === props.selectedFacilityId);
  const filteredFloors = floors.filter((record) => !props.selectedBuildingId || record.buildingId === props.selectedBuildingId);
  const filteredIncidents = incidents.filter((record) => matchesScopedLocation(record, activeSelection));
  const scopedRiskItems = riskItems.filter((record) => matchesScopedLocation(record, activeSelection));
  const filteredRiskItems = scopedRiskItems.filter((record) => !record.isSystemGenerated);
  const filteredScores = readinessScores.filter((record) => matchesScopedLocation(record, activeSelection));
  const incidentBuildings = buildings.filter((record) => !props.selectedFacilityId || record.facilityId === props.selectedFacilityId);
  const incidentFloors = floors.filter((record) => !props.incidentForm.buildingId || record.buildingId === props.incidentForm.buildingId);
  const incidentZones = zones.filter(
    (record) =>
      (!props.selectedFacilityId || record.facilityId === props.selectedFacilityId) &&
      (!props.incidentForm.buildingId || record.buildingId === props.incidentForm.buildingId) &&
      (!props.incidentForm.floorId || record.floorId === props.incidentForm.floorId)
  );
  const incidentRooms = rooms.filter(
    (record) =>
      (!props.selectedFacilityId || record.facilityId === props.selectedFacilityId) &&
      (!props.incidentForm.buildingId || record.buildingId === props.incidentForm.buildingId) &&
      (!props.incidentForm.floorId || record.floorId === props.incidentForm.floorId) &&
      (!props.incidentForm.zoneId || record.zoneId === props.incidentForm.zoneId)
  );
  const riskBuildings = buildings.filter((record) => !props.selectedFacilityId || record.facilityId === props.selectedFacilityId);
  const riskFloors = floors.filter((record) => !props.riskItemForm.buildingId || record.buildingId === props.riskItemForm.buildingId);
  const riskZones = zones.filter(
    (record) =>
      (!props.selectedFacilityId || record.facilityId === props.selectedFacilityId) &&
      (!props.riskItemForm.buildingId || record.buildingId === props.riskItemForm.buildingId) &&
      (!props.riskItemForm.floorId || record.floorId === props.riskItemForm.floorId)
  );
  const riskRooms = rooms.filter(
    (record) =>
      (!props.selectedFacilityId || record.facilityId === props.selectedFacilityId) &&
      (!props.riskItemForm.buildingId || record.buildingId === props.riskItemForm.buildingId) &&
      (!props.riskItemForm.floorId || record.floorId === props.riskItemForm.floorId) &&
      (!props.riskItemForm.zoneId || record.zoneId === props.riskItemForm.zoneId)
  );

  async function runMutation<T>(work: () => Promise<T>, successMessage: string) {
    try {
      await work();
      const selection: { facilityId?: string; buildingId?: string; floorId?: string } = {};
      if (props.selectedFacilityId) {
        selection.facilityId = props.selectedFacilityId;
      }
      if (props.selectedBuildingId) {
        selection.buildingId = props.selectedBuildingId;
      }
      if (props.selectedFloorId) {
        selection.floorId = props.selectedFloorId;
      }
      await props.loadWorkspace(selection);
      props.setMessage(successMessage);
    } catch (error: unknown) {
      props.setMessage(updateErrorMessage(error, "Unable to save readiness changes."));
    }
  }

  function recalculateReadiness() {
    if (!props.selectedFacilityId) {
      props.setMessage("Select a facility before recalculating readiness.");
      return;
    }

    void runMutation(
      () =>
        apiRequest(
          "/api/readiness/recalculate",
          { method: "POST", body: JSON.stringify({ facilityId: props.selectedFacilityId, buildingId: nullableString(props.selectedBuildingId), floorId: nullableString(props.selectedFloorId), archiveExistingSystemRiskItems: true }) },
          props.token
        ),
      "Readiness recalculation requested."
    );
  }

  return (
    <div className="fi-page-stack">
      <PageHeader
        title="Risk and Readiness"
        description="Monitor readiness scores, active incidents, and manual risk items from the enterprise admin shell."
        actions={
          <div className="fi-form-actions">
            <Button type="button" variant="secondary" onClick={recalculateReadiness} disabled={!props.hasWriteAccess || !props.selectedFacilityId}>Recalculate readiness</Button>
            <Button type="button" variant="secondary" onClick={props.clearEditors}>Reset editors</Button>
          </div>
        }
      />

      <StatStrip
        items={[
          { label: "Facilities", value: props.readinessData?.summary.facilities ?? facilities.length },
          { label: "Scores", value: props.readinessData?.summary.readinessScores ?? readinessScores.length },
          { label: "Active incidents", value: props.readinessData?.summary.activeIncidents ?? incidents.length, tone: "warning" },
          { label: "Active risks", value: props.readinessData?.summary.activeRiskItems ?? riskItems.length, tone: "danger" },
          { label: "Critical risks", value: props.readinessData?.summary.criticalRiskItems ?? 0, tone: "danger" },
          { label: "Recalculations", value: props.readinessData?.summary.recalculations ?? 0, tone: "default" }
        ]}
      />

      {props.message ? <PanelMessage tone={props.message.toLowerCase().includes("unable") ? "warning" : "info"} title="Workspace message">{props.message}</PanelMessage> : null}

      {!props.hasWriteAccess ? <PanelMessage tone="info" title="Read-only access">You can review readiness intelligence, but create, edit, archive, and recalculation actions are disabled.</PanelMessage> : null}

      <SectionCard title="Location Context" description="Select the facility, building, and floor that define the readiness review surface.">
        <div className="fi-form-grid">
          <Field label="Facility">
            <SelectInput value={props.selectedFacilityId} onChange={(event) => {
              props.setSelectedFacilityId(event.target.value);
              props.setSelectedBuildingId("");
              props.setSelectedFloorId("");
              props.setSelectedIncidentId("");
              props.setSelectedRiskItemId("");
              props.setSelectedScoreId("");
            }}>
              <option value="">Select facility</option>
              {facilities.map((record) => <option key={record.id} value={record.id}>{facilityLabel(record)}</option>)}
            </SelectInput>
          </Field>
          <Field label="Building">
            <SelectInput value={props.selectedBuildingId} onChange={(event) => {
              props.setSelectedBuildingId(event.target.value);
              props.setSelectedFloorId("");
              props.setSelectedIncidentId("");
              props.setSelectedRiskItemId("");
              props.setSelectedScoreId("");
            }}>
              <option value="">Select building</option>
              {filteredBuildings.map((record) => <option key={record.id} value={record.id}>{locationName(record)}</option>)}
            </SelectInput>
          </Field>
          <Field label="Floor">
            <SelectInput value={props.selectedFloorId} onChange={(event) => {
              props.setSelectedFloorId(event.target.value);
              props.setSelectedIncidentId("");
              props.setSelectedRiskItemId("");
              props.setSelectedScoreId("");
            }}>
              <option value="">Select floor</option>
              {filteredFloors.map((record) => <option key={record.id} value={record.id}>{locationName(record)}</option>)}
            </SelectInput>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Readiness Overview" description="Operational summary for the selected location context.">
        <DefinitionList items={[
          { label: "Facility", value: selectedFacility ? facilityLabel(selectedFacility) : "Not selected" },
          { label: "Building", value: selectedBuilding ? locationName(selectedBuilding) : "Not selected" },
          { label: "Floor", value: selectedFloor ? locationName(selectedFloor) : "Not selected" },
          { label: "Current readiness score", value: scoreLabel(selectedScore?.score ?? null) },
          { label: "Score version", value: selectedScore?.calculationVersion ?? "Not set" }
        ]} />
        <StatStrip items={[
          { label: "High readiness", value: filteredScores.filter((record) => (record.score ?? 0) >= 85).length, tone: "success" },
          { label: "Stable readiness", value: filteredScores.filter((record) => (record.score ?? 0) >= 70 && (record.score ?? 0) < 85).length, tone: "default" },
          { label: "Elevated risk", value: filteredScores.filter((record) => (record.score ?? 0) >= 50 && (record.score ?? 0) < 70).length, tone: "warning" },
          { label: "At risk", value: filteredScores.filter((record) => (record.score ?? 0) < 50).length, tone: "danger" }
        ]} />
      </SectionCard>

      <SectionCard title="Readiness Scores" description="Review facility, building, and floor scores with recalculation details.">
        <div className="fi-two-column">
          <DataTable
            rows={filteredScores}
            onRowClick={(record) => {
              props.setSelectedFacilityId(record.facilityId);
              props.setSelectedBuildingId(record.buildingId ?? "");
              props.setSelectedFloorId(record.floorId ?? "");
              props.setSelectedScoreId(record.id);
              props.setSelectedIncidentId("");
              props.setSelectedRiskItemId("");
            }}
            empty={<EmptyState title="No readiness scores" description={props.selectedFloorId ? "Run a recalculation for this floor." : "Select a floor first."} />}
            columns={[
              { key: "score", header: "Score", render: (record) => <Badge tone={scoreTone(record.score)}>{scoreLabel(record.score)}</Badge> },
              { key: "scope", header: "Location", render: (record) => scoreLocation(record) },
              { key: "incidents", header: "Incidents", render: (record) => record.activeIncidentCount },
              { key: "risks", header: "Risk items", render: (record) => record.activeRiskItemCount },
              { key: "recalculatedAt", header: "Recalculated", render: (record) => formatDateTime(record.recalculatedAt) }
            ]}
          />
          {selectedScore ? (
            <div className="fi-page-stack">
              <DefinitionList items={[
                { label: "Location", value: scoreLocation(selectedScore) },
                { label: "Score", value: scoreLabel(selectedScore.score) },
                { label: "Version", value: selectedScore.calculationVersion ?? "Not set" },
                { label: "Coverage assessments", value: selectedScore.coverageAssessmentCount },
                { label: "Active incidents", value: selectedScore.activeIncidentCount },
                { label: "Active risk items", value: selectedScore.activeRiskItemCount },
                { label: "Recalculated", value: formatDateTime(selectedScore.recalculatedAt) },
                { label: "Status", value: <Badge tone={toneForStatus(selectedScore.status)}>{selectedScore.status}</Badge> }
              ]} />
              <PanelMessage tone="info" title="Score details">
                <pre className="fi-code-block">{formatScoreDetails(selectedScore.scoreDetails)}</pre>
              </PanelMessage>
              <div className="fi-form-actions">
                <Button type="button" variant="secondary" disabled={!props.hasWriteAccess || !props.selectedFacilityId} onClick={recalculateReadiness}>Recalculate now</Button>
              </div>
            </div>
          ) : <EmptyState title="Select a readiness score" description="Choose a row to inspect score details and recalculation options." />}
        </div>
      </SectionCard>

      <SectionCard title="Incidents" description="Track active incidents by location, severity, and resolution state.">
        <div className="fi-two-column">
          <DataTable
            rows={filteredIncidents}
            onRowClick={(record) => {
              props.setSelectedFacilityId(record.facilityId);
              props.setSelectedBuildingId(record.buildingId ?? "");
              props.setSelectedFloorId(record.floorId ?? "");
              props.setSelectedIncidentId(record.id);
              props.setSelectedRiskItemId("");
              props.setIncidentForm(toIncidentForm(record));
            }}
            empty={<EmptyState title="No incidents" description={props.selectedFacilityId ? "Create the first incident for this location scope." : "Select a facility first."} />}
            columns={[
              { key: "name", header: "Incident", render: (record) => record.name },
              { key: "type", header: "Type", render: (record) => record.incidentType ?? "Not set" },
              { key: "severity", header: "Severity", render: (record) => <Badge tone={toneForSeverity(record.severity)}>{record.severity}</Badge> },
              { key: "status", header: "Status", render: (record) => <Badge tone={toneForStatus(record.status)}>{record.status}</Badge> }
            ]}
          />

          <form className="fi-form-grid" onSubmit={(event) => {
            event.preventDefault();
            if (!props.selectedFacilityId) {
              props.setMessage("Select a facility before saving an incident.");
              return;
            }

            let reportedAt: string;
            let resolvedAt: string | null;
            try {
              reportedAt = fromDateTimeLocal(props.incidentForm.reportedAt);
              resolvedAt = props.incidentForm.resolvedAt.trim() === "" ? null : fromDateTimeLocal(props.incidentForm.resolvedAt);
            } catch (error: unknown) {
              props.setMessage(error instanceof Error ? error.message : "Invalid incident timestamp.");
              return;
            }

            void runMutation(
              () => apiRequest(
                props.selectedIncidentId ? `/api/readiness/incidents/${props.selectedIncidentId}` : "/api/readiness/incidents",
                {
                  method: props.selectedIncidentId ? "PATCH" : "POST",
                  body: JSON.stringify(props.selectedIncidentId ? { ...props.incidentForm, buildingId: nullableString(props.incidentForm.buildingId), floorId: nullableString(props.incidentForm.floorId), zoneId: nullableString(props.incidentForm.zoneId), roomId: nullableString(props.incidentForm.roomId), code: nullableString(props.incidentForm.code), incidentType: nullableString(props.incidentForm.incidentType), resolutionSummary: nullableString(props.incidentForm.resolutionSummary), notes: nullableString(props.incidentForm.notes), reportedAt, resolvedAt } : { facilityId: props.selectedFacilityId, name: props.incidentForm.name, code: nullableString(props.incidentForm.code), buildingId: nullableString(props.incidentForm.buildingId), floorId: nullableString(props.incidentForm.floorId), zoneId: nullableString(props.incidentForm.zoneId), roomId: nullableString(props.incidentForm.roomId), incidentType: nullableString(props.incidentForm.incidentType), severity: props.incidentForm.severity, reportedAt, resolvedAt, resolutionSummary: nullableString(props.incidentForm.resolutionSummary), notes: nullableString(props.incidentForm.notes), status: props.incidentForm.status })
                },
                props.token
              ),
              props.selectedIncidentId ? "Incident updated." : "Incident created."
            );
          }}>
            <Field label="Incident name"><TextInput value={props.incidentForm.name} onChange={(event) => props.setIncidentForm({ ...props.incidentForm, name: event.target.value })} required disabled={!props.selectedFacilityId} /></Field>
            <Field label="Code"><TextInput value={props.incidentForm.code} onChange={(event) => props.setIncidentForm({ ...props.incidentForm, code: event.target.value })} disabled={!props.selectedFacilityId} /></Field>
            <Field label="Type"><TextInput value={props.incidentForm.incidentType} onChange={(event) => props.setIncidentForm({ ...props.incidentForm, incidentType: event.target.value })} disabled={!props.selectedFacilityId} /></Field>
            <Field label="Severity"><SelectInput value={props.incidentForm.severity} onChange={(event) => props.setIncidentForm({ ...props.incidentForm, severity: event.target.value })} disabled={!props.selectedFacilityId}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option><option value="critical">Critical</option></SelectInput></Field>
            <Field label="Building"><SelectInput value={props.incidentForm.buildingId} onChange={(event) => props.setIncidentForm({ ...props.incidentForm, buildingId: event.target.value, floorId: "", zoneId: "", roomId: "" })} disabled={!props.selectedFacilityId}><option value="">No building</option>{incidentBuildings.map((record) => <option key={record.id} value={record.id}>{locationName(record)}</option>)}</SelectInput></Field>
            <Field label="Floor"><SelectInput value={props.incidentForm.floorId} onChange={(event) => props.setIncidentForm({ ...props.incidentForm, floorId: event.target.value, zoneId: "", roomId: "" })} disabled={!props.selectedFacilityId}><option value="">No floor</option>{incidentFloors.map((record) => <option key={record.id} value={record.id}>{locationName(record)}</option>)}</SelectInput></Field>
            <Field label="Zone"><SelectInput value={props.incidentForm.zoneId} onChange={(event) => props.setIncidentForm({ ...props.incidentForm, zoneId: event.target.value, roomId: "" })} disabled={!props.selectedFacilityId || !props.incidentForm.floorId}><option value="">No zone</option>{incidentZones.map((record) => <option key={record.id} value={record.id}>{locationName(record)}</option>)}</SelectInput></Field>
            <Field label="Room"><SelectInput value={props.incidentForm.roomId} onChange={(event) => props.setIncidentForm({ ...props.incidentForm, roomId: event.target.value })} disabled={!props.selectedFacilityId || !props.incidentForm.floorId}><option value="">No room</option>{incidentRooms.map((record) => <option key={record.id} value={record.id}>{roomLabel(record)}</option>)}</SelectInput></Field>
            <Field label="Reported at"><TextInput type="datetime-local" value={props.incidentForm.reportedAt} onChange={(event) => props.setIncidentForm({ ...props.incidentForm, reportedAt: event.target.value })} required disabled={!props.selectedFacilityId} /></Field>
            <Field label="Resolved at"><TextInput type="datetime-local" value={props.incidentForm.resolvedAt} onChange={(event) => props.setIncidentForm({ ...props.incidentForm, resolvedAt: event.target.value })} disabled={!props.selectedFacilityId} /></Field>
            <Field label="Resolution summary"><TextareaInput value={props.incidentForm.resolutionSummary} onChange={(event) => props.setIncidentForm({ ...props.incidentForm, resolutionSummary: event.target.value })} rows={3} disabled={!props.selectedFacilityId} /></Field>
            <Field label="Notes"><TextareaInput value={props.incidentForm.notes} onChange={(event) => props.setIncidentForm({ ...props.incidentForm, notes: event.target.value })} rows={3} disabled={!props.selectedFacilityId} /></Field>
            <Field label="Status"><SelectInput value={props.incidentForm.status} onChange={(event) => props.setIncidentForm({ ...props.incidentForm, status: event.target.value })} disabled={!props.selectedFacilityId}><option value="active">Active</option><option value="inactive">Inactive</option></SelectInput></Field>
            <div className="fi-form-actions">
              <Button type="submit" disabled={!props.hasWriteAccess || !props.selectedFacilityId}>{props.selectedIncidentId ? "Save Incident" : "Create Incident"}</Button>
              {props.selectedIncidentId ? <Button type="button" variant="danger" disabled={!props.hasWriteAccess} onClick={() => { if (window.confirm("Archive this incident?")) { void runMutation(() => apiRequest(`/api/readiness/incidents/${props.selectedIncidentId}/archive`, { method: "POST" }, props.token), "Incident archived."); } }}>Archive</Button> : null}
            </div>
          </form>
        </div>
        {selectedIncident ? <DefinitionList items={[{ label: "Location", value: detailLocationLabel(selectedIncident) }, { label: "Severity", value: <Badge tone={toneForSeverity(selectedIncident.severity)}>{selectedIncident.severity}</Badge> }, { label: "Reported", value: formatDateTime(selectedIncident.reportedAt) }, { label: "Resolved", value: formatDateTime(selectedIncident.resolvedAt) }, { label: "Resolution", value: selectedIncident.resolutionSummary ?? "Not set" }, { label: "Status", value: <Badge tone={toneForStatus(selectedIncident.status)}>{selectedIncident.status}</Badge> }]} /> : null}
      </SectionCard>

      <SectionCard title="Manual Risk Items" description="Track manually curated or system-informed risk items without detaching them from location context.">
        <div className="fi-two-column">
          <DataTable
            rows={filteredRiskItems}
            onRowClick={(record) => {
              props.setSelectedFacilityId(record.facilityId);
              props.setSelectedBuildingId(record.buildingId ?? "");
              props.setSelectedFloorId(record.floorId ?? "");
              props.setSelectedRiskItemId(record.id);
              props.setSelectedIncidentId("");
              props.setRiskItemForm(toRiskItemForm(record));
            }}
            empty={<EmptyState title="No risk items" description={props.selectedFacilityId ? "Create the first risk item for this location scope." : "Select a facility first."} />}
            columns={[
              { key: "name", header: "Risk Item", render: (record) => record.name },
              { key: "category", header: "Category", render: (record) => record.category },
              { key: "severity", header: "Severity", render: (record) => <Badge tone={toneForSeverity(record.severity)}>{record.severity}</Badge> },
              { key: "score", header: "Score", render: (record) => scoreLabel(record.score) },
              { key: "status", header: "Status", render: (record) => <Badge tone={toneForStatus(record.status)}>{record.status}</Badge> }
            ]}
          />
          <form className="fi-form-grid" onSubmit={(event) => {
            event.preventDefault();
            if (!props.selectedFacilityId) {
              props.setMessage("Select a facility before saving a risk item.");
              return;
            }

            void runMutation(
              () => apiRequest(
                props.selectedRiskItemId ? `/api/readiness/risk-items/${props.selectedRiskItemId}` : "/api/readiness/risk-items",
                {
                  method: props.selectedRiskItemId ? "PATCH" : "POST",
                  body: JSON.stringify(props.selectedRiskItemId ? { ...props.riskItemForm, buildingId: nullableString(props.riskItemForm.buildingId), floorId: nullableString(props.riskItemForm.floorId), zoneId: nullableString(props.riskItemForm.zoneId), roomId: nullableString(props.riskItemForm.roomId), code: nullableString(props.riskItemForm.code), score: nullableNumber(props.riskItemForm.score), scoreReason: nullableString(props.riskItemForm.scoreReason), sourceReferenceId: nullableString(props.riskItemForm.sourceReferenceId), sourceType: "manual", isSystemGenerated: false, notes: nullableString(props.riskItemForm.notes) } : { facilityId: props.selectedFacilityId, name: props.riskItemForm.name, code: nullableString(props.riskItemForm.code), buildingId: nullableString(props.riskItemForm.buildingId), floorId: nullableString(props.riskItemForm.floorId), zoneId: nullableString(props.riskItemForm.zoneId), roomId: nullableString(props.riskItemForm.roomId), category: props.riskItemForm.category, severity: props.riskItemForm.severity, score: nullableNumber(props.riskItemForm.score), scoreReason: nullableString(props.riskItemForm.scoreReason), sourceType: "manual", sourceReferenceId: nullableString(props.riskItemForm.sourceReferenceId), isSystemGenerated: false, notes: nullableString(props.riskItemForm.notes), status: props.riskItemForm.status })
                },
                props.token
              ),
              props.selectedRiskItemId ? "Risk item updated." : "Risk item created."
            );
          }}>
            <Field label="Risk item name"><TextInput value={props.riskItemForm.name} onChange={(event) => props.setRiskItemForm({ ...props.riskItemForm, name: event.target.value })} required disabled={!props.selectedFacilityId} /></Field>
            <Field label="Code"><TextInput value={props.riskItemForm.code} onChange={(event) => props.setRiskItemForm({ ...props.riskItemForm, code: event.target.value })} disabled={!props.selectedFacilityId} /></Field>
            <Field label="Category"><TextInput value={props.riskItemForm.category} onChange={(event) => props.setRiskItemForm({ ...props.riskItemForm, category: event.target.value })} required disabled={!props.selectedFacilityId} /></Field>
            <Field label="Severity"><SelectInput value={props.riskItemForm.severity} onChange={(event) => props.setRiskItemForm({ ...props.riskItemForm, severity: event.target.value })} disabled={!props.selectedFacilityId}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option><option value="critical">Critical</option></SelectInput></Field>
            <Field label="Score"><TextInput type="number" min="0" max="100" step="1" value={props.riskItemForm.score} onChange={(event) => props.setRiskItemForm({ ...props.riskItemForm, score: event.target.value })} disabled={!props.selectedFacilityId} /></Field>
            <Field label="Source type"><SelectInput value="manual" disabled><option value="manual">Manual</option></SelectInput></Field>
            <Field label="Source reference"><TextInput value={props.riskItemForm.sourceReferenceId} onChange={(event) => props.setRiskItemForm({ ...props.riskItemForm, sourceReferenceId: event.target.value })} disabled={!props.selectedFacilityId} /></Field>
            <Field label="Building"><SelectInput value={props.riskItemForm.buildingId} onChange={(event) => props.setRiskItemForm({ ...props.riskItemForm, buildingId: event.target.value, floorId: "", zoneId: "", roomId: "" })} disabled={!props.selectedFacilityId}><option value="">No building</option>{riskBuildings.map((record) => <option key={record.id} value={record.id}>{locationName(record)}</option>)}</SelectInput></Field>
            <Field label="Floor"><SelectInput value={props.riskItemForm.floorId} onChange={(event) => props.setRiskItemForm({ ...props.riskItemForm, floorId: event.target.value, zoneId: "", roomId: "" })} disabled={!props.selectedFacilityId}><option value="">No floor</option>{riskFloors.map((record) => <option key={record.id} value={record.id}>{locationName(record)}</option>)}</SelectInput></Field>
            <Field label="Zone"><SelectInput value={props.riskItemForm.zoneId} onChange={(event) => props.setRiskItemForm({ ...props.riskItemForm, zoneId: event.target.value, roomId: "" })} disabled={!props.selectedFacilityId || !props.riskItemForm.floorId}><option value="">No zone</option>{riskZones.map((record) => <option key={record.id} value={record.id}>{locationName(record)}</option>)}</SelectInput></Field>
            <Field label="Room"><SelectInput value={props.riskItemForm.roomId} onChange={(event) => props.setRiskItemForm({ ...props.riskItemForm, roomId: event.target.value })} disabled={!props.selectedFacilityId || !props.riskItemForm.floorId}><option value="">No room</option>{riskRooms.map((record) => <option key={record.id} value={record.id}>{roomLabel(record)}</option>)}</SelectInput></Field>
            <Field label="Score reason"><TextareaInput value={props.riskItemForm.scoreReason} onChange={(event) => props.setRiskItemForm({ ...props.riskItemForm, scoreReason: event.target.value })} rows={3} disabled={!props.selectedFacilityId} /></Field>
            <Field label="Notes"><TextareaInput value={props.riskItemForm.notes} onChange={(event) => props.setRiskItemForm({ ...props.riskItemForm, notes: event.target.value })} rows={3} disabled={!props.selectedFacilityId} /></Field>
            <Field label="System generated"><SelectInput value="false" disabled><option value="false">No</option></SelectInput></Field>
            <Field label="Status"><SelectInput value={props.riskItemForm.status} onChange={(event) => props.setRiskItemForm({ ...props.riskItemForm, status: event.target.value })} disabled={!props.selectedFacilityId}><option value="active">Active</option><option value="inactive">Inactive</option></SelectInput></Field>
            <div className="fi-form-actions">
              <Button type="submit" disabled={!props.hasWriteAccess || !props.selectedFacilityId}>{props.selectedRiskItemId ? "Save Risk Item" : "Create Risk Item"}</Button>
              {props.selectedRiskItemId ? <Button type="button" variant="danger" disabled={!props.hasWriteAccess} onClick={() => { if (window.confirm("Archive this risk item?")) { void runMutation(() => apiRequest(`/api/readiness/risk-items/${props.selectedRiskItemId}/archive`, { method: "POST" }, props.token), "Risk item archived."); } }}>Archive</Button> : null}
            </div>
          </form>
        </div>
        {selectedRiskItem ? <DefinitionList items={[{ label: "Location", value: detailLocationLabel(selectedRiskItem) }, { label: "Category", value: selectedRiskItem.category }, { label: "Severity", value: <Badge tone={toneForSeverity(selectedRiskItem.severity)}>{selectedRiskItem.severity}</Badge> }, { label: "Score", value: scoreLabel(selectedRiskItem.score) }, { label: "Source", value: selectedRiskItem.sourceType }, { label: "System generated", value: selectedRiskItem.isSystemGenerated ? "Yes" : "No" }, { label: "Status", value: <Badge tone={toneForStatus(selectedRiskItem.status)}>{selectedRiskItem.status}</Badge> }]} /> : null}
      </SectionCard>

      <SectionCard title="Operational Reporting" description="A concise facility readout for leadership and operations review.">
        <div className="fi-two-column">
          <DefinitionList items={[
            { label: "Active incidents", value: filteredIncidents.filter((record) => record.status === "active").length },
            { label: "Resolved incidents", value: filteredIncidents.filter((record) => record.resolvedAt !== null).length },
            { label: "Active risk items", value: scopedRiskItems.filter((record) => record.status === "active").length },
            { label: "System-generated risk", value: scopedRiskItems.filter((record) => record.isSystemGenerated).length }
          ]} />
          <PanelMessage tone="info" title="Reporting note">Readiness reporting stays tied to facility context so score movement, incidents, and risk items can be reviewed together during operations.</PanelMessage>
        </div>
      </SectionCard>
    </div>
  );
}
