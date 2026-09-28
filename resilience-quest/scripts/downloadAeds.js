// To populate asserts/data/aeds.json with the full 11.6k
// records from data.gov.sg
// scripts/downloadAndGeocodeAeds.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATASET_ID = 'd_e8934d28896a1eceecfe86f42dd3c077';
const SCDF_ENDPOINT = `https://data.gov.sg/api/action/datastore_search?resource_id=${DATASET_ID}&limit=12000`;
const OUTPUT_PATH = path.join(__dirname, '../src/assets/data/aeds.json');

async function geocodePostalCode(postalCode) {
  if (!postalCode || postalCode.length < 5) return null;
  try {
    const res = await axios.get(
      `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postalCode}&returnGeom=Y&getAddrDetails=N&pageNum=1`
    );
    const result = res.data?.results?.[0];
    if (result) {
      return {
        latitude: parseFloat(result.LATITUDE),
        longitude: parseFloat(result.LONGITUDE),
      };
    }
  } catch (err) {
    // ignore failed lookup
  }
  return null;
}

async function buildGeocodedAedDataset() {
  console.log('Fetching SCDF dataset...');
  const response = await axios.get(SCDF_ENDPOINT);
  const records = response.data?.result?.records || [];

  console.log(`Processing ${records.length} records...`);

  // Cache postal code coordinates to prevent duplicate API lookups
  const geoCache = {};
  const processed = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const postalCode = String(record.Postal_Code || '').padStart(6, '0');

    let coords = geoCache[postalCode];
    if (!coords && postalCode !== '000000') {
      coords = await geocodePostalCode(postalCode);
      if (coords) geoCache[postalCode] = coords;
      // Sleep slightly to respect rate limits
      await new Promise((r) => setTimeout(r, 50));
    }

    processed.push({
      id: record._id ? `aed-${record._id}` : `aed-${i}`,
      buildingName: record.Building_Name || 'Public AED Station',
      locationDetails: record.Location_Description || 'Publicly Accessible Area',
      postalCode: postalCode,
      latitude: coords ? coords.latitude : 1.3521,
      longitude: coords ? coords.longitude : 103.8198,
    });

    if (i % 100 === 0) {
      console.log(`Geocoded ${i}/${records.length} records...`);
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(processed, null, 2));
  console.log('Done! Saved geocoded AEDs to assets/data/aeds.json');
}

buildGeocodedAedDataset();