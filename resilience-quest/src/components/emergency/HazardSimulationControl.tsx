// provide developer and demonstration control panel.
// This allows developers to simulate shifting GPS coordinates into various 
// hazard impact vectors (Flood zone, landslide risk, safe evacuation hub) 
// and test real-time app reaction across the components
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useApp } from '@/context/AppContext';
import { useTelemetry } from '@/hooks/useTelemetry';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface SimulationPreset {
  id: string;
  name: string;
  hazardType: string;
  riskLevel: 'HIGH' | 'MODERATE' | 'SAFE';
  latitude: number;
  longitude: number;
  description: string;
}

const SIMULATION_PRESETS: SimulationPreset[] = [
  {
    id: 'preset_flood',
    name: 'Canal Basin Flood',
    hazardType: 'Flash Flood Zone',
    riskLevel: 'HIGH',
    latitude: 1.3521,
    longitude: 103.8198,
    description: 'Simulates positioning inside a high-risk inundated basin.',
  },
  {
    id: 'preset_landslide',
    name: 'Northern Ridge Slope',
    hazardType: 'Landslide Hazard',
    riskLevel: 'MODERATE',
    latitude: 1.3650,
    longitude: 103.8310,
    description: 'Simulates positioning near an unstable slope hazard boundary.',
  },
  {
    id: 'preset_safe',
    name: 'Assembly Complex',
    hazardType: 'Safe Assembly Hub',
    riskLevel: 'SAFE',
    latitude: 1.3400,
    longitude: 103.8000,
    description: 'Simulates entering a designated offline safe shelter zone.',
  },
];

export const HazardSimulationControl: React.FC = () => {
  const { isEmergencyActive, toggleEmergencyMode, setSimulatedLocation, simulatedLocation } = useApp();
  const { reSyncTelemetry } = useTelemetry();

  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const togglePanel = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const handleApplyPreset = (preset: SimulationPreset) => {
    setSelectedPresetId(preset.id);

    // 1. Dispatch global coordinate override to AppContext
    setSimulatedLocation({
      latitude: preset.latitude,
      longitude: preset.longitude,
    });

    // 2. Set Crisis state: activate for HIGH risk, deactivate for MODERATE and SAFE
    if (preset.riskLevel === 'HIGH') {
      toggleEmergencyMode(true);
    } else {
      toggleEmergencyMode(false);
    }
  };

  const handleResetToRealGPS = () => {
    setSelectedPresetId(null);
    setSimulatedLocation(null);
    toggleEmergencyMode(false); // Reset emergency mode back to peacetime
    reSyncTelemetry();
  };

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity style={styles.headerBar} onPress={togglePanel} activeOpacity={0.8}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerBadge}>🛠️ DEMO CONTROLS</Text>
          <Text style={styles.headerTitle}>Hazard Vector Simulator</Text>
        </View>
        <Text style={styles.expandChevron}>{isExpanded ? '▲ Hide' : '▼ Expand'}</Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.panelContent}>
          <Text style={styles.sectionSubtitle}>
            Select a preset scenario vector to trigger real-time distance and risk updates across all screens:
          </Text>

          <View style={styles.presetList}>
            {SIMULATION_PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              const badgeColor =
                preset.riskLevel === 'HIGH'
                  ? '#e53e3e'
                  : preset.riskLevel === 'MODERATE'
                  ? '#dd6b20'
                  : '#38a169';

              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[styles.presetCard, isSelected && styles.presetCardSelected]}
                  onPress={() => handleApplyPreset(preset)}
                  activeOpacity={0.7}
                >
                  <View style={styles.presetHeader}>
                    <Text style={styles.presetName}>{preset.name}</Text>
                    <View style={[styles.riskTag, { backgroundColor: badgeColor }]}>
                      <Text style={styles.riskTagText}>{preset.riskLevel}</Text>
                    </View>
                  </View>

                  <Text style={styles.presetCoords}>
                    GPS: {preset.latitude.toFixed(4)}, {preset.longitude.toFixed(4)}
                  </Text>
                  <Text style={styles.presetDescription}>{preset.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Reset button to clear simulation override */}
          {simulatedLocation && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleResetToRealGPS}
              activeOpacity={0.8}
            >
              <Text style={styles.resetButtonText}>🔄 Clear Simulation Override (Use Real GPS)</Text>
            </TouchableOpacity>
          )}

          <View style={styles.actionRow}>
            <Text style={styles.actionLabel}>Global Crisis Override:</Text>
            <TouchableOpacity
              style={[
                styles.overrideButton,
                isEmergencyActive ? styles.overrideActive : styles.overrideInactive,
              ]}
              onPress={() => toggleEmergencyMode(!isEmergencyActive)}
              activeOpacity={0.8}
            >
              <Text style={styles.overrideButtonText}>
                {isEmergencyActive ? '🚨 CRISIS ACTIVE' : '🛡️ PEACETIME'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#1a202c',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2d3748',
  },
  headerBar: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2d3748',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#63b3ed',
    backgroundColor: '#1a202c',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  expandChevron: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a0aec0',
  },
  panelContent: {
    padding: 14,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#cbd5e0',
    marginBottom: 12,
    lineHeight: 16,
  },
  presetList: {
    gap: 8,
    marginBottom: 12,
  },
  presetCard: {
    backgroundColor: '#2d3748',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#4a5568',
  },
  presetCardSelected: {
    borderColor: '#3182ce',
    backgroundColor: '#2b6cb0',
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  presetName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  riskTag: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  riskTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  presetCoords: {
    fontSize: 10,
    color: '#e2e8f0',
    marginBottom: 4,
  },
  presetDescription: {
    fontSize: 11,
    color: '#cbd5e0',
  },
  resetButton: {
    backgroundColor: '#2d3748',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4a5568',
  },
  resetButtonText: {
    color: '#63b3ed',
    fontSize: 11,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2d3748',
    paddingTop: 10,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  overrideButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  overrideActive: {
    backgroundColor: '#e53e3e',
  },
  overrideInactive: {
    backgroundColor: '#38a169',
  },
  overrideButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
});