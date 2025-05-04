// Dashboard.js - Handles all dashboard interactions and chart rendering

// Check if we're on the dashboard page
const isDashboardPage = document.querySelector('.dashboard-container') !== null;

// Initialize charts when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get data ID from URL
    const urlParts = window.location.pathname.split('/');
    const dataId = urlParts[urlParts.length - 1];
    
    // Load initial data
    loadData(dataId);
    
    // Set up event listeners
    setupEventListeners(dataId);
});

// Load chart data from the API
function loadData(dataId) {
    showLoading('Loading data...');
    console.log(`Loading data for ID: ${dataId}`);
    
    fetch(`/api/data/${dataId}`)
        .then(response => {
            if (!response.ok) {
                // Log full error details
                return response.text().then(text => {
                    console.error('Data API response:', text);
                    console.log('Falling back to dummy data for UI testing');
                    return createDummyData();
                });
            }
            console.log('Got response, parsing JSON...');
            return response.text().then(text => {
                console.log('Response text:', text.substring(0, 100) + '...'); // Log first 100 chars
                try {
                    return JSON.parse(text);
                } catch (e) {
                    console.error('JSON parse error:', e);
                    console.error('Full response:', text);
                    console.log('Falling back to dummy data for UI testing');
                    return createDummyData();
                }
            });
        })
        .then(data => {
            console.log('Data loaded successfully:', Object.keys(data));
            hideLoading();
            displayData(data);
            
            // Store the data globally for other functions to use
            window.dashboardData = data;
        })
        .catch(error => {
            hideLoading();
            console.error('Data loading error:', error);
            showError(`Error loading data: ${error.message}`);
            
            // Even on error, load dummy data for testing
            setTimeout(() => {
                console.log('Loading dummy data after error');
                const dummyData = createDummyData();
                displayData(dummyData);
                window.dashboardData = dummyData;
            }, 1000);
        });
}

// Create dummy data for testing UI when API is not available
function createDummyData() {
    console.log('Creating dummy data for UI testing');
    
    // Create mock statistics for several columns
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
        'Years of Experience': {
            type: 'numeric',
            min: 0,
            max: 40,
            mean: 10.7,
            median: 8,
            std: 9.2,
            value_counts: {},
            unique_values: 41
        },
        'Department': {
            type: 'categorical',
            value_counts: {
                'Engineering': 112,
                'Marketing': 56,
                'Sales': 98,
                'HR': 23,
                'Finance': 43,
                'Product': 67,
                'Operations': 34
            },
            unique_values: 7
        },
        'Job Level': {
            type: 'categorical',
            value_counts: {
                'Entry': 143,
                'Mid-level': 201,
                'Senior': 87,
                'Manager': 56,
                'Director': 23,
                'Executive': 8
            },
            unique_values: 6
        },
        'Satisfaction': {
            type: 'numeric',
            min: 1,
            max: 5,
            mean: 3.7,
            median: 4,
            std: 0.9,
            value_counts: {},
            unique_values: 5
        },
        'Location': {
            type: 'categorical',
            value_counts: {
                'New York': 87,
                'San Francisco': 112,
                'Boston': 43,
                'Chicago': 56,
                'Remote': 143,
                'London': 23,
                'Other': 56
            },
            unique_values: 7
        }
    };
    
    // Return mock data object
    return {
        success: true,
        row_count: 520,
        column_count: Object.keys(stats).length,
        stats: stats,
        categorical_columns: ['Department', 'Job Level', 'Location'],
        numeric_columns: ['Age', 'Years of Experience', 'Satisfaction']
    };
}

