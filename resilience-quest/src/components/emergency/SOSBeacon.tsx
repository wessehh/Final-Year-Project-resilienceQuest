// Generate an offline SMS/emergenct signal template
// containing current GPS coordinates & preformatted
// distress messages.

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Alert,
  TextInput,
} from 'react-native';
import { useTelemetry } from '@/hooks/useTelemetry';

// Schema for distress classification categories
type EmergencyType = 'MEDICAL' | 'RESCUE' | 'TRAPPED' | 'HAZARD';

/**
 * SOSBeacon Component
 * Offline distress signal dispatch interface. Formats GPS telemetry into standard cellular 
 * SMS distress templates, bypassing the need for active Wi-Fi or cellular data infrastructure.
 */
export const SOSBeacon: React.FC = () => {
  // Grab live hardware GPS coordinates and accuracy telemetry
  const { currentLocation } = useTelemetry();

  // Local component state for distress configuration
  const [selectedType, setSelectedType] = useState<EmergencyType>('MEDICAL');
  const [targetContact, setTargetContact] = useState<string>('995'); // Default emergency service number
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  // Extract lat/lon formatted string or fallback to offline warning
  const latitude = currentLocation ? currentLocation.latitude.toFixed(5) : 'UNKNOWN';
  const longitude = currentLocation ? currentLocation.longitude.toFixed(5) : 'UNKNOWN';
  const mapsLink = currentLocation
    ? `https://maps.google.com/?q=${latitude},${longitude}`
    : 'GPS Signal Lost';

  /**
   * Dynamically constructs a plain-text distress message body 
   * formatted for raw cellular SMS transmission.
   */
  const buildDistressMessage = (): string => {
    let msg = `[EMERGENCY SOS - ${selectedType}]\n`;
    msg += `Location: Lat ${latitude}, Lon ${longitude}\n`;
    msg += `Map Link: ${mapsLink}\n`;
    if (additionalNotes.trim().length > 0) {
      msg += `Status: ${additionalNotes.trim()}\n`;
    }
    msg += `Sent via ResilienceQuest Offline SOS.`;
    return msg;
  };

  /**
   * Dispatches native OS SMS app with pre-populated recipient and body content.
   */
  const handleDispatchSMS = () => {
    const body = encodeURIComponent(buildDistressMessage());
    // URI scheme formatted for native cross-platform SMS execution
    const smsUrl = `sms:${targetContact}?body=${body}`;

    Linking.openURL(smsUrl).catch(() => {
      Alert.alert(
        'SMS Dispatch Error',
        'Unable to launch native SMS application on this device. Please transmit manually.'
      );
    });
  };

  return (
    <View style={styles.cardContainer}>
      {/* Visual Header */}
      <View style={styles.headerRow}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>🚨 OFFLINE DISTRESS BEACON</Text>
        </View>
        <Text style={styles.gpsReadout}>
          {currentLocation ? '📡 GPS LOCKED' : '⚠️ NO GPS FIX'}
        </Text>
      </View>

      <Text style={styles.cardTitle}>Cellular SMS Distress Dispatch</Text>
      <Text style={styles.cardSubtitle}>
        Generates standard text messages readable by emergency services without internet connectivity.
      </Text>

      {/* Emergency Category Selector Grid */}
      <Text style={styles.inputLabel}>Select Distress Nature:</Text>
      <View style={styles.typeGrid}>
        {(['MEDICAL', 'RESCUE', 'TRAPPED', 'HAZARD'] as EmergencyType[]).map((type) => {
          const isSelected = selectedType === type;
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeChip,
                isSelected ? styles.typeChipSelected : styles.typeChipUnselected,
              ]}
              onPress={() => setSelectedType(type)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.typeChipText,
                  isSelected ? styles.typeChipTextSelected : styles.typeChipTextUnselected,
                ]}
              >
                {type === 'MEDICAL'
                  ? '🩺 Medical'
                  : type === 'RESCUE'
                  ? '🌊 Flood/Water'
                  : type === 'TRAPPED'
                  ? '🏚️ Trapped'
                  : '⚠️ Hazard'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Recipient Input Field */}
      <Text style={styles.inputLabel}>Emergency Contact Number:</Text>
      <TextInput
        style={styles.textInput}
        value={targetContact}
        onChangeText={setTargetContact}
        keyboardType="phone-pad"
        placeholder="Enter emergency number (e.g., 911 / 995 / 112)"
        placeholderTextColor="#a0aec0"
      />

      {/* Additional Notes Field */}
      <Text style={styles.inputLabel}>Vital Info / Injuries (Optional):</Text>
      <TextInput
        style={[styles.textInput, styles.multilineInput]}
        value={additionalNotes}
        onChangeText={setAdditionalNotes}
        placeholder="e.g., 2 adults, 1 injured, flood level rising"
        placeholderTextColor="#a0aec0"
        multiline
        numberOfLines={2}
      />

      {/* Formatted Message Preview Box */}
      <View style={styles.previewBox}>
        <Text style={styles.previewTitle}>Generated Payload Preview:</Text>
        <Text style={styles.previewContent}>{buildDistressMessage()}</Text>
      </View>

      {/* Primary Dispatch Action Button */}
      <TouchableOpacity
        style={styles.dispatchButton}
        onPress={handleDispatchSMS}
        activeOpacity={0.8}
      >
        <Text style={styles.dispatchButtonText}>📡 DISPATCH SOS SIGNAL (SMS)</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#c53030', // Highlighted emergency red border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeContainer: {
    backgroundColor: '#fff5f5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#feb2b2',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#c53030',
  },
  gpsReadout: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2b6cb0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a202c',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 6,
    marginTop: 6,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeChipSelected: {
    backgroundColor: '#c53030',
    borderColor: '#9b2c2c',
  },
  typeChipUnselected: {
    backgroundColor: '#f7fafc',
    borderColor: '#e2e8f0',
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  typeChipTextSelected: {
    color: '#ffffff',
  },
  typeChipTextUnselected: {
    color: '#4a5568',
  },
  textInput: {
    backgroundColor: '#edf2f7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1a202c',
    marginBottom: 6,
  },
  multilineInput: {
    minHeight: 48,
    textAlignVertical: 'top',
  },
  previewBox: {
    backgroundColor: '#1a202c',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 14,
  },
  previewTitle: {
    color: '#a0aec0',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  previewContent: {
    color: '#63b3ed',
    fontSize: 11,
    fontFamily: 'Platform',
    lineHeight: 16,
  },
  dispatchButton: {
    backgroundColor: '#c53030',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  dispatchButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});