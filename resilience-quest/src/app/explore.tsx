import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { useApp } from '@/context/AppContext';
import { useTelemetry } from '@/hooks/useTelemetry';
import { SOSBeacon } from '@/components/emergency/SOSBeacon';

// TypeScript interface defining offline shelter schema
interface Shelter {
  id: string;
  name: string;
  type: 'Evacuation Center' | 'Medical Post' | 'Distribution Point';
  address: string;
  contact: string;
  latitude: number;
  longitude: number;
  capacityStatus: 'Available' | 'Near Capacity' | 'Full';
  supplies: string[];
}

// Static offline directory database (accessible without cellular/internet connection)
const OFFLINE_SHELTER_DIRECTORY: Shelter[] = [
  {
    id: 'shelter_001',
    name: 'Central Civic Community Center',
    type: 'Evacuation Center',
    address: '124 Sector 4 Main Boulevard',
    contact: '+18005550199',
    latitude: 1.3521,
    longitude: 103.8198,
    capacityStatus: 'Available',
    supplies: ['Clean Water', 'Rations', 'Emergency Power', 'First Aid'],
  },
  {
    id: 'shelter_002',
    name: 'Northside District Hospital Outpost',
    type: 'Medical Post',
    address: '88 Healthcare Avenue',
    contact: '+18005550122',
    latitude: 1.3650,
    longitude: 103.8310,
    capacityStatus: 'Near Capacity',
    supplies: ['Medical Care', 'Oxygen', 'Defibrillator'],
  },
  {
    id: 'shelter_003',
    name: 'St. Jude Emergency Relief Hub',
    type: 'Distribution Point',
    address: '45 Relief Road, Block B',
    contact: '+18005550144',
    latitude: 1.3400,
    longitude: 103.8000,
    capacityStatus: 'Available',
    supplies: ['Blankets', 'Hygiene Kits', 'Dry Food Packs'],
  },
];

// Utility function calculating straight-line distance (km) between GPS coordinates
const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's mean radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function ExploreScreen() {
  // Consume shared emergency crisis state from global AppContext
  const { isEmergencyActive, toggleEmergencyMode } = useApp();

  // Consume live GPS location telemetry from hardware sensor hook
  const { currentLocation } = useTelemetry();

  // Local state for instant client-side offline searching
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Native phone dialer dispatch for emergency contacts
  const handleCallContact = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Call Error', 'Unable to initiate call on this device.');
    });
  };

  // Filter offline shelter list based on name, shelter type, or available supplies
  const filteredShelters = OFFLINE_SHELTER_DIRECTORY.filter(
    (shelter) =>
      shelter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shelter.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shelter.supplies.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <View style={styles.viewport}>
      <ScrollView contentContainerStyle={styles.scrollCanvas}>
        {/* Emergency Mode Banner Header */}
        <View
          style={[
            styles.statusBanner,
            isEmergencyActive ? styles.bannerEmergency : styles.bannerPeacetime,
          ]}
        >
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>
              {isEmergencyActive ? '🚨 CRISIS MODE ACTIVE' : '🛡️ PEACETIME MODE'}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {isEmergencyActive
                ? 'Prioritizing nearest emergency evacuation points and emergency posts.'
                : 'Browse local shelter directories and offline relief resources.'}
            </Text>
          </View>
          
          {/* Emergency Crisis Mode Simulation Toggle */}
          <TouchableOpacity
            style={styles.modeToggleButton}
            onPress={() => toggleEmergencyMode(!isEmergencyActive)}
            activeOpacity={0.8}
          >
            <Text style={styles.modeToggleText}>
              {isEmergencyActive ? 'Deactivate' : 'Simulate Hazard'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Offline SOS Broadcast Beacon */}
        <SOSBeacon/>

        {/* Directory Search & Title Header */}
        <View style={styles.headerSection}>
          <Text style={styles.sectionTitle}>Offline Shelter Directory</Text>
          <Text style={styles.sectionDescription}>
            Cached local database accessible during grid power failures or loss of network signal.
          </Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search shelter, type, or resource (e.g., Water)..."
            placeholderTextColor="#a0aec0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Shelter Resource Cards List */}
        {filteredShelters.map((shelter) => {
          // Dynamically compute user distance if live GPS telemetry coordinates are active
          const distance = currentLocation
            ? calculateDistanceKm(
                currentLocation.latitude,
                currentLocation.longitude,
                shelter.latitude,
                shelter.longitude
              ).toFixed(2)
            : null;

          return (
            <View key={shelter.id} style={styles.shelterCard}>
              <View style={styles.cardHeader}>
                <View style={styles.titleWrapper}>
                  <Text style={styles.shelterName}>{shelter.name}</Text>
                  <Text style={styles.shelterType}>{shelter.type}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    shelter.capacityStatus === 'Available'
                      ? styles.badgeAvailable
                      : styles.badgeWarning,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>{shelter.capacityStatus}</Text>
                </View>
              </View>

              <Text style={styles.shelterAddress}>📍 {shelter.address}</Text>

              {/* Distance readout derived from live GPS Telemetry */}
              {distance && (
                <Text style={styles.distanceText}>
                  📏 Approx. <Text style={styles.boldText}>{distance} km</Text> from current position
                </Text>
              )}

              {/* Available Supplies Tag Cloud */}
              <View style={styles.suppliesContainer}>
                {shelter.supplies.map((item, index) => (
                  <View key={index} style={styles.supplyChip}>
                    <Text style={styles.supplyChipText}>{item}</Text>
                  </View>
                ))}
              </View>

              {/* Native Dial Action Button */}
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handleCallContact(shelter.contact)}
                activeOpacity={0.7}
              >
                <Text style={styles.callButtonText}>📞 Call Emergency Contact ({shelter.contact})</Text>
              </TouchableOpacity>
            </View>
          );
        })}
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
    marginBottom: 20,
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
    color: '#2b6cb0',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#4a5568',
    marginTop: 2,
  },
  modeToggleButton: {
    backgroundColor: '#3182ce',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  modeToggleText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  headerSection: {
    marginBottom: 16,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
  },
  shelterType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3182ce',
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeAvailable: {
    backgroundColor: '#c6f6d5',
  },
  badgeWarning: {
    backgroundColor: '#feebc8',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22543d',
  },
  shelterAddress: {
    fontSize: 13,
    color: '#4a5568',
    marginBottom: 6,
  },
  distanceText: {
    fontSize: 12,
    color: '#2b6cb0',
    marginBottom: 10,
  },
  boldText: {
    fontWeight: '700',
  },
  suppliesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  supplyChip: {
    backgroundColor: '#edf2f7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  supplyChipText: {
    fontSize: 11,
    color: '#4a5568',
    fontWeight: '500',
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