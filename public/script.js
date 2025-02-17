// Initialize the map
var zoomLevel = 5, latitude = 23.5937, longitude = 80.9629
var map = L.map('map').setView([latitude, longitude], zoomLevel);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let pensionerChart;
let channelChart;
let currentDistrictData;

function createOrUpdateChart(data) {
    currentDistrictData = data;
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
        },
        onClick: (event, elements) => {
            if (elements.length > 0) {
                const index = elements[0].index;
                if (index === 1 || index === 2) { // DLC Success or DLC Failed
                    showChannelChart(index === 1 ? 'DLC Success' : 'DLC Failed');
                } else {
                    hideChannelChart();
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
            options: {
                ...chartOptions,
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        if (index === 1) {
                            createOrUpdateChannelChart('DLC Success', data.DLC_success);
                        } else if (index === 2) {
                            createOrUpdateChannelChart('DLC Failed', data.DLC_failed);
                        } else {
                            document.getElementById('channel-chart-container').style.display = 'none';
                        }
                    }
                }
            }
        });
    }
}

function createOrUpdateChannelChart(type, count) {
    const ctx = document.getElementById('channel-chart').getContext('2d');
    
    // Generate random data for channels
    const bankCount = Math.floor(Math.random() * count);
    const epfoCount = Math.floor(Math.random() * (count - bankCount));
    const licCount = Math.floor(Math.random() * (count - bankCount - epfoCount));
    const othersCount = count - bankCount - epfoCount - licCount;

    const chartData = {
        labels: ['Banks', 'EPFO', 'LIC', 'Others'],
        datasets: [{
            data: [bankCount, epfoCount, licCount, othersCount],
            backgroundColor: [
                'rgba(255, 99, 132, 0.8)',
                'rgba(54, 162, 235, 0.8)',
                'rgba(255, 206, 86, 0.8)',
                'rgba(75, 192, 192, 0.8)'
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

    if (channelChart) {
        channelChart.data = chartData;
        channelChart.options = chartOptions;
        channelChart.update();
    } else {
        channelChart = new Chart(ctx, {
            type: 'pie',
            data: chartData,
            options: chartOptions
        });
    }

    document.getElementById('channel-chart-title').textContent = `${type} by Channel`;
    document.getElementById('channel-chart-container').style.display = 'block';
}

function showChannelChart(category) {
    const channelData = generateChannelData(currentDistrictData[category === 'DLC Success' ? 'DLC_success' : 'DLC_failed']);
    const ctx = document.getElementById('channel-chart').getContext('2d');
    
    const chartData = {
        labels: ['Banks', 'EPFO', 'LIC', 'Others'],
        datasets: [{
            data: channelData,
            backgroundColor: [
                'rgba(255, 99, 132, 0.8)',
                'rgba(54, 162, 235, 0.8)',
                'rgba(255, 206, 86, 0.8)',
                'rgba(75, 192, 192, 0.8)'
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

    if (channelChart) {
        channelChart.data = chartData;
        channelChart.options = chartOptions;
        channelChart.update();
    } else {
        channelChart = new Chart(ctx, {
            type: 'pie',
            data: chartData,
            options: chartOptions
        });
    }

    document.getElementById('channel-chart-title').textContent = `${category} by Channel`;
    document.getElementById('channel-chart-container').style.display = 'block';
}

function hideChannelChart() {
    document.getElementById('channel-chart-container').style.display = 'none';
}

function generateChannelData(total) {
    // This function generates random data for the channels
    // In a real application, this data would come from your backend
    const banks = Math.floor(Math.random() * total);
    const epfo = Math.floor(Math.random() * (total - banks));
    const lic = Math.floor(Math.random() * (total - banks - epfo));
    const others = total - banks - epfo - lic;
    return [banks, epfo, lic, others];
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
                                
                                // Hide the channel chart when a new district is selected
                                hideChannelChart();
                            }
                        });
                    }
                }).addTo(map);
            })
            .catch(error => console.error('Error loading GeoJSON:', error));
    })
    .catch(error => console.error('Error loading district data:', error));
