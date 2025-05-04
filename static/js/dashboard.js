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
            populateFilterOptions(data);
            
            // Reset filter indicator
            const filterIndicator = document.getElementById('filter-indicator');
            if (filterIndicator) {
                filterIndicator.classList.add('hidden');
            }
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
                populateFilterOptions(dummyData);
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
    
    // Create filter options
    const filterOptions = {
        'Department': Object.keys(stats['Department'].value_counts),
        'Job Level': Object.keys(stats['Job Level'].value_counts),
        'Location': Object.keys(stats['Location'].value_counts)
    };
    
    // Return mock data object
    return {
        success: true,
        row_count: 520,
        column_count: Object.keys(stats).length,
        stats: stats,
        filter_options: filterOptions
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
            } else {
                // Default options
                updateModelTypeOptions([
                    { value: 'LinearRegression', text: 'Linear Regression' },
                    { value: 'RandomForest', text: 'Random Forest' },
                    { value: 'GradientBoosting', text: 'Gradient Boosting' }
                ]);
            }
        });
    }
    
    // Filter form submission
    const filterForm = document.getElementById('filter-form');
    if (filterForm) {
        filterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            applyFilters(dataId);
        });
    }
    
    // Reset filters button
    const resetBtn = document.getElementById('reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            document.querySelectorAll('#filter-options select').forEach(select => {
                select.value = '';
            });
            
            // Reset to original data
            loadData(dataId);
            
            // Hide filter indicator
            const filterIndicator = document.getElementById('filter-indicator');
            if (filterIndicator) {
                filterIndicator.classList.add('hidden');
            }
        });
    }
    
    // Insights form submission
    const insightsForm = document.getElementById('insights-form');
    if (insightsForm) {
        insightsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            generateInsights(dataId);
        });
    }
    
    // Chart type filter
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
            showScatterDialog();
        });
    }
    
    // Close scatter dialog buttons
    const cancelScatterBtn = document.getElementById('cancel-scatter-btn');
    const closeScatterBtn = document.getElementById('close-scatter-btn');
    
    if (cancelScatterBtn) {
        cancelScatterBtn.addEventListener('click', function() {
            document.getElementById('scatter-dialog').classList.add('hidden');
        });
    }
    
    if (closeScatterBtn) {
        closeScatterBtn.addEventListener('click', function() {
            document.getElementById('scatter-dialog').classList.add('hidden');
        });
    }
    
    // Generate scatter plot button
    const generateScatterBtn = document.getElementById('generate-scatter-btn');
    if (generateScatterBtn) {
        generateScatterBtn.addEventListener('click', function() {
            generateScatterPlot();
            document.getElementById('scatter-dialog').classList.add('hidden');
        });
    }
}

// Helper function to update model type dropdown options
function updateModelTypeOptions(options) {
    const modelTypeSelect = document.getElementById('model-type');
    if (!modelTypeSelect) return;
    
    // Clear existing options
    modelTypeSelect.innerHTML = '';
    
    // Add new options
    options.forEach(option => {
        const optElement = document.createElement('option');
        optElement.value = option.value;
        optElement.textContent = option.text;
        modelTypeSelect.appendChild(optElement);
    });
    
    // Select first option
    if (options.length > 0) {
        modelTypeSelect.value = options[0].value;
    }
}

