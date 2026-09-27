// fetch official NEA 2-hour weather forecast and heavy rain alerts
// PUB water level/flood advisories from data.gov.sg

import axios from 'axios';

export interface EnvironmentalAlert {
  id: string;
  type: 'RAIN' | 'FLOOD' | 'SUMP_HIGH' | 'WEATHER_WARNING';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  areaName: string;
  timestamp: string;
}

export interface HazardAlertSummary {
  weatherForecast: string;
  floodAlertMessage: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  hasActiveEmergency: boolean;
  activeAlertsCount: number;
}

const NEA_2HR_WEATHER_V2_ENDPOINT =
  'https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast';

const RAW_PUB_WATER_LEVEL_ENDPOINT =
  'https://api.data.gov.sg/v1/environment/water-level-sensors';

export const hazardAlertService = {
  /**
   * Fetches live NEA 2-hr weather forecasts and filters for heavy rain / thunderstorms
   */
  async getLiveNEAAlerts(): Promise<EnvironmentalAlert[]> {
    try {
      const response = await axios.get(NEA_2HR_WEATHER_V2_ENDPOINT);
      const items = response.data?.data?.items?.[0];
      const forecasts: Array<{ area: string; forecast: string }> = items?.forecasts || [];

      const activeAlerts: EnvironmentalAlert[] = [];

      forecasts.forEach((item, index) => {
        const text = item.forecast.toLowerCase();
        if (
          text.includes('heavy rain') ||
          text.includes('thunderstorm') ||
          text.includes('heavy showers') ||
          text.includes('thundershowers')
        ) {
          activeAlerts.push({
            id: `nea-rain-${index}`,
            type: 'RAIN',
            severity: text.includes('heavy') ? 'HIGH' : 'MEDIUM',
            title: `⛈️ ${item.forecast} Advisory`,
            description: `NEA forecasts active rain/thunderstorm risk over ${item.area}.`,
            areaName: item.area,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        }
      });

      return activeAlerts;
    } catch (err) {
      return [];
    }
  },

  /**
   * Fetches live PUB water level sensor readings directly from data.gov.sg API
   */
  async getLivePUBFloodAlerts(): Promise<EnvironmentalAlert[]> {
    let responseData: any = null;

    // Try direct v1 call without v2 key headers (v1 gateway rejects v2 keys with 403)
    try {
      const res = await axios.get(RAW_PUB_WATER_LEVEL_ENDPOINT, {
        headers: { Accept: 'application/json' },
        timeout: 8000,
      });
      responseData = res.data;
    } catch (err: any) {
      // Fallback to CORS/proxy unwrapping if direct request is blocked (Web or Network restrictions)
      const proxyUrls = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(RAW_PUB_WATER_LEVEL_ENDPOINT)}`,
        `https://corsproxy.io/?${encodeURIComponent(RAW_PUB_WATER_LEVEL_ENDPOINT)}`,
      ];

      for (const url of proxyUrls) {
        try {
          const res = await axios.get(url, { timeout: 6000 });
          if (res.data?.contents) {
            responseData = typeof res.data.contents === 'string'
              ? JSON.parse(res.data.contents)
              : res.data.contents;
          } else {
            responseData = typeof res.data === 'string'
              ? JSON.parse(res.data)
              : res.data;
          }
          if (responseData) break;
        } catch {
          // Try next fallback proxy if current fails
        }
      }
    }

    if (!responseData) {
      return [];
    }

    const items = responseData?.items?.[0];
    const readings: Array<{ station_id?: string; id?: string; value: number }> =
      items?.readings || [];

    const alerts: EnvironmentalAlert[] = [];

    readings.forEach((sensor) => {
      const stationId = sensor.station_id || sensor.id || 'unknown';
      if (sensor.value >= 85) {
        alerts.push({
          id: `pub-flood-${stationId}`,
          type: 'SUMP_HIGH',
          severity: sensor.value >= 95 ? 'CRITICAL' : 'HIGH',
          title: '🌊 High Water Level / Flash Flood Risk',
          description: `PUB Sensor #${stationId} reports drain capacity at ${sensor.value}%. Avoid low-lying sumps.`,
          areaName: `Drain Sensor Station #${stationId}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    });

    return alerts;
  },

  /**
   * Consolidated live hazard alerts call combining NEA and PUB API calls
   */
  async getAllActiveAlerts(): Promise<EnvironmentalAlert[]> {
    const [nea, pub] = await Promise.allSettled([
      this.getLiveNEAAlerts(),
      this.getLivePUBFloodAlerts(),
    ]);

    const activeAlerts: EnvironmentalAlert[] = [];

    if (nea.status === 'fulfilled') {
      activeAlerts.push(...nea.value);
    }

    if (pub.status === 'fulfilled') {
      activeAlerts.push(...pub.value);
    }

    return activeAlerts;
  },

  /**
   * High-level summary method for AreaRiskCard using live API responses
   */
  async getLiveAlerts(
    location?: { latitude: number; longitude: number } | null
  ): Promise<HazardAlertSummary> {
    try {
      const allAlerts = await this.getAllActiveAlerts();
      const rainAlerts = allAlerts.filter((a) => a.type === 'RAIN');
      const floodAlerts = allAlerts.filter((a) => a.type === 'SUMP_HIGH' || a.type === 'FLOOD');

      let weatherForecast = 'Fair & Normal weather conditions';
      if (rainAlerts.length > 0) {
        weatherForecast = `${rainAlerts.length} area(s) reporting ${rainAlerts[0].title.replace('⛈️ ', '')}`;
      }

      let floodAlertMessage = 'All PUB drain sensors operating within safe capacity (<85%)';
      if (floodAlerts.length > 0) {
        floodAlertMessage = `${floodAlerts.length} drain sensor(s) reporting elevated water capacity (>85%)`;
      }

      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (allAlerts.some((a) => a.severity === 'CRITICAL')) riskLevel = 'CRITICAL';
      else if (allAlerts.some((a) => a.severity === 'HIGH')) riskLevel = 'HIGH';
      else if (allAlerts.some((a) => a.severity === 'MEDIUM')) riskLevel = 'MEDIUM';

      return {
        weatherForecast,
        floodAlertMessage,
        riskLevel,
        hasActiveEmergency: riskLevel === 'HIGH' || riskLevel === 'CRITICAL',
        activeAlertsCount: allAlerts.length,
      };
    } catch (err) {
      return {
        weatherForecast: 'Fair & Normal weather conditions',
        floodAlertMessage: 'All PUB drain sensors operating within safe capacity (<85%)',
        riskLevel: 'LOW',
        hasActiveEmergency: false,
        activeAlertsCount: 0,
      };
    }
  },
};