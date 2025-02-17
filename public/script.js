// Initialize the map
var zoomLevel = 5, latitude = 23.5937, longitude = 80.9629
var map = L.map('map')
            .setView([latitude, longitude], zoomLevel);

// Add OpenStreetMap tile layer
// L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
//     maxZoom: 18,
//     attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
//         '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
//         'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
//     id: 'mapbox/light-v9',
//     tileSize: 512,
//     zoomOffset: -1
// }).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Fetch the district colors
fetch('/district-colors.json')
    .then(response => response.json())
    .then(colorData => {
        // Fetch and add GeoJSON to the map
        fetch('https://raw.githubusercontent.com/Tanmay53/COVID-19-Zones-Mapping-India/refs/heads/master/resources/dataFiles/india-districts-770.geojson')
            .then(response => response.json())
            .then(data => {
                L.geoJSON(data, {
                    style: function (feature) {
                        const districtName = feature.properties.dtname;
                        const districtColor = colorData['district-colors'][districtName];
                        return {
                            color: 'gray',
                            weight: 1,
                            fillColor: districtColor || 'gray',
                            fillOpacity: 0.7
                        };
                    },
                    onEachFeature: function (feature, layer) {
                        layer.bindPopup(feature.properties.name);
                    }
                }).addTo(map);
            })
            .catch(error => console.error('Error loading GeoJSON:', error));
    })
    .catch(error => console.error('Error loading color data:', error));