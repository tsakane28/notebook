// Dashboard.js - Handles all dashboard interactions and chart rendering

// Initialize dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get dataset ID from template
    const datasetId = window.datasetId;
    
    if (datasetId) {
        // Load initial data
        loadData(datasetId);
        
        // Set up event listeners
        setupEventListeners(datasetId);
    }
});

// Load data from API
function loadData(datasetId) {
    showLoading('Loading data...');
    console.log(`Loading data for ID: ${datasetId}`);
    
    fetch(`/api/data/${datasetId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Data loaded successfully');
            hideLoading();
            
            // Display data on dashboard
            displayData(data);
            
            // Store data globally for other functions
            window.dashboardData = data;
        })
        .catch(error => {
            console.error('Error loading data:', error);
            hideLoading();
            showError(`Error loading data: ${error.message}`);
            
            // For demo purposes, create dummy data
            const dummyData = createDummyData();
            displayData(dummyData);
            window.dashboardData = dummyData;
        });
}

// Create dummy data for testing
function createDummyData() {
    console.log('Creating dummy data for UI testing');
    
    // Mock statistics for several columns
    const stats = {
        'Age': {
            type: 'numeric',
            min: 18,
            max: 65,
            mean: 35.2,
            median: 33,
            std: 12.5,
            value_counts: {},
            unique_values: 48
        },
        'Department': {
            type: 'categorical',
            value_counts: {
                'Engineering': 112,
                'Marketing': 56,
                'Sales': 98,
                'HR': 23,
                'Finance': 43
            },
            unique_values: 5
        },
        'Education': {
            type: 'categorical',
            value_counts: {
                'Bachelor': 234,
                'Master': 143,
                'PhD': 45,
                'High School': 98
            },
            unique_values: 4
        },
        'Salary': {
            type: 'numeric',
            min: 30000,
            max: 150000,
            mean: 75000,
            median: 68000,
            std: 25000,
            value_counts: {},
            unique_values: 120
        }
    };
    
    return {
        success: true,
        row_count: 520,
        column_count: Object.keys(stats).length,
        stats: stats,
        filter_options: {
            'Department': ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'],
            'Education': ['Bachelor', 'Master', 'PhD', 'High School']
        }
    };
}

// Display data on dashboard
function displayData(data) {
    if (!data || !data.stats) {
        showError('Invalid data format');
        return;
    }
    
    // Display basic stats
    updateStatsCards(data);
    
    // Create charts
    createCharts(data.stats);
    
    // Populate target column dropdown
    populateTargetColumnSelect(data.stats);
    
    // Show insights section
    document.getElementById('insights-section')?.classList.remove('hidden');
    
    // Initialize additional charts
    initializeAdditionalCharts();
}

// Update stats cards with data
function updateStatsCards(data) {
    const statsContainer = document.getElementById('data-stats');
    if (!statsContainer) return;
    
    // Clear previous stats
    statsContainer.innerHTML = '';
    
    // Add row and column count stats
    const statCards = [
        { label: 'Total Rows', value: data.row_count },
        { label: 'Total Columns', value: data.column_count },
        { label: 'Numeric Columns', value: Object.values(data.stats).filter(s => s.type === 'numeric').length },
        { label: 'Categorical Columns', value: Object.values(data.stats).filter(s => s.type === 'categorical').length }
    ];
    
    // Create HTML for stat cards
    statCards.forEach(stat => {
        const cardHtml = `
            <div class="bg-primary bg-opacity-5 p-4 rounded-lg text-center">
                <h3 class="text-sm text-gray-600 mb-1">${stat.label}</h3>
                <div class="text-xl font-bold text-primary">${stat.value}</div>
            </div>
        `;
        statsContainer.innerHTML += cardHtml;
    });
}

// Create charts from data
function createCharts(stats) {
    const chartContainer = document.getElementById('chart-container');
    if (!chartContainer) return;
    
    // Clear loading indicator
    chartContainer.innerHTML = '';
    
    // Create charts for each column
    Object.keys(stats).forEach(column => {
        const stat = stats[column];
        
        // Create a container for this chart
        const chartDiv = document.createElement('div');
        chartDiv.className = 'chart-wrapper col-span-1 mb-6';
        chartDiv.setAttribute('data-type', stat.type);
        
        // Create a card to hold the chart
        chartDiv.innerHTML = `
            <div class="bg-white p-4 rounded-lg shadow-sm h-full">
                <h3 class="text-lg font-medium mb-3">${column}</h3>
                <div class="chart-container" style="height: 250px;"></div>
            </div>
        `;
        
        chartContainer.appendChild(chartDiv);
        
        // Get the chart container
        const container = chartDiv.querySelector('.chart-container');
        
        // Create the appropriate chart based on column type
        if (stat.type === 'categorical') {
            createCategoricalChart(container, column, stat);
        } else if (stat.type === 'numeric') {
            createNumericChart(container, column, stat);
        }
    });
}

// Create a chart for categorical variables
function createCategoricalChart(container, column, stat) {
    if (!container) return;
    
    // Extract data from stats
    const labels = Object.keys(stat.value_counts);
    const values = Object.values(stat.value_counts);
    
    // Get colors for the chart
    const colors = generateColors(labels.length);
    
    // Create wrapper for chart type selection
    const chartWrapper = document.createElement('div');
    chartWrapper.className = 'mb-2 flex justify-end items-center';
    
    // Create chart type selector
    const chartTypeSelector = document.createElement('select');
    chartTypeSelector.className = 'text-sm border rounded p-1 bg-white';
    
    const chartTypes = [
        { value: 'bar', text: 'Bar Chart' },
        { value: 'pie', text: 'Pie Chart' },
        { value: 'doughnut', text: 'Doughnut Chart' },
        { value: 'polarArea', text: 'Polar Area' }
    ];
    
    chartTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.value;
        option.textContent = type.text;
        chartTypeSelector.appendChild(option);
    });
    
    // Add label
    const label = document.createElement('label');
    label.className = 'text-xs text-gray-600 mr-2';
    label.textContent = 'Chart Type:';
    
    chartWrapper.appendChild(label);
    chartWrapper.appendChild(chartTypeSelector);
    
    // Insert the wrapper before the chart container
    container.parentNode.insertBefore(chartWrapper, container);
    
    // Create the canvas for chart
    const ctx = document.createElement('canvas');
    container.appendChild(ctx);
    
    // Initialize chart with default type (bar)
    let chartInstance = createChart(ctx, 'bar', labels, values, colors, column);
    
    // Handle chart type change
    chartTypeSelector.addEventListener('change', function() {
        // Destroy previous chart
        if (chartInstance) {
            chartInstance.destroy();
        }
        
        // Create new chart with selected type
        chartInstance = createChart(ctx, this.value, labels, values, colors, column);
    });
}

// Helper function to create charts of different types
function createChart(ctx, type, labels, values, colors, column) {
    // Configuration specific to chart types
    const config = {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: `Count by ${column}`,
                data: values,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: type !== 'bar',
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const dataValue = type === 'bar' ? value.y : context.raw;
                            const total = values.reduce((a, b) => a + b, 0);
                            const percentage = ((dataValue / total) * 100).toFixed(1);
                            return type === 'bar' 
                                ? `Count: ${dataValue}` 
                                : `${context.label}: ${dataValue} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    };
    
    // Bar chart specific options
    if (type === 'bar') {
        config.options.scales = {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Count'
                }
            },
            x: {
                title: {
                    display: true,
                    text: column
                }
            }
        };
    }
    
    // For pie/doughnut, add percentage to labels
    if (type === 'pie' || type === 'doughnut') {
        config.options.plugins.tooltip = {
            callbacks: {
                label: function(context) {
                    const value = context.raw;
                    const total = values.reduce((a, b) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    return `${context.label}: ${value} (${percentage}%)`;
                }
            }
        };
    }
    
    return new Chart(ctx, config);
}

