// Initialize the map
var zoomLevel = 5, latitude = 23.5937, longitude = 80.9629
var map = L.map('map').setView([26.4499, 80.3319], 10); // Coordinates for Kanpur, zoom level 10

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let selectedDistrict = 'Kanpur Nagar'; // Initially selected district
let geojsonLayer;

function updateInfoPane(districtName, districtData) {
    document.getElementById('district-name').textContent = districtName;
    
    // Assuming you have a main chart to update
    if (typeof createOrUpdateMainChart === 'function') {
        createOrUpdateMainChart(districtData);
    }
    
    // Clear any existing pie or channel charts
    if (typeof cleanupCharts === 'function') {
        cleanupCharts();
    }
    
    // Add any other info pane updates here
}

function updateInfoPaneWithAgency(agency) {
    document.getElementById('district-name').textContent = `${selectedDistrict}`
    document.getElementById('agency-name').textContent = `${agency.type}: ${agency.name}`;
    document.getElementById('agency-name').style.display = "block";

    // Clear existing charts
    if (mainChart) {
        mainChart.destroy();
    }
    
    // Create agency performance chart
    const ctx = document.getElementById('main-chart').getContext('2d');
    mainChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Success', 'Failure'],
            datasets: [{
                label: 'DLC Performance',
                data: [agency.DLC_success, agency.DLC_failure],
                backgroundColor: ['#59a14f', '#e15759']
            }]
        },
        options: {
            indexAxis: 'y', // This makes the bars horizontal
            responsive: true,
            plugins: {
                legend: {
                    display: false // Hide legend as it's not needed for two bars
                },
                title: {
                    display: true,
                    text: 'DLC Performance'
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Cases'
                    }
                },
                y: {
                    title: {
                        display: false
                    }
                }
            }
        }
    });

    // Hide other elements in the info pane that are not relevant to agency view
    document.getElementById('internet-penetration').style.display = 'none';
    document.getElementById('channel-chart-container').style.display = 'none';
}



function styleDistrict(feature) {
    const isSelected = feature.properties.dtname === selectedDistrict;
    console.log(`Styling district: ${feature.properties.dtname}, Selected: ${isSelected}`);
    return {
        fillColor: feature.properties.dtname === selectedDistrict ? '#4bc0c0' : '#cccccc',
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}

let mainChart, channelChart;

function createOrUpdateMainChart(data) {
    cleanupCharts();
    const ctx = document.getElementById('main-chart').getContext('2d');
    
    const colors = {
        'Manual LC': 'rgba(30, 136, 229, 0.8)',
        'DLC Complete': 'rgba(0, 77, 64, 0.8)',
        'DLC Rejected': 'rgba(255, 193, 7, 0.8)',
        'DLC Pending': 'rgba(216, 27, 96, 0.8)'
    };

    const chartData = {
        labels: ['60-79', '80+'],
        datasets: [
            {
                label: 'Manual LC',
                data: data.pensioner_count.map((total, i) => total - data.DLC_potential[i]),
                backgroundColor: colors['Manual LC'],
            },
            {
                label: 'DLC Complete',
                data: data.DLC_success,
                backgroundColor: colors['DLC Complete'],
            },
            {
                label: 'DLC Rejected',
                data: data.DLC_failed,
                backgroundColor: colors['DLC Rejected'],
            },
            {
                label: 'DLC Pending',
                data: data.DLC_potential.map((potential, i) => potential - data.DLC_success[i] - data.DLC_failed[i]),
                backgroundColor: colors['DLC Pending'],
            }
        ]
    };

    const chartOptions = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                stacked: true,
                beginAtZero: true
            },
            y: {
                stacked: true
            }
        },
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.x !== null) {
                            label += context.parsed.x.toLocaleString();
                        }
                        return label;
                    },
                    footer: function(tooltipItems) {
                        const total = tooltipItems.reduce((sum, item) => sum + item.parsed.x, 0);
                        const dlcTotal = tooltipItems.slice(1).reduce((sum, item) => sum + item.parsed.x, 0);
                        const dlcPercentage = ((dlcTotal / total) * 100).toFixed(1);
                        return `Total Pensioners: ${total.toLocaleString()}\nDLC Total: ${dlcTotal.toLocaleString()} (${dlcPercentage}% of Total)`;
                    }
                }
            },
            legend: {
                display: true,
                position: 'top',
            }
        },
        onClick: (event, elements) => {
            if (elements.length > 0) {
                const element = elements[0];
                const datasetIndex = element.datasetIndex;
                const ageGroupIndex = element.index;
                
                if (datasetIndex === 0 || datasetIndex === 3) { // Manual LC or DLC Pending
                    showInternetPenetration(data, ageGroupIndex, datasetIndex===0?false: true);
                } else if (datasetIndex === 1 || datasetIndex === 2) { // DLC Complete or DLC Rejected
                    createOrUpdateChannelChart(data, ageGroupIndex, datasetIndex === 1 ? 'success' : 'failed');
                }
            }
        }
    };

    if (mainChart) {
        mainChart.data = chartData;
        mainChart.options = chartOptions;
        mainChart.update();
    } else {
        mainChart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: chartOptions
        });
    }
}


function showInternetPenetration(data, ageGroupIndex, isPending) {
    cleanupCharts();
    const penetrationElement = document.getElementById('internet-penetration');
    const titleElement = document.getElementById('internet-penetration-title');

    const ageGroup = ageGroupIndex === 0 ? '60-79' : '80+';
    const penetration = (data.internet_penetration[ageGroupIndex] * 100).toFixed(1);

    if(isPending){
        titleElement.textContent = `Internet Penetration (${ageGroup} years): ${penetration}%`;
    }
    else{
        var unpenetration = 100-penetration;
        titleElement.textContent = `Internet Unavailable (${ageGroup} years): ${unpenetration}%`;
    }
    penetrationElement.style.display = 'block';
}

