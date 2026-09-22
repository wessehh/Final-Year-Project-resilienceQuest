// Crisis alerts, SOS overlays, hazard warnings 

import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { useApp } from '@/context/AppContext';

// Component Props interface allowing optional custom dismiss callbacks
interface HazardAlertModalProps {
    /** Optional callback invoked when the user acknowledges and dismisses the alert modal */
    onDismiss?: () => void;
}

/**
 * HazardAlertModal
 * High-priority emergency modal that displays urgent actionable guidance
 * and hazard location alerts whenever crisis mode is active globally. 
 */
export const HazardAlertModal: React.FC<HazardAlertModalProps> = ({onDismiss}) => {
    // Access active emergency state and state-toggle handler from global AppContext
    const {isEmergencyActive, toggleEmergencyMode } = useApp();

    /**
     * Handles modal dismissal by executing custom onDismiss if provided,
     * or deactivating emergency crisis mode across the global context.
     */

    const handleAcknowledge = () => {
        if (onDismiss) {
            onDismiss();
        } else {
            toggleEmergencyMode(false);
        }
    };

    return (
        <Modal
            // Modal visibility is driven by the global emergency state
            visible={isEmergencyActive}
            transparent={true}
            animationType="slide"
            // Hardware back button behavior on andriod devices
            onRequestClose={handleAcknowledge}
        >
            {/* Dark semi transparent backdrop */}
            <View style={styles.backdrop}>
                {/* Main Alert Card Container with urgent high-contrast styling */}
                <View style={styles.modalCard}>

                    {/* high-priority alert status badge */}
                    <View  style={styles.headerBadge}>
                        <Text style={styles.badgeText}> ⚠️ HIGH RISK HAZARD ALERT </Text>
                    </View>

                    {/* Primary Hazard Title and proximity telemetry details */}
                    <Text style={styles.title}>Flash Flood & Severe Weather Warning</Text>
                    <Text style={styles.subtext}>
                        Detected within <Text style={styles.boldText}>1.5km</Text> of your current GPS position.
                    </Text>

                    {/* Visual section divider */}
                    <View style={styles.divider}/>

                    {/* Scrollable list of critical offline safety steps */}
                    <ScrollView style={styles.instructionScroll}>
                        <Text style={styles.sectionHeading}>Immediate Action Steps:</Text>

                        <View style={styles.bulletRow}>
                            <Text style={styles.bulletPoint}>1.</Text>
                            <Text style={styles.bulletText}>
                                Move to higher ground immediately. Avoid basements or low-lying pedestrain paths.
                            </Text>
                        </View>

                        <View style={styles.bulletRow}>
                            <Text style={styles.bulletPoint}>2.</Text>
                            <Text style={styles.bulletText}>
                                Do not attempt to walk, swim or drive through fast-moving floodwaters.
                            </Text>
                        </View>
                        <View style={styles.bulletRow}>
                            <Text style={styles.bulletPoint}>3.</Text>
                            <Text style={styles.bulletText}>
                                Check the Explore tab to locate your nearest offline emergency shelter
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Primary User Action Button */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.acknowledgeButton}
                            onPress={handleAcknowledge}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.acknowledgeButtonText}> Acknowledge & Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    // Semi-transparent black backdrop ensures high focus during crisis state
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    // Red border styling signals urgent high-priority crisis status
    borderColor: '#e53e3e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerBadge: {
    backgroundColor: '#fff5f5',
    borderColor: '#feb2b2',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badgeText: {
    color: '#c53030',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a202c',
    marginBottom: 6,
  },
  subtext: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 12,
  },
  boldText: {
    fontWeight: '700',
    color: '#e53e3e',
  },
  divider: {
    height: 1,
    backgroundColor: '#edf2f7',
    marginVertical: 10,
  },
  instructionScroll: {
    maxHeight: 180,
    marginVertical: 10,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  bulletPoint: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e53e3e',
    width: 20,
  },
  bulletText: {
    fontSize: 13,
    color: '#4a5568',
    flex: 1,
    lineHeight: 18,
  },
  buttonContainer: {
    marginTop: 16,
  },
  acknowledgeButton: {
    backgroundColor: '#e53e3e',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  acknowledgeButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});