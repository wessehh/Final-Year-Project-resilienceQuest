/**
 * 
 * Real-time text searching (by building name, address or postal code), a 24/7 access filter chip
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  SafeAreaView,
  Switch,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { aedService, AEDLocation } from '@/services/aedService';

export default function AEDSearchScreen() {
  const router = useRouter();

  // State Management
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [aedList, setAedList] = useState<AEDLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [only24Hours, setOnly24Hours] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Fetch initial location and AED data
  useEffect(() => {
    let isMounted = true;

    async function initializeData() {
      setLoading(true);
      let coords: { latitude: number; longitude: number } | null = null;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          if (isMounted) setUserLocation(coords);
        }
      } catch {
        // Fallback gracefully if location permission is denied or fails
      }

      // Fetch full AED registry sorted by distance from user (or central SG if null)
      const data = await aedService.getNearbyAEDs(coords, 100);
      if (isMounted) {
        setAedList(data);
        setLoading(false);
      }
    }

    initializeData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered dataset based on search query & 24/7 filter toggle
  const filteredAEDs = useMemo(() => {
    return aedList.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.buildingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.locationDetails.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.postalCode && item.postalCode.includes(searchQuery.trim()));

      const matches24Hours = !only24Hours || item.is24Hours;

      return matchesSearch && matches24Hours;
    });
  }, [aedList, searchQuery, only24Hours]);

  // Direct map navigation launcher
  const openNavigation = (aed: AEDLocation) => {
    const label = encodeURIComponent(aed.buildingName);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${aed.latitude},${aed.longitude}`,
      android: `geo:0,0?q=${aed.latitude},${aed.longitude}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${aed.latitude},${aed.longitude}`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AED Directory</Text>
        <View style={styles.placeholderRight} />
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search building, address, or postal code..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Filter Chips & View Mode Toggle Row */}
      <View style={styles.controlsRow}>
        <View style={styles.filterChip}>
          <Text style={styles.filterChipLabel}>24/7 Access Only</Text>
          <Switch
            value={only24Hours}
            onValueChange={setOnly24Hours}
            trackColor={{ false: '#E5E7EB', true: '#FCA5A5' }}
            thumbColor={only24Hours ? '#DC2626' : '#9CA3AF'}
            style={styles.switchStyle}
          />
        </View>

        {/* List / Map Switcher */}
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            style={[styles.modeButton, viewMode === 'list' && styles.modeButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.modeButtonText, viewMode === 'list' && styles.modeButtonTextActive]}>
              📋 List ({filteredAEDs.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, viewMode === 'map' && styles.modeButtonActive]}
            onPress={() => setViewMode('map')}
          >
            <Text style={[styles.modeButtonText, viewMode === 'map' && styles.modeButtonTextActive]}>
              🗺️ Map
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main View Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Syncing SCDF AED Registry...</Text>
        </View>
      ) : viewMode === 'list' ? (
        /* LIST VIEW MODE */
        <FlatList
          data={filteredAEDs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No AED locations match your query.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.aedCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.buildingName}>{item.buildingName}</Text>
                {item.distanceKm !== undefined && (
                  <Text style={styles.distanceText}>{item.distanceKm} km</Text>
                )}
              </View>

              <Text style={styles.addressText}>{item.address}</Text>
              <Text style={styles.detailsText}>📍 {item.locationDetails}</Text>

              <View style={styles.cardFooter}>
                <View style={styles.badgeRow}>
                  {item.is24Hours && (
                    <View style={styles.hoursBadge}>
                      <Text style={styles.hoursBadgeText}>24/7 Access</Text>
                    </View>
                  )}
                  {item.postalCode ? (
                    <Text style={styles.postalCodeText}>S({item.postalCode})</Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={styles.navigateButton}
                  onPress={() => openNavigation(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.navigateButtonText}>Navigate ➔</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        /* MAP VIEW PLACEHOLDER / FUTURE INTEGRATION CONTAINER */
        <View style={styles.mapContainer}>
          {/* 
            FUTURE MAPVIEW UPGRADE STEP:
            Replace this placeholder View with:
            
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: userLocation?.latitude ?? 1.3521,
                longitude: userLocation?.longitude ?? 103.8198,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              {filteredAEDs.map((aed) => (
                <Marker
                  key={aed.id}
                  coordinate={{ latitude: aed.latitude, longitude: aed.longitude }}
                  title={aed.buildingName}
                  description={aed.locationDetails}
                />
              ))}
            </MapView>
          */}
          <View style={styles.mapPlaceholderBox}>
            <Text style={styles.mapPlaceholderIcon}>🗺️</Text>
            <Text style={styles.mapPlaceholderTitle}>Interactive Map Ready</Text>
            <Text style={styles.mapPlaceholderSub}>
              Showing {filteredAEDs.length} locations on coordinates.
            </Text>
            {userLocation && (
              <Text style={styles.userCoordsText}>
                User Position: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
              </Text>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  placeholderRight: {
    width: 48,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  switchStyle: {
    transform: Platform.OS === 'ios' ? [{ scaleX: 0.75 }, { scaleY: 0.75 }] : [],
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  modeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  modeButtonTextActive: {
    color: '#111827',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  aedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  buildingName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  addressText: {
    fontSize: 13,
    color: '#4B5563',
  },
  detailsText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hoursBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hoursBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
  postalCodeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  navigateButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  navigateButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#E5E7EB',
  },
  mapPlaceholderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F3F4F6',
  },
  mapPlaceholderIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  mapPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  mapPlaceholderSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  userCoordsText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});