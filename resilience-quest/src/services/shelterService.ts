// handle live SCDF fetching, cache staleness checks and 
// bundled fallback seeding
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationCoords } from '@/context/AppContext';
import seedShelters from '../assets/data/sg_shelters.json';
import { oneMapService } from './oneMapService';

const CACHE_KEY = '@resiliencequest_scdf_shelters';
const LAST_SYNC_KEY = '@resiliencequest_scdf_shelters_last_sync';
const GEOCODE_LOOKUP_KEY = '@resiliencequest_address_coords_map';
const STALE_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// Optimal parallel requests to maximize throughput without hitting OneMap HTTP 429 limits
const CONCURRENCY_LIMIT = 6;

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

  // 1. Strip title prefixes, unit numbers (#01-490, #B1-186), postal codes, and quotes
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

  // 2. Multi-block notation fix (e.g. "491D/491E" -> "491D", "219/220" -> "219")
  clean = clean.replace(/Blk\s+([0-9A-Za-z]+)\/[0-9A-Za-z]+/i, 'Blk $1');
  clean = clean.replace(/^([0-9A-Za-z]+)\/[0-9A-Za-z]+/, '$1');

  // 3. Dataset typos & specific expansions
  clean = clean.replace(/Stratmore/gi, 'Strathmore');
  clean = clean.replace(/\bSt\s+George/gi, 'Saint George');

  // Expanded variant (Dr -> Drive, St -> Street)
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

  // Abbreviated variant (Drive -> Dr, Street -> St)
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
      variants.push(noBlk);      // "491D Tampines St 45"
      variants.push(withBlk);    // "Blk 491D Tampines St 45"
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

async function performLoadShelters(forceRefresh: boolean = false): Promise<SCDFShelter[]> {
  const now = Date.now();

  try {
    const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const lastSyncTime = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
    const isStale = now - lastSyncTime > STALE_THRESHOLD_MS;

    if (!isStale && !forceRefresh) {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
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

          // Process records in parallel batches using concurrency limit
          const liveShelters = await mapConcurrent(records, CONCURRENCY_LIMIT, async (item: any, i: number) => {
            let postalCode = (
              item.POSTALCODE || item.POSTAL_CODE || item.postal_code || item.POSTAL || ''
            ).toString().trim();

            const blkNo = (item.BLK_NO || item.block || item.BLOCK || '').toString().trim();
            const rawStreet = (item.STREET_NAME || item.street || item.STREET || item.ROAD_NAME || '').toString().trim();
            const rawAddress = (item.ADDRESS || item.address || item.LOCATION || '').toString().trim();
            const rawName = (item.NAME || item.SHELTER_NAME || item.building || '').toString().replace(/\s+/g, ' ').trim();

            // Regex fallback: Extract 6-digit Singapore postal code if missing from explicit JSON keys
            if (!postalCode || postalCode.length < 5) {
              const match = (rawAddress + ' ' + rawName).match(/\b(\d{6})\b/);
              if (match) {
                postalCode = match[1];
              }
            }

            const constructedAddress = [blkNo, rawStreet].filter(Boolean).join(' ');
            const fullAddress = (constructedAddress || rawAddress || 'Singapore').replace(/\s+/g, ' ').trim();

            // Clean address for UI display (strips basement & unit numbers like #01-490, #B1-186)
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
            const cacheKey = postalCode || addressVariants[0] || fullAddress;

            // Priority 0: Check Persistent Geocode Cache (0ms)
            if (geocodeMap[cacheKey]) {
              coords = geocodeMap[cacheKey];
            }

            // Priority 1: Postal Code Geocoding
            if (!coords && postalCode && postalCode.length >= 5) {
              coords = await geocodeWithRetry(postalCode);
            }

            // Priority 2: Address Variants (Cleaned, Expanded, Abbreviated)
            if (!coords) {
              for (const variant of addressVariants) {
                coords = await geocodeWithRetry(variant);
                if (coords) break;
              }
            }

            // Priority 3: Formatted Name Variants (e.g. Community Clubs)
            if (!coords && formattedName) {
              const nameVariants = prepareAddressVariants(formattedName);
              for (const nVariant of nameVariants) {
                coords = await geocodeWithRetry(nVariant);
                if (coords) break;
              }
            }

            // Priority 4: Street Fallback
            if (!coords && rawStreet) {
              const streetVariants = prepareAddressVariants(rawStreet);
              for (const stVariant of streetVariants) {
                coords = await geocodeWithRetry(stVariant);
                if (coords) break;
              }
            }

            if (coords) {
              if (!geocodeMap[cacheKey]) {
                geocodeMap[cacheKey] = coords;
                unpersistedCount++;
              }
            } else {
              console.warn(`[Geocode Fallback] ${formattedName} failed, using default coords.`);
            }

            // Batch save new geocodes every 20 items asynchronously
            if (unpersistedCount >= 20) {
              unpersistedCount = 0;
              AsyncStorage.setItem(GEOCODE_LOOKUP_KEY, JSON.stringify(geocodeMap)).catch(() => {});
            }

            return {
              id: item._id ? `scdf_${item._id}` : `scdf_live_${i}`,
              name: formattedName,
              address: cleanDisplayAddress,
              type: item.DESCRIPTION || item.SHELTER_TYPE || 'Civil Defence Shelter',
              latitude: coords?.latitude ?? 1.3521,
              longitude: coords?.longitude ?? 103.8198,
              postalCode,
            };
          });

          // Final persistence pass
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
      return JSON.parse(existingCache);
    }
  } catch (err) {
    console.warn('Error evaluating shelter cache:', err);
  }

  return seedShelters as SCDFShelter[];
}

export const shelterService = {
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

  loadShelters: (forceRefresh: boolean = false): Promise<SCDFShelter[]> => {
    // Return active promise if sync is already running
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