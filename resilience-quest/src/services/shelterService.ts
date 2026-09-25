// handle live SCDF fetching, cache staleness checks and 
// bundled fallback seeding

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationCoords } from '@/context/AppContext';
import seedShelters from '../assets/data/sg_shelters.json';

const CACHE_KEY = '@resiliencequest_scdf_shelters';
const LAST_SYNC_KEY = '@resiliencequest_scdf_shelters_last_sync';
const STALE_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 7; // 7 days staleness threshold

// Data.gov.sg SCDF Public Shelter Resource Endpoint
const DATA_GOV_SCDF_URL =
  'https://data.gov.sg/api/action/datastore_search?resource_id=d_291795a678b8cf82f108780a6235ce18';

export interface SCDFShelter {
  id: string;
  name: string;
  address: string;
  type: string;
  latitude: number;
  longitude: number;
  capacity: number;
  postalCode: string;
  distanceKm?: number;
}

/**
 * Great-circle distance calculation using the Haversine formula
 */
export function calculateHaversineDistance(
  coords1: LocationCoords,
  coords2: LocationCoords
): number {
  const EARTH_RADIUS_KM = 6371;
  const dLat = ((coords2.latitude - coords1.latitude) * Math.PI) / 180;
  const dLon = ((coords2.longitude - coords1.longitude) * Math.PI) / 180;

  const lat1Rad = (coords1.latitude * Math.PI) / 180;
  const lat2Rad = (coords2.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((EARTH_RADIUS_KM * c).toFixed(2));
}

export const shelterService = {
  /**
   * Developer utility: Clears local SCDF shelter cache and sync timestamp from AsyncStorage.
   * Forces the next loadShelters() invocation to execute a live API fetch or seed fallback.
   */    
  clearShelterCache: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(LAST_SYNC_KEY);
      console.log('[Dev Suite] SCDF Shelter cache and timestamp purged.');
    } catch (error) {
      console.error('failed to clear shelter cache:', error);
    }
  },

  /**
   * Primary data resolver:
   * 1. Attempts live pull from SCDF API if cache is missing or stale.
   * 2. Persists live payload to local AsyncStorage.
   * 3. Falls back to AsyncStorage if offline.
   * 4. Falls back to seed `sg_shelters.json` if storage is empty.
   */
  loadShelters: async (forceRefresh: boolean = false): Promise<SCDFShelter[]> => {
    const now = Date.now();
    
    try {
      const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_KEY);
      const lastSyncTime = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
      const isStale = now - lastSyncTime > STALE_THRESHOLD_MS;

      // 1. IF FRESH & NOT FORCED: Skip network request and return local cache
      if (!isStale && !forceRefresh) {
        const cachedData = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedData) {
          return JSON.parse(cachedData);
        }
      }

      // 2. IF STALE OR MISSING: Fetch live SCDF data from Data.gov.sg
      try {
        const response = await fetch(DATA_GOV_SCDF_URL, { method: 'GET' });
        if (response.ok) {
          const json = await response.json();
          const records = json?.result?.records || [];

          if (records.length > 0) {
            const liveShelters: SCDFShelter[] = records.map((item: any, idx: number) => ({
              id: item._id ? `scdf_${item._id}` : `scdf_live_${idx}`,
              name: item.NAME || item.SHELTER_NAME || 'SCDF Civil Defence Shelter',
              address: item.ADDRESS || item.STREET_NAME || 'Singapore',
              type: item.DESCRIPTION || item.SHELTER_TYPE || 'Civil Defence Shelter',
              latitude: parseFloat(item.LATITUDE) || 1.3521,
              longitude: parseFloat(item.LONGITUDE) || 103.8198,
              capacity: parseInt(item.CAPACITY, 10) || 2000,
              postalCode: item.POSTALCODE || item.POSTAL_CODE || '',
            }));

            // Save fresh data & update timestamp
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(liveShelters));
            await AsyncStorage.setItem(LAST_SYNC_KEY, now.toString());

            return liveShelters;
          }
        }
      } catch (networkErr) {
        console.warn('Network offline/failed during SCDF sync. Falling back to local cache:', networkErr);
      }

      // 3. FALLBACK TO EXISTING CACHE (If offline during stale refresh)
      const existingCache = await AsyncStorage.getItem(CACHE_KEY);
      if (existingCache) {
        return JSON.parse(existingCache);
      }
    } catch (err) {
      console.warn('Error evaluating shelter cache:', err);
    }

    // 4. ULTIMATE FALLBACK: Return bundled seed asset
    return seedShelters as SCDFShelter[];
  },

  /**
   * Calculates distance for all shelters relative to user coordinates, 
   * filters by radius, and returns sorted results by proximity.
   */
  getNearbyShelters: async (
    userLocation: LocationCoords | null,
    maxDistanceKm: number = 25
  ): Promise<SCDFShelter[]> => {
    const shelters = await shelterService.loadShelters();

    if (!userLocation) {
      return shelters;
    }

    return shelters
      .map((shelter) => {
        const distanceKm = calculateHaversineDistance(userLocation, {
          latitude: shelter.latitude,
          longitude: shelter.longitude,
        });
        return {
          ...shelter,
          distanceKm,
        };
      })
      .filter((shelter) => (shelter.distanceKm ?? 0) <= maxDistanceKm)
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  },
};