import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define an array of 4 colors
const colors = [
    "rgba(216,27,96, 0.5)",  // Purple
    "rgba(68, 170, 153, 0.5)",  // Teal
    "rgba(221, 204, 119, 0.5)",  // Yellow
    "rgba(136, 34, 85, 0.5)"  // Pink
];

// Function to get a random color from the array
function getRandomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
}

// Function to generate random pensioner data
function generatePensionerData() {
    const pensioner_count = Math.floor(Math.random() * 10000) + 1000; // Random number between 1000 and 11000
    const DLC_count = Math.floor(Math.random() * (pensioner_count - 1)) + 1; // Ensures DLC_count is less than pensioner_count
    const DLC_success = Math.floor(Math.random() * DLC_count);
    const DLC_failed = DLC_count - DLC_success;

    return {
        pensioner_count,
        DLC_count,
        DLC_success,
        DLC_failed
    };
}

// Path to the GeoJSON file
const geoJsonPath = path.join(__dirname, 'public', 'india-districts-770.geojson');

// Read GeoJSON and generate data
fs.readFile(geoJsonPath, 'utf8')
    .then(data => {
        const geoJson = JSON.parse(data);
        const districtData = {};
        geoJson.features.forEach(feature => {
            const districtName = feature.properties.dtname;
            if (districtName && typeof districtName === 'string') {
                districtData[districtName] = {
                    color: getRandomColor(),
                    ...generatePensionerData()
                };
                console.log(districtData[districtName]);
            }
        });

        const jsonData = JSON.stringify({ "district-data": districtData }, null, 2);
        return fs.writeFile(path.join(__dirname, 'public', 'district-data.json'), jsonData);
    })
    .then(() => console.log('district-data.json has been generated'))
    .catch(error => {
        console.error('Error:', error.message);
        if (error instanceof SyntaxError) {
            console.error('Invalid JSON in the GeoJSON file. The file might be malformed.');
        }
    });