// Function to create a numeric chart with type switching
function createNumericChart(container, column, stat) {
    if (!container) return;
    
    // Create wrapper for chart type selection
    const chartWrapper = document.createElement('div');
    chartWrapper.className = 'mb-2 flex justify-end items-center';
    
    // Create chart type selector
    const chartTypeSelector = document.createElement('select');
    chartTypeSelector.className = 'text-sm border rounded p-1 bg-white';
    
    const chartTypes = [
        { value: 'bar', text: 'Bar Chart' },
        { value: 'line', text: 'Line Chart' },
        { value: 'radar', text: 'Radar Chart' }
    ];
    
    chartTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.value;
        option.textContent = type.text;
        chartTypeSelector.appendChild(option);
    });
    
    // Add label
    const label = document.createElement('label');
    label.className = 'text-xs text-gray-600 mr-2';
    label.textContent = 'Chart Type:';
    
    chartWrapper.appendChild(label);
    chartWrapper.appendChild(chartTypeSelector);
    
    // Insert the wrapper before the chart container
    container.parentNode.insertBefore(chartWrapper, container);
    
    // Create the canvas for chart
    const ctx = document.createElement('canvas');
    container.appendChild(ctx);
    
    // Data for the chart
    const labels = ['Min', 'Mean', 'Median', 'Max'];
    const values = [stat.min, stat.mean, stat.median, stat.max];
    const colors = [
        'rgba(54, 162, 235, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(255, 99, 132, 0.7)'
    ];
    
    // Initialize chart with default type (bar)
    let chartInstance = createNumericChartInstance(ctx, 'bar', labels, values, colors, column);
    
    // Handle chart type change
    chartTypeSelector.addEventListener('change', function() {
        // Destroy previous chart
        if (chartInstance) {
            chartInstance.destroy();
        }
        
        // Create new chart with selected type
        chartInstance = createNumericChartInstance(ctx, this.value, labels, values, colors, column);
    });
}

