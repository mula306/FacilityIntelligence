import bcrypt from "bcryptjs";
import { prisma } from "./index.js";

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { code: "platform-admin" },
    update: {
      name: "Platform Administrator",
      description: "Full administrative access for bootstrap delivery.",
      permissionsJson: JSON.stringify([
        "platform:*",
        "location:*",
        "hours:*",
        "contacts:*",
        "inventory:*",
        "network:*",
        "mapping:*",
        "wifi:*",
        "coverage:*",
        "readiness:*",
        "audit:read"
      ])
    },
    create: {
      name: "Platform Administrator",
      code: "platform-admin",
      description: "Full administrative access for bootstrap delivery.",
      permissionsJson: JSON.stringify([
        "platform:*",
        "location:*",
        "hours:*",
        "contacts:*",
        "inventory:*",
        "network:*",
        "mapping:*",
        "wifi:*",
        "coverage:*",
        "readiness:*",
        "audit:read"
      ])
    }
  });

  const operationsRole = await prisma.role.upsert({
    where: { code: "operations-lead" },
    update: {
      name: "Operations Lead",
      description: "Operational access to facility and location modules.",
      permissionsJson: JSON.stringify([
        "facility:read",
        "facility:write",
        "location:read",
        "location:write",
        "hours:read",
        "hours:write",
        "contacts:read",
        "contacts:write",
        "inventory:read",
        "inventory:write",
        "network:read",
        "network:write",
        "mapping:read",
        "mapping:write",
        "wifi:read",
        "wifi:write",
        "coverage:read",
        "coverage:write",
        "readiness:read",
        "readiness:write",
        "audit:read"
      ])
    },
    create: {
      name: "Operations Lead",
      code: "operations-lead",
      description: "Operational access to facility and location modules.",
      permissionsJson: JSON.stringify([
        "facility:read",
        "facility:write",
        "location:read",
        "location:write",
        "hours:read",
        "hours:write",
        "contacts:read",
        "contacts:write",
        "inventory:read",
        "inventory:write",
        "network:read",
        "network:write",
        "mapping:read",
        "mapping:write",
        "wifi:read",
        "wifi:write",
        "coverage:read",
        "coverage:write",
        "readiness:read",
        "readiness:write",
        "audit:read"
      ])
    }
  });

  const passwordHash = await bcrypt.hash("Facility123!", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@facility.local" },
    update: {
      firstName: "Facility",
      lastName: "Admin",
      displayName: "Facility Admin",
      passwordHash
    },
    create: {
      email: "admin@facility.local",
      passwordHash,
      firstName: "Facility",
      lastName: "Admin",
      displayName: "Facility Admin"
    }
  });

  const opsUser = await prisma.user.upsert({
    where: { email: "ops@facility.local" },
    update: {
      firstName: "Operations",
      lastName: "Lead",
      displayName: "Operations Lead",
      passwordHash
    },
    create: {
      email: "ops@facility.local",
      passwordHash,
      firstName: "Operations",
      lastName: "Lead",
      displayName: "Operations Lead"
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: opsUser.id,
        roleId: operationsRole.id
      }
    },
    update: {},
    create: {
      userId: opsUser.id,
      roleId: operationsRole.id
    }
  });

  const facility = await prisma.facility.upsert({
    where: { code: "RGH" },
    update: {
      name: "Regina General Hospital",
      city: "Regina",
      region: "Saskatchewan",
      timezone: "America/Regina"
    },
    create: {
      name: "Regina General Hospital",
      code: "RGH",
      shortName: "Regina General",
      facilityType: "Hospital",
      city: "Regina",
      region: "Saskatchewan",
      countryCode: "CA",
      timezone: "America/Regina"
    }
  });

  const building = await prisma.building.upsert({
    where: {
      facilityId_code: {
        facilityId: facility.id,
        code: "MAIN"
      }
    },
    update: {
      name: "Main Building"
    },
    create: {
      facilityId: facility.id,
      name: "Main Building",
      code: "MAIN",
      buildingType: "Acute Care"
    }
  });

  const floor = await prisma.floor.upsert({
    where: {
      buildingId_floorNumber: {
        buildingId: building.id,
        floorNumber: 1
      }
    },
    update: {
      name: "Level 1"
    },
    create: {
      facilityId: facility.id,
      buildingId: building.id,
      name: "Level 1",
      code: "L1",
      floorNumber: 1,
      canvasWidth: 1200,
      canvasHeight: 800
    }
  });

  const existingPlanVersion = await prisma.floorPlanVersion.findFirst({
    where: {
      floorId: floor.id,
      name: "Base Floor Plan",
      archivedAt: null
    }
  });

  const floorPlanVersion = existingPlanVersion
    ? await prisma.floorPlanVersion.update({
        where: { id: existingPlanVersion.id },
        data: {
          versionLabel: "v1",
          assetUrl: "https://example.com/floorplans/rgh-main-l1.png",
          canvasWidth: 1200,
          canvasHeight: 800,
          source: "url",
          isCurrent: true,
          status: "active",
          notes: "Seeded baseline floor plan for mapping workflows."
        }
      })
    : await prisma.floorPlanVersion.create({
        data: {
          floorId: floor.id,
          name: "Base Floor Plan",
          versionLabel: "v1",
          assetUrl: "https://example.com/floorplans/rgh-main-l1.png",
          canvasWidth: 1200,
          canvasHeight: 800,
          source: "url",
          isCurrent: true,
          status: "active",
          notes: "Seeded baseline floor plan for mapping workflows."
        }
      });

  const zone = await prisma.zone.upsert({
    where: {
      floorId_code: {
        floorId: floor.id,
        code: "ED"
      }
    },
    update: {
      name: "Emergency Department"
    },
    create: {
      facilityId: facility.id,
      buildingId: building.id,
      floorId: floor.id,
      name: "Emergency Department",
      code: "ED",
      zoneType: "Clinical"
    }
  });

  await prisma.zone.update({
    where: { id: zone.id },
    data: {
      geometryJson: JSON.stringify({
        type: "polygon",
        points: [
          { x: 120, y: 120 },
          { x: 540, y: 120 },
          { x: 540, y: 420 },
          { x: 120, y: 420 }
        ]
      })
    }
  });

  const room = await prisma.room.upsert({
    where: {
      floorId_roomNumber: {
        floorId: floor.id,
        roomNumber: "1A-101"
      }
    },
    update: {
      name: "Triage Room 101"
    },
    create: {
      facilityId: facility.id,
      buildingId: building.id,
      floorId: floor.id,
      zoneId: zone.id,
      name: "Triage Room 101",
      code: "TRIAGE-101",
      roomNumber: "1A-101",
      roomType: "Triage",
      clinicalCriticality: "high"
    }
  });

  await prisma.room.update({
    where: { id: room.id },
    data: {
      geometryJson: JSON.stringify({
        type: "polygon",
        points: [
          { x: 180, y: 180 },
          { x: 340, y: 180 },
          { x: 340, y: 300 },
          { x: 180, y: 300 }
        ]
      })
    }
  });

  const existingAnnotation = await prisma.mapAnnotation.findFirst({
    where: {
      floorId: floor.id,
      title: "Coverage review entry point",
      archivedAt: null
    }
  });

  if (existingAnnotation) {
    await prisma.mapAnnotation.update({
      where: { id: existingAnnotation.id },
      data: {
        floorPlanVersionId: floorPlanVersion.id,
        zoneId: zone.id,
        roomId: room.id,
        annotationType: "workflow",
        severity: "moderate",
        geometryJson: JSON.stringify({
          type: "point",
          points: [{ x: 160, y: 160 }]
        }),
        status: "active",
        notes: "Seeded annotation for the mapping workspace."
      }
    });
  } else {
    await prisma.mapAnnotation.create({
      data: {
        floorId: floor.id,
        floorPlanVersionId: floorPlanVersion.id,
        zoneId: zone.id,
        roomId: room.id,
        title: "Coverage review entry point",
        annotationType: "workflow",
        severity: "moderate",
        geometryJson: JSON.stringify({
          type: "point",
          points: [{ x: 160, y: 160 }]
        }),
        status: "active",
        notes: "Seeded annotation for the mapping workspace."
      }
    });
  }

  const existingAccessPoint = await prisma.accessPoint.findFirst({
    where: {
      facilityId: facility.id,
      code: "AP-ED-01",
      archivedAt: null
    }
  });

  const accessPoint = existingAccessPoint
    ? await prisma.accessPoint.update({
        where: { id: existingAccessPoint.id },
        data: {
          buildingId: building.id,
          floorId: floor.id,
          zoneId: zone.id,
          roomId: room.id,
          name: "ED Access Point 01",
          model: "Cisco Catalyst 9120",
          macAddress: "AA:BB:CC:DD:EE:01",
          geometryJson: JSON.stringify({
            type: "point",
            points: [{ x: 260, y: 150 }]
          }),
          status: "active",
          notes: "Seeded access point for Wi-Fi scan capture workflows."
        }
      })
    : await prisma.accessPoint.create({
        data: {
          facilityId: facility.id,
          buildingId: building.id,
          floorId: floor.id,
          zoneId: zone.id,
          roomId: room.id,
          name: "ED Access Point 01",
          code: "AP-ED-01",
          model: "Cisco Catalyst 9120",
          macAddress: "AA:BB:CC:DD:EE:01",
          geometryJson: JSON.stringify({
            type: "point",
            points: [{ x: 260, y: 150 }]
          }),
          status: "active",
          notes: "Seeded access point for Wi-Fi scan capture workflows."
        }
      });

  const existingWifiSession = await prisma.wifiScanSession.findFirst({
    where: {
      facilityId: facility.id,
      code: "SCAN-L1-BASE",
      archivedAt: null
    }
  });

  const wifiSession = existingWifiSession
    ? await prisma.wifiScanSession.update({
        where: { id: existingWifiSession.id },
        data: {
          buildingId: building.id,
          floorId: floor.id,
          zoneId: zone.id,
          roomId: room.id,
          collectorUserId: opsUser.id,
          collectorDeviceLabel: "Bootstrap Scanner Tablet",
          name: "Level 1 Baseline Walk",
          startedAt: new Date("2026-03-29T15:15:00.000Z"),
          endedAt: new Date("2026-03-29T15:26:00.000Z"),
          source: "CSV_IMPORT",
          status: "active",
          notes: "Seeded Wi-Fi scan session for capture and import workflows."
        }
      })
    : await prisma.wifiScanSession.create({
        data: {
          facilityId: facility.id,
          buildingId: building.id,
          floorId: floor.id,
          zoneId: zone.id,
          roomId: room.id,
          collectorUserId: opsUser.id,
          collectorDeviceLabel: "Bootstrap Scanner Tablet",
          name: "Level 1 Baseline Walk",
          code: "SCAN-L1-BASE",
          startedAt: new Date("2026-03-29T15:15:00.000Z"),
          endedAt: new Date("2026-03-29T15:26:00.000Z"),
          source: "CSV_IMPORT",
          status: "active",
          notes: "Seeded Wi-Fi scan session for capture and import workflows."
        }
      });

  await prisma.wifiScanSample.deleteMany({
    where: {
      wifiScanSessionId: wifiSession.id
    }
  });

  await prisma.wifiScanSample.createMany({
    data: [
      {
        wifiScanSessionId: wifiSession.id,
        facilityId: facility.id,
        buildingId: building.id,
        floorId: floor.id,
        zoneId: zone.id,
        roomId: room.id,
        accessPointId: accessPoint.id,
        ssid: "FacilitySecure",
        bssid: "AA:BB:CC:DD:EE:01",
        rssi: -58,
        frequencyMHz: 5180,
        channel: 36,
        band: "BAND_5GHZ",
        sampledAt: new Date("2026-03-29T15:16:00.000Z"),
        coordinateX: 210,
        coordinateY: 205,
        status: "active"
      },
      {
        wifiScanSessionId: wifiSession.id,
        facilityId: facility.id,
        buildingId: building.id,
        floorId: floor.id,
        zoneId: zone.id,
        roomId: room.id,
        accessPointId: accessPoint.id,
        ssid: "FacilitySecure",
        bssid: "AA:BB:CC:DD:EE:01",
        rssi: -84,
        frequencyMHz: 2412,
        channel: 1,
        band: "BAND_2_4GHZ",
        sampledAt: new Date("2026-03-29T15:21:00.000Z"),
        coordinateX: 360,
        coordinateY: 245,
        status: "active"
      }
    ]
  });

  await prisma.coverageAssessment.deleteMany({
    where: {
      floorId: floor.id,
      wifiScanSessionId: wifiSession.id
    }
  });

  await prisma.coverageAssessment.createMany({
    data: [
      {
        scope: "FACILITY",
        facilityId: facility.id,
        buildingId: building.id,
        floorId: floor.id,
        wifiScanSessionId: wifiSession.id,
        band: "DEAD_ZONE",
        sampleCount: 2,
        averageRssi: -71,
        strongestRssi: -58,
        weakestRssi: -84,
        coverageScore: 28,
        confidenceScore: 0.72,
        deadZoneSampleCount: 1,
        poorSampleCount: 0,
        scoreReason: "Seeded facility-level coverage baseline shows one dead-zone sample on Level 1.",
        status: "active",
        createdBy: adminUser.id,
        updatedBy: adminUser.id
      },
      {
        scope: "FLOOR",
        facilityId: facility.id,
        buildingId: building.id,
        floorId: floor.id,
        wifiScanSessionId: wifiSession.id,
        band: "DEAD_ZONE",
        sampleCount: 2,
        averageRssi: -71,
        strongestRssi: -58,
        weakestRssi: -84,
        coverageScore: 28,
        confidenceScore: 0.72,
        deadZoneSampleCount: 1,
        poorSampleCount: 0,
        scoreReason: "Seeded floor-level coverage baseline shows one dead-zone sample near triage.",
        status: "active",
        createdBy: adminUser.id,
        updatedBy: adminUser.id
      },
      {
        scope: "ZONE",
        facilityId: facility.id,
        buildingId: building.id,
        floorId: floor.id,
        zoneId: zone.id,
        wifiScanSessionId: wifiSession.id,
        band: "DEAD_ZONE",
        sampleCount: 2,
        averageRssi: -71,
        strongestRssi: -58,
        weakestRssi: -84,
        coverageScore: 28,
        confidenceScore: 0.72,
        deadZoneSampleCount: 1,
        poorSampleCount: 0,
        scoreReason: "Seeded zone-level coverage baseline highlights a triage-area gap.",
        status: "active",
        createdBy: adminUser.id,
        updatedBy: adminUser.id
      },
      {
        scope: "ROOM",
        facilityId: facility.id,
        buildingId: building.id,
        floorId: floor.id,
        zoneId: zone.id,
        roomId: room.id,
        wifiScanSessionId: wifiSession.id,
        band: "DEAD_ZONE",
        sampleCount: 2,
        averageRssi: -71,
        strongestRssi: -58,
        weakestRssi: -84,
        coverageScore: 28,
        confidenceScore: 0.72,
        deadZoneSampleCount: 1,
        poorSampleCount: 0,
        scoreReason: "Seeded room-level coverage baseline flags Triage Room 101 for follow-up.",
        status: "active",
        createdBy: adminUser.id,
        updatedBy: adminUser.id
      }
    ]
  });

  const existingCoverageGapAnnotation = await prisma.mapAnnotation.findFirst({
    where: {
      floorId: floor.id,
      annotationType: "coverage-gap",
      title: "Triage Room 101 coverage gap",
      archivedAt: null
    }
  });

  if (existingCoverageGapAnnotation) {
    await prisma.mapAnnotation.update({
      where: { id: existingCoverageGapAnnotation.id },
      data: {
        floorPlanVersionId: floorPlanVersion.id,
        zoneId: zone.id,
        roomId: room.id,
        severity: "critical",
        geometryJson: JSON.stringify({
          type: "polygon",
          points: [
            { x: 340, y: 130 },
            { x: 470, y: 130 },
            { x: 470, y: 250 },
            { x: 340, y: 250 }
          ]
        }),
        notes: "Seeded coverage-gap annotation generated for the T09 baseline.",
        updatedBy: adminUser.id,
        archivedAt: null,
        archivedBy: null,
        status: "active"
      }
    });
  } else {
    await prisma.mapAnnotation.create({
      data: {
        floorId: floor.id,
        floorPlanVersionId: floorPlanVersion.id,
        zoneId: zone.id,
        roomId: room.id,
        title: "Triage Room 101 coverage gap",
        annotationType: "coverage-gap",
        severity: "critical",
        geometryJson: JSON.stringify({
          type: "polygon",
          points: [
            { x: 340, y: 130 },
            { x: 470, y: 130 },
            { x: 470, y: 250 },
            { x: 340, y: 250 }
          ]
        }),
        status: "active",
        notes: "Seeded coverage-gap annotation generated for the T09 baseline.",
        createdBy: adminUser.id,
        updatedBy: adminUser.id
      }
    });
  }

  const roomCoverageAssessment = await prisma.coverageAssessment.findFirst({
    where: {
      facilityId: facility.id,
      floorId: floor.id,
      roomId: room.id,
      scope: "ROOM",
      archivedAt: null
    }
  });

  await prisma.incident.deleteMany({
    where: {
      facilityId: facility.id,
      code: {
        in: ["INC-T10-TRIAGE"]
      }
    }
  });

  const readinessIncident = await prisma.incident.create({
    data: {
      facilityId: facility.id,
      buildingId: building.id,
      floorId: floor.id,
      zoneId: zone.id,
      roomId: room.id,
      name: "Triage network degradation",
      code: "INC-T10-TRIAGE",
      incidentType: "network",
      severity: "high",
      reportedAt: new Date("2026-03-29T16:05:00.000Z"),
      status: "active",
      notes: "Seeded T10 incident aligned to the triage coverage gap baseline.",
      createdBy: adminUser.id,
      updatedBy: adminUser.id
    }
  });

  await prisma.riskItem.deleteMany({
    where: {
      facilityId: facility.id,
      code: {
        in: ["RISK-T10-MANUAL", "RISK-T10-SYSTEM"]
      }
    }
  });

  const manualRiskItem = await prisma.riskItem.create({
    data: {
      facilityId: facility.id,
      buildingId: building.id,
      floorId: floor.id,
      zoneId: zone.id,
      roomId: room.id,
      name: "Backup workflow signage outdated",
      code: "RISK-T10-MANUAL",
      category: "operations",
      severity: "moderate",
      score: 52,
      scoreReason: "Clinical staff need an updated fallback workflow reference for temporary Wi-Fi outages.",
      sourceType: "manual",
      sourceReferenceId: null,
      isSystemGenerated: false,
      status: "active",
      notes: "Seeded manual risk item for T10 review and archive workflows.",
      createdBy: adminUser.id,
      updatedBy: adminUser.id
    }
  });

  const systemRiskItem = await prisma.riskItem.create({
    data: {
      facilityId: facility.id,
      buildingId: building.id,
      floorId: floor.id,
      zoneId: zone.id,
      roomId: room.id,
      name: "Derived triage Wi-Fi exposure",
      code: "RISK-T10-SYSTEM",
      category: "coverage",
      severity: "high",
      score: 68,
      scoreReason: "Derived from the room-level dead-zone assessment and active incident volume in triage.",
      sourceType: "coverage-assessment",
      sourceReferenceId: roomCoverageAssessment?.id ?? null,
      isSystemGenerated: true,
      status: "active",
      notes: "Seeded system-generated risk item to demonstrate T10 reporting rollups.",
      createdBy: adminUser.id,
      updatedBy: adminUser.id
    }
  });

  await prisma.readinessScore.deleteMany({
    where: {
      facilityId: facility.id,
      buildingId: building.id,
      floorId: floor.id,
      calculationVersion: "t10-seed-v1"
    }
  });

  await prisma.readinessScore.create({
    data: {
      facilityId: facility.id,
      buildingId: building.id,
      floorId: floor.id,
      calculatedAt: new Date("2026-03-29T16:20:00.000Z"),
      overallScore: 61,
      infrastructureScore: 66,
      coverageScore: 28,
      supportScore: 74,
      calculationVersion: "t10-seed-v1",
      scoreDetailsJson: JSON.stringify({
        summary: "Seeded T10 readiness baseline for Regina General Hospital Level 1.",
        coverage: {
          coverageAssessmentId: roomCoverageAssessment?.id ?? null,
          roomName: room.name,
          coverageScore: 28
        },
        support: {
          activeIncidentId: readinessIncident.id,
          manualRiskItemId: manualRiskItem.id,
          systemRiskItemId: systemRiskItem.id
        }
      }),
      coverageAssessmentCount: 4,
      activeIncidentCount: 1,
      activeRiskItemCount: 2,
      status: "active",
      createdBy: adminUser.id,
      updatedBy: adminUser.id
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: adminUser.id,
      action: "seed.bootstrap",
      entityType: "system",
      summary: "Bootstrap data seeded for foundation delivery."
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
