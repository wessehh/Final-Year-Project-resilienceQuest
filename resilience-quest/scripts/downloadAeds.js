// To populate asserts/data/aeds.json with the full 11.6k
// records from data.gov.sg

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATASET_ID = 'd_e8934d28896a1eceecfe86f42dd3c077';
const ENDPOINT = `https://data.gov.sg/api/action/datastore_search?resource_id=${DATASET_ID}&limit=12000`;
const OUTPUT_PATH = path.join(__dirname, '../assets/data/aeds.json');

async function downloadAndSeed() {
  console.log('Downloading live SCDF AED dataset from data.gov.sg...');
  
  try {
    const response = await axios.get(ENDPOINT);
    const records = response.data?.result?.records || [];

    if (!Array.isArray(records) || records.length === 0) {
      console.error('Failed to retrieve records from data.gov.sg API.');
      return;
    }

    console.log(`Downloaded ${records.length} records. Transforming data...`);

    // Minify field names to keep bundled JSON size small (~1MB)
    const minified = records.map((record, index) => ({
      id: record._id ? `aed-${record._id}` : `aed-${index}`,
      b: record.Building_Name || '',
      l: record.Location_Description || '',
      p: record.Postal_Code ? String(record.Postal_Code) : '',
    }));

    // Ensure directory exists
    const dir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(minified));
    console.log(`Successfully saved ${minified.length} AED records to ${OUTPUT_PATH}!`);
  } catch (error) {
    console.error('Error downloading dataset:', error.message);
  }
}

downloadAndSeed();