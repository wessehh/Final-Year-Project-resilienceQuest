/**
 * Intgrate the aedService to be displayed
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { aedService, AEDLocation } from '@/services/aedService';

interface AEDCardProps {
  userLocation: { latitude: number; longitude: number } | null;
  limit?: number;
}

export const AEDCard: React.FC<AEDCardProps> = ({
  userLocation,
  limit = 3,
}) => {
  const [aedList, setAedList] = useState<AEDLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  
  const loadNearbyAEDs = useCallback(async () => {
    try {
      const data = await aedService.getNearbyAEDs(userLocation, limit);
      setAedList(data);
    } catch {
      setAedList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userLocation, limit]);

  useEffect(() => {
    loadNearbyAEDs();
  }, [loadNearbyAEDs]);

  const handleManualSync = async () => {
    setRefreshing(true);
    // Passing forceSync = true triggers an immediate remote check
    const updatedData = await aedService.getNearbyAEDs(userLocation, limit, true);
    setAedList(updatedData);
    setRefreshing(false);
  };

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

  const nearestAED = aedList[0];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.icon}>⚡</Text>
          <Text style={styles.title}>Nearest Public AED</Text>
        </View>
        <TouchableOpacity
          onPress={handleManualSync}
          disabled={loading || refreshing}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.syncButtonText}>
            {refreshing ? 'Syncing...' : 'Re-sync'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#DC2626" />
          <Text style={styles.loadingText}>Locating nearest AED stations...</Text>
        </View>
      ) : nearestAED ? (
        <View style={styles.content}>
          <View style={styles.mainInfo}>
            <Text style={styles.buildingName}>{nearestAED.buildingName}</Text>
            <Text style={styles.addressText}>{nearestAED.address}</Text>
            <Text style={styles.detailsText}>📍 {nearestAED.locationDetails}</Text>
          </View>

          <View style={styles.badgeRow}>
            {nearestAED.distanceKm !== undefined && (
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceBadgeText}>
                  {nearestAED.distanceKm} km away
                </Text>
              </View>
            )}
            {nearestAED.is24Hours && (
              <View style={styles.hoursBadge}>
                <Text style={styles.hoursBadgeText}>24/7 Access</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.directionsButton}
            onPress={() => openNavigation(nearestAED)}
            activeOpacity={0.8}
          >
            <Text style={styles.directionsButtonText}>Get Directions</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.emptyText}>No registered AED locations found nearby.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  syncButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  loaderContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  content: {
    gap: 12,
  },
  mainInfo: {
    gap: 2,
  },
  buildingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  addressText: {
    fontSize: 13,
    color: '#4B5563',
  },
  detailsText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distanceBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  distanceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
  },
  hoursBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hoursBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  directionsButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  directionsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 12,
  },
});