// Set up event listeners for interactive elements
function setupEventListeners(dataId) {
    // Model form submission
    const modelForm = document.getElementById('model-form');
    if (modelForm) {
        modelForm.addEventListener('submit', function(e) {
            e.preventDefault();
            trainModel(dataId);
        });
    }
    
    // Target column change - update model type automatically
    const targetColumnSelect = document.getElementById('target-column');
    const modelTypeSelect = document.getElementById('model-type');
    
    if (targetColumnSelect && modelTypeSelect) {
        targetColumnSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const columnType = selectedOption.getAttribute('data-type');
            
            // Update model type based on column type
            if (columnType === 'numeric') {
                // For numeric target, show regression models
                updateModelTypeOptions([
                    { value: 'LinearRegression', text: 'Linear Regression' },
                    { value: 'RandomForestRegressor', text: 'Random Forest Regressor' },
                    { value: 'GradientBoostingRegressor', text: 'Gradient Boosting Regressor' }
                ]);
            } else if (columnType === 'categorical') {
                // For categorical target, show classification models
                updateModelTypeOptions([
                    { value: 'LogisticRegression', text: 'Logistic Regression' },
                    { value: 'RandomForestClassifier', text: 'Random Forest Classifier' },
                    { value: 'GradientBoostingClassifier', text: 'Gradient Boosting Classifier' }
                ]);
            }
        });
    }
    
    // Chart filter dropdown
    const chartTypeSelect = document.getElementById('chart-type');
    if (chartTypeSelect) {
        chartTypeSelect.addEventListener('change', function() {
            filterCharts(this.value);
        });
    }
    
    // Create scatter plot button
    const createScatterBtn = document.getElementById('create-scatter-btn');
    if (createScatterBtn) {
        createScatterBtn.addEventListener('click', function() {
            const data = window.dashboardData || createDummyData();
            showScatterDialog(data.stats);
        });
    }
    
    // Insights form
    const insightsForm = document.getElementById('insights-form');
    if (insightsForm) {
        insightsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            generateInsights(dataId);
        });
    }
    
    // Scatter plot dialog handlers
    setupScatterDialogEventListeners();
}

function updateModelTypeOptions(options) {
    const modelTypeSelect = document.getElementById('model-type');
    if (!modelTypeSelect) return;
    
    // Clear existing options
    modelTypeSelect.innerHTML = '';
    
    // Add new options
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        modelTypeSelect.appendChild(optionElement);
    });
}

function displayData(data) {
    console.log('Displaying data and charts...');
    
    // Display row and column counts
    const stats = data.stats || {};
    const rowCount = data.row_count || 0;
    const columnCount = data.column_count || 0;
    
    // Update statistics cards
    const dataStats = document.getElementById('data-stats');
    if (dataStats) {
        // Clear existing stats
        dataStats.innerHTML = '';
        
        // Add row and column count stats
        const rowCountCard = document.createElement('div');
        rowCountCard.className = 'bg-primary bg-opacity-5 p-4 rounded-lg text-center';
        rowCountCard.innerHTML = `
            <h3 class="text-sm text-gray-600 mb-1">Total Rows</h3>
            <div class="text-xl font-bold text-primary">${rowCount.toLocaleString()}</div>
        `;
        dataStats.appendChild(rowCountCard);
        
        const columnCountCard = document.createElement('div');
        columnCountCard.className = 'bg-primary bg-opacity-5 p-4 rounded-lg text-center';
        columnCountCard.innerHTML = `
            <h3 class="text-sm text-gray-600 mb-1">Total Columns</h3>
            <div class="text-xl font-bold text-primary">${columnCount}</div>
        `;
        dataStats.appendChild(columnCountCard);
        
        // Add more summary stats for common types of data
        
        // Get counts of categorical and numeric columns
        const categoricalColumns = Object.keys(stats).filter(col => stats[col].type === 'categorical').length;
        const numericColumns = Object.keys(stats).filter(col => stats[col].type === 'numeric').length;
        
        // Add categorical column count
        const categoricalCard = document.createElement('div');
        categoricalCard.className = 'bg-secondary bg-opacity-5 p-4 rounded-lg text-center';
        categoricalCard.innerHTML = `
            <h3 class="text-sm text-gray-600 mb-1">Categorical Columns</h3>
            <div class="text-xl font-bold text-secondary">${categoricalColumns}</div>
        `;
        dataStats.appendChild(categoricalCard);
        
        // Add numeric column count
        const numericCard = document.createElement('div');
        numericCard.className = 'bg-secondary bg-opacity-5 p-4 rounded-lg text-center';
        numericCard.innerHTML = `
            <h3 class="text-sm text-gray-600 mb-1">Numeric Columns</h3>
            <div class="text-xl font-bold text-secondary">${numericColumns}</div>
        `;
        dataStats.appendChild(numericCard);
    }
    
    // Enable insights section
    const insightsSection = document.getElementById('insights-section');
    if (insightsSection) {
        insightsSection.classList.remove('hidden');
    }
    
    // Populate target column select for model training
    populateTargetColumnSelect(stats);
    
    // Create charts
    createCharts(stats);
}

