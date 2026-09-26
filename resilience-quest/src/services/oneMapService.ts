// standalone service handles queries to SLA's OneMap REST API
export interface OneMapGeocodeResult {
  latitude: number;
  longitude: number;
  buildingName?: string;
  address?: string;
  postalCode?: string;
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Geocodes a Singapore Postal Code, street name, or building via SLA OneMap REST API.
 * Includes automatic retry with exponential backoff on HTTP 429 (Rate Limit).
 */
export async function geocodeLocation(
  searchQuery: string,
  retries: number = 2,
  backoffMs: number = 300
): Promise<OneMapGeocodeResult | null> {
  if (!searchQuery || searchQuery.trim() === '') return null;

  // Sanitize query string
  const sanitizedQuery = searchQuery
    .replace(/'/g, '')                    // Remove apostrophes (Queen's -> Queens)
    .replace(/#\s*[a-zA-Z0-9-]+/g, '')    // Remove unit numbers (#01-141)
    .replace(/#/g, '')                    // Remove leftover hashes
    .replace(/\s+/g, ' ')                 // Collapse multiple spaces
    .trim();

  if (!sanitizedQuery) return null;

  const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(
    sanitizedQuery
  )}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { method: 'GET' });

      // If rate limited (429), back off and retry
      if (response.status === 429) {
        if (attempt < retries) {
          await sleep(backoffMs * (attempt + 1));
          continue;
        }
        return null;
      }

      if (!response.ok) return null;

      const data = await response.json();
      if (data.found > 0 && data.results && data.results.length > 0) {
        const match = data.results[0];
        const lat = parseFloat(match.LATITUDE);
        const lon = parseFloat(match.LONGITUDE);

        if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
          return {
            latitude: lat,
            longitude: lon,
            buildingName: match.BUILDING !== 'NIL' ? match.BUILDING : undefined,
            address: match.ADDRESS,
            postalCode: match.POSTAL,
          };
        }
      }
      // If valid response but 0 results, no need to retry
      return null;
    } catch (error) {
      if (attempt < retries) {
        await sleep(backoffMs * (attempt + 1));
      }
    }
  }

  return null;
}

export const oneMapService = {
  geocodeLocation,
};