/**
 * Dev suite
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/context/AppContext';
import { HazardSimulationControl } from '@/components/emergency/HazardSimulationControl';
import { SCDFShelter, shelterService } from '@/services/shelterService';
import seedShelters from '../assets/data/sg_shelters.json';
import { calculateDistanceKm } from '@/utils/geoUtils';
import { hazardAlertService } from '@/services/hazardAlertService';
import { aedService } from '@/services/aedService';
import { taskService } from '@/services/taskService';

const CACHE_KEY = '@resiliencequest_scdf_shelters';
const LAST_SYNC_KEY = '@resiliencequest_scdf_shelters_last_sync';

/**
 * DevScreen Component
 * Developer & Evaluator suite for triggering scenario overrides, wiping cache, or maxing XP.
 */
export default function DevScreen() {
  const { completeAllTasks, resetAllData } = useApp();
  const [isSyncingShelters, setIsSyncingShelters] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [cachedSheltersPreview, setCachedSheltersPreview] = useState<string>('Loading...');
  const [cachedCount, setCachedCount] = useState<number>(0);
  const [lastSyncTimeStr, setLastSyncTimeStr] = useState<string>('Never');
  const [failedSheltersList, setFailedSheltersList] = useState<SCDFShelter[]>([]);

  // Diagnostics State
  const [diagLogs, setDiagLogs] = useState<string[]>([]);
  const [isRunningDiag, setIsRunningDiag] = useState<boolean>(false);

  // week simulator for tasks 
  const { simulatedWeekOffset, setSimulatedWeekOffset } = useApp();
  const currentLabel = taskService.getCurrentWeekLabel(simulatedWeekOffset);

  // Subscribe globally to shelter sync progress from ANY caller (Dev Suite or Explore)
  useEffect(() => {
    const unsubscribe = shelterService.subscribeProgress((progress) => {
      setSyncProgress(progress);
      if (progress > 0 && progress < 1) {
        setIsSyncingShelters(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load current AsyncStorage inspection state 
  const refreshStoragePreview = async () => {
    try {
      const rawCache = await AsyncStorage.getItem(CACHE_KEY);
      const rawSyncTime = await AsyncStorage.getItem(LAST_SYNC_KEY);
      if (rawCache) {
        const parsed: SCDFShelter[] = JSON.parse(rawCache);
        setCachedCount(parsed.length);

        // Filter out shelters that required fallback coordinates
        const failed = parsed.filter((s) => s.isGeocodeFallback);
        setFailedSheltersList(failed);

        // Display sample records for inspection
        setCachedSheltersPreview(JSON.stringify(parsed.slice(0, 5), null, 2));
      } else {
        setCachedCount(0);
        setFailedSheltersList([]);
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

  // Live Service & Utility Diagnostics Runner
  const handleRunDiagnostics = async () => {
    setIsRunningDiag(true);
    const logs: string[] = [];

    try {
      // 1. geoUtils
      const dist = calculateDistanceKm(1.3048, 103.8318, 1.2838, 103.8591);
      logs.push(`✅ geoUtils: Orchard -> MBS = ${dist.toFixed(2)} km`);

      // 2. aedService
      const aeds = await aedService.getNearbyAEDs({ latitude: 1.2991, longitude: 103.8458 }, 2);
      logs.push(`✅ aedService: ${aeds.length} AEDs nearby (Nearest: ${aeds[0]?.buildingName || 'N/A'})`);

      // 3. taskService
      const tasks = taskService.getWeeklyTasks();
      const weekLabel = taskService.getCurrentWeekLabel();
      logs.push(`✅ taskService: Loaded ${tasks.length} quests for "${weekLabel}"`);

      // 4. hazardAlertService
      const alerts = await hazardAlertService.getAllActiveAlerts();
      logs.push(`✅ hazardAlertService: ${alerts.length} active threat alert(s) returned`);

      setDiagLogs(logs);
      Alert.alert('Diagnostics Complete', 'All 4 service utilities executed successfully.');
    } catch (err) {
      logs.push(`❌ Diagnostic Error: ${String(err)}`);
      setDiagLogs(logs);
    } finally {
      setIsRunningDiag(false);
    }
  };

  // Full system wipe
  const handleConfirmReset = async () => {
    resetAllData();
    await shelterService.clearShelterCache();
    await aedService.clearCache();
    await refreshStoragePreview();
    Alert.alert('Demo Suite Reset', 'Local user progress, XP, shelter cache, and AED cache wiped.');
  };

  // Targeted cache clear for SCDF shelters 
  const handleClearShelterCache = async () => {
    setSyncProgress(0);
    setIsSyncingShelters(true);

    try {
      await shelterService.clearShelterCache();

      const freshShelters = await shelterService.loadShelters(true, (progress) => {
        setSyncProgress(progress);
      });
      console.log('Sample Geocoded Shelter:', freshShelters[0]);

      await refreshStoragePreview();

      await new Promise((resolve) => setTimeout(resolve, 400));
      Alert.alert('Shelter Cache Purged', 'SCDF shelter cache and sync timestamp have been reset.');
    } catch (err) {
      Alert.alert('Purge Error', 'Failed to refresh shelter cache.');
    } finally {
      setIsSyncingShelters(false);
      setSyncProgress(0);
    }
  };

  // Targeted cache clear for AEDs
  const handleClearAEDCache = async () => {
    try {
      await aedService.clearCache();
      Alert.alert('AED Cache Purged', 'Local AED AsyncStorage cache wiped. Future loads will use clean seed data.');
    } catch (err) {
      Alert.alert('Purge Error', 'Failed to purge AED cache.');
    }
  };

  // Force live API fetch from Data.gov.sg
  const handleForceShelterSync = async () => {
    setSyncProgress(0);
    setIsSyncingShelters(true);

    try {
      const shelters = await shelterService.loadShelters(true /* forceRefresh */, (progress) => {
        setSyncProgress(progress);
      });
      await refreshStoragePreview();

      await new Promise((resolve) => setTimeout(resolve, 400));
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
      setSyncProgress(0);
    }
  };

  const syncPercentage = Math.round(syncProgress * 100);

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

        {/* Weekly Task Cycling Simulator */}
        <View style={styles.utilityCard}>
          <Text style={styles.utilityTitle}>🗓️ Quest Week Simulator</Text>
          <Text style={styles.statusText}>
            Current View: <Text style={styles.highlight}>{currentLabel}</Text>
          </Text>
          <Text style={styles.subtext}>
            Offset: {simulatedWeekOffset === 0 ? '0 (Current Real Week)' : `${simulatedWeekOffset > 0 ? '+' : ''}${simulatedWeekOffset} Week(s)`}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setSimulatedWeekOffset((prev) => prev - 1)}
              activeOpacity={0.7}
            >
              <Text style={styles.btnText}>◀ Prev Week</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.resetBtn]}
              onPress={() => setSimulatedWeekOffset(0)}
              activeOpacity={0.7}
            >
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setSimulatedWeekOffset((prev) => prev + 1)}
              activeOpacity={0.7}
            >
              <Text style={styles.btnText}>Next Week ▶</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Service Diagnostics Test Card */}
        <View style={styles.utilityCard}>
          <Text style={styles.utilityTitle}>🧪 Live Services Diagnostic Suite</Text>
          <Text style={styles.utilitySubtitle}>
            Verify live functionality of geoUtils, aedService, taskService, and hazardAlertService:
          </Text>

          <TouchableOpacity
            style={[styles.actionButton, styles.diagBtn, isRunningDiag && styles.disabledBtn]}
            disabled={isRunningDiag}
            onPress={handleRunDiagnostics}
            activeOpacity={0.8}
          >
            <Text style={styles.diagBtnText}>
              {isRunningDiag ? '⏳ Running Diagnostics...' : '▶ Run All Service Tests'}
            </Text>
          </TouchableOpacity>

          {diagLogs.length > 0 && (
            <View style={styles.diagLogBox}>
              {diagLogs.map((log, idx) => (
                <Text key={idx} style={styles.diagLogText}>
                  {log}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* AED Cache Utilities */}
        <View style={styles.utilityCard}>
          <Text style={styles.utilityTitle}>🚑 AED Dataset Cache Suite</Text>
          <Text style={styles.utilitySubtitle}>
            Purge local AED AsyncStorage cache to fix default fallback distances or force clean seed reload:
          </Text>

          <TouchableOpacity
            style={[styles.actionButton, styles.shelterPurgeBtn]}
            onPress={handleClearAEDCache}
            activeOpacity={0.8}
          >
            <Text style={styles.shelterPurgeBtnText}>🧹 Purge AED Cache Only</Text>
          </TouchableOpacity>
        </View>

        {/* SCDF Shelter Cache & Sync Utilities */}
        <View style={styles.utilityCard}>
          <Text style={styles.utilityTitle}>SCDF Public Shelter Data Suite</Text>
          <Text style={styles.utilitySubtitle}>
            Test offline caching, purge persistent storage, or trigger background Data.gov.sg fetches:
          </Text>

          {isSyncingShelters ? (
            <View style={styles.progressBarContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>⏳ Fetching & Geocoding SCDF Data...</Text>
                <Text style={styles.progressPercentText}>{syncPercentage}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${syncPercentage}%` }]} />
              </View>
            </View>
          ) : (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.shelterSyncBtn]}
                onPress={handleForceShelterSync}
                activeOpacity={0.8}
              >
                <Text style={styles.shelterSyncBtnText}>🔄 Force Data.gov.sg Sync</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.shelterPurgeBtn]}
                onPress={handleClearShelterCache}
                activeOpacity={0.8}
              >
                <Text style={styles.shelterPurgeBtnText}>🧹 Purge Shelter Cache Only</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Live Geocode Failures / Fallback */}
        <View style={styles.utilityCard}>
          <Text style={styles.metaText}>
            • Live Geocode Failures / Fallbacks: <Text style={styles.highlight}>{failedSheltersList.length}</Text> items
          </Text>

          {failedSheltersList.length > 0 && (
            <>
              <Text style={[styles.codeLabel, { color: '#dd6b20' }]}>
                ⚠️ Shelters Using Fallback Coordinates ({failedSheltersList.length}):
              </Text>
              <View style={styles.codeBox}>
                <ScrollView 
                  nestedScrollEnabled={true} 
                  style={styles.verticalScrollContainer}
                  indicatorStyle="black"
                  persistentScrollbar={true}
                >
                  {failedSheltersList.map((item, idx) => (
                    <Text key={item.id || idx} style={{ fontSize: 11, color: '#fbd38d', marginBottom: 2 }}>
                      • {item.name} ({item.address || 'No Address'})
                    </Text>
                  ))}
                </ScrollView>
              </View>
            </>
          )}
        </View>

        {/* Storage & Seed Data Inspection Card */}
        <View style={styles.utilityCard}>
          <View style={styles.inspectorHeader}>
            <Text style={styles.utilityTitle}>Storage & Seed Inspector</Text>
            <TouchableOpacity onPress={refreshStoragePreview}>
              <Text style={styles.refreshText}>Refresh View</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.metaText}>
            • Cached Shelters in <Text style={styles.bold}>AsyncStorage</Text>: <Text style={styles.highlight}>{cachedCount}</Text> items
          </Text>
          <Text style={styles.metaText}>
            • Last Live sync: <Text style={styles.bold}>{lastSyncTimeStr}</Text>
          </Text>

          {/* AsyncStorage JSON Inspector ScrollView */}
          <Text style={styles.codeLabel}>AsyncStorage Preview (Scrollable):</Text>
          <View style={styles.codeBox}>
            <ScrollView 
              nestedScrollEnabled={true} 
              style={styles.verticalScrollContainer}
              indicatorStyle="black"
              persistentScrollbar={true}
            >
              <ScrollView 
                horizontal 
                nestedScrollEnabled={true} 
                style={styles.codeScroll}
                indicatorStyle="black"
                persistentScrollbar={true}
              >
                <Text style={styles.codeText}>{cachedSheltersPreview}</Text>
              </ScrollView>
            </ScrollView>
          </View>

          {/* Seed JSON Inspector ScrollView */}
          <Text style={[styles.codeLabel, { marginTop: 12 }]}>
            Bundled Static Seed Asset (<Text style={styles.bold}>sg_shelters.json</Text> - {seedShelters.length} items):
          </Text>
          <View style={styles.codeBox}>
            <ScrollView 
              nestedScrollEnabled={true} 
              style={styles.verticalScrollContainer}
              indicatorStyle="black"
              persistentScrollbar={true}
            >
              <ScrollView 
                horizontal 
                nestedScrollEnabled={true} 
                style={styles.codeScroll}
                indicatorStyle="black"
                persistentScrollbar={true}
              >
                <Text style={styles.codeText}>
                  {JSON.stringify(seedShelters.slice(0, 5), null, 2)}
                </Text>
              </ScrollView>
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
    gap: 16,
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
    marginBottom: 8,
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
  disabledBtn: {
    opacity: 0.6,
  },
  diagBtn: {
    backgroundColor: '#2b6cb0',
  },
  diagBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  diagLogBox: {
    backgroundColor: '#1a202c',
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
  },
  diagLogText: {
    color: '#68d391',
    fontFamily: 'Courier',
    fontSize: 11,
    marginBottom: 4,
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
  /* Progress Bar Styles */
  progressBarContainer: {
    backgroundColor: '#e6fffa',
    borderColor: '#319795',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#234e52',
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#319795',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#b2f5ea',
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#319795',
    borderRadius: 4,
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
    maxHeight: 180,
  },
  verticalScrollContainer: {
    maxHeight: 160,
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
  statusText: {
    fontSize: 12,
    color: '#4a5568',
    marginBottom: 2,
  },
  subtext: {
    fontSize: 11,
    color: '#718096',
    marginBottom: 12,
  },
  btnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2d3748',
  },
});