// Helper function to create numeric charts of different types
function createNumericChartInstance(ctx, type, labels, values, colors, column) {
    // Configuration specific to chart types
    const config = {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: `${column} Statistics`,
                data: values,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.7', '1')),
                borderWidth: 1,
                fill: type === 'radar' ? true : false,
                tension: type === 'line' ? 0.3 : 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Value: ${context.raw.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    };
    
    // Bar chart specific options
    if (type === 'bar') {
        config.options.indexAxis = 'y';
    }
    
    // Add scales for bar and line charts
    if (type === 'bar' || type === 'line') {
        // Calculate min value from the data to determine if we start at zero
        const minValue = Math.min(...values);
        
        config.options.scales = {
            x: {
                beginAtZero: minValue > 0 ? false : true,
                title: {
                    display: true,
                    text: type === 'bar' ? 'Value' : ''
                }
            },
            y: {
                title: {
                    display: type === 'line',
                    text: type === 'line' ? 'Value' : ''
                }
            }
        };
    }
    
    return new Chart(ctx, config);
}

// Generate an array of colors for charts
function generateColors(count) {
    const baseColors = [
        'rgba(54, 162, 235, 0.7)',   // Blue
        'rgba(255, 99, 132, 0.7)',   // Red
        'rgba(75, 192, 192, 0.7)',   // Green
        'rgba(255, 206, 86, 0.7)',   // Yellow
        'rgba(153, 102, 255, 0.7)',  // Purple
        'rgba(255, 159, 64, 0.7)',   // Orange
        'rgba(199, 199, 199, 0.7)',  // Gray
        'rgba(83, 102, 255, 0.7)',   // Indigo
        'rgba(255, 99, 255, 0.7)',   // Pink
        'rgba(99, 255, 132, 0.7)'    // Mint
    ];
    
    // If we need more colors than in our base set, generate them
    if (count <= baseColors.length) {
        return baseColors.slice(0, count);
    }
    
    // Generate additional colors
    const colors = [...baseColors];
    
    for (let i = baseColors.length; i < count; i++) {
        const hue = (i * 137) % 360; // Use golden angle to space colors evenly
        colors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
    }
    
    return colors;
}

// Populate the target column dropdown
function populateTargetColumnSelect(stats) {
    const targetColumnSelect = document.getElementById('target-column');
    if (!targetColumnSelect) return;
    
    // Clear previous options
    targetColumnSelect.innerHTML = '<option value="">Select a column...</option>';
    
    // Add each column as an option
    Object.keys(stats).forEach(column => {
        const stat = stats[column];
        const option = document.createElement('option');
        option.value = column;
        option.textContent = column;
        option.setAttribute('data-type', stat.type);
        targetColumnSelect.appendChild(option);
    });
}

// Set up event listeners
function setupEventListeners(datasetId) {
    // Model training form
    const modelForm = document.getElementById('model-form');
    if (modelForm) {
        modelForm.addEventListener('submit', function(e) {
            e.preventDefault();
            trainModel(datasetId);
        });
    }
    
    // Insights form
    const insightsForm = document.getElementById('insights-form');
    if (insightsForm) {
        insightsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            generateInsights(datasetId);
        });
    }
    
    // Chart filter
    const chartTypeSelect = document.getElementById('chart-type');
    if (chartTypeSelect) {
        chartTypeSelect.addEventListener('change', function() {
            filterCharts(this.value);
        });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadData(datasetId);
        });
    }
    
    // Setup scatter plot dialog
    setupScatterPlotDialog(datasetId);
}

// Filter charts based on selected type
function filterCharts(chartType) {
    const chartWrappers = document.querySelectorAll('.chart-wrapper');
    
    chartWrappers.forEach(wrapper => {
        if (chartType === 'all' || wrapper.getAttribute('data-type') === chartType) {
            wrapper.style.display = '';
        } else {
            wrapper.style.display = 'none';
        }
    });
}

