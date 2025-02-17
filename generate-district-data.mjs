import fetch from 'node-fetch';
import fs from 'fs/promises';

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

// Fetch GeoJSON and generate color data
fetch('https://raw.githubusercontent.com/Tanmay53/COVID-19-Zones-Mapping-India/refs/heads/master/resources/dataFiles/india-districts-770.geojson')
    .then(response => response.json())
    .then(data => {
        const colorData = {};
        data.features.forEach(feature => {
            const districtName = feature.properties.dtname;
            console.log(districtName);
            if (districtName && typeof districtName === 'string') {
                colorData[districtName] = getRandomColor();
            }
        });

        const jsonData = JSON.stringify({ "district-colors": colorData }, null, 2);
        return fs.writeFile('public/district-colors.json', jsonData);
    })
    .then(() => console.log('district-colors.json has been generated'))
    .catch(error => console.error('Error:', error));
