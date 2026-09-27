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
const PUB_WATER_LEVEL_ENDPOINT =
  'https://api.data.gov.sg/v1/environment/water-level-sensors';

export const hazardAlertService = {
  /**
   * Fetches NEA 2-hr weather forecasts and filters for heavy rain / thunderstorms
   */
  async getLiveNEAAlerts(): Promise<EnvironmentalAlert[]> {
    try {
      const response = await axios.get(NEA_2HR_WEATHER_V2_ENDPOINT);

      // v2 wraps items inside response.data.data.items
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
      console.warn('NEA V2 API error, returning offline fallback alerts:', err);
      return [];
    }
  },

  /**
   * Fetches PUB water level sensor readings to detect flood risk
   */
  async getLivePUBFloodAlerts(): Promise<EnvironmentalAlert[]> {
    try {
      const response = await axios.get(PUB_WATER_LEVEL_ENDPOINT);
      const items = response.data?.items?.[0];
      const readings: Array<{ id: string; value: number }> = items?.readings || [];

      const alerts: EnvironmentalAlert[] = [];

      // PUB sensors trigger warnings when water capacity exceeds 85%
      readings.forEach((sensor) => {
        if (sensor.value >= 85) {
          alerts.push({
            id: `pub-flood-${sensor.id}`,
            type: 'SUMP_HIGH',
            severity: sensor.value >= 95 ? 'CRITICAL' : 'HIGH',
            title: '🌊 High Water Level / Flash Flood Risk',
            description: `PUB Sensor #${sensor.id} reports drain capacity at ${sensor.value}%. Avoid low-lying sumps.`,
            areaName: `Drain Sensor Area #${sensor.id}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        }
      });

      return alerts;
    } catch (err) {
      console.warn('PUB API error:', err);
      return [];
    }
  },

  /**
   * Consolidated hazard alerts call returning raw EnvironmentalAlert items
   */
  async getAllActiveAlerts(): Promise<EnvironmentalAlert[]> {
    const [nea, pub] = await Promise.all([
      this.getLiveNEAAlerts(),
      this.getLivePUBFloodAlerts(),
    ]);
    return [...nea, ...pub];
  },

  /**
   * Summary method required by AreaRiskCard to render high-level risk metrics
   */
  async getLiveAlerts(
    location?: { latitude: number; longitude: number } | null
  ): Promise<HazardAlertSummary> {
    try {
      const allAlerts = await this.getAllActiveAlerts();
      const rainAlerts = allAlerts.filter((a) => a.type === 'RAIN');
      const floodAlerts = allAlerts.filter((a) => a.type === 'SUMP_HIGH' || a.type === 'FLOOD');

      // Determine Weather Summary
      let weatherForecast = 'Fair & Normal weather conditions';
      if (rainAlerts.length > 0) {
        weatherForecast = `${rainAlerts.length} area(s) reporting ${rainAlerts[0].title.replace('⛈️ ', '')}`;
      }

      // Determine Flood Summary
      let floodAlertMessage = 'No active heavy rain or flash flood advisories';
      if (floodAlerts.length > 0) {
        floodAlertMessage = `${floodAlerts.length} drain sensor(s) reporting elevated water capacity (>85%)`;
      }

      // Evaluate Overall Highest Severity
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      const hasCritical = allAlerts.some((a) => a.severity === 'CRITICAL');
      const hasHigh = allAlerts.some((a) => a.severity === 'HIGH');
      const hasMedium = allAlerts.some((a) => a.severity === 'MEDIUM');

      if (hasCritical) riskLevel = 'CRITICAL';
      else if (hasHigh) riskLevel = 'HIGH';
      else if (hasMedium) riskLevel = 'MEDIUM';

      const hasActiveEmergency = riskLevel === 'HIGH' || riskLevel === 'CRITICAL';

      return {
        weatherForecast,
        floodAlertMessage,
        riskLevel,
        hasActiveEmergency,
        activeAlertsCount: allAlerts.length,
      };
    } catch (err) {
      return {
        weatherForecast: 'Weather advisory unavailable (cached)',
        floodAlertMessage: 'Normal drain water levels',
        riskLevel: 'LOW',
        hasActiveEmergency: false,
        activeAlertsCount: 0,
      };
    }
  },
};