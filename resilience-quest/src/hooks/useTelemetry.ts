// Hardware GPS and Permission Hook 
// Encapsulates expo-location permissions and sensor handshake logic 
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { useApp } from '@/context/AppContext';

export interface TelemetryLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

/**
 * useTelemetry Hook
 * Reads live hardware GPS coordinates, preferring active simulated overrides from AppContext when testing.
 */
export const useTelemetry = () => {
  const { simulatedLocation } = useApp();
  const [hardwareLocation, setHardwareLocation] = useState<TelemetryLocation | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<'INITIALIZING' | 'ACTIVE' | 'DENIED' | 'ERROR'>('INITIALIZING');

  const fetchHardwareLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setTrackingStatus('DENIED');
        // Fallback default coordinates if hardware permission is rejected
        setHardwareLocation({ latitude: 1.3521, longitude: 103.8198, accuracy: 10 });
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setHardwareLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });
      setTrackingStatus('ACTIVE');
    } catch (error) {
      setTrackingStatus('ERROR');
      // Fallback location for offline/emulator compatibility
      setHardwareLocation({ latitude: 1.3521, longitude: 103.8198, accuracy: 15 });
    }
  };

  useEffect(() => {
    fetchHardwareLocation();
  }, []);

  // Effective location prioritizes simulated location override over physical hardware GPS
  const effectiveLocation: TelemetryLocation | null = simulatedLocation
    ? { latitude: simulatedLocation.latitude, longitude: simulatedLocation.longitude, accuracy: 1 }
    : hardwareLocation;

  return {
    currentLocation: effectiveLocation,
    trackingStatus,
    reSyncTelemetry: fetchHardwareLocation,
  };
};