// handle live SCDF fetching, cache staleness checks and 
// bundled fallback seeding
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationCoords } from '@/context/AppContext';
import seedShelters from '../assets/data/sg_shelters.json';
import { oneMapService } from './oneMapService';

const CACHE_KEY = '@resiliencequest_scdf_shelters';
const LAST_SYNC_KEY = '@resiliencequest_scdf_shelters_last_sync';
const GEOCODE_LOOKUP_KEY = '@resiliencequest_address_coords_map';
const CACHE_STALE_DAYS = 90;
const CACHE_EXPIRY_MS = CACHE_STALE_DAYS * 24 * 60 * 60 * 1000; // 90 days (quarterly)

// Optimal parallel requests to maximize throughput without hitting OneMap HTTP 429 limits
const CONCURRENCY_LIMIT = 3;
// pace the requests to respect the SLA OneMap rate limits
const BETWEEN_REQUEST_DELAY_MS = 150;

const DATA_GOV_SCDF_URL =
  'https://data.gov.sg/api/action/datastore_search?resource_id=d_291795a678b8cf82f108780a6235ce18&limit=1000';

export interface SCDFShelter {
  id: string;
  name: string;
  address: string;
  type: string;
  latitude: number;
  longitude: number;
  postalCode: string;
  distanceKm?: number;
  isGeocodeFallback?: boolean; // True if exact OneMap geocoding failed
}

/**
 * In-flight request map to deduplicate concurrent requests for the exact same query
 */
const inFlightRequests = new Map<string, Promise<{ latitude: number; longitude: number } | null>>();

/**
 * Global persistent progress subscribers set
 */
const progressListeners = new Set<(progress: number) => void>();

function broadcastProgress(progress: number) {
  progressListeners.forEach((listener) => listener(progress));
}

async function deduplicatedGeocode(
  query: string,
  geocodeMap: Record<string, { latitude: number; longitude: number }>
): Promise<{ latitude: number; longitude: number } | null> {
  if (!query) return null;
  const key = query.toLowerCase().trim();

  // 1. Check persistent memory cache first
  if (geocodeMap[key]) {
    return geocodeMap[key];
  }

  // 2. If another worker is already fetching this exact query, attach to its Promise
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }

  // 3. Otherwise, initiate a single network request and store the Promise in the map 
  const requestPromise = geocodeWithRetry(query).then((coords) => {
    if (coords) {
      geocodeMap[key] = coords; // Immediately populate in-memory map for subsequent checks
    }
    return coords;
  }).finally(() => {
    inFlightRequests.delete(key); // Clean up completed request 
  });

  inFlightRequests.set(key, requestPromise);
  return requestPromise;
}

// Active sync lock to prevent duplicate parallel sync loops across UI components
let activeLoadPromise: Promise<SCDFShelter[]> | null = null;

/**
 * Concurrency Pool Helper: Executes `taskFn` on `items` using a maximum of `limit` parallel workers.
 */
async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  taskFn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const worker = async () => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await taskFn(items[index], index);
      // Pacing delay to prevent rapid-fire burst limits on OneMap
      await new Promise((resolve) => setTimeout(resolve, BETWEEN_REQUEST_DELAY_MS));
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Executes oneMapService.geocodeLocation with up to 2 retries on rate limits or drops.
 */
async function geocodeWithRetry(
  query: string,
  retries: number = 2,
  delayMs: number = 150
): Promise<{ latitude: number; longitude: number } | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const coords = await oneMapService.geocodeLocation(query);
    if (coords) return coords;
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  return null;
}

/**
 * Normalizes raw SCDF addresses into SLA OneMap search query variants.
 */
