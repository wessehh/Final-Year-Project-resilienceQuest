// Crisis alerts, SOS overlays, hazard warnings 
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';

/**
 * HazardAlertModal Component
 * Priority overlay rendered at root level in _layout.tsx.
 * Activates when `isEmergencyActive` is true, but allows closing the modal 
 * without canceling the underlying global crisis state.
 */
export const HazardAlertModal: React.FC = () => {
  const { isEmergencyActive } = useApp();
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const router = useRouter();

  // Reset local dismissed state whenever a new crisis mode is triggered
  useEffect(() => {
    if (isEmergencyActive) {
      setIsDismissed(false);
    }
  }, [isEmergencyActive]);

  // Hide modal if crisis mode is inactive OR if user acknowledged the alert
  if (!isEmergencyActive || isDismissed) {
    return null;
  }

  const handleNavigateGuides = () => {
    setIsDismissed(true); // Close modal overlay
    router.push('/guides'); // Navigate while keeping crisis mode active
  };

  const handleNavigateShelters = () => {
    setIsDismissed(true); // Close modal overlay
    router.push('/explore'); // Navigate while keeping crisis mode active
  };

  const handleAcknowledge = () => {
    setIsDismissed(true); // Close modal overlay
  };

  return (
    <Modal
      visible={isEmergencyActive && !isDismissed}
      animationType="slide"
      transparent={false}
      onRequestClose={handleAcknowledge}
    >
      <View style={styles.modalContainer}>
        {/* Header Alert Title */}
        <View style={styles.header}>
          <Text style={styles.alertBadge}>🚨 HIGH SEVERITY ALERT</Text>
          <Text style={styles.title}>EMERGENCY HAZARD DETECTED</Text>
          <Text style={styles.subtitle}>
            Your current coordinates put you near an active impact vector or high-risk hazard area.
          </Text>
        </View>

        {/* Immediate Safety Instructions */}
        <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent}>
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>Recommended Immediate Actions:</Text>

            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>
                <Text style={styles.boldText}>Seek High/Safe Ground:</Text> Move away from inundated canal basins or steep slope boundaries immediately.
              </Text>
            </View>

            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                <Text style={styles.boldText}>Locate Evacuation Hub:</Text> Check nearest offline community assembly centers for shelter.
              </Text>
            </View>

            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>
                <Text style={styles.boldText}>Stand By SOS Beacon:</Text> Use native SMS distress broadcasting if cellular data becomes unavailable.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleNavigateShelters}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>🧭 Route to Nearby Shelters</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleNavigateGuides}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>📖 View Offline Survival Guides</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dismissButton]}
            onPress={handleAcknowledge}
            activeOpacity={0.8}
          >
            <Text style={styles.dismissButtonText}>Acknowledge & Close Alert</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#742a2a',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 16,
  },
  alertBadge: {
    backgroundColor: '#e53e3e',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 10,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#feb2b2',
    lineHeight: 18,
  },
  bodyScroll: {
    flex: 1,
    marginVertical: 10,
  },
  bodyContent: {
    paddingVertical: 4,
  },
  instructionCard: {
    backgroundColor: '#9b2c2c',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#c53030',
  },
  instructionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e53e3e',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 24,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#fff5f5',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '800',
    color: '#ffffff',
  },
  footer: {
    gap: 10,
    marginTop: 10,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#ffffff',
  },
  primaryButtonText: {
    color: '#9b2c2c',
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryButton: {
    backgroundColor: '#c53030',
    borderWidth: 1,
    borderColor: '#feb2b2',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  dismissButton: {
    backgroundColor: 'transparent',
  },
  dismissButtonText: {
    color: '#feb2b2',
    fontSize: 13,
    fontWeight: '700',
  },
});