// this component uses offline telemetry to compare your current GPS 
// coordinates against a cached hazard dataset, computing real-time 
// proximity risk levels wihtout relying on extermap map tile
// servers or internet connectivity

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTelemetry } from '@/hooks/useTelemetry';

// TypeScript schema for defined offline hazard risk zones
export interface HazardZone {
  id: string;
  name: string;
  riskLevel: 'SAFE' | 'LOW' | 'MODERATE' | 'HIGH';
  type: 'Flood Zone' | 'Landslide Hazard' | 'Safe Evacuation Zone' | 'Industrial Danger';
  latitude: number;
  longitude: number;
  radiusKm: number; // Radius of impact zone in kilometers
}

// Cached offline hazard zone dataset accessible without network connectivity
const OFFLINE_HAZARD_ZONES: HazardZone[] = [
  {
    id: 'zone_001',
    name: 'Low-Lying Canal Basin',
    riskLevel: 'HIGH',
    type: 'Flood Zone',
    latitude: 1.3521,
    longitude: 103.8198,
    radiusKm: 2.0,
  },
  {
    id: 'zone_002',
    name: 'Northern Ridge Slope',
    riskLevel: 'MODERATE',
    type: 'Landslide Hazard',
    latitude: 1.3650,
    longitude: 103.8310,
    radiusKm: 1.5,
  },
  {
    id: 'zone_003',
    name: 'Central Assembly Complex',
    riskLevel: 'SAFE',
    type: 'Safe Evacuation Zone',
    latitude: 1.3400,
    longitude: 103.8000,
    radiusKm: 3.0,
  },
];

// Utility Haversine distance calculator (Km)
const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * AreaRiskCard
 * Evaluates current GPS telemetry against cached offline hazard zones to render 
 * visual threat assessments and localized safety badges.
 */