function populateTargetColumnSelect(stats) {
    const targetColumnSelect = document.getElementById('target-column');
    if (!targetColumnSelect) return;
    
    // Clear existing options
    targetColumnSelect.innerHTML = '<option value="">Select a column...</option>';
    
    // Add options for each column in the stats
    Object.keys(stats).forEach(column => {
        const option = document.createElement('option');
        option.value = column;
        option.textContent = column;
        option.setAttribute('data-type', stats[column].type);
        targetColumnSelect.appendChild(option);
    });
}

function trainModel(dataId) {
    const targetColumn = document.getElementById('target-column').value;
    const modelType = document.getElementById('model-type').value;
    
    if (!targetColumn) {
        showError('Please select a target column for the model');
        return;
    }
    
    showLoading('Training model...');
    
    fetch(`/api/train_model/${dataId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            target_column: targetColumn,
            model_type: modelType
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Failed to train model');
            });
        }
        return response.json();
    })
    .then(data => {
        hideLoading();
        if (data.success) {
            // Display model results
            displayModelResults(data.model);
        } else {
            showError(data.error || 'Unknown error training model');
        }
    })
    .catch(error => {
        hideLoading();
        console.error('Model training error:', error);
        showError(`Error training model: ${error.message}`);
    });
}

function displayModelResults(model) {
    const modelSection = document.getElementById('model-section');
    const modelResults = document.getElementById('model-results');
    
    if (!modelSection || !modelResults) return;
    
    // Show the model section
    modelSection.classList.remove('hidden');
    
    // Display model metrics
    let modelHTML = `
        <div class="mb-6">
            <h3 class="text-lg font-semibold mb-3">Model Information</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-light p-4 rounded-lg">
                    <p class="text-sm text-gray-600 mb-1">Model Type</p>
                    <p class="font-medium">${model.model_type}</p>
                </div>
                <div class="bg-light p-4 rounded-lg">
                    <p class="text-sm text-gray-600 mb-1">Target Column</p>
                    <p class="font-medium">${model.target_column}</p>
                </div>
                <div class="bg-light p-4 rounded-lg">
                    <p class="text-sm text-gray-600 mb-1">Training Samples</p>
                    <p class="font-medium">${model.training_samples}</p>
                </div>
                <div class="bg-light p-4 rounded-lg">
                    <p class="text-sm text-gray-600 mb-1">Test Samples</p>
                    <p class="font-medium">${model.test_samples}</p>
                </div>
            </div>
        </div>
    `;
    
    // Display model metrics based on metrics available
    const metrics = model.metrics || {};
    
    if (Object.keys(metrics).length > 0) {
        modelHTML += '<div class="mb-6"><h3 class="text-lg font-semibold mb-3">Model Performance</h3><div class="space-y-3">';
        
        Object.keys(metrics).forEach(metric => {
            // Format the metric value (usually a number)
            let metricValue = metrics[metric];
            if (typeof metricValue === 'number') {
                // Round to 4 decimal places
                metricValue = metricValue.toFixed(4);
            }
            
            modelHTML += `
                <div class="flex items-center p-4 bg-light rounded-lg">
                    <div class="font-medium mr-2 min-w-32">${formatMetricName(metric)}:</div>
                    <div class="text-xl font-bold text-primary">${metricValue}</div>
                </div>
            `;
        });
        
        modelHTML += '</div></div>';
    }
    
    // Display feature importance if available
    const featureImportance = model.feature_importance || {};
    
    if (Object.keys(featureImportance).length > 0) {
        modelHTML += '<div><h3 class="text-lg font-semibold mb-3">Feature Importance</h3><div class="space-y-2">';
        
        // Sort features by importance (descending)
        const sortedFeatures = Object.entries(featureImportance)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); // Show top 10 features
        
        sortedFeatures.forEach(([feature, importance]) => {
            const percent = (importance * 100).toFixed(1);
            modelHTML += `
                <div class="mb-2">
                    <div class="flex justify-between mb-1">
                        <span class="text-sm font-medium">${feature}</span>
                        <span class="text-sm font-medium">${percent}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="bg-primary h-2 rounded-full" style="width: ${percent}%"></div>
                    </div>
                </div>
            `;
        });
        
        modelHTML += '</div></div>';
    }
    
    // Update the model results container
    modelResults.innerHTML = modelHTML;
}

function formatMetricName(metric) {
    // Convert snake_case to Title Case with spaces
    return metric
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function generateInsights(dataId) {
    const promptInput = document.getElementById('insight-prompt');
    if (!promptInput) return;
    
    const prompt = promptInput.value.trim();
    if (!prompt) {
        showError('Please enter a question about your data');
        return;
    }
    
    showLoading('Generating insights...');
    
    fetch('/api/insights', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: dataId,
            prompt: prompt
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Failed to generate insights');
            });
        }
        return response.json();
    })
    .then(data => {
        hideLoading();
        if (data.success) {
            displayInsights(data);
        } else {
            showError(data.error || 'Unknown error generating insights');
        }
    })
    .catch(error => {
        hideLoading();
        console.error('Insights error:', error);
        showError(`Error generating insights: ${error.message}`);
    });
}

function displayInsights(data) {
    const insightsResults = document.getElementById('insights-results');
    if (!insightsResults) return;
    
    // Convert Markdown to HTML for better formatting
    let html = `
        <div class="prose prose-sm max-w-none prose-headings:text-primary prose-a:text-primary">
            ${convertMarkdownToHTML(data.insights)}
        </div>
        <div class="mt-4 text-xs text-gray-500 text-right">
            Insights generated using: ${data.model_used}
        </div>
    `;
    
    insightsResults.innerHTML = html;
}

function convertMarkdownToHTML(markdown) {
    if (!markdown) return '';
    
    // Very basic Markdown conversion (for demonstration purposes)
    return markdown
        // Convert headers
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*([^*]+)\*/g, '<em>$1</em>') // Italic
        // Convert lists
        .replace(/^\* (.+)$/gm, '<li>$1</li>') // List items
        // Wrap lists
        .replace(/(<li>.+<\/li>\n)+/g, '<ul class="list-disc list-inside my-2">$&</ul>')
        // Convert line breaks
        .replace(/\n\n/g, '<br><br>');
}

function createCharts(stats) {
    const chartContainer = document.getElementById('chart-container');
    if (!chartContainer) return;
    
    // Clear loading indicator
    chartContainer.innerHTML = '';
    
    // Create charts for categorical and numeric columns
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
            // Also create a histogram for numeric columns
            createHistogram(chartContainer, column, stat);
        }
    });
    
    // Create a correlation matrix as the last chart
    createCorrelationMatrix(chartContainer, stats);
}

// ... rest of the functions (createCategoricalChart, createNumericChart, etc.) ...

function showLoading(message) {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    
    if (loadingOverlay && loadingText) {
        loadingText.textContent = message || 'Loading...';
        loadingOverlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}

function showError(message) {
    console.error(message);
    alert(message); // Simple error display for now
} 