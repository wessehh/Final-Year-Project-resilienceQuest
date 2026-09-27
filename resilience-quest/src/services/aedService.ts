// manage public Automated External Defibrillator locations with coordinate distance calculation
import { calculateDistanceKm } from '@/utils/geoUtils'; // existing haversine utility

export interface AEDLocation {
  id: string;
  buildingName: string;
  address: string;
  postalCode: string;
  locationDetails: string; // e.g. "Level 1, Lift Lobby B"
  latitude: number;
  longitude: number;
  distanceKm?: number;
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
  },
  {
    id: 'aed-002',
    buildingName: 'Jurong East Bus Interchange',
    address: '60 Jurong Gateway Rd',
    postalCode: '608548',
    locationDetails: 'Level 1, opposite Berth 3',
    latitude: 1.3332,
    longitude: 103.7423,
  },
  {
    id: 'aed-003',
    buildingName: 'Tampines Hub',
    address: '1 Tampines Walk',
    postalCode: '528523',
    locationDetails: 'L1 Information Counter',
    latitude: 1.3532,
    longitude: 103.9402,
  },
];

export const aedService = {
  async getNearbyAEDs(
    currentLoc: { latitude: number; longitude: number } | null,
    limit: number = 5
  ): Promise<AEDLocation[]> {
    let dataset = [...SEED_AEDS];

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