export const AreaRiskCard: React.FC = () => {
  // Consume real-time GPS telemetry from hardware hook
  const { currentLocation, reSyncTelemetry } = useTelemetry();

  // Evaluate closest hazard zone based on GPS coordinates
  let activeThreatZone: HazardZone | null = null;
  let nearestDistance: number | null = null;

  if (currentLocation) {
    for (const zone of OFFLINE_HAZARD_ZONES) {
      const dist = calculateDistanceKm(
        currentLocation.latitude,
        currentLocation.longitude,
        zone.latitude,
        zone.longitude
      );

      // Check if user location falls within the hazard radius, or find nearest zone
      if (nearestDistance === null || dist < nearestDistance) {
        nearestDistance = dist;
        activeThreatZone = zone;
      }
    }
  }

  // Determine current overall risk status
  const isInsideHazardRadius =
    activeThreatZone && nearestDistance !== null && nearestDistance <= activeThreatZone.radiusKm;

  const currentRiskLevel = isInsideHazardRadius ? activeThreatZone.riskLevel : 'SAFE';

  // Helper function to return dynamic badge colors based on risk severity
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH':
        return { bg: '#fff5f5', border: '#feb2b2', text: '#e53e3e', indicator: '#e53e3e' };
      case 'MODERATE':
        return { bg: '#fffaf0', border: '#fbd38d', text: '#dd6b20', indicator: '#dd6b20' };
      case 'LOW':
      case 'SAFE':
      default:
        return { bg: '#f0fff4', border: '#9ae6b4', text: '#38a169', indicator: '#38a169' };
    }
  };

  const riskTheme = getRiskColor(currentRiskLevel);

  return (
    <View style={styles.cardContainer}>
      {/* Header section with telemetry sync trigger */}
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.cardTitle}>Offline Area Risk Indicator</Text>
          <Text style={styles.cardSubtitle}>
            Local vector threat analysis computed offline
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={reSyncTelemetry} activeOpacity={0.7}>
          <Text style={styles.refreshButtonText}>📡 Sync</Text>
        </TouchableOpacity>
      </View>

      {/* Primary Risk Status Banner */}
      <View
        style={[
          styles.statusBanner,
          { backgroundColor: riskTheme.bg, borderColor: riskTheme.border },
        ]}
      >
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: riskTheme.indicator }]} />
          <Text style={[styles.statusTitleText, { color: riskTheme.text }]}>
            {currentRiskLevel === 'HIGH'
              ? '⚠️ HIGH RISK HAZARD ZONE'
              : currentRiskLevel === 'MODERATE'
              ? '⚡ MODERATE HAZARD PROXIMITY'
              : '🛡️ CURRENT AREA SAFE'}
          </Text>
        </View>

        <Text style={styles.statusDescriptionText}>
          {isInsideHazardRadius && activeThreatZone
            ? `Located inside ${activeThreatZone.name} (${activeThreatZone.type}). Exercise caution.`
            : nearestDistance !== null && activeThreatZone
            ? `Nearest hazard: ${activeThreatZone.name} (${nearestDistance.toFixed(2)} km away).`
            : 'Acquiring GPS location telemetry...'}
        </Text>
      </View>

      {/* Offline Grid Visual Representation (map simulation) */}
      <View style={styles.radarContainer}>
        <View style={styles.radarGridBackground}>
          <View style={styles.radarCrosshairH} />
          <View style={styles.radarCrosshairV} />
          <View style={[styles.radarPing, { borderColor: riskTheme.indicator }]} />
          <Text style={styles.radarText}>
            GPS: {currentLocation ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}` : 'Scanning...'}
          </Text>
        </View>
      </View>

      {/* List of Nearby Cached Hazard Vectors */}
      <Text style={styles.listHeaderTitle}>Nearby Offline Hazard Zones:</Text>
      {OFFLINE_HAZARD_ZONES.map((zone) => {
        const zoneDist = currentLocation
          ? calculateDistanceKm(
              currentLocation.latitude,
              currentLocation.longitude,
              zone.latitude,
              zone.longitude
            ).toFixed(2)
          : '--';

        const zoneTheme = getRiskColor(zone.riskLevel);

        return (
          <View key={zone.id} style={styles.zoneRow}>
            <View style={styles.zoneInfo}>
              <Text style={styles.zoneName}>{zone.name}</Text>
              <Text style={styles.zoneType}>{zone.type} • {zone.radiusKm} km radius</Text>
            </View>
            <View style={styles.zoneMetrics}>
              <View style={[styles.miniBadge, { backgroundColor: zoneTheme.bg, borderColor: zoneTheme.border }]}>
                <Text style={[styles.miniBadgeText, { color: zoneTheme.text }]}>{zone.riskLevel}</Text>
              </View>
              <Text style={styles.zoneDistance}>{zoneDist} km</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a202c',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  refreshButton: {
    backgroundColor: '#edf2f7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2b6cb0',
  },
  statusBanner: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusTitleText: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusDescriptionText: {
    fontSize: 12,
    color: '#4a5568',
    marginLeft: 18,
  },
  radarContainer: {
    height: 90,
    backgroundColor: '#1a202c',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  radarGridBackground: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarCrosshairH: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#2d3748',
  },
  radarCrosshairV: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: '#2d3748',
  },
  radarPing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    opacity: 0.7,
  },
  radarText: {
    position: 'absolute',
    bottom: 6,
    left: 10,
    color: '#a0aec0',
    fontSize: 10,
    fontFamily: 'Platform',
  },
  listHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 8,
  },
  zoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  zoneInfo: {
    flex: 1,
    marginRight: 8,
  },
  zoneName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2d3748',
  },
  zoneType: {
    fontSize: 11,
    color: '#718096',
    marginTop: 2,
  },
  zoneMetrics: {
    alignItems: 'flex-end',
  },
  miniBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 2,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  zoneDistance: {
    fontSize: 11,
    color: '#4a5568',
    fontWeight: '600',
  },
});