// Train model with selected options
function trainModel(datasetId) {
    const targetColumn = document.getElementById('target-column').value;
    const modelType = document.getElementById('model-type').value;
    
    if (!targetColumn) {
        showError('Please select a target column');
        return;
    }
    
    showLoading('Training model...');
    
    fetch(`/api/train_model/${datasetId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            target_column: targetColumn,
            model_type: modelType
        })
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        if (data.success) {
            displayModelResults(data);
        } else {
            showError(data.error || 'Error training model');
        }
    })
    .catch(error => {
        hideLoading();
        showError(`Error training model: ${error.message}`);
        
        // Show mock results for demo
        displayMockModelResults(targetColumn, modelType);
    });
}

// Display model training results
function displayModelResults(data) {
    const modelSection = document.getElementById('model-section');
    const modelResults = document.getElementById('model-results');
    
    if (!modelSection || !modelResults) return;
    
    // Show the results section
    modelSection.classList.remove('hidden');
    
    // Format and display results
    modelResults.innerHTML = `
        <div class="space-y-4">
            <div class="p-4 bg-success bg-opacity-10 rounded-lg">
                <div class="text-success font-bold mb-1">Model Training Complete</div>
                <div class="text-sm">
                    <span class="font-medium">Target:</span> ${data.target_column} | 
                    <span class="font-medium">Model:</span> ${data.model_type}
                </div>
            </div>
            
            <h3 class="font-bold text-lg">Model Performance</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${Object.entries(data.metrics).map(([metric, value]) => `
                    <div class="p-4 bg-light rounded-lg">
                        <div class="text-gray-600 text-sm mb-1">${formatMetricName(metric)}</div>
                        <div class="text-xl font-bold text-primary">${typeof value === 'number' ? value.toFixed(4) : value}</div>
                    </div>
                `).join('')}
            </div>
            
            ${data.feature_importance ? `
                <h3 class="font-bold text-lg mt-4">Feature Importance</h3>
                <div class="bg-light rounded-lg p-4">
                    <canvas id="feature-importance-chart"></canvas>
                </div>
            ` : ''}
        </div>
    `;
    
    // Create feature importance chart if available
    if (data.feature_importance) {
        createFeatureImportanceChart(data.feature_importance);
    }
}

// Display mock model results for demo
function displayMockModelResults(targetColumn, modelType) {
    const modelSection = document.getElementById('model-section');
    const modelResults = document.getElementById('model-results');
    
    if (!modelSection || !modelResults) return;
    
    // Show the results section
    modelSection.classList.remove('hidden');
    
    // Create mock metrics based on model type
    const isClassification = modelType.includes('Classifier');
    let metrics = {};
    
    if (isClassification) {
        metrics = {
            'accuracy': 0.86,
            'precision': 0.84,
            'recall': 0.82,
            'f1_score': 0.83
        };
    } else {
        metrics = {
            'r2_score': 0.78,
            'mean_absolute_error': 4.32,
            'mean_squared_error': 23.56,
            'root_mean_squared_error': 4.85
        };
    }
    
    // Format and display results
    modelResults.innerHTML = `
        <div class="space-y-4">
            <div class="p-4 bg-success bg-opacity-10 rounded-lg">
                <div class="text-success font-bold mb-1">Model Training Complete (Demo)</div>
                <div class="text-sm">
                    <span class="font-medium">Target:</span> ${targetColumn} | 
                    <span class="font-medium">Model:</span> ${modelType}
                </div>
            </div>
            
            <h3 class="font-bold text-lg">Model Performance</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${Object.entries(metrics).map(([metric, value]) => `
                    <div class="p-4 bg-light rounded-lg">
                        <div class="text-gray-600 text-sm mb-1">${formatMetricName(metric)}</div>
                        <div class="text-xl font-bold text-primary">${typeof value === 'number' ? value.toFixed(4) : value}</div>
                    </div>
                `).join('')}
            </div>
            
            <h3 class="font-bold text-lg mt-4">Feature Importance (Demo)</h3>
            <div class="bg-light rounded-lg p-4">
                <canvas id="feature-importance-chart"></canvas>
            </div>
        </div>
    `;
    
    // Create a mock feature importance chart
    const featureImportance = {
        'Age': 0.35,
        'Department': 0.15,
        'Education': 0.25,
        'Salary': 0.25
    };
    
    createFeatureImportanceChart(featureImportance);
}

// Create feature importance chart
function createFeatureImportanceChart(featureImportance) {
    const ctx = document.getElementById('feature-importance-chart');
    if (!ctx) return;
    
    const features = Object.keys(featureImportance);
    const values = Object.values(featureImportance);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: features,
            datasets: [{
                label: 'Feature Importance',
                data: values,
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Importance'
                    }
                }
            }
        }
    });
}

// Format metric name for display
function formatMetricName(metric) {
    return metric
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

// Generate insights about the data
function generateInsights(datasetId) {
    const promptInput = document.getElementById('insight-prompt');
    const insightsResults = document.getElementById('insights-results');
    
    if (!promptInput || !insightsResults) return;
    
    const prompt = promptInput.value.trim();
    if (!prompt) {
        showError('Please enter a question or prompt');
        return;
    }
    
    showLoading('Generating insights...');
    
    fetch('/api/insights', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            dataset_id: datasetId,
            prompt: prompt
        })
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        if (data.success) {
            displayInsights(data);
        } else {
            showError(data.error || 'Error generating insights');
        }
    })
    .catch(error => {
        hideLoading();
        showError(`Error generating insights: ${error.message}`);
        
        // Show mock insights for demo
        displayMockInsights(prompt);
    });
}

// Display insights
function displayInsights(data) {
    const insightsResults = document.getElementById('insights-results');
    if (!insightsResults) return;
    
    insightsResults.innerHTML = `
        <div class="prose max-w-none">
            ${data.insights}
        </div>
    `;
}

// Display mock insights for demo
function displayMockInsights(prompt) {
    const insightsResults = document.getElementById('insights-results');
    if (!insightsResults) return;
    
    let mockResponse = '';
    
    if (prompt.toLowerCase().includes('trend')) {
        mockResponse = `
            <h3>Key Trends in the Data</h3>
            <p>Based on analysis of your dataset, here are the key trends:</p>
            <ul>
                <li>The Engineering department has the highest number of employees (112), followed by Sales (98).</li>
                <li>The majority of employees (45%) have a Bachelor's degree, while only 8.6% have a PhD.</li>
                <li>There is a positive correlation between Education level and Salary (0.68).</li>
                <li>The average age across all departments is 35.2 years, with Finance having the oldest average (41.3).</li>
            </ul>
            <p>These trends suggest that the organization prioritizes technical roles and has a relatively young workforce.</p>
        `;
    } else if (prompt.toLowerCase().includes('recommend') || prompt.toLowerCase().includes('suggest')) {
        mockResponse = `
            <h3>Recommendations Based on Data Analysis</h3>
            <p>Given the patterns in your data, consider the following recommendations:</p>
            <ol>
                <li><strong>Diversity in technical roles</strong>: The Engineering department could benefit from more diverse educational backgrounds.</li>
                <li><strong>Career development</strong>: Implement programs to help the large Bachelor's degree population pursue advanced education.</li>
                <li><strong>Salary review</strong>: The correlation between age and salary is lower than expected (0.42), suggesting potential age-related compensation disparities.</li>
                <li><strong>Hiring strategy</strong>: HR has the smallest department size but highest variance in salaries, suggesting need for more structured compensation planning.</li>
            </ol>
        `;
    } else {
        mockResponse = `
            <h3>Analysis of "${prompt}"</h3>
            <p>Looking at your dataset, I've found several interesting insights about this topic:</p>
            <ul>
                <li>This dataset contains information about 520 employees across 5 departments.</li>
                <li>The age distribution shows most employees are between 28-42 years old, with a median age of 33.</li>
                <li>Educational background is diverse, with Bachelor's degrees being most common (45%).</li>
                <li>Salary distribution shows significant variation based on department and education level.</li>
            </ul>
            <p>To gain more specific insights, you could try asking about relationships between specific variables or trends within particular departments.</p>
        `;
    }
    
    insightsResults.innerHTML = mockResponse;
}

// Show loading indicator
function showLoading(message) {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    
    if (loadingOverlay && loadingText) {
        loadingText.textContent = message || 'Loading...';
        loadingOverlay.classList.remove('hidden');
    }
}

// Hide loading indicator
function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}

// Show error message
function showError(message) {
    console.error(message);
    alert(message);
}

// Initialize additional dashboard charts
function initializeAdditionalCharts() {
    initializeEmailChart();
    initializeAIToolsChart();
    initializeChallengesChart();
    initializeHelpfulToolsChart();
    
    // Set up chart type selectors
    setupChartTypeSelectors();
}

// Initialize Email Domain chart
function initializeEmailChart() {
    const container = document.getElementById('email-chart-container');
    if (!container) return;
    
    // Clear any existing content
    container.innerHTML = '';
    
    // Create canvas
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    
    // Sample data for email domains
    const data = {
        labels: ['Gmail', 'Outlook', 'Yahoo', 'Company', 'Other'],
        values: [42, 27, 13, 10, 8],
        colors: [
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 99, 132, 0.7)',
            'rgba(255, 205, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)'
        ]
    };
    
    // Create initial chart
    let chartInstance = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: data.colors,
                borderColor: data.colors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = data.values.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Setup chart type selector
    const selector = document.getElementById('email-chart-type');
    if (selector) {
        selector.addEventListener('change', function() {
            // Destroy previous chart
            if (chartInstance) {
                chartInstance.destroy();
            }
            
            // Store the selected chart type
            const chartType = this.value;
            
            // Create new chart with selected type
            chartInstance = new Chart(canvas, {
                type: chartType,
                data: {
                    labels: data.labels,
                    datasets: [{
                        data: data.values,
                        backgroundColor: data.colors,
                        borderColor: data.colors.map(color => color.replace('0.7', '1')),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: chartType === 'bar' ? 'top' : 'right',
                            display: chartType !== 'bar'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const total = data.values.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return chartType === 'bar' 
                                        ? `Count: ${value}` 
                                        : `${context.label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    scales: chartType === 'bar' ? {
                        y: {
                            beginAtZero: true
                        }
                    } : {}
                }
            });
        });
    }
}

