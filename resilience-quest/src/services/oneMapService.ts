// standalone service handles queries to SLA's OneMap REST API
export interface OneMapGeocodeResult {
  latitude: number;
  longitude: number;
  buildingName?: string;
  address?: string;
  postalCode?: string;
}

/**
 * Geocodes a Singapore Postal Code, street name, or building via OneMap REST API.
 * Free & official API from Singapore Land Authority (SLA). No API key required.
 */
export async function geocodeLocation(
  searchQuery: string
): Promise<OneMapGeocodeResult | null> {
  if (!searchQuery || searchQuery.trim() === '') return null;

  try {
    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(
      searchQuery.trim()
    )}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) return null;

    const data = await response.json();
    if (data.found > 0 && data.results && data.results.length > 0) {
      const match = data.results[0];
      const lat = parseFloat(match.LATITUDE);
      const lon = parseFloat(match.LONGITUDE);

      if (!isNaN(lat) && !isNaN(lon)) {
        return {
          latitude: lat,
          longitude: lon,
          buildingName: match.BUILDING !== 'NIL' ? match.BUILDING : undefined,
          address: match.ADDRESS,
          postalCode: match.POSTAL,
        };
      }
    }
  } catch (error) {
    console.warn(`[OneMap Service] Geocoding error for "${searchQuery}":`, error);
  }
  return null;
}

export const oneMapService = {
  geocodeLocation,
};