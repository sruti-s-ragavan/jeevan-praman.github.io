// Initialize the map
var zoomLevel = 5, latitude = 23.5937, longitude = 80.9629
var map = L.map('map').setView([latitude, longitude], zoomLevel);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Fetch the district colors
fetch('/district-data.json')
    .then(response => response.json())
    .then(districtData => {
        // Fetch and add GeoJSON to the map
        fetch('/india-districts-770.geojson')
            .then(response => response.json())
            .then(data => {
                L.geoJSON(data, {
                    style: function (feature) {
                        const districtName = feature.properties.dtname;
                        const districtColor = districtData['district-data'][districtName]['color'];
                        return {
                            color: 'gray',
                            weight: 1,
                            fillColor: districtColor || 'gray',
                            fillOpacity: 0.7
                        };
                    },
                    onEachFeature: function (feature, layer) {
                        layer.on('click', function (e) {
                            const districtName = feature.properties.dtname;
                            const districtColor = districtData['district-data'][districtName]['color'];
                            
                            // Update info panel
                            document.getElementById('district-name').textContent = `District: ${districtName}`;
                            document.getElementById('district-color').textContent = `Color: ${districtColor}`;
                        });
                    }
                }).addTo(map);
            })
            .catch(error => console.error('Error loading GeoJSON:', error));
    })
    .catch(error => console.error('Error loading color data:', error));