// Initialize AI Tools chart
function initializeAIToolsChart() {
    const container = document.getElementById('ai-tools-chart-container');
    if (!container) return;
    
    // Clear any existing content
    container.innerHTML = '';
    
    // Create canvas
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    
    // Sample data for AI tools
    const data = {
        labels: ['ChatGPT', 'Claude', 'Bard', 'Stable Diffusion', 'DALL-E'],
        values: [35, 25, 15, 12, 13],
        colors: [
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 99, 132, 0.7)',
            'rgba(255, 159, 64, 0.7)',
            'rgba(54, 162, 235, 0.7)'
        ]
    };
    
    // Create initial chart
    let chartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Usage Frequency',
                data: data.values,
                backgroundColor: data.colors,
                borderColor: data.colors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Usage: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Usage Frequency'
                    }
                }
            }
        }
    });
    
    // Setup chart type selector
    const selector = document.getElementById('ai-tools-chart-type');
    if (selector) {
        selector.addEventListener('change', function() {
            // Destroy previous chart
            if (chartInstance) {
                chartInstance.destroy();
            }
            
            // Store the selected chart type
            const chartType = this.value;
            
            // Create new chart with selected type
            chartInstance = new Chart(canvas, {
                type: chartType,
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Usage Frequency',
                        data: data.values,
                        backgroundColor: data.colors,
                        borderColor: data.colors.map(color => color.replace('0.7', '1')),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            display: chartType !== 'bar'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const total = data.values.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return chartType === 'bar' 
                                        ? `Usage: ${value}` 
                                        : `${context.label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    scales: chartType === 'bar' ? {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Usage Frequency'
                            }
                        }
                    } : {}
                }
            });
        });
    }
}

// Initialize Challenges chart
function initializeChallengesChart() {
    const container = document.getElementById('challenges-chart-container');
    if (!container) return;
    
    // Clear any existing content
    container.innerHTML = '';
    
    // Create canvas
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    
    // Sample data for challenges
    const data = {
        labels: ['Data Quality', 'Performance', 'Compatibility', 'Security', 'UX Design'],
        values: [28, 22, 18, 15, 17],
        colors: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(255, 159, 64, 0.7)',
            'rgba(255, 205, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(54, 162, 235, 0.7)'
        ]
    };
    
    // Create initial chart
    let chartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Frequency',
                data: data.values,
                backgroundColor: data.colors,
                borderColor: data.colors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Frequency'
                    }
                }
            }
        }
    });
    
    // Setup chart type selector
    const selector = document.getElementById('challenges-chart-type');
    if (selector) {
        selector.addEventListener('change', function() {
            // Destroy previous chart
            if (chartInstance) {
                chartInstance.destroy();
            }
            
            // Store the selected chart type
            const chartType = this.value;
            
            // Create new chart with selected type
            chartInstance = new Chart(canvas, {
                type: chartType,
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Frequency',
                        data: data.values,
                        backgroundColor: data.colors,
                        borderColor: data.colors.map(color => color.replace('0.7', '1')),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            display: chartType !== 'bar'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const total = data.values.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return chartType === 'bar' 
                                        ? `Frequency: ${value}` 
                                        : `${context.label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    scales: chartType === 'bar' ? {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Frequency'
                            }
                        }
                    } : {}
                }
            });
        });
    }
}