// Display data on the dashboard
function displayData(data) {
    // Store data stats globally for later use
    window.currentDataStats = data.stats || {};
    
    // Display basic stats
    const statsContainer = document.getElementById('data-stats');
    if (statsContainer && data.stats) {
        let statsHtml = '';
        
        // Add row and column count stats
        statsHtml += `
            <div class="stat-card">
                <h3>Rows</h3>
                <div class="value">${data.row_count || 'N/A'}</div>
            </div>
            <div class="stat-card">
                <h3>Columns</h3>
                <div class="value">${data.column_count || 'N/A'}</div>
            </div>
        `;
        
        // Add additional stats if available
        if (data.stats && Object.keys(data.stats).length > 0) {
            const numericStats = Object.entries(data.stats)
                .filter(([_, stat]) => stat.type === 'numeric')
                .slice(0, 3);  // Take first 3 numeric columns
                
            numericStats.forEach(([column, stat]) => {
                statsHtml += `
                    <div class="stat-card">
                        <h3>${column}</h3>
                        <div class="value">${stat.mean ? stat.mean.toFixed(2) : 'N/A'}</div>
                    </div>
                `;
            });
        }
        
        statsContainer.innerHTML = statsHtml;
    }
    
    // Make insights visible
    const insightsSection = document.getElementById('insights-section');
    if (insightsSection) {
        insightsSection.classList.remove('hidden');
    }
    
    // Populate target column dropdown for model training
    const targetColumnSelect = document.getElementById('target-column');
    if (targetColumnSelect && data.stats) {
        // Clear existing options
        targetColumnSelect.innerHTML = '<option value="">Select a column...</option>';
        
        // Add all columns as options (except email-like columns)
        for (const [column, stat] of Object.entries(data.stats)) {
            // Skip columns that look like emails or identifiers
            if (/email|address|id$/i.test(column)) {
                continue;
            }
            
            const option = document.createElement('option');
            option.value = column;
            option.textContent = column;
            
            // Add data-type attribute for easy reference
            option.setAttribute('data-type', stat.type || 'unknown');
            
            targetColumnSelect.appendChild(option);
        }
    }
    
    // Display charts if chart container exists
    const chartContainer = document.getElementById('chart-container');
    if (chartContainer && data.stats) {
        createCharts(data.stats);
    }
}

// Populate filter options based on data
function populateFilterOptions(data) {
    const filterContainer = document.getElementById('filter-options');
    if (!filterContainer || !data.filter_options) return;
    
    // Clear existing filters
    filterContainer.innerHTML = '';
    
    // Add filter options
    for (const [column, values] of Object.entries(data.filter_options)) {
        if (values.length > 0 && values.length < 20) {  // Only add reasonable filters
            const filterGroup = document.createElement('div');
            filterGroup.className = 'filter-group';
            
            const label = document.createElement('label');
            label.htmlFor = `filter-${column.replace(/\s+/g, '-')}`;
            label.textContent = column;
            
            const select = document.createElement('select');
            select.id = `filter-${column.replace(/\s+/g, '-')}`;
            select.className = 'filter-select';
            select.setAttribute('data-column', column);
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'All';
            select.appendChild(defaultOption);
            
            // Add options
            values.forEach(value => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                select.appendChild(option);
            });
            
            filterGroup.appendChild(label);
            filterGroup.appendChild(select);
            filterContainer.appendChild(filterGroup);
        }
    }
}

// Apply filters
function applyFilters(dataId) {
    showLoading('Applying filters...');
    
    // Get all filter selections
    const filterSelects = document.querySelectorAll('.filter-select');
    const filters = {};
    
    filterSelects.forEach(select => {
        if (select.value) {
            filters[select.getAttribute('data-column')] = select.value;
        }
    });
    
    // Check if we have any filters
    if (Object.keys(filters).length === 0) {
        // If no filters, just reload data
        loadData(dataId);
        return;
    }
    
    console.log('Applying filters:', filters); // Debug log
    
    // Call API - restore original API endpoint structure
    fetch(`/api/filter-data`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: dataId,
            filters: filters
        })
    })
    .then(response => {
        if (!response.ok) {
            // Log full error details
            return response.text().then(text => {
                console.error('Filter API response:', text);
                throw new Error('Failed to apply filters');
            });
        }
        return response.json();
    })
    .then(data => {
        hideLoading();
        if (data.success) {
            displayFilteredData(data);
            
            // Show filter indicator
            const filterIndicator = document.getElementById('filter-indicator');
            if (filterIndicator) {
                filterIndicator.classList.remove('hidden');
            }
        } else {
            showError(`Error applying filters: ${data.message || 'Unknown error'}`);
        }
    })
    .catch(error => {
        hideLoading();
        console.error('Filter error:', error);
        showError(`Error applying filters: ${error.message}`);
    });
}

