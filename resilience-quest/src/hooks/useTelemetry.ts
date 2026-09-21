// Hardware GPS and Permission Hook 
// Encapsulates expo-location permissions and sensor handshake logic 

import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking } from 'react-native';
import * as Location from 'expo-location';
import { TrackingStatus } from '@/types';

export const useTelemetry = () => {
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('Initialising sensors...');

  const initialiseTelemetry = useCallback(async () => {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        setTrackingStatus('Disabled');
        if (Platform.OS === 'android') {
          await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
        } else {
          await Linking.openSettings();
        }
        return;
      }

      let permissionResult = await Location.getForegroundPermissionsAsync();
      let currentStatus = permissionResult.status;

      if (currentStatus !== 'granted') {
        setTrackingStatus('Syncing...');
        const requestResult = await Location.requestForegroundPermissionsAsync();
        currentStatus = requestResult.status;
      }

      if (currentStatus !== 'granted') {
        setTrackingStatus('Unauthorised');
        setCurrentLocation(null);
        await Linking.openSettings();
        return;
      }

      setTrackingStatus('Active');

      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc) setCurrentLocation(loc.coords);
      } catch {
        const lowAccuracyLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
        if (lowAccuracyLoc) {
          setCurrentLocation(lowAccuracyLoc.coords);
          setTrackingStatus('Active (Approximate)');
        }
      }
    } catch (err) {
      console.error('Hardware telemetry connection failure:', err);
      setTrackingStatus('Error');
    }
  }, []);

  useEffect(() => {
    initialiseTelemetry();
  }, [initialiseTelemetry]);

  return { currentLocation, trackingStatus, reSyncTelemetry: initialiseTelemetry };
};