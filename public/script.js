// Initialize the map
const dlcSuccessColors = {
    '0-25': '#a8b6cc',   // Very Light blue
    '25-50': '#7ca1cc',  // Light blue
    '50-75': '#3d65a5',  // Medium blue
    '75-100': '#1f449c'  // Dark blue
};
const selectedPlaceColor = '#eebab4';

function getColorForDLCSuccess(successRate) {
    if (successRate < 25) return dlcSuccessColors['0-25'];
    if (successRate < 50) return dlcSuccessColors['25-50'];
    if (successRate < 75) return dlcSuccessColors['50-75'];
    return dlcSuccessColors['75-100'];
}

let stateLayer, districtLayer, stateLabelLayer, districtLabelLayer;
const zoomThreshold = 8;
let selectedDistrict = 'Kanpur Nagar'; // Initially selected district
let selectedState = null;


var map = L.map('map').setView([26.4499, 80.3319], 10); // Coordinates for Kanpur, zoom level 10

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);


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
    document.getElementById('district-name').textContent = agency.dtname;
    document.getElementById('agency-name').textContent = `${agency.type}: ${agency.name}`;
    document.getElementById('agency-name').style.display = "block";

    if (mainChart) {
        mainChart.destroy();
    }
    
    const ctx = document.getElementById('main-chart').getContext('2d');
    
    mainChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['60-79', '80+'],
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            datasets: [
                {
                    label: 'Manual',
                    data: agency.Manual,
                    backgroundColor: 'rgba(30, 136, 229, 0.8)'
                },
                {
                    label: 'DLC Success',
                    data: agency.DLC_success,
                    backgroundColor: 'rgba(0, 77, 64, 0.8)'
                },
                {
                    label: 'DLC Failed',
                    data: agency.DLC_failed,
                    backgroundColor: 'rgba(255, 193, 7, 0.8)'
                },
                {
                    label: 'Pending',
                    data: agency.Pending,
                    backgroundColor: 'rgba(216, 27, 96, 0.8)'
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Agency Performance by Age Group'
                },
                tooltip: {
                    callbacks: {
                        footer: (tooltipItems) => {
                            const total = tooltipItems.reduce((sum, item) => sum + item.parsed.x, 0);
                            return `Total: ${total}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Pensioners'
                    }
                },
                y: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Age Group'
                    }
                }
            }
        }
    });

    document.getElementById('main-chart-container').style.display = 'block';
    document.getElementById('internet-penetration').style.display = 'none';
    document.getElementById('channel-chart-container').style.display = 'none';
}

function styleState(feature) {
    const stateName = feature.properties.ST_NM;
    const stateDistricts = Object.keys(districtData).filter(district => 
        districtData[district].state.toLowerCase() === stateName.toLowerCase()
    );

    let totalPotential = 0;
    let totalSuccess = 0;

    stateDistricts.forEach(district => {
        const data = districtData[district];
        totalPotential += data.DLC_potential[0] + data.DLC_potential[1];
        totalSuccess += data.DLC_success[0] + data.DLC_success[1];
    });

    const successRate = totalPotential > 0 ? (totalSuccess / totalPotential) * 100 : 0;

    return {
        fillColor: stateName === selectedState? selectedPlaceColor: getColorForDLCSuccess(successRate),
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}

function styleDistrict(feature) {
    const districtName = feature.properties.dtname;
    const district = districtData[districtName];
    if (!district) {
        return {
            fillColor: '#CCCCCC',  // Light Grey for districts with no data
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.7
        };
    }

    const totalPotential = district.DLC_potential[0] + district.DLC_potential[1];
    const totalSuccess = district.DLC_success[0] + district.DLC_success[1];
    const successRate = totalPotential > 0 ? (totalSuccess / totalPotential) * 100 : 0;

    return {
        fillColor: selectedDistrict===districtName? selectedPlaceColor: getColorForDLCSuccess(successRate),
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

// const states_geo_json_path = '/india-states.geojson'
// const districts_geo_json_path = '/india-districts-770.geojson'
// const district_data_path = '/district-data.json'
// const agencies_path = '/agencies-data.json'

const states_geo_json_path = 'https://raw.githubusercontent.com/sruti-s-ragavan/pf-dlc/refs/heads/main/public/india-states.geojson'
const districts_geo_json_path = 'https://raw.githubusercontent.com/sruti-s-ragavan/pf-dlc/refs/heads/main/public/india-districts-770.geojson'
const district_data_path = 'https://raw.githubusercontent.com/sruti-s-ragavan/pf-dlc/refs/heads/main/public/district-data.json'
const agencies_path = 'https://raw.githubusercontent.com/sruti-s-ragavan/pf-dlc/refs/heads/main/public/agencies-data.json'

Promise.all([
    fetch(states_geo_json_path).then(response => response.json()),
    fetch(districts_geo_json_path).then(response => response.json()),
    fetch(district_data_path).then(response => response.json()),
    fetch(agencies_path).then(response => response.json())
])
.then(([statesData, districtsData, districtDataJson, agenciesDataJson]) => {
    districtData = districtDataJson['district-data'];
    agenciesData = agenciesDataJson.PDA;

    stateLayer = L.geoJSON(statesData, {
        style: styleState, 
        onEachFeature: function(feature, layer) {
            layer.bindTooltip(feature.properties.ST_NM, {
                permanent: true,
                direction: 'center',
                className: 'state-label'
            });
            layer.on('click', function(e) {
                if (map.getZoom() < zoomThreshold) {
                    selectedState = feature.properties.ST_NM;
                    stateLayer.resetStyle();
                    stateLayer.eachLayer(function(layer) {
                        layer.setStyle(styleState(layer.feature));
                    });
                    updateInfoPaneWithState(selectedState);
                    zoomToState(layer);
                }
            });
        }
    });

    function updateInfoPaneWithState(stateName) {
        document.getElementById('district-name').textContent = stateName;
        document.getElementById('agency-name').style.display = 'none';
        document.getElementById('main-chart-container').style.display = 'block';
        document.getElementById('internet-penetration').style.display = 'none';
        document.getElementById('channel-chart-container').style.display = 'none';
        
        const stateData = aggregateStateData(stateName);
        createOrUpdateMainChart(stateData);
    }
    
    function aggregateStateData(stateName) {
        const stateDistricts = Object.keys(districtData).filter(district => 
            districtData[district].state.toLowerCase() === stateName.toLowerCase()
        );
    
        const aggregatedData = {
            pensioner_count: [0, 0],
            DLC_potential: [0, 0],
            DLC_success: [0, 0],
            DLC_failed: [0, 0],
            internet_penetration: [0, 0],
            DLC_success_channels: [
                { lic: 0, epfo: 0, banks: 0, others: 0 },
                { lic: 0, epfo: 0, banks: 0, others: 0 }
            ],
            DLC_failed_channels: [
                { lic: 0, epfo: 0, banks: 0, others: 0 },
                { lic: 0, epfo: 0, banks: 0, others: 0 }
            ]
        };
    
        stateDistricts.forEach(district => {
            const data = districtData[district];
            for (let i = 0; i < 2; i++) {
                aggregatedData.pensioner_count[i] += data.pensioner_count[i];
                aggregatedData.DLC_potential[i] += data.DLC_potential[i];
                aggregatedData.DLC_success[i] += data.DLC_success[i];
                aggregatedData.DLC_failed[i] += data.DLC_failed[i];
                aggregatedData.internet_penetration[i] += data.internet_penetration[i];
    
                ['lic', 'epfo', 'banks', 'others'].forEach(channel => {
                    aggregatedData.DLC_success_channels[i][channel] += data.DLC_success_channels[i][channel];
                    aggregatedData.DLC_failed_channels[i][channel] += data.DLC_failed_channels[i][channel];
                });
            }
        });
    
        // Calculate average internet penetration
        aggregatedData.internet_penetration = aggregatedData.internet_penetration.map(
            sum => sum / stateDistricts.length
        );
    
        return aggregatedData;
    }


    function zoomToState(layer) {
        const bounds = layer.getBounds();
        map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: zoomThreshold - 1  // Ensure we don't zoom in too far
        });
    }

    districtLayer = L.geoJSON(districtsData, {
        style: styleDistrict,
        onEachFeature: function (feature, layer) {
            layer.bindTooltip(feature.properties.dtname, {
                permanent: true,
                direction: 'center',
                className: 'district-label'
            });
            layer.on('click', function (e) {
                const districtName = feature.properties.dtname;
                const district = districtData[districtName];
                if (district) {
                    if (selectedDistrict) {
                        districtLayer.resetStyle();
                    }
                    selectedDistrict = districtName;
                    districtLayer.eachLayer(function (layer) {
                        layer.setStyle(styleDistrict(layer.feature));
                    });
                    
                    updateInfoPane(districtName, district);

                    if (map.getZoom() >= 10) {
                        displayAgencies(districtName);
                    } else {
                        hideAgencies();
                    }
                }
            });
        }
    });

    updateLayerDisplay();
    map.on('zoomend', updateLayerDisplay);

    // Initialize with Kanpur Nagar data
    selectedDistrict = 'Kanpur Nagar';
    const kanpurData = districtData[selectedDistrict];
    if (kanpurData) {
        updateInfoPane(selectedDistrict, kanpurData);
        districtLayer.eachLayer(function (layer) {
            if (layer.feature.properties.dtname === selectedDistrict) {
                layer.setStyle(styleDistrict(layer.feature));
            }
        });
        // Display initial agencies for Kanpur Nagar if zoom level is appropriate
        if (map.getZoom() >= 10) {
            displayAgencies(selectedDistrict);
        }
        map.addLayer(districtLayer);
    }
}).catch(error => console.error('Error loading data:', error));

function updateLayerDisplay() {
    const currentZoom = map.getZoom();
    if (currentZoom < zoomThreshold) {
        map.removeLayer(districtLayer);
        map.addLayer(stateLayer);
    } else {
        map.removeLayer(stateLayer);
        map.addLayer(districtLayer);
    }
}


// Add zoom event listener
map.on('zoomend', function() {
    updateLayerDisplay();
    if (map.getZoom() >= 10) {
        if (selectedDistrict) {
            displayAgencies(selectedDistrict);
        }
    } else {
        hideAgencies();
    }
});

const icons = {
    EPF: L.icon({
        iconUrl: 'images/epf.png',
        iconSize: [10, 10],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    }),
    LIC: L.icon({
        iconUrl: 'images/lic.png',
        iconSize: [20, 20],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    }),
    Bank: L.icon({
        iconUrl: 'images/black-bank.png',
        iconSize: [20, 20],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    }),
    "Post Office": L.icon({
        iconUrl: 'images/post.png',
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
    const districtAgencies = agenciesData;
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