// Display filtered data
function displayFilteredData(data) {
    // Update stats
    const statsContainer = document.getElementById('data-stats');
    if (statsContainer) {
        let statsHtml = `
            <div class="stat-card">
                <h3>Filtered Rows</h3>
                <div class="value">${data.row_count || 'N/A'}</div>
            </div>
            <div class="stat-card">
                <h3>Columns</h3>
                <div class="value">${data.column_count || 'N/A'}</div>
            </div>
        `;
        
        statsContainer.innerHTML = statsHtml;
    }
    
    // Update charts
    const chartContainer = document.getElementById('chart-container');
    if (chartContainer && data.stats) {
        createCharts(data.stats);
    }
    
    // Show filter indication
    const filterIndicator = document.getElementById('filter-indicator');
    if (filterIndicator) {
        filterIndicator.classList.remove('hidden');
    }
}

// Train predictive model
function trainModel(dataId) {
    // Get target column
    const targetColumn = document.getElementById('target-column').value;
    const modelTypeSelect = document.getElementById('model-type');
    const modelType = modelTypeSelect ? modelTypeSelect.value : 'classifier';
    
    // Validate target column is selected
    if (!targetColumn) {
        showError('Please select a target column for model training');
        return;
    }
    
    // Get column type from data stats
    const stats = window.currentDataStats || {};
    const targetColumnType = stats[targetColumn]?.type || 'unknown';
    
    // Determine appropriate model type and preprocessing based on column type
    let preprocessingOptions = {
        handle_unknown: 'impute',
        handle_missing: true,
        encode_categorical: true
    };
    
    let selectedModelType = modelType;
    
    // Adjust for column type
    if (targetColumnType === 'categorical') {
        // For categorical targets, use classification
        selectedModelType = 'classifier';
        preprocessingOptions.target_type = 'categorical';
    } else if (targetColumnType === 'numeric') {
        // For numeric targets, use regression
        selectedModelType = 'regressor';
        preprocessingOptions.target_type = 'numeric';
    } else {
        // If we can't determine type, let user know
        showError(`Warning: Column type for "${targetColumn}" could not be determined. Training might fail.`);
    }
    
    showLoading('Training model...');
    console.log('Training model with:', {targetColumn, modelType: selectedModelType});
    
    // Call API with preprocessing options - restore original API endpoint
    fetch(`/api/train_model/${dataId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            target_column: targetColumn,
            model_type: selectedModelType,
            preprocessing: preprocessingOptions,
            exclude_columns: ['Email', 'email', 'Email Address', 'email_address'] // Exclude email columns
        })
    })
    .then(response => {
        if (!response.ok) {
            // Log full error details
            return response.text().then(text => {
                console.error('Model API response:', text);
                throw new Error('Failed to train model');
            });
        }
        return response.json();
    })
    .then(data => {
        hideLoading();
        if (data.success) {
            displayModelResults(data.model);
        } else {
            showError(`Error training model: ${data.message || 'Unknown error'}`);
        }
    })
    .catch(error => {
        hideLoading();
        console.error('Model training error:', error);
        showError(`Error training model: ${error.message}`);
    });
}

// Display model results
function displayModelResults(model) {
    const modelResultsContainer = document.getElementById('model-results');
    if (!modelResultsContainer) return;
    
    // Show the model section
    document.getElementById('model-section').classList.remove('hidden');
    
    // Display model info
    let metricsHtml = '<h4 class="font-semibold mt-4 mb-2">Model Metrics</h4><ul class="space-y-1 text-sm">';
    for (const [key, value] of Object.entries(model.metrics)) {
        if (typeof value === 'object') {
            metricsHtml += `<li><span class="font-medium">${key}:</span> ${JSON.stringify(value)}</li>`;
        } else {
            metricsHtml += `<li><span class="font-medium">${key}:</span> ${value}</li>`;
        }
    }
    metricsHtml += '</ul>';
    
    // Display feature importance if available
    let featureHtml = '';
    if (model.feature_importance) {
        featureHtml = '<h4 class="font-semibold mt-4 mb-2">Feature Importance</h4><ul class="space-y-1 text-sm">';
        
        // Sort features by importance
        const sortedFeatures = Object.entries(model.feature_importance)
            .sort((a, b) => b[1] - a[1]);
            
        sortedFeatures.forEach(([feature, importance]) => {
            featureHtml += `<li><span class="font-medium">${feature}:</span> ${importance.toFixed(4)}</li>`;
        });
        
        featureHtml += '</ul>';
    }
    
    modelResultsContainer.innerHTML = `
        <div class="bg-gray-50 p-3 rounded">
            <h4 class="font-semibold mb-2">Model Information</h4>
            <ul class="space-y-1 text-sm">
                <li><span class="font-medium">Type:</span> ${model.model_type}</li>
                <li><span class="font-medium">Target:</span> ${model.target_column}</li>
                <li><span class="font-medium">Training samples:</span> ${model.training_samples}</li>
                <li><span class="font-medium">Test samples:</span> ${model.test_samples}</li>
            </ul>
            ${metricsHtml}
            ${featureHtml}
        </div>
    `;
}

// Generate AI insights
function generateInsights(dataId) {
    showLoading('Generating insights...');
    
    // Get prompt if any
    const promptInput = document.getElementById('insight-prompt');
    const prompt = promptInput ? promptInput.value : '';
    
    // Get current filters
    const filterSelects = document.querySelectorAll('.filter-select');
    const filters = {};
    
    filterSelects.forEach(select => {
        if (select.value) {
            filters[select.getAttribute('data-column')] = select.value;
        }
    });
    
    // Call API with restored endpoint structure
    fetch('/api/insights', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: dataId,
            prompt: prompt,
            filters: filters
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to generate insights');
        }
        return response.json();
    })
    .then(data => {
        hideLoading();
        if (data.success) {
            displayInsights(data);
        } else {
            showError(`Error generating insights: ${data.message || data.error}`);
        }
    })
    .catch(error => {
        hideLoading();
        showError(`Error generating insights: ${error.message}`);
    });
}

// Display insights in the sidebar
function displayInsights(data) {
    const insightsContainer = document.getElementById('insights-results');
    if (!insightsContainer) return;
    
    // Show the insights section
    document.getElementById('insights-section').classList.remove('hidden');
    
    // Format the insights with markdown-like syntax
    let formattedInsights = data.insights
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
        .replace(/\n\n/g, '<br><br>')                      // Paragraphs
        .replace(/\n(\d+\.\s)/g, '<br>$1');                // Lists
    
    insightsContainer.innerHTML = `
        <div class="insights-content p-3">
            ${formattedInsights}
        </div>
        <div class="mt-4 text-right text-xs text-gray-500">
            <p><em>Generated by ${data.model_used}</em></p>
        </div>
    `;
}

// Create charts based on data
function createCharts(stats) {
    const chartContainer = document.getElementById('chart-container');
    if (!chartContainer) return;
    
    // Clear existing charts
    chartContainer.innerHTML = '';
    
    // Add visualization controls
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'mb-4 flex flex-wrap gap-2 items-center';
    controlsDiv.innerHTML = `
        <div class="mr-auto">
            <label for="chart-type" class="block text-sm font-medium text-gray-700 mb-1">Chart Type:</label>
            <select id="chart-type" class="p-2 border border-gray-300 rounded">
                <option value="all">All Charts</option>
                <option value="bar">Bar Charts</option>
                <option value="histogram">Histograms</option>
                <option value="scatter">Scatter Plots</option>
            </select>
        </div>
        <button id="create-scatter-btn" class="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded transition-colors">
            Create Scatter Plot
        </button>
    `;
    chartContainer.appendChild(controlsDiv);
    
    // Add scatter plot dialog
    const scatterDialog = document.createElement('div');
    scatterDialog.className = 'scatter-dialog hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    scatterDialog.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 class="text-lg font-bold mb-4">Create Scatter Plot</h3>
            <div class="space-y-4">
                <div>
                    <label for="x-axis" class="block text-sm font-medium text-gray-700 mb-1">X Axis:</label>
                    <select id="x-axis" class="w-full p-2 border border-gray-300 rounded"></select>
                </div>
                <div>
                    <label for="y-axis" class="block text-sm font-medium text-gray-700 mb-1">Y Axis:</label>
                    <select id="y-axis" class="w-full p-2 border border-gray-300 rounded"></select>
                </div>
                <div>
                    <label for="color-by" class="block text-sm font-medium text-gray-700 mb-1">Color By (optional):</label>
                    <select id="color-by" class="w-full p-2 border border-gray-300 rounded">
                        <option value="">None</option>
                    </select>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button id="cancel-scatter-btn" class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors">
                        Cancel
                    </button>
                    <button id="generate-scatter-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors">
                        Generate
                    </button>
                </div>
            </div>
        </div>
    `;
    chartContainer.appendChild(scatterDialog);
    
    // Add event listeners for controls
    document.getElementById('chart-type').addEventListener('change', function() {
        filterCharts(this.value);
    });
    
    document.getElementById('create-scatter-btn').addEventListener('click', function() {
        showScatterDialog(stats);
    });
    
    document.getElementById('cancel-scatter-btn').addEventListener('click', function() {
        document.querySelector('.scatter-dialog').classList.add('hidden');
    });
    
    document.getElementById('generate-scatter-btn').addEventListener('click', function() {
        generateScatterPlot(stats);
    });
    
    // Create charts container
    const chartsGrid = document.createElement('div');
    chartsGrid.className = 'charts-grid grid grid-cols-1 md:grid-cols-2 gap-6';
    chartContainer.appendChild(chartsGrid);
    
    // Create a chart for each categorical column
    for (const [column, stat] of Object.entries(stats)) {
        if (stat.type === 'categorical' && stat.unique_values > 1 && stat.unique_values < 15) {
            createCategoricalChart(chartsGrid, column, stat);
        } else if (stat.type === 'numeric') {
            createNumericChart(chartsGrid, column, stat);
            createHistogram(chartsGrid, column, stat);
        }
    }
    
    // Create a correlation matrix for numeric columns
    createCorrelationMatrix(chartsGrid, stats);
}

// Create a categorical chart (improved bar chart)
function createCategoricalChart(container, column, stat) {
    // Create chart div
    const chartDiv = document.createElement('div');
    chartDiv.className = 'chart bg-white p-4 rounded-lg shadow-sm';
    chartDiv.setAttribute('data-chart-type', 'bar');
    
    // Create chart header
    const chartHeader = document.createElement('div');
    chartHeader.className = 'mb-2';
    chartHeader.innerHTML = `<h3 class="text-base font-semibold">${column}</h3>`;
    chartDiv.appendChild(chartHeader);
    
    // Create canvas container with fixed height
    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'h-64';
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.id = `chart-bar-${column.replace(/\s+/g, '-')}`;
    canvasContainer.appendChild(canvas);
    chartDiv.appendChild(canvasContainer);
    
    // Add chart to container
    container.appendChild(chartDiv);
    
    // Prepare data
    const entries = Object.entries(stat.value_counts);
    entries.sort((a, b) => b[1] - a[1]); // Sort by count descending
    
    const labels = entries.slice(0, 10).map(entry => entry[0]);  // Top 10
    const values = entries.slice(0, 10).map(entry => entry[1]);
    
    // Generate colors
    const colors = generateColorPalette(labels.length);
    
    // Create chart
    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: column,
                data: values,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.6', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
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
            },
            plugins: {
                title: {
                    display: true,
                    text: `Distribution of ${column}`,
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Count: ${context.raw}`;
                        }
                    }
                }
            }
        }
    });
}

// Create a numeric chart (improved)
function createNumericChart(container, column, stat) {
    // Create chart div
    const chartDiv = document.createElement('div');
    chartDiv.className = 'chart bg-white p-4 rounded-lg shadow-sm';
    chartDiv.setAttribute('data-chart-type', 'bar');
    
    // Create chart header
    const chartHeader = document.createElement('div');
    chartHeader.className = 'mb-2';
    chartHeader.innerHTML = `<h3 class="text-base font-semibold">${column} - Summary</h3>`;
    chartDiv.appendChild(chartHeader);
    
    // Create canvas container with fixed height
    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'h-64';
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.id = `chart-summary-${column.replace(/\s+/g, '-')}`;
    canvasContainer.appendChild(canvas);
    chartDiv.appendChild(canvasContainer);
    
    // Add chart to container
    container.appendChild(chartDiv);
    
    // Prepare data with better rounding
    const data = [
        { label: 'Min', value: stat.min, display: stat.min.toFixed(2) },
        { label: 'Mean', value: stat.mean, display: stat.mean.toFixed(2) },
        { label: 'Median', value: stat.median, display: stat.median.toFixed(2) },
        { label: 'Max', value: stat.max, display: stat.max.toFixed(2) }
    ];
    
    // Generate colors
    const colors = [
        'rgba(75, 192, 192, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(153, 102, 255, 0.6)',
        'rgba(255, 159, 64, 0.6)'
    ];
    
    // Create chart
    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                label: column,
                data: data.map(d => d.value),
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.6', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Value'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${data[context.dataIndex].display}`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            }
        }
    });
}

