/**
 * downloadShelters.js
 * Run locally to fetch, geocode, and pre-bundle sg_shelters.json
 * Usage: node downloadShelters.js
 */

const fs = require('fs');
const path = require('path');

const DATA_GOV_SCDF_URL =
  'https://data.gov.sg/api/action/datastore_search?resource_id=d_291795a678b8cf82f108780a6235ce18&limit=1000';
const ONEMAP_GEOCODE_URL = 'https://www.onemap.gov.sg/api/common/elastic/search';
const OUTPUT_FILE = path.join(__dirname,  '../src/assets/data/sg_shelters.json');

const CONCURRENCY_LIMIT = 3;
const DELAY_MS = 150;

// Simple delay helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Geocode a postal code or address query via OneMap REST API
 */
async function geocodeOneMap(query) {
  if (!query) return null;
  try {
    const url = `${ONEMAP_GEOCODE_URL}?searchVal=${encodeURIComponent(query)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const top = data.results[0];
      const lat = parseFloat(top.LATITUDE);
      const lng = parseFloat(top.LONGITUDE);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
  } catch (err) {
    // Ignore individual fetch errors
  }
  return null;
}

/**
 * Address variant generator for fallback matches
 */
function prepareAddressVariants(rawAddress) {
  if (!rawAddress) return [];
  let clean = rawAddress
    .replace(/^HDB Shelter\s*-\s*/i, '')
    .replace(/#\s*[a-zA-Z0-9-]+/g, '')
    .replace(/\b[bB]\d+-\d+\b/g, '')
    .replace(/\b\d{2}-\d{2,4}\b/g, '')
    .replace(/\bS\s*\(\d{6}\)/gi, '')
    .replace(/\bSingapore\s*\d{6}\b/gi, '')
    .replace(/\b\d{6}\b/g, '')
    .replace(/#/g, '')
    .replace(/'/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  clean = clean.replace(/Blk\s+([0-9A-Za-z]+)\/[0-9A-Za-z]+/i, 'Blk $1');
  const noBlk = clean.replace(/^Blk\s+/i, '').trim();
  const withBlk = clean.startsWith('Blk ') ? clean : `Blk ${clean}`;

  return Array.from(new Set([clean, noBlk, withBlk])).filter(Boolean);
}

async function run() {
  console.log('🚀 Starting SCDF Shelter dataset download & pre-bundling...');

  const response = await fetch(DATA_GOV_SCDF_URL);
  if (!response.ok) {
    throw new Error(`Data.gov.sg responded with status ${response.status}`);
  }

  const json = await response.json();
  const records = json?.result?.records || [];
  console.log(`📦 Received ${records.length} shelter records from Data.gov.sg`);

  const geocodeMap = {};
  const processedShelters = [];

  for (let i = 0; i < records.length; i++) {
    const item = records[i];
    let postalCode = (
      item.POSTALCODE || item.POSTAL_CODE || item.postal_code || item.POSTAL || ''
    ).toString().trim();

    const blkNo = (item.BLK_NO || item.block || item.BLOCK || '').toString().trim();
    const rawStreet = (item.STREET_NAME || item.street || item.STREET || item.ROAD_NAME || '').toString().trim();
    const rawAddress = (item.ADDRESS || item.address || item.LOCATION || '').toString().trim();
    const rawName = (item.NAME || item.SHELTER_NAME || item.building || '').toString().replace(/\s+/g, ' ').trim();

    if (!postalCode || postalCode.length < 5) {
      const match = (rawAddress + ' ' + rawName).match(/\b(\d{6})\b/);
      if (match) postalCode = match[1];
    }

    const constructedAddress = [blkNo, rawStreet].filter(Boolean).join(' ');
    const fullAddress = (constructedAddress || rawAddress || 'Singapore').replace(/\s+/g, ' ').trim();

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

    // Attempt geocoding
    let coords = null;
    const cacheKey = (postalCode || fullAddress).toLowerCase().trim();

    if (geocodeMap[cacheKey]) {
      coords = geocodeMap[cacheKey];
    } else {
      if (postalCode && postalCode.length >= 5) {
        coords = await geocodeOneMap(postalCode);
        await sleep(DELAY_MS);
      }

      if (!coords) {
        const variants = prepareAddressVariants(fullAddress);
        for (const variant of variants) {
          coords = await geocodeOneMap(variant);
          await sleep(DELAY_MS);
          if (coords) break;
        }
      }

      if (coords) {
        geocodeMap[cacheKey] = coords;
      }
    }

    const isFallback = !coords;
    const finalLat = coords?.latitude ?? 1.3521;
    const finalLng = coords?.longitude ?? 103.8198;

    processedShelters.push({
      id: item._id ? `scdf_${item._id}` : `scdf_${i}`,
      name: formattedName,
      address: cleanDisplayAddress,
      type: item.DESCRIPTION || item.SHELTER_TYPE || 'Civil Defence Shelter',
      latitude: finalLat,
      longitude: finalLng,
      postalCode,
      isGeocodeFallback: isFallback,
    });

    if ((i + 1) % 25 === 0 || i === records.length - 1) {
      console.log(`⏳ Progress: ${i + 1} / ${records.length} shelters processed...`);
    }
  }

  // Ensure output directory exists
  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Save output to sg_shelters.json
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(processedShelters, null, 2), 'utf-8');
  console.log(`✅ Success! Pre-bundled ${processedShelters.length} shelters into: ${OUTPUT_FILE}`);
}

run().catch((err) => {
  console.error('❌ Error executing pre-bundle script:', err);
  process.exit(1);
});