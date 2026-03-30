import { useEffect, useRef, useState } from "react";
import { PanelMessage } from "@facility/ui";
import { ApiError, apiRequest } from "../../app/api";
import {
  blankIncidentForm,
  blankRiskItemForm,
  type BootstrapPayload,
  type IncidentFormState,
  type LocationBootstrap,
  type RiskItemFormState,
  toIncidentForm,
  toRiskItemForm
} from "./readinessModels";
import { ReadinessWorkspace } from "./ReadinessWorkspace";

function scopeKey(selection: { facilityId?: string | null; buildingId?: string | null; floorId?: string | null }) {
  return `${selection.facilityId ?? ""}|${selection.buildingId ?? ""}|${selection.floorId ?? ""}`;
}

export function ReadinessPage({ token, hasWriteAccess }: { token: string; hasWriteAccess: boolean }) {
  const [locationData, setLocationData] = useState<LocationBootstrap | null>(null);
  const [readinessData, setReadinessData] = useState<BootstrapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [selectedRiskItemId, setSelectedRiskItemId] = useState("");
  const [selectedScoreId, setSelectedScoreId] = useState("");
  const [incidentForm, setIncidentForm] = useState<IncidentFormState>(blankIncidentForm);
  const [riskItemForm, setRiskItemForm] = useState<RiskItemFormState>(blankRiskItemForm);
  const loadedScopeRef = useRef("");

  async function loadWorkspace(selection?: { facilityId?: string; buildingId?: string; floorId?: string }) {
    const query = new URLSearchParams();
    if (selection?.facilityId) {
      query.set("facilityId", selection.facilityId);
    }
    if (selection?.buildingId) {
      query.set("buildingId", selection.buildingId);
    }
    if (selection?.floorId) {
      query.set("floorId", selection.floorId);
    }

    const queryString = query.size > 0 ? `?${query.toString()}` : "";
    const [locationResponse, readinessResponse] = await Promise.all([
      apiRequest<{ data: LocationBootstrap }>("/api/locations/bootstrap", {}, token),
      apiRequest<{ data: BootstrapPayload }>(`/api/readiness/bootstrap${queryString}`, {}, token)
    ]);

    setLocationData(locationResponse.data);
    setReadinessData(readinessResponse.data);

    const nextSelection = readinessResponse.data.selection;
    loadedScopeRef.current = scopeKey(nextSelection);
    setSelectedFacilityId(nextSelection.facilityId ?? "");
    setSelectedBuildingId(nextSelection.buildingId ?? "");
    setSelectedFloorId(nextSelection.floorId ?? "");
  }

  useEffect(() => {
    setLoading(true);
    void loadWorkspace()
      .catch((error: unknown) => {
        setMessage(error instanceof ApiError ? error.message : "Unable to load readiness workspace.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!locationData || loading || !selectedFacilityId) {
      return;
    }

    const nextKey = scopeKey({
      facilityId: selectedFacilityId,
      buildingId: selectedBuildingId,
      floorId: selectedFloorId
    });

    if (nextKey === loadedScopeRef.current) {
      return;
    }

    const selection: { facilityId?: string; buildingId?: string; floorId?: string } = {};
    if (selectedFacilityId) {
      selection.facilityId = selectedFacilityId;
    }
    if (selectedBuildingId) {
      selection.buildingId = selectedBuildingId;
    }
    if (selectedFloorId) {
      selection.floorId = selectedFloorId;
    }

    void loadWorkspace(selection).catch((error: unknown) => {
      setMessage(error instanceof ApiError ? error.message : "Unable to refresh readiness workspace.");
    });
  }, [selectedFacilityId, selectedBuildingId, selectedFloorId, locationData, loading, token]);

  useEffect(() => {
    const selectedIncident = readinessData?.lists.incidents.find((record) => record.id === selectedIncidentId) ?? null;
    if (selectedIncident) {
      setIncidentForm(toIncidentForm(selectedIncident));
      return;
    }

    if (!selectedIncidentId) {
      setIncidentForm(blankIncidentForm);
    }
  }, [readinessData, selectedIncidentId]);

  useEffect(() => {
    const selectedRiskItem = readinessData?.lists.riskItems.find((record) => record.id === selectedRiskItemId) ?? null;
    if (selectedRiskItem) {
      setRiskItemForm(toRiskItemForm(selectedRiskItem));
      return;
    }

    if (!selectedRiskItemId) {
      setRiskItemForm(blankRiskItemForm);
    }
  }, [readinessData, selectedRiskItemId]);

  useEffect(() => {
    if (selectedScoreId && !readinessData?.lists.readinessScores.some((record) => record.id === selectedScoreId)) {
      setSelectedScoreId("");
    }
  }, [readinessData, selectedScoreId]);

  if (loading) {
    return <PanelMessage tone="info" title="Loading readiness workspace">Fetching readiness scores, incidents, risk items, and location context.</PanelMessage>;
  }

  if (message && !readinessData) {
    return <PanelMessage tone="warning" title="Readiness workspace unavailable">{message}</PanelMessage>;
  }

  return (
    <ReadinessWorkspace
      token={token}
      hasWriteAccess={hasWriteAccess}
      message={message}
      setMessage={setMessage}
      locationData={locationData}
      readinessData={readinessData}
      loadWorkspace={loadWorkspace}
      selectedFacilityId={selectedFacilityId}
      setSelectedFacilityId={setSelectedFacilityId}
      selectedBuildingId={selectedBuildingId}
      setSelectedBuildingId={setSelectedBuildingId}
      selectedFloorId={selectedFloorId}
      setSelectedFloorId={setSelectedFloorId}
      selectedIncidentId={selectedIncidentId}
      setSelectedIncidentId={setSelectedIncidentId}
      selectedRiskItemId={selectedRiskItemId}
      setSelectedRiskItemId={setSelectedRiskItemId}
      selectedScoreId={selectedScoreId}
      setSelectedScoreId={setSelectedScoreId}
      incidentForm={incidentForm}
      setIncidentForm={setIncidentForm}
      riskItemForm={riskItemForm}
      setRiskItemForm={setRiskItemForm}
      clearEditors={() => {
        setSelectedIncidentId("");
        setSelectedRiskItemId("");
        setSelectedScoreId("");
        setIncidentForm(blankIncidentForm);
        setRiskItemForm(blankRiskItemForm);
      }}
    />
  );
}