function prepareAddressVariants(rawAddress: string): string[] {
  if (!rawAddress) return [];

  let clean = rawAddress
    .replace(/^HDB Shelter\s*-\s*/i, '')
    .replace(/#\s*[a-zA-Z0-9-]+/g, '')     // #01-490, #B1-186
    .replace(/\b[bB]\d+-\d+\b/g, '')        // B1-186 without #
    .replace(/\b\d{2}-\d{2,4}\b/g, '')      // 01-490 without #
    .replace(/\bS\s*\(\d{6}\)/gi, '')       // S(510233)
    .replace(/\bSingapore\s*\d{6}\b/gi, '') // Singapore 510233
    .replace(/\b\d{6}\b/g, '')              // Standalone 6-digit postal codes
    .replace(/#/g, '')
    .replace(/'/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  clean = clean.replace(/Blk\s+([0-9A-Za-z]+)\/[0-9A-Za-z]+/i, 'Blk $1');
  clean = clean.replace(/^([0-9A-Za-z]+)\/[0-9A-Za-z]+/, '$1');

  clean = clean.replace(/Stratmore/gi, 'Strathmore');
  clean = clean.replace(/\bSt\s+George/gi, 'Saint George');

  const expanded = clean
    .replace(/\bSt\b|\bSt\.\b/gi, 'Street')
    .replace(/\bDr\b|\bDr\.\b/gi, 'Drive')
    .replace(/\bAve\b|\bAve\.\b/gi, 'Avenue')
    .replace(/\bLor\b|\bLor\.\b/gi, 'Lorong')
    .replace(/\bRd\b|\bRd\.\b/gi, 'Road')
    .replace(/\bBt\b|\bBt\.\b/gi, 'Bukit')
    .replace(/\bJln\b|\bJln\.\b/gi, 'Jalan')
    .replace(/\bNth\b/gi, 'North')
    .replace(/\bSth\b/gi, 'South')
    .replace(/\bCtrl\b/gi, 'Central')
    .replace(/\s+/g, ' ')
    .trim();

  const abbreviated = clean
    .replace(/\bStreet\b/gi, 'St')
    .replace(/\bDrive\b/gi, 'Dr')
    .replace(/\bAvenue\b/gi, 'Ave')
    .replace(/\bLorong\b/gi, 'Lor')
    .replace(/\bRoad\b/gi, 'Rd')
    .replace(/\bBukit\b/gi, 'Bt')
    .replace(/\bJalan\b/gi, 'Jln')
    .replace(/\s+/g, ' ')
    .trim();

  const variants: string[] = [];

  const addVariants = (str: string) => {
    if (!str) return;
    if (/\bCC\b/i.test(str)) {
      variants.push(str.replace(/\bCC\b/gi, 'Community Club'));
      variants.push(str.replace(/\bCC\b/gi, 'Community Centre'));
      variants.push(str);
    } else {
      const noBlk = str.replace(/^Blk\s+/i, '').trim();
      const withBlk = str.startsWith('Blk ') ? str : `Blk ${str}`;
      variants.push(noBlk);
      variants.push(withBlk);
    }
  };

  addVariants(clean);
  addVariants(expanded);
  addVariants(abbreviated);

  return Array.from(new Set(variants)).filter(Boolean);
}

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

async function performLoadShelters(
  forceRefresh: boolean = false
): Promise<SCDFShelter[]> {
  const seedMap = new Map<string, { latitude: number; longitude: number }>();
  (seedShelters as SCDFShelter[]).forEach((s) => {
    if (s.postalCode) seedMap.set(s.postalCode, { latitude: s.latitude, longitude: s.longitude });
    if (s.address) seedMap.set(s.address.toLowerCase(), { latitude: s.latitude, longitude: s.longitude });
  });

  const now = Date.now();

  try {
    const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const lastSyncTime = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
    const isStale = now - lastSyncTime > CACHE_EXPIRY_MS;
    
    if (!forceRefresh && !isStale) {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        broadcastProgress(1);
        return JSON.parse(cachedData);
      }
    }

    try {
      const response = await fetch(DATA_GOV_SCDF_URL, { method: 'GET' });
      if (response.ok) {
        const json = await response.json();
        const records = json?.result?.records || [];

        if (records.length > 0) {
          const savedLookupStr = await AsyncStorage.getItem(GEOCODE_LOOKUP_KEY);
          const geocodeMap: Record<string, { latitude: number; longitude: number }> = savedLookupStr
            ? JSON.parse(savedLookupStr)
            : {};

          let unpersistedCount = 0;
          let completedCount = 0;
          const totalRecords = records.length;

          const liveShelters = await mapConcurrent(records, CONCURRENCY_LIMIT, async (item: any, i: number) => {
            let postalCode = (
              item.POSTALCODE || item.POSTAL_CODE || item.postal_code || item.POSTAL || ''
            ).toString().trim();

            const blkNo = (item.BLK_NO || item.block || item.BLOCK || '').toString().trim();
            const rawStreet = (item.STREET_NAME || item.street || item.STREET || item.ROAD_NAME || '').toString().trim();
            const rawAddress = (item.ADDRESS || item.address || item.LOCATION || '').toString().trim();
            const rawName = (item.NAME || item.SHELTER_NAME || item.building || '').toString().replace(/\s+/g, ' ').trim();

            if (!postalCode || postalCode.length < 5) {
              const match = (rawAddress + ' ' + rawName).match(/\b(\d{6})\b/);
              if (match) {
                postalCode = match[1];
              }
            }

            const constructedAddress = [blkNo, rawStreet].filter(Boolean).join(' ');
            const fullAddress = (constructedAddress || rawAddress || 'Singapore').replace(/\s+/g, ' ').trim();

            const cleanDisplayAddress = fullAddress
              .replace(/#\s*[a-zA-Z0-9-]+/g, '')
              .replace(/\b[bB]\d+-\d+\b/g, '')
              .replace(/\b\d{2}-\d{2,4}\b/g, '')
              .replace(/\s+/g, ' ')
              .trim();

            let formattedName = rawName;
            if (!formattedName || formattedName.toUpperCase() === 'HDB') {
              if (blkNo && rawStreet) {
                formattedName = `HDB Blk ${blkNo} (${rawStreet})`;
              } else if (cleanDisplayAddress !== 'Singapore') {
                formattedName = `HDB Shelter - ${cleanDisplayAddress}`;
              } else {
                formattedName = 'HDB Civil Defence Shelter';
              }
            }

            let coords: { latitude: number; longitude: number } | null = null;
            const addressVariants = prepareAddressVariants(fullAddress);
            const cacheKey = (postalCode || addressVariants[0] || fullAddress).toLowerCase().trim();

            if (geocodeMap[cacheKey]) {
              coords = geocodeMap[cacheKey];
            }

            if (!coords && postalCode && postalCode.length >= 5) {
              coords = await deduplicatedGeocode(postalCode, geocodeMap);
            }

            if (!coords) {
              for (const variant of addressVariants) {
                coords = await deduplicatedGeocode(variant, geocodeMap);
                if (coords) break;
              }
            }

            if (!coords && formattedName) {
              const nameVariants = prepareAddressVariants(formattedName);
              for (const nVariant of nameVariants) {
                coords = await deduplicatedGeocode(nVariant, geocodeMap);
                if (coords) break;
              }
            }

            if (!coords && rawStreet) {
              const streetVariants = prepareAddressVariants(rawStreet);
              for (const stVariant of streetVariants) {
                coords = await deduplicatedGeocode(stVariant, geocodeMap);
                if (coords) break;
              }
            }

            if (coords) {
              if (!geocodeMap[cacheKey]) {
                geocodeMap[cacheKey] = coords;
                unpersistedCount++;
              }
            }

            const seedFallback = 
              (postalCode ? seedMap.get(postalCode) : null) ||
              seedMap.get(cleanDisplayAddress.toLowerCase());

            const finalLatitude = coords?.latitude ?? seedFallback?.latitude ?? 1.3521;
            const finalLongitude = coords?.longitude ?? seedFallback?.longitude ?? 103.8198;
            const isFallback = !coords;

            if (unpersistedCount >= 20) {
              unpersistedCount = 0;
              AsyncStorage.setItem(GEOCODE_LOOKUP_KEY, JSON.stringify(geocodeMap)).catch(() => {});
            }

            completedCount++;
            broadcastProgress(completedCount / totalRecords);

            if (completedCount % 5 === 0 || completedCount === totalRecords) {
              await new Promise((resolve) => setTimeout(resolve, 0));
            }

            return {
              id: item._id ? `scdf_${item._id}` : `scdf_live_${i}`,
              name: formattedName,
              address: cleanDisplayAddress,
              type: item.DESCRIPTION || item.SHELTER_TYPE || 'Civil Defence Shelter',
              latitude: finalLatitude,
              longitude: finalLongitude,
              postalCode,
              isGeocodeFallback: isFallback,
            };
          });

          await AsyncStorage.setItem(GEOCODE_LOOKUP_KEY, JSON.stringify(geocodeMap));
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(liveShelters));
          await AsyncStorage.setItem(LAST_SYNC_KEY, now.toString());

          return liveShelters;
        }
      }
    } catch (networkErr) {
      console.warn('Network error during SCDF sync:', networkErr);
    }

    const existingCache = await AsyncStorage.getItem(CACHE_KEY);
    if (existingCache) {
      broadcastProgress(1);
      return JSON.parse(existingCache);
    }
  } catch (err) {
    console.warn('Error evaluating shelter cache:', err);
  }

  broadcastProgress(1);
  return seedShelters as SCDFShelter[];
}

export const shelterService = {
  subscribeProgress: (listener: (progress: number) => void): (() => void) => {
    progressListeners.add(listener);
    return () => {
      progressListeners.delete(listener);
    };
  },

  clearShelterCache: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(LAST_SYNC_KEY);
      await AsyncStorage.removeItem(GEOCODE_LOOKUP_KEY);
      console.log('[Dev Suite] Shelter cache and persistent lookup map purged.');
    } catch (error) {
      console.error('Failed to clear shelter cache:', error);
    }
  },

  loadShelters: (
    forceRefresh: boolean = false,
    onProgress?: (progress: number) => void
  ): Promise<SCDFShelter[]> => {
    if (onProgress) {
      progressListeners.add(onProgress);
    }

    if (activeLoadPromise) {
      return activeLoadPromise;
    }

    activeLoadPromise = performLoadShelters(forceRefresh).finally(() => {
      activeLoadPromise = null;
    });

    return activeLoadPromise;
  },

  getNearbyShelters: async (
    userLocation: LocationCoords | null,
    maxDistanceKm: number = 25,
    forceRefresh: boolean = false,
    onProgress?: (progress: number) => void
  ): Promise<SCDFShelter[]> => {
    const shelters = await shelterService.loadShelters(forceRefresh, onProgress);

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