import fs from 'fs/promises';
import path from 'path';

const stateData = {};
const districtData = {};
const districtsByState = {};

// Helper function to generate random numbers
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate data for a district
// Generate data for a district
function generateDistrictData() {
    const pensioner_count_60_79 = getRandomInt(10000, 100000);
    const pensioner_count_80_plus = getRandomInt(5000, 50000);
    
    // Generate random internet penetration percentages for each age group
    const internet_penetration = getRandomInt(10, 99) / 100; // 10% to 99%
    const internet_penetration_60_79 = internet_penetration;
    const internet_penetration_80_plus = internet_penetration;

    return {
        pensioner_count: [pensioner_count_60_79, pensioner_count_80_plus],
        internet_penetration: [internet_penetration_60_79, internet_penetration_80_plus],
        DLC_potential: [
            Math.floor(pensioner_count_60_79 * internet_penetration_60_79),
            Math.floor(pensioner_count_80_plus * internet_penetration_80_plus)
        ],
        DLC_success: [
            getRandomInt(0, Math.floor(pensioner_count_60_79 * internet_penetration_60_79)),
            getRandomInt(0, Math.floor(pensioner_count_80_plus * internet_penetration_80_plus))
        ],
        DLC_failed: [
            getRandomInt(0, Math.floor(pensioner_count_60_79 * internet_penetration_60_79 * 0.1)),
            getRandomInt(0, Math.floor(pensioner_count_80_plus * internet_penetration_80_plus * 0.1))
        ],
        DLC_success_channels: [
            {
                lic: getRandomInt(1000, 5000),
                epfo: getRandomInt(1000, 5000),
                banks: getRandomInt(1000, 5000),
                post: getRandomInt(100, 1000)
            },
            {
                lic: getRandomInt(500, 2500),
                epfo: getRandomInt(500, 2500),
                banks: getRandomInt(500, 2500),
                post: getRandomInt(50, 500)
            }
        ],
        DLC_failed_channels: [
            {
                lic: getRandomInt(100, 500),
                epfo: getRandomInt(100, 500),
                banks: getRandomInt(100, 500),
                post: getRandomInt(10, 100)
            },
            {
                lic: getRandomInt(50, 250),
                epfo: getRandomInt(50, 250),
                banks: getRandomInt(50, 250),
                post: getRandomInt(5, 50)
            }
        ]
    };
}

// Aggregate district data to state level
function aggregateStateData(districts) {
    const stateData = {
        pensioner_count: [0, 0],
        DLC_potential: [0, 0],
        DLC_success: [0, 0],
        DLC_failed: [0, 0],
        DLC_success_channels: [{lic: 0, epfo: 0, banks: 0, post: 0}, {lic: 0, epfo: 0, banks: 0, post: 0}],
        DLC_failed_channels: [{lic: 0, epfo: 0, banks: 0, post: 0}, {lic: 0, epfo: 0, banks: 0, post: 0}]
    };

    districts.forEach(district => {
        for (let i = 0; i < 2; i++) {
            stateData.pensioner_count[i] += district.pensioner_count[i];
            stateData.DLC_potential[i] += district.DLC_potential[i];
            stateData.DLC_success[i] += district.DLC_success[i];
            stateData.DLC_failed[i] += district.DLC_failed[i];

            ['lic', 'epfo', 'banks', 'post'].forEach(channel => {
                stateData.DLC_success_channels[i][channel] += district.DLC_success_channels[i][channel];
                stateData.DLC_failed_channels[i][channel] += district.DLC_failed_channels[i][channel];
            });
        }
    });

    return stateData;
}

// Read the GeoJSON files
const stateGeoJSON = JSON.parse(await fs.readFile('public\\india-states.geojson', 'utf8'));
const districtGeoJSON = JSON.parse(await fs.readFile('public\\india-districts-770.geojson', 'utf8'));

// Create a mapping of lowercase state names to correct state names
const stateNameMapping = {};
stateGeoJSON.features.forEach(feature => {
    if (feature.properties && feature.properties.ST_NM){
        const stateName = feature.properties.ST_NM;
        stateNameMapping[stateName.toLowerCase()] = stateName;
    }
    else{
        console.log(feature);
    }
    
});

// Generate district data and organize by state
districtGeoJSON.features.forEach(feature => {
    const districtName = feature.properties.dtname;
    let stateName = feature.properties.stname;
    
    // Use the correct state name from the mapping
    stateName = stateNameMapping[stateName.toLowerCase()] || stateName;

    const districtDataItem = generateDistrictData();
    
    districtData[districtName] = districtDataItem;
    
    if (!districtsByState[stateName]) {
        districtsByState[stateName] = [];
    }
    districtsByState[stateName].push(districtDataItem);
});

// Generate state data by aggregating district data
stateGeoJSON.features.forEach(feature => {
    const stateName = feature.properties.ST_NM;
    if (districtsByState[stateName]) {
        stateData[stateName] = aggregateStateData(districtsByState[stateName]);
    } else {
        console.warn(`No districts found for state: ${stateName}`);
        stateData[stateName] = generateDistrictData(); // Fallback to generating random data
    }
});

// Write state data to file
await fs.writeFile('public\\state-data.json', JSON.stringify(stateData, null, 2));
console.log('State data written to state-data.json');

// Write district data to file
await fs.writeFile('public\\district-data.json', JSON.stringify({ 'district-data': districtData }, null, 2));
console.log('District data written to district-data.json');
