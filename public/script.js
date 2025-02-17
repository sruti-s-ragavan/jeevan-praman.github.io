// Initialize the map
var zoomLevel = 5, latitude = 23.5937, longitude = 80.9629
var map = L.map('map').setView([latitude, longitude], zoomLevel);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let mainChart, channelChart;

function createOrUpdateMainChart(data) {
    cleanupCharts();
    const ctx = document.getElementById('main-chart').getContext('2d');
    
    const chartData = {
        labels: ['60-79', '80+'],
        datasets: [
            {
                label: 'Non-DLC Potential',
                data: data.pensioner_count.map((total, i) => total - data.DLC_potential[i]),
                backgroundColor: [
                    'rgba(200, 200, 200, 0.8)',
                    'rgba(150, 150, 150, 0.8)'
                ],
            },
            {
                label: 'DLC Potential',
                data: data.DLC_potential,
                backgroundColor: [
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(75, 192, 192, 0.8)'
                ],
            }
        ]
    };

    const chartOptions = {
        indexAxis: 'y',  // This makes the bars horizontal
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
                        const totalPensioners = tooltipItems.reduce((sum, item) => sum + item.parsed.x, 0);
                        const dlcPotential = tooltipItems[1].parsed.x;
                        const percentage = ((dlcPotential / totalPensioners) * 100).toFixed(1);
                        return `Total Pensioners: ${totalPensioners.toLocaleString()}\nDLC Potential: ${percentage}% of Total`;
                    }
                }
            },
            legend: {
                labels: {
                    generateLabels: function(chart) {
                        const datasets = chart.data.datasets;
                        return datasets.map((dataset, i) => ({
                            text: dataset.label,
                            fillStyle: dataset.backgroundColor[0],
                            hidden: false,
                            lineCap: dataset.borderCapStyle,
                            lineDash: dataset.borderDash,
                            lineDashOffset: dataset.borderDashOffset,
                            lineJoin: dataset.borderJoinStyle,
                            lineWidth: dataset.borderWidth,
                            strokeStyle: dataset.borderColor,
                            pointStyle: dataset.pointStyle,
                            rotation: dataset.rotation,
                            datasetIndex: i
                        }));
                    }
                }
            }
        },
        onClick: (event, elements) => {
            if (elements.length > 0) {
                const index = elements[0].index;
                cleanupCharts(); // Clean up before creating a new pie chart
                createOrUpdatePieChart(data, index);
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

function createOrUpdatePieChart(data, ageGroupIndex) {
    const ctx = document.getElementById('pie-chart').getContext('2d');
    
    const dlcPotential = data.DLC_potential[ageGroupIndex];
    const dlcSuccess = data.DLC_success[ageGroupIndex];
    const dlcFailed = data.DLC_failed[ageGroupIndex];

    const chartData = {
        labels: ['DLC Potential (Not Attempted)', 'DLC Success', 'DLC Failed'],
        datasets: [{
            data: [dlcPotential - dlcSuccess - dlcFailed, dlcSuccess, dlcFailed],
            backgroundColor: [
                'rgba(75, 192, 192, 0.8)',
                'rgba(255, 206, 86, 0.8)',
                'rgba(255, 99, 132, 0.8)'
            ]
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const percentage = ((value / dlcPotential) * 100).toFixed(1);
                        return `${label}: ${value.toLocaleString()} (${percentage}% of DLC Potential)`;
                    }
                }
            },
            title: {
                display: true,
                text: `DLC Potential Breakdown - ${ageGroupIndex === 0 ? '60-79' : '80+'}`
            }
        },
        onClick: (event, elements) => {
            if (elements.length > 0) {
                const index = elements[0].index;
                if (index === 1 || index === 2) { // DLC Success or DLC Failed
                    createOrUpdateChannelChart(data, ageGroupIndex);
                } else {
                    document.getElementById('channel-chart-container').style.display = 'none';
                }
            }
        }
    };

    if (window.pieChart instanceof Chart) {
        window.pieChart.destroy();
    }

    window.pieChart = new Chart(ctx, {
        type: 'pie',
        data: chartData,
        options: chartOptions
    });

    // Show the pie chart container
    document.getElementById('pie-chart-container').style.display = 'block';
}

function createOrUpdateChannelChart(data, ageGroupIndex) {
    const ctx = document.getElementById('channel-chart').getContext('2d');
    
    const successChannels = data.DLC_success_channels[ageGroupIndex];
    const failedChannels = data.DLC_failed_channels[ageGroupIndex];

    const chartData = {
        labels: ['LIC', 'EPFO', 'Banks', 'Others'],
        datasets: [
            {
                label: 'Success',
                data: [successChannels.lic, successChannels.epfo, successChannels.banks, successChannels.others],
                backgroundColor: 'rgba(75, 192, 192, 0.8)'
            },
            {
                label: 'Failed',
                data: [failedChannels.lic, failedChannels.epfo, failedChannels.banks, failedChannels.others],
                backgroundColor: 'rgba(255, 99, 132, 0.8)'
            }
        ]
    };

    const totalSuccess = Object.values(successChannels).reduce((a, b) => a + b, 0);
    const totalFailed = Object.values(failedChannels).reduce((a, b) => a + b, 0);
    const totalAttempts = totalSuccess + totalFailed;

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                stacked: true,
            },
            y: {
                stacked: true,
                beginAtZero: true
            }
        },
        plugins: {
            title: {
                display: true,
                text: `DLC Channels - ${ageGroupIndex === 0 ? '60-79' : '80+'}`
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y || 0;
                        const total = context.dataset.label === 'Success' ? totalSuccess : totalFailed;
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value.toLocaleString()} (${percentage}% of ${label})`;
                    },
                    footer: function(tooltipItems) {
                        const sum = tooltipItems.reduce((a, b) => a + b.parsed.y, 0);
                        const percentage = ((sum / totalAttempts) * 100).toFixed(1);
                        return `Total: ${sum.toLocaleString()} (${percentage}% of all attempts)`;
                    }
                }
            }
        }
    };

    if (window.channelChart instanceof Chart) {
        window.channelChart.destroy();
    }

    window.channelChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: chartOptions
    });

    // Show the channel chart container
    document.getElementById('channel-chart-container').style.display = 'block';
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
                                
                                cleanupCharts();
                                // Create or update the main chart
                                createOrUpdateMainChart(district);

                                // Hide the channel chart initially
                                document.getElementById('channel-chart-container').style.display = 'none';
                            }
                        });
                    }
                }).addTo(map);
            })
            .catch(error => console.error('Error loading GeoJSON:', error));
    })
    .catch(error => console.error('Error loading district data:', error));

    function cleanupCharts() {
        // Hide pie chart and channel chart containers
        document.getElementById('pie-chart-container').style.display = 'none';
        document.getElementById('channel-chart-container').style.display = 'none';
        
        // Destroy existing pie and channel charts if they exist
        if (window.pieChart instanceof Chart) {
            window.pieChart.destroy();
            window.pieChart = null;
        }
        if (window.channelChart instanceof Chart) {
            window.channelChart.destroy();
            window.channelChart = null;
        }
    }