/**
 * manage public Automated External Defibrillator locations with coordinate distance calculation
 */

import { calculateDistanceKm } from '@/utils/geoUtils'; // existing haversine utility
import axios from 'axios';
import { Platform } from 'react-native';

export interface AEDLocation {
  id: string;
  buildingName: string;
  address: string;
  postalCode?: string;
  locationDetails: string; // e.g. "Level 1, Lift Lobby B"
  latitude: number;
  longitude: number;
  distanceKm?: number;
  is24Hours?: boolean;
}

// Offline seed fallback dataset for key Singapore hubs
const SEED_AEDS: AEDLocation[] = [
  {
    id: 'aed-001',
    buildingName: 'Dhoby Ghaut MRT Station',
    address: '60 Orchard Rd',
    postalCode: '238889',
    locationDetails: 'B1 Concourse Level near Passenger Service Centre',
    latitude: 1.2991,
    longitude: 103.8458,
    is24Hours: true,
  },
  {
    id: 'aed-002',
    buildingName: 'Jurong East Bus Interchange',
    address: '60 Jurong Gateway Rd',
    postalCode: '608548',
    locationDetails: 'Level 1, opposite Berth 3',
    latitude: 1.3332,
    longitude: 103.7423,
    is24Hours: true,
  },
  {
    id: 'aed-003',
    buildingName: 'Tampines Hub',
    address: '1 Tampines Walk',
    postalCode: '528523',
    locationDetails: 'L1 Information Counter',
    latitude: 1.3532,
    longitude: 103.9402,
    is24Hours: true,
  },
];

const RAW_AED_ENDPOINT =
  'https://data.gov.sg/api/action/datastore_search?resource_id=aed-registry-sg';

export const aedService = {
  /**
   * Fetches all registered AED locations from live dataset with offline fallback
   */
  async fetchAllAEDs(): Promise<AEDLocation[]> {
    try {
      const endpoint =
        Platform.OS === 'web'
          ? `https://api.allorigins.win/get?url=${encodeURIComponent(RAW_AED_ENDPOINT)}`
          : RAW_AED_ENDPOINT;

      const response = await axios.get(endpoint, { timeout: 6000 });

      let data: any = response.data;
      if (Platform.OS === 'web' && data?.contents) {
        data = typeof data.contents === 'string' ? JSON.parse(data.contents) : data.contents;
      }

      const records = data?.result?.records || [];
      if (!Array.isArray(records) || records.length === 0) {
        return SEED_AEDS;
      }

      return records
        .map((record: any, index: number) => ({
          id: record._id ? `aed-${record._id}` : `aed-live-${index}`,
          buildingName: record.building_name || record.location_name || 'Public AED Station',
          address: record.address || record.street_name || 'Public Premises',
          postalCode: record.postal_code || '',
          locationDetails: record.location_description || record.floor || 'Publicly Accessible Area',
          latitude: parseFloat(record.latitude || record.lat || 0),
          longitude: parseFloat(record.longitude || record.lng || 0),
          is24Hours: record.operating_hours ? record.operating_hours.includes('24') : true,
        }))
        .filter(
          (aed: AEDLocation) =>
            !isNaN(aed.latitude) &&
            !isNaN(aed.longitude) &&
            aed.latitude !== 0 &&
            aed.longitude !== 0
        );
    } catch {
      // Return offline fallback dataset when network requests are unavailable or deferred
      return SEED_AEDS;
    }
  },

  /**
   * Returns nearby AEDs sorted by distance to the user's current coordinates
   */
  async getNearbyAEDs(
    currentLoc: { latitude: number; longitude: number } | null,
    limit: number = 5
  ): Promise<AEDLocation[]> {
    const liveAEDs = await this.fetchAllAEDs();
    let dataset = liveAEDs.length > 0 ? liveAEDs : [...SEED_AEDS];

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

    return dataset.slice(0, limit);
  },
};