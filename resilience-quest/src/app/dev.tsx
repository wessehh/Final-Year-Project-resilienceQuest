import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/context/AppContext';
import { HazardSimulationControl } from '@/components/emergency/HazardSimulationControl';
import { shelterService } from '@/services/shelterService';
import seedShelters from '../assets/data/sg_shelters.json';

const CACHE_KEY = '@resiliencequest_scdf_shelters';
const LAST_SYNC_KEY = '@resiliencequest_scdf_shelters_last_sync';

/**
 * DevScreen Component
 * Developer & Evaluator suite for triggering scenario overrides, wiping cache, or maxing XP.
 */
export default function DevScreen() {
  const { completeAllTasks, resetAllData } = useApp();
  const [isSyncingShelters, setIsSyncingShelters] = useState<boolean>(false);
  const [cachedSheltersPreview, setCachedSheltersPreview] = useState<string>('Loading...');
  const [cachedCount, setCachedCount] = useState<number>(0);
  const [lastSyncTimeStr, setLastSyncTimeStr] = useState<string>('Never');
  

  // Load current AsyncStorage inspection state 
  const refreshStoragePreview = async () => {
    try {
      const rawCache = await AsyncStorage.getItem(CACHE_KEY);
      const rawSyncTime = await AsyncStorage.getItem(LAST_SYNC_KEY);
      if (rawCache){
        const parsed = JSON.parse(rawCache);
        setCachedCount(parsed.length);
        // display only the first 2 records for cleaner formatting 
        setCachedSheltersPreview(JSON.stringify(parsed.slice(0,2),null, 2));

      }else {
        setCachedCount(0);
        setCachedSheltersPreview('No data cached in AsyncStorage (using seed JSON).');

      }

      if (rawSyncTime) {
        const date = new Date(parseInt(rawSyncTime, 10));
        setLastSyncTimeStr(date.toLocaleString());
      } else {
        setLastSyncTimeStr('Never');
      }
    } catch (error) {
      setCachedSheltersPreview('Error reading AsyncStorage.');
    }
  };

  useEffect(() => {
    refreshStoragePreview();
  }, []);

  // Full system wipe
  const handleConfirmReset = async () => {
    resetAllData();
    await shelterService.clearShelterCache();
    await refreshStoragePreview();
    Alert.alert('Demo Suite Reset', 'Local user progress, XP. and SCDF shelter cache wiped.');
  };

  // Targeted cache clear for SCDF shelters 
  const handleClearShelterCache = async () => {
    //clear old storage containing default lat/lon
    await shelterService.clearShelterCache();
    // load shleters with forceRefresh = true to trigger OneMap batch geocoding 
    const freshShelters = await shelterService.loadShelters(true);
    console.log('Sample Geocoded Shelter:', freshShelters[0]);
    
    await refreshStoragePreview();
    Alert.alert('Shelter Cache Purged', 'SCDF shelter cache and sync timestamp have been reset.');
  }

  // Force live API fetch from Data.gov.sg
  const handleForceShelterSync = async () => {
    setIsSyncingShelters(true);
    try {
      const shelters = await shelterService.loadShelters(true /* forceRefresh */);
      await refreshStoragePreview();
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

        {/* Storage & Seed Data Inspection Card*/}
        <View style={styles.utilityCard}>
          <View style={styles.inspectorHeader}>
            <Text style={styles.utilityTitle}> Storage & Seed Inspector</Text>
            <TouchableOpacity onPress={refreshStoragePreview}>
              <Text style={styles.refreshText}>Refresh View</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.metaText}>
            - Cached Shelters in <Text style={styles.bold}>AsyncStorage</Text>: <Text style={styles.highlight}>{cachedCount}</Text> items
          </Text>
          <Text style={styles.metaText}>
            - Last Live sync: <Text style={styles.bold}>{lastSyncTimeStr}</Text>
          </Text>

          <Text style={styles.codeLabel}>AsyncStorage Sample (First 2 Records):</Text>
          <View style={styles.codeBox}>
            <ScrollView horizontal style={styles.codeScroll}>
              <Text style={styles.codeText}>{cachedSheltersPreview}</Text>
            </ScrollView>
          </View>
          
          <Text style={[styles.codeLabel, { marginTop: 12 }]}>
            Bundled Static Seed Asset (<Text style={styles.bold}>sg_shelters.json</Text> - {seedShelters.length} items):
          </Text>
          <View style={styles.codeBox}>
            <ScrollView horizontal style={styles.codeScroll}>
              <Text style={styles.codeText}>
                {JSON.stringify(seedShelters.slice(0,2), null, 2)}
              </Text>
            </ScrollView>
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
  metaText: {
    fontSize: 12,
    color: '#4a5568',
    marginBottom: 4,
  },
  bold: {
    fontWeight: '700',
  },
  highlight: {
    color: '#2b6cb0',
    fontWeight: '800',
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#718096',
    marginTop: 8,
    marginBottom: 4,
  },
  codeBox: {
    backgroundColor: '#1a202c',
    borderRadius: 6,
    padding: 10,
    maxHeight: 140,
  },
  codeScroll: {
    flexGrow: 0,
  },
  codeText: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: '#68d391',
  },
  inspectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  refreshText: {
    fontSize: 12,
    color: '#3182ce',
    fontWeight: '700',
  },
});
