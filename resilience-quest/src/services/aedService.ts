/**
 * Manage public Automated External Defibrillator locations with quarterly caching
 * and local bundled seed fallback.
 */

import { calculateDistanceKm } from '@/utils/geoUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import BUNDLED_AEDS from '../assets/data/aeds.json';

export interface AEDLocation {
  id: string;
  buildingName: string;
  address: string;
  postalCode?: string;
  locationDetails: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
  is24Hours?: boolean;
}

const CACHE_KEY_AEDS = '@aed_cache_data';
const CACHE_KEY_LAST_SYNC = '@aed_cache_last_sync';
const QUARTER_IN_MS = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds

const DATASET_ID = 'd_e8934d28896a1eceecfe86f42dd3c077';
const DIRECT_ENDPOINT = `https://data.gov.sg/api/action/datastore_search?resource_id=${DATASET_ID}&limit=10000`;

// Parse minified bundled JSON records
const PARSED_BUNDLED_AEDS: AEDLocation[] = (BUNDLED_AEDS as any[]).map((item, index) => {
  const postalCode = item.p || item.postalCode || item.Postal_Code || '';
  const lat = parseFloat(item.latitude || item.Latitude || '1.3521');
  const lng = parseFloat(item.longitude || item.Longitude || '103.8198');

  return {
    id: item.id || `aed-bundled-${index}`,
    buildingName: item.b || item.buildingName || item.Building_Name || 'Public AED Station',
    address: postalCode ? `Singapore ${postalCode}` : 'Singapore',
    postalCode: String(postalCode),
    locationDetails: item.l || item.locationDetails || item.Location_Description || 'Publicly Accessible Area',
    latitude: !isNaN(lat) && lat !== 0 ? lat : 1.3521,
    longitude: !isNaN(lng) && lng !== 0 ? lng : 103.8198,
    is24Hours: true,
  };
});

export const aedService = {
  /**
   * Retrieves active dataset from local AsyncStorage cache or bundled seed fallback.
   * Auto-triggers remote sync if cache is older than 90 days (quarterly).
   */
  async fetchAllAEDs(forceSync: boolean = false): Promise<AEDLocation[]> {
    try {
      const lastSyncStr = await AsyncStorage.getItem(CACHE_KEY_LAST_SYNC);
      const cachedDataStr = await AsyncStorage.getItem(CACHE_KEY_AEDS);

      const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
      const isStale = Date.now() - lastSync > QUARTER_IN_MS;

      // If data is stale or sync is explicitly forced by user, sync in background
      if (forceSync || isStale || !cachedDataStr) {
        this.syncWithRemote().catch(() => {});
      }

      // Return cached remote data if available; otherwise return bundled seed
      if (cachedDataStr) {
        return JSON.parse(cachedDataStr);
      }
      return PARSED_BUNDLED_AEDS;
    } catch {
      return PARSED_BUNDLED_AEDS;
    }
  },

  /**
   * Performs live sync with data.gov.sg datastore and updates local cache
   */
  async syncWithRemote(): Promise<AEDLocation[]> {
    try {
      const response = await axios.get(DIRECT_ENDPOINT, { timeout: 15000 });
      const records: any[] = response.data?.result?.records || [];

      if (!Array.isArray(records) || records.length === 0) {
        return PARSED_BUNDLED_AEDS;
      }

      const mappedList: AEDLocation[] = records.map((record: any, index: number) => {
        const buildingName =
          record.Building_Name || record.building_name || 'Public AED Station';
        const locationDetails =
          record.Location_Description || record.location_description || 'Publicly Accessible Area';
        const postalCode = record.Postal_Code || record.postal_code || '';
        const lat = parseFloat(record.Latitude || record.latitude || record.lat || '1.3521');
        const lng = parseFloat(record.Longitude || record.longitude || record.lng || '103.8198');

        return {
          id: record._id ? `aed-${record._id}` : `aed-live-${index}`,
          buildingName,
          address: postalCode ? `Singapore ${postalCode}` : 'Singapore',
          postalCode: String(postalCode),
          locationDetails,
          latitude: !isNaN(lat) && lat !== 0 ? lat : 1.3521,
          longitude: !isNaN(lng) && lng !== 0 ? lng : 103.8198,
          is24Hours: true,
        };
      });

      // Update AsyncStorage cache and last synced timestamp
      await AsyncStorage.setItem(CACHE_KEY_AEDS, JSON.stringify(mappedList));
      await AsyncStorage.setItem(CACHE_KEY_LAST_SYNC, Date.now().toString());

      return mappedList;
    } catch {
      return PARSED_BUNDLED_AEDS;
    }
  },

  /**
   * Returns nearby AEDs sorted by distance to user coordinates
   */
  async getNearbyAEDs(
    currentLoc: { latitude: number; longitude: number } | null,
    limit?: number,
    forceSync: boolean = false
  ): Promise<AEDLocation[]> {
    let dataset = await this.fetchAllAEDs(forceSync);

    if (currentLoc) {
      dataset = dataset
        .map((aed) => ({
          ...aed,
          distanceKm: parseFloat(
            calculateDistanceKm(
              currentLoc.latitude,
              currentLoc.longitude,
              aed.latitude,
              aed.longitude
            ).toFixed(2)
          ),
        }))
        .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }

    // Return the full dataset if limit is omitted
    return limit ? dataset.slice(0, limit) : dataset;
  },
};