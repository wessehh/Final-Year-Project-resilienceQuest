// GPS and Sensor Status Matrix
// Renders device sensor link diagnostics and real-time GPS coordinates 
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { TelemetryLocation } from '@/hooks/useTelemetry';

interface TelemetryCardProps {
  trackingStatus: 'INITIALIZING' | 'ACTIVE' | 'DENIED' | 'ERROR';
  currentLocation: TelemetryLocation | null;
  onReSync: () => void;
}

export const TelemetryCard: React.FC<TelemetryCardProps> = ({
  trackingStatus,
  currentLocation,
  onReSync,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Offline Telemetry Status</Text>
        <TouchableOpacity style={styles.syncButton} onPress={onReSync}>
          <Text style={styles.syncText}>🔄 Re-Sync</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>GPS Signal Status:</Text>
        <Text style={[styles.statusTag, trackingStatus === 'ACTIVE' ? styles.statusActive : styles.statusWarning]}>
          {trackingStatus}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Coordinates:</Text>
        <Text style={styles.coordsValue}>
          {currentLocation
            ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
            : 'Acquiring location...'}
        </Text>
      </View>

      {currentLocation?.accuracy !== null && currentLocation?.accuracy !== undefined && (
        <View style={styles.row}>
          <Text style={styles.label}>Estimated Accuracy:</Text>
          <Text style={styles.accuracyValue}>±{currentLocation.accuracy.toFixed(0)} meters</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2d3748',
  },
  syncButton: {
    backgroundColor: '#ebf8ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  syncText: {
    color: '#3182ce',
    fontSize: 11,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    color: '#718096',
  },
  coordsValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2d3748',
    fontFamily: 'Platform',
  },
  accuracyValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a5568',
  },
  statusTag: {
    fontSize: 11,
    fontWeight: '800',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: '#c6f6d5',
    color: '#22543d',
  },
  statusWarning: {
    backgroundColor: '#feebc8',
    color: '#744210',
  },
});