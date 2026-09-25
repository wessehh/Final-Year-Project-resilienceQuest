import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useApp } from '@/context/AppContext';
import { useTelemetry } from '@/hooks/useTelemetry';
import { SOSBeacon } from '@/components/emergency/SOSBeacon';
import { shelterService, SCDFShelter } from '@/services/shelterService';

export default function ExploreScreen() {
  const { isEmergencyActive, toggleEmergencyMode, simulatedLocation } = useApp();
  const { currentLocation } = useTelemetry();

  // Active position priority: Dev Suite override -> Live GPS telemetry
  const activeLocation = simulatedLocation || currentLocation;

  // SCDF Shelter state
  const [shelters, setShelters] = useState<SCDFShelter[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch SCDF shelters from cache or trigger live refresh
  const fetchShelters = async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setIsSyncing(true);
    } else {
      setIsLoading(true);
    }

    try {
      if (forceRefresh) {
        const freshData = await shelterService.loadShelters(true);
        // Re-evaluate distances relative to active location
        const evaluated = await shelterService.getNearbyShelters(activeLocation, 25);
        setShelters(evaluated.length > 0 ? evaluated : freshData);
      } else {
        const data = await shelterService.getNearbyShelters(activeLocation, 25);
        setShelters(data);
      }
    } catch (err) {
      console.warn('Failed to load SCDF shelters:', err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  // Load shelters when screen mounts or when active location changes
  useEffect(() => {
    fetchShelters();
  }, [simulatedLocation, currentLocation]);

  // Native phone dialer dispatch for SCDF emergency contact
  const handleCallEmergency = (phoneNumber: string = '995') => {
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Call Error', 'Unable to initiate call on this device.');
    });
  };

  // Instant client-side search filtering
  const filteredShelters = shelters.filter((shelter) => {
    const query = searchQuery.toLowerCase();
    return (
      shelter.name.toLowerCase().includes(query) ||
      shelter.address.toLowerCase().includes(query) ||
      shelter.type.toLowerCase().includes(query) ||
      shelter.postalCode.includes(query)
    );
  });

  return (
    <View style={styles.viewport}>
      <ScrollView contentContainerStyle={styles.scrollCanvas}>
        {/* Crisis Mode Banner Header */}
        <View
          style={[
            styles.statusBanner,
            isEmergencyActive ? styles.bannerEmergency : styles.bannerPeacetime,
          ]}
        >
          <View style={styles.bannerTextContainer}>
            <Text
              style={[
                styles.bannerTitle,
                isEmergencyActive ? styles.textEmergency : styles.textPeacetime,
              ]}
            >
              {isEmergencyActive ? '🚨 CRISIS MODE ACTIVE' : '🛡️ PEACETIME MODE'}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {isEmergencyActive
                ? 'Prioritizing nearest SCDF emergency public shelters and medical points.'
                : 'Browse local civil defence shelters and offline relief resources.'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.modeToggleButton,
              isEmergencyActive ? styles.btnEmergency : styles.btnPeacetime,
            ]}
            onPress={() => toggleEmergencyMode(!isEmergencyActive)}
            activeOpacity={0.8}
          >
            <Text style={styles.modeToggleText}>
              {isEmergencyActive ? 'Deactivate' : 'Simulate Hazard'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic SCDF Data Sync Banner (Triggers if dataset is empty or on demand) */}
        {shelters.length === 0 && !isLoading && (
          <View style={styles.syncBanner}>
            <View style={styles.syncBannerTextCol}>
              <Text style={styles.syncBannerTitle}>⚠️ SCDF Cache Missing or Stale</Text>
              <Text style={styles.syncBannerSub}>
                Tap to sync official Civil Defence shelters directly from Data.gov.sg.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.syncBtn}
              onPress={() => fetchShelters(true)}
              disabled={isSyncing}
              activeOpacity={0.8}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.syncBtnText}>🔄 Sync SCDF</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Offline SOS Broadcast Beacon */}
        <SOSBeacon />

        {/* Directory Search Header */}
        <View style={styles.headerSection}>
          <View style={styles.titleRow}>
            <Text style={styles.sectionTitle}>SCDF Public Shelters</Text>
            {isSyncing && <ActivityIndicator size="small" color="#3182ce" />}
          </View>
          <Text style={styles.sectionDescription}>
            Offline-cached Singapore Civil Defence Force (SCDF) shelters accessible without internet connection.
          </Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search shelter name, MRT, postal code, or address..."
            placeholderTextColor="#a0aec0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Shelter Resource Cards List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3182ce" />
            <Text style={styles.loadingText}>Locating nearest SCDF shelters...</Text>
          </View>
        ) : filteredShelters.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No matching shelters found</Text>
            <Text style={styles.emptySub}>
              Try searching for another MRT station, area, or postal code.
            </Text>
          </View>
        ) : (
          filteredShelters.map((shelter) => (
            <View key={shelter.id} style={styles.shelterCard}>
              <View style={styles.cardHeader}>
                <View style={styles.titleWrapper}>
                  <Text style={styles.shelterName}>{shelter.name}</Text>
                  <Text style={styles.shelterType}>🏛️ {shelter.type}</Text>
                </View>
                
              </View>

              <Text style={styles.shelterAddress}>📍 {shelter.address}</Text>

              {shelter.postalCode ? (
                <Text style={styles.postalText}>📮 Postal Code: {shelter.postalCode}</Text>
              ) : null}

              {/* Distance readout derived from Haversine calculation */}
              {shelter.distanceKm !== undefined && (
                <Text style={styles.distanceText}>
                  📏 Approx. <Text style={styles.boldText}>{shelter.distanceKm} km</Text> away
                </Text>
              )}

              {/* Emergency Call Action */}
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handleCallEmergency('995')}
                activeOpacity={0.7}
              >
                <Text style={styles.callButtonText}>📞 Call SCDF Emergency Line (995)</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
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
  statusBanner: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerPeacetime: {
    backgroundColor: '#ebf8ff',
    borderWidth: 1,
    borderColor: '#bee3f8',
  },
  bannerEmergency: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#feb2b2',
  },
  bannerTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  textPeacetime: {
    color: '#2b6cb0',
  },
  textEmergency: {
    color: '#c53030',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#4a5568',
    marginTop: 2,
  },
  modeToggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  btnPeacetime: {
    backgroundColor: '#3182ce',
  },
  btnEmergency: {
    backgroundColor: '#e53e3e',
  },
  modeToggleText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  syncBanner: {
    backgroundColor: '#fffaf0',
    borderColor: '#fbd38d',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncBannerTextCol: {
    flex: 1,
    marginRight: 10,
  },
  syncBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#c05621',
  },
  syncBannerSub: {
    fontSize: 11,
    color: '#9c4221',
    marginTop: 2,
  },
  syncBtn: {
    backgroundColor: '#dd6b20',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  syncBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  headerSection: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a365d',
  },
  sectionDescription: {
    fontSize: 13,
    color: '#718096',
    marginTop: 4,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2d3748',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#718096',
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4a5568',
  },
  emptySub: {
    fontSize: 12,
    color: '#a0aec0',
    marginTop: 4,
  },
  shelterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleWrapper: {
    flex: 1,
    marginRight: 8,
  },
  shelterName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2d3748',
  },
  shelterType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3182ce',
    marginTop: 2,
  },
  shelterAddress: {
    fontSize: 13,
    color: '#4a5568',
    marginBottom: 4,
  },
  postalText: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 6,
  },
  distanceText: {
    fontSize: 12,
    color: '#2b6cb0',
    marginBottom: 12,
  },
  boldText: {
    fontWeight: '800',
  },
  callButton: {
    backgroundColor: '#3182ce',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  callButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});