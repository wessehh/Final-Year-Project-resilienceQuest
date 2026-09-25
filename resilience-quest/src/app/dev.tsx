import React from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, Alert } from 'react-native';
import { useApp } from '@/context/AppContext';
import { HazardSimulationControl } from '@/components/emergency/HazardSimulationControl';
import { shelterService } from '@/services/shelterService';

/**
 * DevScreen Component
 * Developer & Evaluator suite for triggering scenario overrides, wiping cache, or maxing XP.
 */
export default function DevScreen() {
  const { completeAllTasks, resetAllData } = useApp();
  const [isSyncingShelters, setIsSyncingShelters] = useState<boolean>(false);


  // Full system wipe (XP, task states, and shleter cache)
  const handleConfirmReset = async () => {
    resetAllData();
    await shelterService.clearShelterCache();
    Alert.alert('Demo Suite Reset', 'Local user progress, XP. and SCDF shelter cache wiped.');
  };

  // Targeted cache clear for SCDF shelters 
  const handleClearShelterCache = async () => {
    await shelterService.clearShelterCache();
    Alert.alert('Shelter Cache Purged', 'SCDF shelter cache and sync timestamp have been reset.');
  }

  // Force live API fetch from Data.gov.sg
  const handleForceShelterSync = async () => {
    setIsSyncingShelters(true);
    try {
      const shelters = await shelterService.loadShelters(true /* forceRefresh */);
      Alert.alert(
        'SCDF Live Sync Success',
        `Successfully synchronized ${shelters.length} shelter records from Data.gov.sg.`
      );
    } catch (err) {
      Alert.alert(
        'Sync Warning',
        'Could not reach Data.gov.sg. Falling back to local cache or seed asset.'
      );
    } finally {
      setIsSyncingShelters(false);
    }
  };
  
  return (
    <View style={styles.viewport}>
      <ScrollView contentContainerStyle={styles.scrollCanvas}>
        <Text style={styles.title}>Evaluator Demonstration Suite</Text>
        <Text style={styles.subtitle}>
          Use this panel during live project demonstrations to override hardware GPS coordinates,
          test offline threat radius logic, and simulate storage state.
        </Text>

        {/* Interactive Threat Simulator */}
        <HazardSimulationControl />

        {/* SCDF Shelter Cache & Sync Utilities */}
        <View style={styles.utilityCard}>
          <Text style={styles.utilityTitle}> SCDF Public Shelter Data Suite</Text>
          <Text style={styles.utilitySubtitle}>Test offline caching, purge persistent storage, or tigger background Data.gov.sg fetches:</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.shelterSyncBtn]}
              onPress={handleForceShelterSync}
              disabled={isSyncingShelters}
              activeOpacity={0.8}
            >
              <Text style={styles.shelterSyncBtnText}>
                {isSyncingShelters ? '⏳ Fetching SCDF Data...' : '🔄 Force Data.gov.sg Sync'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.shelterPurgeBtn]}
              onPress={handleClearShelterCache}
              activeOpacity={0.8}
            >
              <Text style={styles.shelterPurgeBtnText}>🧹 Purge Shelter Cache Only</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Demo Fast-Action Utilities */}
        <View style={styles.utilityCard}>
          <Text style={styles.utilityTitle}>⚡ Fast Demo Utilities</Text>
          <Text style={styles.utilitySubtitle}>
            Simulate user progress milestones or clear local state on demand:
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeBtn]}
              onPress={completeAllTasks}
              activeOpacity={0.8}
            >
              <Text style={styles.completeBtnText}>🏆 Max-XP (Complete All Quests)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.resetBtn]}
              onPress={handleConfirmReset}
              activeOpacity={0.8}
            >
              <Text style={styles.resetBtnText}>🔄 Wipe Cache & Reset XP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  scrollCanvas: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a202c',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#718096',
    lineHeight: 18,
    marginBottom: 16,
  },
  utilityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  utilityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2d3748',
  },
  utilitySubtitle: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
    marginBottom: 12,
  },
  buttonRow: {
    gap: 10,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeBtn: {
    backgroundColor: '#ebf8ff',
    borderWidth: 1,
    borderColor: '#3182ce',
  },
  completeBtnText: {
    color: '#2b6cb0',
    fontSize: 12,
    fontWeight: '800',
  },
  resetBtn: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#e53e3e',
  },
  resetBtnText: {
    color: '#090707',
    fontSize: 12,
    fontWeight: '800',
  },
  shelterSyncBtn: {
    backgroundColor: '#e6fffa',
    borderWidth: 1,
    borderColor: '#319795',
  },
  shelterSyncBtnText: {
    color: '#234e52',
    fontSize: 12,
    fontWeight: '800',
  },
  shelterPurgeBtn: {
    backgroundColor: '#fffaf0',
    borderWidth: 1,
    borderColor: '#dd6b20',
  },
  shelterPurgeBtnText: {
    color: '#9c4221',
    fontSize: 12,
    fontWeight: '800',
  },
});
