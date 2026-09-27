/* this component uses offline telemetry to compare your current GPS 
* coordinates against a cached hazard dataset, computing real-time 
* proximity risk levels wihtout relying on external map tile
* servers or internet connectivity, augmented with live NEA/PUB hazard feeds.
*/

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useApp } from '@/context/AppContext';
import { hazardAlertService, HazardAlertSummary } from '@/services/hazardAlertService';
import { calculateDistanceKm } from '@/utils/geoUtils';

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

/**
 * AreaRiskCard
 * Evaluates current GPS telemetry against cached offline hazard zones & live NEA/PUB 
 * alerts to render visual threat assessments and localized safety badges.
 */
export const AreaRiskCard: React.FC = () => {
  const { currentLocation, reSyncTelemetry } = useTelemetry();
  const { isEmergencyActive, toggleEmergencyMode } = useApp();

  // Live hazard alert state
  const [hazardSummary, setHazardSummary] = useState<HazardAlertSummary | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // Fetch live NEA weather & PUB flood advisories
  const fetchLiveHazards = async () => {
    setIsLoadingLive(true);
    try {
      const summary = await hazardAlertService.getLiveAlerts(currentLocation);
      setHazardSummary(summary);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      // Auto-trigger emergency mode if live feed detects an active emergency
      if (summary.hasActiveEmergency && !isEmergencyActive) {
        toggleEmergencyMode(true);
      }
    } catch (error) {
      console.warn('Live hazard sync deferred:', error);
    } finally {
      setIsLoadingLive(false);
    }
  };

  useEffect(() => {
    fetchLiveHazards();

    // Auto-poll live alerts every 5 minutes
    const interval = setInterval(fetchLiveHazards, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentLocation]);

  const handleSyncAll = () => {
    reSyncTelemetry();
    fetchLiveHazards();
  };

  // Evaluate closest offline hazard zone based on GPS coordinates
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

      if (nearestDistance === null || dist < nearestDistance) {
        nearestDistance = dist;
        activeThreatZone = zone;
      }
    }
  }

  // Determine current offline risk status
  const isInsideHazardRadius =
    activeThreatZone && nearestDistance !== null && nearestDistance <= activeThreatZone.radiusKm;

  const offlineRiskLevel = isInsideHazardRadius ? activeThreatZone?.riskLevel ?? 'SAFE' : 'SAFE';

  // Elevate overall threat if live feeds OR offline vectors detect high risk
  const isElevated =
    offlineRiskLevel === 'HIGH' ||
    hazardSummary?.riskLevel === 'HIGH' ||
    hazardSummary?.riskLevel === 'CRITICAL' ||
    isEmergencyActive;

  // Helper function to return dynamic badge colors based on risk severity
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH':
      case 'CRITICAL':
        return { bg: '#fff5f5', border: '#feb2b2', text: '#e53e3e', indicator: '#e53e3e' };
      case 'MODERATE':
      case 'MEDIUM':
        return { bg: '#fffaf0', border: '#fbd38d', text: '#dd6b20', indicator: '#dd6b20' };
      case 'LOW':
      case 'SAFE':
      default:
        return { bg: '#f0fff4', border: '#9ae6b4', text: '#38a169', indicator: '#38a169' };
    }
  };

  const riskTheme = getRiskColor(isElevated ? 'HIGH' : offlineRiskLevel);

  return (
    <View style={styles.cardContainer}>
      {/* Header section with telemetry & hazard sync trigger */}
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.cardTitle}>Real-Time & Offline Area Risk</Text>
          <Text style={styles.cardSubtitle}>
            {lastRefreshed ? `Live feeds updated at ${lastRefreshed}` : 'Evaluating localized risk vectors...'}
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={handleSyncAll} activeOpacity={0.7}>
          {isLoadingLive ? (
            <ActivityIndicator size="small" color="#2b6cb0" />
          ) : (
            <Text style={styles.refreshButtonText}>📡 Sync</Text>
          )}
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
            {isElevated
              ? '⚠️ HIGH RISK HAZARD ZONE DETECTED'
              : offlineRiskLevel === 'MODERATE'
              ? '⚡ MODERATE HAZARD PROXIMITY'
              : '🛡️ CURRENT AREA SAFE'}
          </Text>
        </View>

        <Text style={styles.statusDescriptionText}>
          {isInsideHazardRadius && activeThreatZone
            ? `Located inside ${activeThreatZone.name} (${activeThreatZone.type}). Exercise caution.`
            : nearestDistance !== null && activeThreatZone
            ? `Nearest offline hazard: ${activeThreatZone.name} (${nearestDistance.toFixed(2)} km away).`
            : 'Acquiring GPS location telemetry...'}
        </Text>
      </View>

      {/* Live Hazard Feeds Section (NEA & PUB Alerts) */}
      <View style={styles.liveFeedContainer}>
        <Text style={styles.sectionHeaderTitle}>Live NEA & PUB Environmental Feeds:</Text>
        
        <View style={styles.hazardRow}>
          <Text style={styles.hazardIcon}>🌦️</Text>
          <View style={styles.hazardInfo}>
            <Text style={styles.hazardLabel}>NEA 2-Hr Forecast</Text>
            <Text style={styles.hazardValue}>
              {hazardSummary?.weatherForecast || 'Fetching live weather status...'}
            </Text>
          </View>
        </View>

        <View style={styles.hazardRow}>
          <Text style={styles.hazardIcon}>🌊</Text>
          <View style={styles.hazardInfo}>
            <Text style={styles.hazardLabel}>PUB Flood Advisory</Text>
            <Text style={styles.hazardValue}>
              {hazardSummary?.floodAlertMessage || 'Checking drainage sensors...'}
            </Text>
          </View>
        </View>
      </View>

      {/* Offline Grid Visual Representation (radar simulation) */}
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
    fontSize: 15,
    fontWeight: '800',
    color: '#1a202c',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#718096',
    marginTop: 2,
  },
  refreshButton: {
    backgroundColor: '#edf2f7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 11,
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
    fontSize: 12,
    fontWeight: '800',
  },
  statusDescriptionText: {
    fontSize: 11,
    color: '#4a5568',
    marginLeft: 18,
  },
  liveFeedContainer: {
    marginBottom: 14,
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 4,
  },
  hazardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  hazardIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  hazardInfo: {
    flex: 1,
  },
  hazardLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#718096',
    textTransform: 'uppercase',
  },
  hazardValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2d3748',
    marginTop: 1,
  },
  radarContainer: {
    height: 80,
    backgroundColor: '#1a202c',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  radarGridBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    opacity: 0.7,
  },
  radarText: {
    position: 'absolute',
    bottom: 6,
    left: 10,
    color: '#a0aec0',
    fontSize: 10,
  },
  listHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 6,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#2d3748',
  },
  zoneType: {
    fontSize: 10,
    color: '#718096',
    marginTop: 1,
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
    fontSize: 9,
    fontWeight: '800',
  },
  zoneDistance: {
    fontSize: 10,
    color: '#4a5568',
    fontWeight: '600',
  },
});