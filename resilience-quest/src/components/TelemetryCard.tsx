// GPS and Sensor Status Matrix
// Renders device sensor link diagnostics and real-time GPS coordinates 
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { TrackingStatus } from '@/types';

interface TelemetryCardProps {
  trackingStatus: TrackingStatus;
  currentLocation: Location.LocationObjectCoords | null;
  onReSync: () => void;
}

export const TelemetryCard: React.FC<TelemetryCardProps> = ({
  trackingStatus,
  currentLocation,
  onReSync,
}) => {
  const isErrorState = trackingStatus === 'Unauthorised' || trackingStatus === 'Disabled';

  return (
    <View style={styles.componentCard}>
      <Text style={styles.sectionHeading}>System Telemetry Matrix</Text>
      <Text style={styles.bodyDescription}>
        Monitoring native device hardware sensor arrays for localised coordinate tracking.
      </Text>

      <View style={styles.telemetryStatusRow}>
        <Text style={styles.telemetryLabel}>Sensor Node Link:</Text>
        <Text style={[styles.telemetryValue, isErrorState && styles.telemetryValueError]}>
          {trackingStatus}
        </Text>
      </View>

      {currentLocation ? (
        <View style={styles.coordinateGrid}>
          <Text style={styles.geoText}>LAT: {currentLocation.latitude.toFixed(5)}</Text>
          <Text style={styles.geoText}>LON: {currentLocation.longitude.toFixed(5)}</Text>
        </View>
      ) : (
        <View style={styles.fallbackContainer}>
          <Text style={styles.geoAwaitingText}>
            {trackingStatus === 'Unauthorised'
              ? 'GPS core connection offline due to restricted security permissions.'
              : 'Awaiting hardware communication link verification...'}
          </Text>

          {isErrorState && (
            <TouchableOpacity style={styles.syncButton} onPress={onReSync} activeOpacity={0.7}>
              <Text style={styles.syncButtonText}>Re-Sync Hardware Sensors</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  componentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3f3e3f',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
  },
  bodyDescription: {
    fontSize: 13,
    color: '#718096',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  telemetryStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  telemetryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a5568',
  },
  telemetryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2b6cb0',
  },
  telemetryValueError: {
    color: '#e53e3e',
  },
  coordinateGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#ebf8ff',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  geoText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#2b6cb0',
    fontWeight: '700',
  },
  geoAwaitingText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#a0aec0',
    marginTop: 6,
    textAlign: 'center',
  },
  fallbackContainer: {
    alignItems: 'center',
    marginTop: 6,
  },
  syncButton: {
    backgroundColor: '#3182ce',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2b6cb0',
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