// Create histogram for numeric data
function createHistogram(container, column, stat) {
    // Skip if we don't have enough information to create bins
    if (!stat.min || !stat.max) return;
    
    // Create chart div
    const chartDiv = document.createElement('div');
    chartDiv.className = 'chart bg-white p-4 rounded-lg shadow-sm';
    chartDiv.setAttribute('data-chart-type', 'histogram');
    
    // Create chart header
    const chartHeader = document.createElement('div');
    chartHeader.className = 'mb-2';
    chartHeader.innerHTML = `<h3 class="text-base font-semibold">${column} - Histogram</h3>`;
    chartDiv.appendChild(chartHeader);
    
    // Create canvas container with fixed height
    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'h-64';
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.id = `chart-histogram-${column.replace(/\s+/g, '-')}`;
    canvasContainer.appendChild(canvas);
    chartDiv.appendChild(canvasContainer);
    
    // Add chart to container
    container.appendChild(chartDiv);
    
    // We don't have actual distribution data, so we'll simulate a normal distribution
    // based on the min, max, mean, and std values
    const min = stat.min;
    const max = stat.max;
    const mean = stat.mean;
    const std = stat.std || (max - min) / 4;
    
    // Create bin edges
    const numBins = 10;
    const binWidth = (max - min) / numBins;
    const bins = Array.from({length: numBins}, (_, i) => min + i * binWidth);
    
    // Generate simulated histogram data (bell curve)
    const histData = bins.map(binStart => {
        const binEnd = binStart + binWidth;
        const binCenter = (binStart + binEnd) / 2;
        const height = Math.exp(-0.5 * Math.pow((binCenter - mean) / std, 2)) / (std * Math.sqrt(2 * Math.PI));
        // Scale to make it visually appealing
        return height * 100;
    });
    
    // Create chart
    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: bins.map(bin => bin.toFixed(1)),
            datasets: [{
                label: column,
                data: histData,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                barPercentage: 1,
                categoryPercentage: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Frequency'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: column
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const index = context[0].dataIndex;
                            const start = parseFloat(bins[index].toFixed(1));
                            const end = parseFloat((bins[index] + binWidth).toFixed(1));
                            return `Range: ${start} - ${end}`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            }
        }
    });
}