function createOrUpdateChannelChart(data, ageGroupIndex, type) {
    cleanupCharts();
    const ctx = document.getElementById('channel-chart').getContext('2d');
    
    const channels = type === 'success' ? data.DLC_success_channels[ageGroupIndex] : data.DLC_failed_channels[ageGroupIndex];

    const colors = {
        'Manual LC': 'rgba(30, 136, 229, 0.8)',
        'DLC Complete': 'rgba(0, 77, 64, 0.8)',
        'DLC Rejected': 'rgba(255, 193, 7, 0.8)',
        'DLC Pending': 'rgba(216, 27, 96, 0.8)'
    };

    const chartData = {
        labels: ['LIC', 'EPFO', 'Banks', 'Post Office'],
        datasets: [{
            data: [channels.lic, channels.epfo, channels.banks, channels.others],
            backgroundColor: Object.values(colors)
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: `DLC ${type === 'success' ? 'Complete' : 'Rejected'} Channels - ${ageGroupIndex === 0 ? '60-79' : '80+'}`
            }
        }
    };

    if (window.channelChart instanceof Chart) {
        window.channelChart.destroy();
    }

    window.channelChart = new Chart(ctx, {
        type: 'pie',
        data: chartData,
        options: chartOptions
    });

    document.getElementById('channel-chart-container').style.display = 'block';
}


function cleanupCharts() {
    if (window.channelChart instanceof Chart) {
        window.channelChart.destroy();
        window.channelChart = null;
    }
    document.getElementById('internet-penetration').style.display = 'none';
    document.getElementById('channel-chart-container').style.display = 'none';
    document.getElementById('agency-name').style.display = 'none';
}

let agenciesData; // New variable to store agencies data

Promise.all([
    fetch('/district-data.json').then(response => response.json()),
    fetch('/agencies-data.json').then(response => response.json()),
    fetch('/india-districts-770.geojson').then(response => response.json())
])
.then(([districtData, agencies, geoJsonData]) => {
    agenciesData = agencies.PDA; // Store agencies data

    geojsonLayer = L.geoJSON(geoJsonData, {
        style: styleDistrict,
        onEachFeature: function (feature, layer) {
            layer.on('click', function (e) {
                const districtName = feature.properties.dtname;
                const district = districtData['district-data'][districtName];
                if (district) {
                    if (selectedDistrict) {
                        geojsonLayer.resetStyle();
                    }
                    selectedDistrict = districtName;
                    geojsonLayer.eachLayer(function (layer) {
                        layer.setStyle(styleDistrict(layer.feature));
                    });
                    
                    
                    cleanupCharts();
                    createOrUpdateMainChart(district);
                    document.getElementById('channel-chart-container').style.display = 'none';
                    updateInfoPane(districtName, district);

                    // Display agencies for the clicked district if zoom level is appropriate
                    if (map.getZoom() >= 10) {
                        displayAgencies(districtName);
                    } else {
                        hideAgencies();
                    }
                }
            });
        }
    }).addTo(map);

    // Initialize with Kanpur Nagar data
    const kanpurData = districtData['district-data'][selectedDistrict];
    if (kanpurData) {
        updateInfoPane(selectedDistrict, kanpurData);
        geojsonLayer.eachLayer(function (layer) {
            if (layer.feature.properties.dtname === selectedDistrict) {
                layer.setStyle(styleDistrict(layer.feature));
            }
        });
        // Display initial agencies for Kanpur Nagar if zoom level is appropriate
        if (map.getZoom() >= 10) {
            displayAgencies(selectedDistrict);
        }
    }

    // Add zoom event listener
    map.on('zoomend', function() {
        if (map.getZoom() >= 10) {
            if (selectedDistrict) {
                displayAgencies(selectedDistrict);
            }
        } else {
            hideAgencies();
        }
    });
})
.catch(error => console.error('Error loading data:', error));

const icons = {
    EPF: L.icon({
        iconUrl: '/images/epf.png',
        iconSize: [10, 10],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    }),
    LIC: L.icon({
        iconUrl: '/images/lic.png',
        iconSize: [20, 20],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    }),
    Bank: L.icon({
        iconUrl: '/images/bank.png',
        iconSize: [20, 20],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    }),
    "Post Office": L.icon({
        iconUrl: '/images/post.png',
        iconSize: [20, 20],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    })
};

function displayAgencies(dtname) {
    if (map.getZoom() < 10) {
        return; // Don't display agencies if zoom level is less than 10
    }

    // Clear existing markers
    hideAgencies();

    // Filter and add new markers
    const districtAgencies = agenciesData.filter(agency => agency.dtname === dtname);
    districtAgencies.forEach(agency => {
        const icon = icons[agency.type] || L.Icon.Default(); // Use default icon if type not found
        const marker = L.marker([agency.lat, agency.lng], { icon: icon })
            .addTo(map)
            .bindPopup(`<b>${agency.type}: </b><br> ${agency.name}`)
            .on('click', function() {
                updateInfoPaneWithAgency(agency);
            });
    });

    // Find the bounds of the filtered agencies
    if (districtAgencies.length > 0) {
        const bounds = L.latLngBounds(districtAgencies.map(agency => [agency.lat, agency.lng]));
        map.fitBounds(bounds);
    }
}

function hideAgencies() {
    map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });
}