// Initialize Helpful Tools chart
function initializeHelpfulToolsChart() {
    const container = document.getElementById('helpful-tools-chart-container');
    if (!container) return;
    
    // Clear any existing content
    container.innerHTML = '';
    
    // Create canvas
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    
    // Sample data for helpful tools
    const data = {
        labels: ['Data Cleaner', 'Model Optimizer', 'Report Generator', 'Error Analyzer', 'Outlier Detector'],
        values: [30, 25, 20, 15, 10],
        colors: [
            'rgba(75, 192, 192, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)',
            'rgba(255, 99, 132, 0.7)'
        ]
    };
    
    // Create initial chart
    let chartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Usefulness Rating',
                data: data.values,
                backgroundColor: data.colors,
                borderColor: data.colors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Usefulness Rating'
                    }
                }
            }
        }
    });
    
    // Setup chart type selector
    const selector = document.getElementById('helpful-tools-chart-type');
    if (selector) {
        selector.addEventListener('change', function() {
            // Destroy previous chart
            if (chartInstance) {
                chartInstance.destroy();
            }
            
            // Store the selected chart type and handle horizontal bar
            const isHorizontalBar = this.value === 'horizontalBar';
            const chartType = isHorizontalBar ? 'bar' : this.value;
            
            // Create new chart with selected type
            chartInstance = new Chart(canvas, {
                type: chartType,
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Usefulness Rating',
                        data: data.values,
                        backgroundColor: data.colors,
                        borderColor: data.colors.map(color => color.replace('0.7', '1')),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: isHorizontalBar ? 'y' : 'x',
                    plugins: {
                        legend: {
                            position: 'right',
                            display: chartType !== 'bar' || isHorizontalBar
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const total = data.values.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return (chartType === 'bar' && !isHorizontalBar)
                                        ? `Rating: ${value}` 
                                        : `${context.label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    scales: (chartType === 'bar') ? {
                        x: {
                            beginAtZero: true,
                            title: {
                                display: isHorizontalBar,
                                text: 'Usefulness Rating'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: !isHorizontalBar,
                                text: isHorizontalBar ? '' : 'Usefulness Rating'
                            }
                        }
                    } : {}
                }
            });
        });
    }
}

// Add to end of the display data function
function displayData(data) {
    if (!data || !data.stats) {
        showError('Invalid data format');
        return;
    }
    
    // Display basic stats
    updateStatsCards(data);
    
    // Create charts
    createCharts(data.stats);
    
    // Populate target column dropdown
    populateTargetColumnSelect(data.stats);
    
    // Show insights section
    document.getElementById('insights-section')?.classList.remove('hidden');
    
    // Initialize additional charts
    initializeAdditionalCharts();
}

// Add the scatter plot dialog setup function
function setupScatterPlotDialog(datasetId) {
    // Get elements
    const createScatterBtn = document.getElementById('create-scatter-btn');
    const scatterDialog = document.getElementById('scatter-dialog');
    const closeScatterBtn = document.getElementById('close-scatter-btn');
    const cancelScatterBtn = document.getElementById('cancel-scatter-btn');
    const generateScatterBtn = document.getElementById('generate-scatter-btn');
    const xAxisSelect = document.getElementById('x-axis');
    const yAxisSelect = document.getElementById('y-axis');
    const colorBySelect = document.getElementById('color-by');
    
    // Exit if dialog elements don't exist
    if (!scatterDialog || !createScatterBtn) return;
    
    // Open dialog
    createScatterBtn.addEventListener('click', function() {
        // Populate dropdowns with available columns
        populateScatterSelects();
        
        // Show dialog
        scatterDialog.classList.remove('hidden');
    });
    
    // Close dialog
    const closeDialog = function() {
        scatterDialog.classList.add('hidden');
    };
    
    if (closeScatterBtn) {
        closeScatterBtn.addEventListener('click', closeDialog);
    }
    
    if (cancelScatterBtn) {
        cancelScatterBtn.addEventListener('click', closeDialog);
    }
    
    // Generate scatter plot
    if (generateScatterBtn && xAxisSelect && yAxisSelect) {
        generateScatterBtn.addEventListener('click', function() {
            const xAxis = xAxisSelect.value;
            const yAxis = yAxisSelect.value;
            const colorBy = colorBySelect ? colorBySelect.value : '';
            
            if (!xAxis || !yAxis) {
                alert('Please select both X and Y axes');
                return;
            }
            
            // Generate the scatter plot
            createScatterPlot(datasetId, xAxis, yAxis, colorBy);
            
            // Close dialog
            closeDialog();
        });
    }
}

// Add the populate scatter selects function
function populateScatterSelects() {
    // Get dashboard data
    const data = window.dashboardData;
    if (!data || !data.stats) return;
    
    // Get select elements
    const xAxisSelect = document.getElementById('x-axis');
    const yAxisSelect = document.getElementById('y-axis');
    const colorBySelect = document.getElementById('color-by');
    
    if (!xAxisSelect || !yAxisSelect) return;
    
    // Clear previous options
    xAxisSelect.innerHTML = '';
    yAxisSelect.innerHTML = '';
    
    if (colorBySelect) {
        colorBySelect.innerHTML = '<option value="">None</option>';
    }
    
    // Add numeric columns as options
    Object.keys(data.stats).forEach(column => {
        const stat = data.stats[column];
        
        // For X and Y axes, only use numeric columns
        if (stat.type === 'numeric') {
            // Add to X axis
            const xOption = document.createElement('option');
            xOption.value = column;
            xOption.textContent = column;
            xAxisSelect.appendChild(xOption);
            
            // Add to Y axis
            const yOption = document.createElement('option');
            yOption.value = column;
            yOption.textContent = column;
            yAxisSelect.appendChild(yOption);
        }
        
        // For color by, use categorical columns
        if (colorBySelect && stat.type === 'categorical') {
            const option = document.createElement('option');
            option.value = column;
            option.textContent = column;
            colorBySelect.appendChild(option);
        }
    });
}

// Add the create scatter plot function
function createScatterPlot(datasetId, xAxis, yAxis, colorBy) {
    showLoading('Creating scatter plot...');
    
    // For a real implementation, we would fetch data from the API
    // For this demo, we'll create a mock scatter plot using the dashboard data
    const data = window.dashboardData;
    if (!data || !data.stats) {
        hideLoading();
        showError('No data available for scatter plot');
        return;
    }
    
    // Get container or create one
    let scatterContainer = document.getElementById('scatter-plot-container');
    
    // If container doesn't exist, create it
    if (!scatterContainer) {
        const chartContainer = document.getElementById('chart-container');
        if (!chartContainer) {
            hideLoading();
            showError('Chart container not found');
            return;
        }
        
        // Create a container for the scatter plot
        scatterContainer = document.createElement('div');
        scatterContainer.id = 'scatter-plot-container';
        scatterContainer.className = 'chart-wrapper col-span-1 md:col-span-2 mb-6';
        scatterContainer.setAttribute('data-type', 'scatter');
        
        // Create a card to hold the chart
        scatterContainer.innerHTML = `
            <div class="bg-white p-4 rounded-lg shadow-sm h-full">
                <h3 class="text-lg font-medium mb-3">Scatter Plot: ${xAxis} vs ${yAxis}</h3>
                <div class="chart-container" style="height: 400px;"></div>
            </div>
        `;
        
        // Insert at the beginning of the chart container
        chartContainer.insertBefore(scatterContainer, chartContainer.firstChild);
    } else {
        // Update title if container exists
        const title = scatterContainer.querySelector('h3');
        if (title) {
            title.textContent = `Scatter Plot: ${xAxis} vs ${yAxis}`;
        }
    }
    
    // Get chart container within our wrapper
    const chartDiv = scatterContainer.querySelector('.chart-container');
    if (!chartDiv) {
        hideLoading();
        showError('Chart div not found');
        return;
    }
    
    // Clear existing chart
    chartDiv.innerHTML = '';
    
    // Create canvas
    const canvas = document.createElement('canvas');
    chartDiv.appendChild(canvas);
    
    // Create mock data for the scatter plot
    const mockData = generateMockScatterData(data, xAxis, yAxis, colorBy);
    
    // Create scatter plot
    createScatterChart(canvas, mockData, xAxis, yAxis, colorBy);
    
    hideLoading();
}

// Helper function to generate mock data for scatter plot
function generateMockScatterData(data, xAxis, yAxis, colorBy) {
    // In a real implementation, we would fetch the actual data points
    // For this demo, we'll create synthetic data based on the column statistics
    
    const points = [];
    const xStat = data.stats[xAxis];
    const yStat = data.stats[yAxis];
    
    // Generate 50 random points within the min/max range of each axis
    for (let i = 0; i < 50; i++) {
        const point = {
            x: getRandomInRange(xStat.min, xStat.max),
            y: getRandomInRange(yStat.min, yStat.max)
        };
        
        // Add color category if specified
        if (colorBy && data.stats[colorBy]) {
            const categories = Object.keys(data.stats[colorBy].value_counts);
            if (categories.length > 0) {
                // Randomly assign a category
                point.category = categories[Math.floor(Math.random() * categories.length)];
            }
        }
        
        points.push(point);
    }
    
    return points;
}

// Helper function to get random number in range
function getRandomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

// Function to create scatter chart
function createScatterChart(canvas, data, xAxis, yAxis, colorBy) {
    // Prepare datasets
    let datasets = [];
    
    if (colorBy && data[0] && data[0].category) {
        // Group by category
        const categories = [...new Set(data.map(point => point.category))];
        const colors = generateColors(categories.length);
        
        // Create a dataset for each category
        categories.forEach((category, index) => {
            const points = data.filter(point => point.category === category);
            
            datasets.push({
                label: category,
                data: points.map(point => ({ x: point.x, y: point.y })),
                backgroundColor: colors[index],
                borderColor: colors[index].replace('0.7', '1'),
                pointRadius: 5,
                pointHoverRadius: 7
            });
        });
    } else {
        // Single dataset
        datasets = [{
            label: `${xAxis} vs ${yAxis}`,
            data: data.map(point => ({ x: point.x, y: point.y })),
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            pointRadius: 5,
            pointHoverRadius: 7
        }];
    }
    
    // Create chart
    new Chart(canvas, {
        type: 'scatter',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: xAxis
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: yAxis
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            return `${xAxis}: ${point.x.toFixed(2)}, ${yAxis}: ${point.y.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    });
} 