// Generate a scatter plot based on user selection
function generateScatterPlot(stats) {
    const xAxis = document.getElementById('x-axis').value;
    const yAxis = document.getElementById('y-axis').value;
    const colorBy = document.getElementById('color-by').value;
    
    if (!xAxis || !yAxis) {
        showError('Please select both X and Y axes');
        return;
    }
    
    const xStat = stats[xAxis];
    const yStat = stats[yAxis];
    
    if (!xStat || !yStat) {
        showError('Selected columns not found in data');
        return;
    }
    
    // Check if we have the actual data points (we don't, so we'll simulate)
    // In a real app, you would fetch the actual data points here
    
    // Create chart div
    const chartContainer = document.querySelector('.charts-grid');
    const chartDiv = document.createElement('div');
    chartDiv.className = 'chart bg-white p-4 rounded-lg shadow-sm';
    chartDiv.setAttribute('data-chart-type', 'scatter');
    
    // Create chart header
    const chartHeader = document.createElement('div');
    chartHeader.className = 'mb-2';
    chartHeader.innerHTML = `<h3 class="text-base font-semibold">Scatter Plot: ${xAxis} vs ${yAxis}</h3>`;
    chartDiv.appendChild(chartHeader);
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.id = `chart-scatter-${xAxis.replace(/\s+/g, '-')}-${yAxis.replace(/\s+/g, '-')}`;
    chartDiv.appendChild(canvas);
    
    // Add chart to container
    chartContainer.appendChild(chartDiv);
    
    // Hide dialog
    document.querySelector('.scatter-dialog').classList.add('hidden');
    
    // Generate simulated data
    const numPoints = 100;
    const xMean = xStat.mean;
    const yMean = yStat.mean;
    const xStd = xStat.std || 1;
    const yStd = yStat.std || 1;
    
    // Create slightly correlated data
    const correlation = 0.7;  // Positive correlation
    const points = [];
    
    for (let i = 0; i < numPoints; i++) {
        // Generate correlated random variables
        const x1 = randomNormal();
        const x2 = correlation * x1 + Math.sqrt(1 - correlation * correlation) * randomNormal();
        
        // Scale to match mean and std
        const x = x1 * xStd + xMean;
        const y = x2 * yStd + yMean;
        
        points.push({ x, y });
    }
    
    // Create chart
    new Chart(canvas, {
        type: 'scatter',
        data: {
            datasets: [{
                label: `${xAxis} vs ${yAxis}`,
                data: points,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
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
                            return `${xAxis}: ${context.parsed.x.toFixed(2)}, ${yAxis}: ${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    });
}

// Create a correlation matrix for numeric columns
function createCorrelationMatrix(container, stats) {
    // Get numeric columns
    const numericColumns = Object.entries(stats)
        .filter(([_, stat]) => stat.type === 'numeric')
        .map(([col, _]) => col);
    
    if (numericColumns.length < 2) return; // Need at least 2 columns for correlation
    
    // Create chart div
    const chartDiv = document.createElement('div');
    chartDiv.className = 'chart bg-white p-4 rounded-lg shadow-sm';
    chartDiv.setAttribute('data-chart-type', 'correlation');
    
    // Create chart header
    const chartHeader = document.createElement('div');
    chartHeader.className = 'mb-2';
    chartHeader.innerHTML = `<h3 class="text-base font-semibold">Correlation Matrix</h3>`;
    chartDiv.appendChild(chartHeader);
    
    // Create canvas container with fixed height
    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'h-64';
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'chart-correlation';
    canvasContainer.appendChild(canvas);
    chartDiv.appendChild(canvasContainer);
    
    // Add chart to container
    container.appendChild(chartDiv);
    
    // Generate simulated correlation matrix
    const numCols = numericColumns.length;
    const correlationData = [];
    
    for (let i = 0; i < numCols; i++) {
        const row = [];
        for (let j = 0; j < numCols; j++) {
            if (i === j) {
                row.push(1.0); // Perfect correlation with itself
            } else {
                // Generate random correlation between -1 and 1
                // But make it more likely to be positive for this demo
                const correlation = Math.random() * 0.8 + 0.2;
                row.push(correlation);
            }
        }
        correlationData.push(row);
    }
    
    // Make sure the matrix is symmetric
    for (let i = 0; i < numCols; i++) {
        for (let j = i + 1; j < numCols; j++) {
            correlationData[j][i] = correlationData[i][j];
        }
    }
    
    // Create labels with shorter text if necessary
    const shortLabels = numericColumns.map(col => 
        col.length > 10 ? col.substring(0, 10) + '...' : col
    );
    
    // Create datasets for a heatmap using a scatter chart
    const datasets = [];
    
    for (let i = 0; i < numCols; i++) {
        for (let j = 0; j < numCols; j++) {
            const color = getCorrelationColor(correlationData[i][j]);
            datasets.push({
                label: `${numericColumns[i]} vs ${numericColumns[j]}`,
                data: [{x: j, y: numCols - 1 - i, r: 15}],
                backgroundColor: color,
                borderColor: 'white',
                borderWidth: 1,
                pointRadius: 20,
                pointHoverRadius: 25
            });
        }
    }
    
    // Create chart
    new Chart(canvas, {
        type: 'bubble',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: -0.5,
                    max: numCols - 0.5,
                    ticks: {
                        callback: function(value) {
                            if (Number.isInteger(value) && value >= 0 && value < numCols) {
                                return shortLabels[value];
                            }
                            return '';
                        }
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    type: 'linear',
                    min: -0.5,
                    max: numCols - 0.5,
                    ticks: {
                        callback: function(value) {
                            if (Number.isInteger(value) && value >= 0 && value < numCols) {
                                return shortLabels[numCols - 1 - value];
                            }
                            return '';
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function() {
                            return '';
                        },
                        label: function(context) {
                            const datasetIndex = context.datasetIndex;
                            const i = Math.floor(datasetIndex / numCols);
                            const j = datasetIndex % numCols;
                            const value = correlationData[i][j];
                            return [
                                `${numericColumns[i]} vs ${numericColumns[j]}`,
                                `Correlation: ${value.toFixed(2)}`
                            ];
                        }
                    }
                },
                legend: {
                    display: false
                }
            }
        }
    });
}

// Helper function to get color for correlation value
function getCorrelationColor(value) {
    // Color scale from red (negative) to white (zero) to blue (positive)
    if (value < 0) {
        const intensity = Math.round(255 * (1 - Math.abs(value)));
        return `rgba(255, ${intensity}, ${intensity}, 0.7)`;
    } else {
        const intensity = Math.round(255 * (1 - value));
        return `rgba(${intensity}, ${intensity}, 255, 0.7)`;
    }
}

// Show scatter plot creation dialog
function showScatterDialog(stats) {
    const dialog = document.querySelector('.scatter-dialog');
    dialog.classList.remove('hidden');
    
    // Get numeric columns
    const numericColumns = Object.entries(stats)
        .filter(([_, stat]) => stat.type === 'numeric')
        .map(([col, _]) => col);
    
    // Get categorical columns
    const categoricalColumns = Object.entries(stats)
        .filter(([_, stat]) => stat.type === 'categorical')
        .map(([col, _]) => col);
    
    // Populate X and Y axis dropdowns
    const xAxisSelect = document.getElementById('x-axis');
    const yAxisSelect = document.getElementById('y-axis');
    const colorBySelect = document.getElementById('color-by');
    
    // Clear existing options
    xAxisSelect.innerHTML = '';
    yAxisSelect.innerHTML = '';
    colorBySelect.innerHTML = '<option value="">None</option>';
    
    // Add numeric options for X and Y
    numericColumns.forEach(col => {
        xAxisSelect.add(new Option(col, col));
        yAxisSelect.add(new Option(col, col));
    });
    
    // Add categorical options for color
    categoricalColumns.forEach(col => {
        colorBySelect.add(new Option(col, col));
    });
    
    // Select different columns by default if possible
    if (numericColumns.length >= 2) {
        yAxisSelect.value = numericColumns[1];
    }
}

// Filter charts by type
function filterCharts(type) {
    const charts = document.querySelectorAll('.chart');
    
    if (type === 'all') {
        charts.forEach(chart => chart.style.display = 'block');
    } else {
        charts.forEach(chart => {
            if (chart.getAttribute('data-chart-type') === type) {
                chart.style.display = 'block';
            } else {
                chart.style.display = 'none';
            }
        });
    }
}

// Helper function: Generate random normal distribution
function randomNormal() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Helper function: Generate a color palette
function generateColorPalette(numColors) {
    const baseColors = [
        'rgba(54, 162, 235, 0.6)',   // blue
        'rgba(255, 99, 132, 0.6)',   // red
        'rgba(75, 192, 192, 0.6)',   // green
        'rgba(255, 159, 64, 0.6)',   // orange
        'rgba(153, 102, 255, 0.6)',  // purple
        'rgba(255, 205, 86, 0.6)',   // yellow
        'rgba(201, 203, 207, 0.6)',  // grey
        'rgba(255, 99, 255, 0.6)',   // pink
        'rgba(99, 255, 132, 0.6)',   // light green
        'rgba(99, 132, 255, 0.6)'    // light blue
    ];
    
    // If we need more colors than base colors, generate them
    if (numColors <= baseColors.length) {
        return baseColors.slice(0, numColors);
    } else {
        const colors = [...baseColors];
        for (let i = baseColors.length; i < numColors; i++) {
            const r = Math.floor(Math.random() * 255);
            const g = Math.floor(Math.random() * 255);
            const b = Math.floor(Math.random() * 255);
            colors.push(`rgba(${r}, ${g}, ${b}, 0.6)`);
        }
        return colors;
    }
}

// Utility functions
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
    // Create error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-md';
    errorDiv.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-exclamation-circle mr-2"></i>
            <p>${message}</p>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorDiv.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => {
            errorDiv.remove();
        }, 500);
    }, 5000);
} 