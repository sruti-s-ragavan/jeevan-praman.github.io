import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = [
    "rgba(216,27,96, 0.5)",
    "rgba(68, 170, 153, 0.5)",
    "rgba(221, 204, 119, 0.5)",
    "rgba(136, 34, 85, 0.5)"
];

function getRandomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
}

function generatePensionerData() {
    const pensioner_count = [
        Math.floor(Math.random() * 8000) + 2000,  // 60-79
        Math.floor(Math.random() * 2000) + 500    // 80+
    ];

    const internet_penetration = Math.random().toFixed(2);
    const DLC_potential = pensioner_count.map(count => Math.floor(count * internet_penetration));

    const DLC_count = DLC_potential.map(potential => Math.floor(Math.random() * potential) + 1);

    const DLC_success = DLC_count.map(count => Math.floor(Math.random() * count));

    const DLC_failed = DLC_count.map((count, index) => count - DLC_success[index]);

   function generateChannelData(count) {
    const lic = Math.floor(Math.random() * count);
    const epfo = Math.floor(Math.random() * (count - lic));
    const banks = Math.floor(Math.random() * (count - lic - epfo));
    const others = count - lic - epfo - banks;
    return { lic, epfo, banks, others };
}

// In your district data generation:

    return {
        pensioner_count,
        internet_penetration,
        DLC_potential,
        DLC_count,
        DLC_success,
        DLC_failed,
        DLC_success_channels: [
            generateChannelData(DLC_success[0]), // for 60-79
            generateChannelData(DLC_success[1])  // for 80+
        ],
        DLC_failed_channels: [
            generateChannelData(DLC_failed[0]), // for 60-79
            generateChannelData(DLC_failed[1])  // for 80+
        ]
    };
}

const geoJsonPath = path.join(__dirname, 'public', 'india-districts-770.geojson');

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
            }
        });

        const jsonData = JSON.stringify({ "district-data": districtData }, null, 2);
        return fs.writeFile(path.join(__dirname, 'public', 'district-data.json'), jsonData);
    })
    .then(() => console.log('district-data.json has been generated'))
    .catch(error => console.error('Error:', error));
