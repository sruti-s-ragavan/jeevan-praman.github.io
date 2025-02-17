// Initialize the map
var zoomLevel = 5, latitude = 23.5937, longitude = 80.9629
var map = L.map('map').setView([latitude, longitude], zoomLevel);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let pensionerChart;

function createOrUpdateChart(data) {
    const ctx = document.getElementById('pensioner-chart').getContext('2d');
    
    const chartData = {
        labels: ['Other Pensioners', 'DLC Success', 'DLC Failed'],
        datasets: [{
            data: [
                data.pensioner_count - data.DLC_count,
                data.DLC_success,
                data.DLC_failed
            ],
            backgroundColor: [
                'rgba(255, 206, 86, 0.8)',
                'rgba(75, 192, 192, 0.8)',
                'rgba(255, 99, 132, 0.8)'
            ]
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom'
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed !== null) {
                            label += context.parsed.toLocaleString();
                        }
                        return label;
                    }
                }
            }
        }
    };

    if (pensionerChart) {
        pensionerChart.data = chartData;
        pensionerChart.options = chartOptions;
        pensionerChart.update();
    } else {
        pensionerChart = new Chart(ctx, {
            type: 'pie',
            data: chartData,
            options: chartOptions
        });
    }
}

// Fetch the district data
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
                        const district = districtData['district-data'][districtName];
                        return {
                            color: 'gray',
                            weight: 1,
                            fillColor: district ? district.color : 'gray',
                            fillOpacity: 0.7
                        };
                    },
                    onEachFeature: function (feature, layer) {
                        layer.on('click', function (e) {
                            const districtName = feature.properties.dtname;
                            const district = districtData['district-data'][districtName];
                            
                            if (district) {
                                // Update district name
                                document.getElementById('district-name').textContent = districtName;
                                
                                // Create or update the chart
                                createOrUpdateChart(district);
                            }
                        });
                    }
                }).addTo(map);
            })
            .catch(error => console.error('Error loading GeoJSON:', error));
    })
    .catch(error => console.error('Error loading district data:', error));
