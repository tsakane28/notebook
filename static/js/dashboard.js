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
            
            // Load data preview
            loadDataPreview(datasetId);
        })
        .catch(error => {
            console.error('Error loading data:', error);
            hideLoading();
            showError(`Error loading data: ${error.message}`);
            
            // For demo purposes, create dummy data
            const dummyData = createDummyData();
            displayData(dummyData);
            window.dashboardData = dummyData;
            
            // Load dummy preview data
            loadDummyDataPreview();
        });
}

// Load data preview from API
function loadDataPreview(datasetId) {
    const previewLoading = document.getElementById('data-preview-loading');
    const previewTable = document.getElementById('data-preview-table');
    const previewEmpty = document.getElementById('data-preview-empty');
    
    if (!previewLoading || !previewTable || !previewEmpty) return;
    
    // Show loading state
    previewLoading.classList.remove('hidden');
    previewTable.classList.add('hidden');
    previewEmpty.classList.add('hidden');
    
    // Clear any existing data
    const previewHeaders = document.getElementById('data-preview-headers');
    const previewBody = document.getElementById('data-preview-body');
    if (previewHeaders) previewHeaders.innerHTML = '';
    if (previewBody) previewBody.innerHTML = '';
    
    fetch(`/api/data-preview/${datasetId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                displayDataPreview(data.preview);
                
                // Store preview data for searching
                window.previewData = data.preview;
                
                // Initialize search functionality
                initDataPreviewSearch();
            } else {
                showDataPreviewEmpty();
            }
        })
        .catch(error => {
            console.error('Error loading data preview:', error);
            showDataPreviewEmpty();
            
            // For demo purposes, create dummy preview
            loadDummyDataPreview();
        });
}

// Display data preview
function displayDataPreview(preview, filteredRows = null) {
    const previewLoading = document.getElementById('data-preview-loading');
    const previewTable = document.getElementById('data-preview-table');
    const previewEmpty = document.getElementById('data-preview-empty');
    const previewNoResults = document.getElementById('data-preview-no-results');
    
    if (!previewLoading || !previewTable || !previewEmpty || !previewNoResults) return;
    
    const previewHeaders = document.getElementById('data-preview-headers');
    const previewBody = document.getElementById('data-preview-body');
    const previewCount = document.getElementById('data-preview-count');
    const totalCount = document.getElementById('data-total-count');
    
    if (!previewHeaders || !previewBody) return;
    
    // Use filtered rows if provided, otherwise use all rows
    const rowsToDisplay = filteredRows !== null ? filteredRows : preview.rows;
    
    // Hide loading state
    previewLoading.classList.add('hidden');
    
    // Check if we have data to display
    if (!preview.columns || !rowsToDisplay || rowsToDisplay.length === 0) {
        previewTable.classList.add('hidden');
        
        if (filteredRows !== null) {
            // Show no results message if we filtered and got no results
            previewEmpty.classList.add('hidden');
            previewNoResults.classList.remove('hidden');
        } else {
            // Show empty message if no data available
            previewEmpty.classList.remove('hidden');
            previewNoResults.classList.add('hidden');
        }
        return;
    }
    
    // Hide empty state and show table
    previewEmpty.classList.add('hidden');
    previewNoResults.classList.add('hidden');
    previewTable.classList.remove('hidden');
    
    // Create column headers
    previewHeaders.innerHTML = preview.columns.map(col => 
        `<th class="px-3 py-2 border-b-2 border-gray-300 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">${col}</th>`
    ).join('');
    
    // Apply pagination if needed
    let displayedRows = rowsToDisplay;
    
    if (window.previewPagination && rowsToDisplay.length > window.previewPagination.rowsPerPage) {
        const start = window.previewPagination.page * window.previewPagination.rowsPerPage;
        const end = start + window.previewPagination.rowsPerPage;
        displayedRows = rowsToDisplay.slice(start, end);
        
        // Update total pages
        window.previewPagination.totalPages = Math.ceil(rowsToDisplay.length / window.previewPagination.rowsPerPage);
        
        // Update pagination buttons
        updatePaginationButtons();
    }
    
    // Populate table with data
    previewBody.innerHTML = displayedRows.map(row => 
        `<tr class="hover:bg-gray-50">
            ${row.map(cell => `<td class="px-3 py-2 border-b border-gray-200 text-sm">${cell !== null ? cell : '-'}</td>`).join('')}
        </tr>`
    ).join('');
    
    // Update row count
    if (previewCount) previewCount.textContent = displayedRows.length;
    if (totalCount) totalCount.textContent = rowsToDisplay.length;
    
    // Populate column select dropdown if needed
    if (!document.querySelector('#data-search-column option:not([value="all"])')) {
        populateSearchColumnDropdown(preview.columns);
    }
}

// Populate the search column dropdown
function populateSearchColumnDropdown(columns) {
    const columnSelect = document.getElementById('data-search-column');
    if (!columnSelect) return;
    
    // Clear previous options except the "All columns" option
    while (columnSelect.options.length > 1) {
        columnSelect.remove(1);
    }
    
    // Add each column as an option
    columns.forEach((column, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = column;
        columnSelect.appendChild(option);
    });
}

// Initialize data preview search functionality
function initDataPreviewSearch() {
    const searchInput = document.getElementById('data-search');
    const columnSelect = document.getElementById('data-search-column');
    
    if (!searchInput || !columnSelect) return;
    
    // Add event listeners
    searchInput.addEventListener('input', performDataSearch);
    columnSelect.addEventListener('change', performDataSearch);
    
    // Initialize pagination
    window.previewPagination = {
        page: 0,
        rowsPerPage: 10,
        totalPages: Math.ceil((window.previewData?.rows?.length || 0) / 10)
    };
    
    setupPagination();
}

// Perform data search
function performDataSearch() {
    const searchInput = document.getElementById('data-search');
    const columnSelect = document.getElementById('data-search-column');
    
    if (!searchInput || !columnSelect || !window.previewData) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    const columnIndex = columnSelect.value === 'all' ? -1 : parseInt(columnSelect.value);
    
    if (!searchTerm) {
        // If search is empty, show all data
        displayDataPreview(window.previewData);
        return;
    }
    
    // Filter rows based on search term
    const filteredRows = window.previewData.rows.filter(row => {
        if (columnIndex >= 0 && columnIndex < row.length) {
            // Search in specific column
            const cell = String(row[columnIndex] || '').toLowerCase();
            return cell.includes(searchTerm);
        } else if (columnIndex === -1) {
            // Search in all columns
            return row.some(cell => 
                String(cell || '').toLowerCase().includes(searchTerm)
            );
        }
        return false;
    });
    
    // Display filtered data
    displayDataPreview(window.previewData, filteredRows);
    
    // Reset pagination
    if (window.previewPagination) {
        window.previewPagination.page = 0;
        updatePaginationButtons();
    }
}

// Setup pagination for data preview
function setupPagination() {
    const prevButton = document.getElementById('data-preview-prev');
    const nextButton = document.getElementById('data-preview-next');
    
    if (!prevButton || !nextButton) return;
    
    // Add event listeners
    prevButton.addEventListener('click', () => changePage(-1));
    nextButton.addEventListener('click', () => changePage(1));
    
    // Update button states
    updatePaginationButtons();
}

// Change data preview page
function changePage(direction) {
    if (!window.previewPagination || !window.previewData) return;
    
    // Calculate new page
    const newPage = window.previewPagination.page + direction;
    
    // Check if valid page
    if (newPage < 0 || newPage >= window.previewPagination.totalPages) {
        return;
    }
    
    // Update current page
    window.previewPagination.page = newPage;
    
    // Get currently filtered rows or all rows
    const searchInput = document.getElementById('data-search');
    const hasSearchTerm = searchInput && searchInput.value.trim().length > 0;
    
    if (hasSearchTerm) {
        // Re-run the search to get filtered rows
        performDataSearch();
    } else {
        // Display with pagination
        displayDataPreview(window.previewData);
    }
}

// Update pagination button states
function updatePaginationButtons() {
    const prevButton = document.getElementById('data-preview-prev');
    const nextButton = document.getElementById('data-preview-next');
    
    if (!prevButton || !nextButton || !window.previewPagination) return;
    
    // Disable/enable previous button
    prevButton.disabled = window.previewPagination.page === 0;
    prevButton.classList.toggle('opacity-50', window.previewPagination.page === 0);
    
    // Disable/enable next button
    nextButton.disabled = window.previewPagination.page >= window.previewPagination.totalPages - 1;
    nextButton.classList.toggle('opacity-50', window.previewPagination.page >= window.previewPagination.totalPages - 1);
}

// Show data preview empty state
function showDataPreviewEmpty() {
    const previewLoading = document.getElementById('data-preview-loading');
    const previewTable = document.getElementById('data-preview-table');
    const previewEmpty = document.getElementById('data-preview-empty');
    
    if (!previewLoading || !previewTable || !previewEmpty) return;
    
    previewLoading.classList.add('hidden');
    previewTable.classList.add('hidden');
    previewEmpty.classList.remove('hidden');
}

// Load dummy data preview for demo
function loadDummyDataPreview() {
    const dummyPreview = {
        columns: [
            'Email', 'Level of study', 'Faculty', 'AI familiarity', 'Used AI tools', 
            'Tools used', 'Usage frequency', 'Challenges', 'Helpful tools needed', 
            'Improves learning?', 'Suggestions'
        ],
        rows: [
            [
                'cameron.graham@gmail.com', 'Undergraduate', 'Business', 'Not familiar at all', 
                'Unknown', 'Unknown', '1', 'Technical issues with tools/platforms, Lack of training on how to use AI tools', 
                'NLP-powered plagiarism detection system', 'Yes', 
                'Create Engineering fundamentals-specific model using Graph Neural Networks that enables resource recommendation'
            ],
            [
                'roger.smith@gmail.com', 'Undergraduate', 'Business', 'Somewhat familiar', 
                'Grammarly', 'Grammarly', '2', 'Unknown', 
                'knowledge graphs-powered concept visualization system', 'No', 
                'Develop Time-series analysis to predict engagement levels in Engineering fundamentals for adaptive testing'
            ],
            [
                'jonathan31@gmail.com', 'Undergraduate', 'Business', 'Not familiar at all', 
                'Unknown', 'Unknown', '1', 'Unknown', 
                'reinforcement learning-powered automated grading system', 'Yes', 
                'Student training program on model interpretation'
            ],
            [
                'emily.wilson@gmail.com', 'Graduate', 'Engineering', 'Very familiar', 
                'ChatGPT, DALL-E', 'ChatGPT, DALL-E', '5', 'Privacy concerns, Data quality issues', 
                'AI-powered code assistance', 'Yes', 
                'Integrate AI tools directly into the learning management system'
            ],
            [
                'alex.johnson@gmail.com', 'Undergraduate', 'Science', 'Moderately familiar', 
                'ChatGPT', 'ChatGPT', '3', 'Accuracy of information, Ethical concerns', 
                'Personalized learning assistant', 'Yes', 
                'Provide more training on responsible AI use'
            ],
            [
                'sarah.lee@gmail.com', 'Graduate', 'Arts', 'Slightly familiar', 
                'Grammarly', 'Grammarly', '2', 'Limited access to advanced tools', 
                'Creative writing assistant', 'Yes', 
                'Develop specialized AI tools for humanities'
            ],
            [
                'michael.brown@gmail.com', 'PhD', 'Science', 'Extremely familiar', 
                'ChatGPT, GitHub Copilot, Stable Diffusion', 'ChatGPT, GitHub Copilot, Stable Diffusion', '5', 
                'Integration with existing workflows', 
                'Research paper analyzer', 'Yes', 
                'Create AI ethics guidelines for academic research'
            ]
        ]
    };
    
    // Store dummy data
    window.previewData = dummyPreview;
    
    // Display dummy data
    displayDataPreview(dummyPreview);
    
    // Initialize search functionality
    initDataPreviewSearch();
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

    const rowsCount = data.row_count || 0;
    const columnsCount = Object.keys(data.stats || {}).length || 0;
    
    // Count numeric and categorical columns
    let numericCount = 0;
    let categoricalCount = 0;
    
    Object.values(data.stats || {}).forEach(stat => {
        if (stat.type === 'numeric') {
            numericCount++;
        } else if (stat.type === 'categorical') {
            categoricalCount++;
        }
    });
    
    // Create the cards HTML
    statsContainer.innerHTML = `
        <div class="bg-primary rounded-lg p-4 shadow-sm">
            <h3 class="text-xs uppercase tracking-wider text-white font-semibold mb-2">Total Rows</h3>
            <div class="text-2xl font-bold text-white">${rowsCount}</div>
        </div>
        <div class="bg-primary rounded-lg p-4 shadow-sm">
            <h3 class="text-xs uppercase tracking-wider text-white font-semibold mb-2">Total Columns</h3>
            <div class="text-2xl font-bold text-white">${columnsCount}</div>
        </div>
        <div class="bg-primary rounded-lg p-4 shadow-sm">
            <h3 class="text-xs uppercase tracking-wider text-white font-semibold mb-2">Numeric Columns</h3>
            <div class="text-2xl font-bold text-white">${numericCount}</div>
        </div>
        <div class="bg-primary rounded-lg p-4 shadow-sm">
            <h3 class="text-xs uppercase tracking-wider text-white font-semibold mb-2">Categorical Columns</h3>
            <div class="text-2xl font-bold text-white">${categoricalCount}</div>
        </div>
    `;
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
    // Store dataset ID globally
    window.datasetId = datasetId;
    
    // Model training form
    const modelForm = document.getElementById('model-form');
    if (modelForm) {
        modelForm.addEventListener('submit', function(e) {
            e.preventDefault();
            trainModel(datasetId);
        });
        
        // Set up model type change handlers to show/hide appropriate parameters
        const modelTypeSelect = document.getElementById('model-type');
        if (modelTypeSelect) {
            modelTypeSelect.addEventListener('change', function() {
                toggleModelParams(this.value);
            });
            
            // Initialize with current selection
            toggleModelParams(modelTypeSelect.value);
        }
        
        // Update test size display value
        const testSizeInput = document.getElementById('test-size');
        const testSizeDisplay = document.getElementById('test-size-value');
        if (testSizeInput && testSizeDisplay) {
            testSizeInput.addEventListener('input', function() {
                testSizeDisplay.textContent = `${this.value}%`;
            });
        }
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
    
    // Export model button
    const downloadModelBtn = document.getElementById('download-model-btn');
    if (downloadModelBtn) {
        downloadModelBtn.addEventListener('click', function() {
            exportModelResults();
        });
    }
    
    // Setup scatter plot dialog
    setupScatterPlotDialog(datasetId);
}

// Toggle model parameters sections based on selected model type
function toggleModelParams(modelType) {
    // Hide all parameter sections first
    document.querySelectorAll('.params-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show the appropriate parameter section
    if (modelType === 'LinearRegression') {
        document.getElementById('linear-params')?.classList.remove('hidden');
    } else if (modelType === 'RandomForest') {
        document.getElementById('forest-params')?.classList.remove('hidden');
    } else if (modelType === 'GradientBoosting') {
        document.getElementById('boost-params')?.classList.remove('hidden');
    } else if (modelType === 'SVM') {
        document.getElementById('svm-params')?.classList.remove('hidden');
    }
}

// Train model with selected options
function trainModel(datasetId) {
    const modelName = document.getElementById('model-name').value.trim();
    const targetColumn = document.getElementById('target-column').value;
    const modelType = document.getElementById('model-type').value;
    
    // Basic validation
    if (!modelName) {
        showError('Please enter a model name');
        return;
    }
    
    if (!targetColumn) {
        showError('Please select a target column');
        return;
    }
    
    // Set the target name in the results section
    const targetNameElement = document.getElementById('model-target-name');
    if (targetNameElement) {
        targetNameElement.textContent = targetColumn;
    }
    
    // Get model parameters based on model type
    const params = collectModelParameters(modelType);
    
    // Get test size and cross-validation settings
    const testSize = document.getElementById('test-size')?.value || 20;
    const useCrossValidation = document.getElementById('cross-validation')?.checked || false;
    
    showLoading('Training model...');
    
    fetch(`/api/train_model/${datasetId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model_name: modelName,
            target_column: targetColumn,
            model_type: modelType,
            params: params,
            test_size: testSize / 100, // Convert percentage to decimal
            use_cross_validation: useCrossValidation
        })
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        if (data.success) {
            displayModelResults(data);
            
            // Store the model results for export
            window.modelResults = data;
        } else {
            showError(data.error || 'Error training model');
        }
    })
    .catch(error => {
        hideLoading();
        showError(`Error training model: ${error.message}`);
        
        // Show mock results for demo
        const mockData = createMockModelResults(modelName, targetColumn, modelType, params);
        displayModelResults(mockData);
        
        // Store the model results for export
        window.modelResults = mockData;
    });
}

// Collect model parameters from the form based on model type
function collectModelParameters(modelType) {
    let params = {};
    
    if (modelType === 'LinearRegression') {
        params = {
            fit_intercept: document.getElementById('fit-intercept')?.value === 'true',
            normalize: document.getElementById('normalize')?.value === 'true'
        };
    } else if (modelType === 'RandomForest') {
        params = {
            n_estimators: parseInt(document.getElementById('n-estimators')?.value || 100),
            max_depth: document.getElementById('max-depth')?.value === 'None' ? null : parseInt(document.getElementById('max-depth')?.value),
            min_samples_split: parseInt(document.getElementById('min-samples-split')?.value || 2),
            min_samples_leaf: parseInt(document.getElementById('min-samples-leaf')?.value || 1)
        };
    } else if (modelType === 'GradientBoosting') {
        params = {
            n_estimators: parseInt(document.getElementById('gb-n-estimators')?.value || 100),
            learning_rate: parseFloat(document.getElementById('learning-rate')?.value || 0.1),
            max_depth: parseInt(document.getElementById('gb-max-depth')?.value || 3),
            subsample: parseFloat(document.getElementById('subsample')?.value || 1.0)
        };
    } else if (modelType === 'SVM') {
        params = {
            kernel: document.getElementById('kernel')?.value || 'rbf',
            C: parseFloat(document.getElementById('c-value')?.value || 1.0),
            gamma: document.getElementById('gamma')?.value || 'scale'
        };
    }
    
    return params;
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
        <div class="space-y-6">
            <div class="p-4 bg-success-light rounded-lg">
                <div class="text-success font-bold mb-1">Model Training Complete</div>
                <div class="text-sm">
                    <span class="font-medium">Target:</span> ${data.target_column} | 
                    <span class="font-medium">Model:</span> ${data.model_type}
                    ${data.is_categorical_target ? '<span class="ml-2 badge badge-info">Categorical</span>' : ''}
                </div>
            </div>
            
            <!-- Model Performance Metrics -->
            <div>
                <h3 class="font-bold text-lg mb-3">Model Performance</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    ${Object.entries(data.metrics).map(([metric, value]) => `
                        <div class="p-4 bg-light rounded-lg">
                            <div class="text-gray-600 text-sm mb-1">${formatMetricName(metric)}</div>
                            <div class="text-xl font-bold text-primary">${typeof value === 'number' ? value.toFixed(4) : value}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Visualizations -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Feature Importance -->
                ${data.feature_importance ? `
                    <div class="bg-white rounded-lg shadow-sm p-4">
                        <h3 class="font-bold text-md mb-3">Feature Importance</h3>
                        <div class="h-64">
                            <canvas id="feature-importance-chart"></canvas>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Prediction vs Actual -->
                ${data.predictions ? `
                    <div class="bg-white rounded-lg shadow-sm p-4">
                        <h3 class="font-bold text-md mb-3">Predictions vs Actual</h3>
                        <div class="h-64">
                            ${data.is_categorical_target 
                                ? `<div id="categorical-predictions" class="overflow-auto h-full"></div>`
                                : `<canvas id="prediction-vs-actual-chart"></canvas>`
                            }
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <!-- AI Adoption Insights -->
            <div class="bg-white rounded-lg shadow-sm p-4">
                <h3 class="font-bold text-md mb-3">AI Adoption Insights</h3>
                ${data.target_column.toLowerCase().includes('ai') || data.target_column.toLowerCase().includes('adoption') ? `
                    <div class="mb-4">
                        <div class="text-sm font-medium mb-2">Key Factors Influencing AI Adoption:</div>
                        <ul class="list-disc pl-5 text-sm space-y-1">
                            ${Object.entries(data.feature_importance || {})
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([feature, importance]) => `
                                    <li><span class="font-medium">${feature}:</span> ${(importance * 100).toFixed(1)}% influence</li>
                                `).join('')}
                        </ul>
                    </div>
                    <div>
                        <div class="text-sm font-medium mb-2">AI Adoption Recommendations:</div>
                        <div class="p-3 bg-primary-light rounded text-sm">
                            <p>Based on the model, focus on the following to increase AI adoption:</p>
                            <ul class="list-disc pl-5 mt-2 space-y-1">
                                <li>Invest in training for top influencing factors</li>
                                <li>Address any barriers identified in significant features</li>
                                <li>Consider pilot programs targeting high-potential segments</li>
                            </ul>
                        </div>
                    </div>
                ` : `
                    <p class="text-sm text-gray-600">This model is not specifically for AI adoption. To get AI adoption insights, train a model with an AI adoption related target variable.</p>
                `}
            </div>
            
            <!-- Improvement Suggestions -->
            <div class="bg-white rounded-lg shadow-sm p-4">
                <h3 class="font-bold text-md mb-3">Model Improvement Suggestions</h3>
                <div class="text-sm space-y-3">
                    ${getModelImprovementSuggestions(data.model_type, data.metrics).map(suggestion => `
                        <div class="flex">
                            <div class="text-primary mr-2"><i class="fas fa-lightbulb"></i></div>
                            <div>${suggestion}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    // Create feature importance chart if available
    if (data.feature_importance) {
        createFeatureImportanceChart(data.feature_importance);
    }
    
    // Create prediction vs actual chart if available
    if (data.predictions) {
        if (data.is_categorical_target) {
            createCategoricalPredictionTable(data.predictions, data.target_column);
        } else {
            createPredictionVsActualChart(data.predictions, data.target_column);
        }
    }
}

// Create prediction vs actual chart
function createPredictionVsActualChart(predictions, targetColumn) {
    const ctx = document.getElementById('prediction-vs-actual-chart');
    if (!ctx) return;
    
    // Extract actual and predicted values
    const actual = predictions.actual;
    const predicted = predictions.predicted;
    
    // Create scatter plot
    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Predictions',
                data: actual.map((value, index) => ({ x: value, y: predicted[index] })),
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
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
                        text: `Actual ${targetColumn}`
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: `Predicted ${targetColumn}`
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            return `Actual: ${typeof point.x === 'number' ? point.x.toFixed(2) : point.x}, Predicted: ${typeof point.y === 'number' ? point.y.toFixed(2) : point.y}`;
                        }
                    }
                }
            }
        }
    });
}

// Create categorical prediction table
function createCategoricalPredictionTable(predictions, targetColumn) {
    const container = document.getElementById('categorical-predictions');
    if (!container) return;
    
    // Extract actual and predicted values
    const actual = predictions.actual;
    const predicted = predictions.predicted;
    
    // Create a container for the confusion matrix if there are few categories
    // Otherwise show a sample of predictions
    const uniqueCategories = [...new Set([...actual, ...predicted])];
    
    if (uniqueCategories.length <= 10) {
        // Create confusion matrix
        const confusionMatrix = {};
        
        // Initialize matrix with zeros
        uniqueCategories.forEach(actualCat => {
            confusionMatrix[actualCat] = {};
            uniqueCategories.forEach(predCat => {
                confusionMatrix[actualCat][predCat] = 0;
            });
        });
        
        // Fill in the matrix
        for (let i = 0; i < actual.length; i++) {
            confusionMatrix[actual[i]][predicted[i]] = (confusionMatrix[actual[i]][predicted[i]] || 0) + 1;
        }
        
        // Create HTML table for the confusion matrix
        let tableHTML = `
            <div class="mb-2 text-sm font-medium">Confusion Matrix</div>
            <table class="w-full text-sm">
                <thead>
                    <tr>
                        <th class="p-1 border bg-gray-100">Actual ↓ Predicted →</th>
                        ${uniqueCategories.map(cat => `<th class="p-1 border bg-gray-100">${cat}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;
        
        uniqueCategories.forEach(actualCat => {
            tableHTML += `<tr>
                <th class="p-1 border bg-gray-100">${actualCat}</th>
                ${uniqueCategories.map(predCat => {
                    const count = confusionMatrix[actualCat][predCat];
                    const isMatch = actualCat === predCat;
                    return `<td class="p-1 border text-center ${isMatch ? 'bg-success-light' : ''}">${count}</td>`;
                }).join('')}
            </tr>`;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHTML;
    } else {
        // Too many categories for a matrix, show sample predictions
        let tableHTML = `
            <div class="mb-2 text-sm font-medium">Sample Predictions (${Math.min(actual.length, 20)} of ${actual.length})</div>
            <table class="w-full text-sm">
                <thead>
                    <tr>
                        <th class="p-1 border bg-gray-100">#</th>
                        <th class="p-1 border bg-gray-100">Actual</th>
                        <th class="p-1 border bg-gray-100">Predicted</th>
                        <th class="p-1 border bg-gray-100">Match</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Show up to 20 samples
        const sampleSize = Math.min(actual.length, 20);
        for (let i = 0; i < sampleSize; i++) {
            const isMatch = actual[i] === predicted[i];
            tableHTML += `<tr>
                <td class="p-1 border text-center">${i+1}</td>
                <td class="p-1 border">${actual[i]}</td>
                <td class="p-1 border">${predicted[i]}</td>
                <td class="p-1 border text-center">${isMatch ? '✓' : '✗'}</td>
            </tr>`;
        }
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        // Add accuracy summary
        const totalMatches = actual.filter((val, idx) => val === predicted[idx]).length;
        const accuracy = (totalMatches / actual.length * 100).toFixed(1);
        
        tableHTML = `
            <div class="mb-3 p-2 bg-primary-light rounded">
                <div class="font-medium">Accuracy: ${accuracy}%</div>
                <div class="text-xs">(${totalMatches} correct out of ${actual.length})</div>
            </div>
        ` + tableHTML;
        
        container.innerHTML = tableHTML;
    }
}

// Create feature importance chart
function createFeatureImportanceChart(featureImportance) {
    const ctx = document.getElementById('feature-importance-chart');
    if (!ctx) return;
    
    // Sort features by importance
    const sortedEntries = Object.entries(featureImportance)
        .sort((a, b) => b[1] - a[1]);
    
    const features = sortedEntries.map(entry => entry[0]);
    const values = sortedEntries.map(entry => entry[1]);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: features,
            datasets: [{
                label: 'Feature Importance',
                data: values,
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderColor: 'rgba(54, 162, 235, 1)',
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
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            return `Importance: ${(value * 100).toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Importance'
                    },
                    ticks: {
                        callback: function(value) {
                            return `${(value * 100).toFixed(0)}%`;
                        }
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

// Get model improvement suggestions
function getModelImprovementSuggestions(modelType, metrics) {
    const suggestions = [];
    
    // Common suggestions for all models
    suggestions.push("Consider feature engineering to create new meaningful features.");
    suggestions.push("Try scaling features for potentially better model performance.");
    
    // Model-specific suggestions
    if (modelType === 'LinearRegression') {
        if (metrics.r2_score < 0.7) {
            suggestions.push("The linear model may not capture complex relationships. Try non-linear models like Random Forest.");
        }
        suggestions.push("Check for multicollinearity between features for more stable coefficients.");
        suggestions.push("Consider polynomial features to capture non-linear relationships.");
    } else if (modelType === 'RandomForest') {
        suggestions.push("Try increasing the number of estimators for potentially better performance.");
        suggestions.push("Adjust max_depth to control overfitting or underfitting.");
        suggestions.push("Feature selection might help reduce noise from less important features.");
    } else if (modelType === 'GradientBoosting') {
        suggestions.push("Experiment with lower learning rates and more estimators for better generalization.");
        suggestions.push("Try different subsample values to reduce overfitting.");
        suggestions.push("Early stopping can help prevent overfitting while saving computation time.");
    } else if (modelType === 'SVM') {
        suggestions.push("Try different kernel types for capturing complex patterns.");
        suggestions.push("Adjust the C parameter to balance regularization and model fit.");
        suggestions.push("SVMs are sensitive to feature scaling, ensure all features are on similar scales.");
    }
    
    // AI adoption specific suggestions
    suggestions.push("For AI adoption prediction, consider collecting more data on organization culture and digital readiness.");
    suggestions.push("Include industry-specific variables to better capture adoption patterns unique to each sector.");
    
    return suggestions;
}

// Export model results
function exportModelResults() {
    // Check if we have model results to export
    if (!window.modelResults) {
        showError('No model results available to export');
        return;
    }
    
    // Convert model results to CSV format
    const modelResults = window.modelResults;
    
    // Create a CSV string
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add model information
    csvContent += `Model Type,${modelResults.model_type}\n`;
    csvContent += `Target Column,${modelResults.target_column}\n\n`;
    
    // Add metrics
    csvContent += "Metrics\n";
    for (const [metric, value] of Object.entries(modelResults.metrics)) {
        csvContent += `${formatMetricName(metric)},${typeof value === 'number' ? value.toFixed(4) : value}\n`;
    }
    csvContent += "\n";
    
    // Add feature importance if available
    if (modelResults.feature_importance) {
        csvContent += "Feature Importance\n";
        csvContent += "Feature,Importance\n";
        
        // Sort features by importance
        const sortedFeatures = Object.entries(modelResults.feature_importance)
            .sort((a, b) => b[1] - a[1]);
        
        for (const [feature, importance] of sortedFeatures) {
            csvContent += `${feature},${importance.toFixed(4)}\n`;
        }
    }
    
    // Create a download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `model_results_${modelResults.model_type}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
}

// Create mock model results for demo
function createMockModelResults(modelName, targetColumn, modelType, params) {
    // Use current date and time for the timestamp
    const timestamp = new Date().toISOString();
    
    // Determine if the target is AI adoption related
    const isAIAdoption = targetColumn.toLowerCase().includes('ai') || 
                          targetColumn.toLowerCase().includes('adoption');
    
    // Check if column name might indicate a categorical variable
    const mightBeCategorical = targetColumn.toLowerCase().includes('level') || 
                              targetColumn.toLowerCase().includes('category') || 
                              targetColumn.toLowerCase().includes('type') || 
                              targetColumn.toLowerCase().includes('class') ||
                              targetColumn.toLowerCase().includes('rating') ||
                              targetColumn.toLowerCase().includes('status') ||
                              targetColumn.toLowerCase().includes('familiarity');
    
    // Create metrics based on model type
    let metrics = {};
    
    if (isAIAdoption) {
        // AI adoption metrics
        if (modelType === 'LinearRegression') {
            metrics = {
                'r2_score': 0.76,
                'mean_absolute_error': 0.11,
                'mean_squared_error': 0.032,
                'root_mean_squared_error': 0.18
            };
        } else if (modelType === 'RandomForest') {
            metrics = {
                'r2_score': 0.85,
                'mean_absolute_error': 0.085,
                'mean_squared_error': 0.026,
                'root_mean_squared_error': 0.16
            };
        } else if (modelType === 'GradientBoosting') {
            metrics = {
                'r2_score': 0.88,
                'mean_absolute_error': 0.078,
                'mean_squared_error': 0.022,
                'root_mean_squared_error': 0.15
            };
        } else {
            metrics = {
                'r2_score': 0.82,
                'mean_absolute_error': 0.092,
                'mean_squared_error': 0.028,
                'root_mean_squared_error': 0.17
            };
        }
    } else {
        // Generic metrics for other targets
        if (modelType === 'LinearRegression') {
            metrics = {
                'r2_score': 0.68,
                'mean_absolute_error': 8.95,
                'mean_squared_error': 125.6,
                'root_mean_squared_error': 11.21
            };
        } else if (modelType === 'RandomForest') {
            metrics = {
                'r2_score': 0.82,
                'mean_absolute_error': 6.45,
                'mean_squared_error': 64.3,
                'root_mean_squared_error': 8.02
            };
        } else if (modelType === 'GradientBoosting') {
            metrics = {
                'r2_score': 0.84,
                'mean_absolute_error': 5.83,
                'mean_squared_error': 58.7,
                'root_mean_squared_error': 7.66
            };
        } else {
            metrics = {
                'r2_score': 0.75,
                'mean_absolute_error': 7.22,
                'mean_squared_error': 85.1,
                'root_mean_squared_error': 9.23
            };
        }
    }
    
    // Create mock feature importance
    let featureImportance = {};
    
    if (isAIAdoption) {
        featureImportance = {
            'Technical_Infrastructure': 0.28,
            'Management_Support': 0.23,
            'Budget_Allocation': 0.18,
            'Staff_Skills': 0.15,
            'Industry_Competition': 0.09,
            'Previous_Tech_Adoption': 0.07
        };
    } else {
        // Generic feature importance
        featureImportance = {
            'Age': 0.18,
            'Department': 0.12,
            'Education': 0.25,
            'Salary': 0.19,
            'Years_Experience': 0.14,
            'Performance_Score': 0.12
        };
    }
    
    // Mock predictions based on whether we're dealing with categorical data
    let predictions = {};
    let targetMapping = {};
    let isCategoricalTarget = mightBeCategorical;
    
    if (isCategoricalTarget) {
        // Create categorical mock data
        let categories = [];
        
        if (targetColumn.toLowerCase().includes('familiarity')) {
            categories = ['Not familiar at all', 'Slightly familiar', 'Moderately familiar', 'Very familiar', 'Extremely familiar'];
            targetMapping = Object.fromEntries(categories.map((cat, idx) => [cat, idx]));
        } else if (targetColumn.toLowerCase().includes('adoption')) {
            categories = ['Not adopted', 'Planning to adopt', 'Early adoption', 'Partial adoption', 'Full adoption'];
            targetMapping = Object.fromEntries(categories.map((cat, idx) => [cat, idx]));
        } else if (targetColumn.toLowerCase().includes('level')) {
            categories = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
            targetMapping = Object.fromEntries(categories.map((cat, idx) => [cat, idx]));
        } else {
            // Generic categories
            categories = ['Low', 'Medium', 'High'];
            targetMapping = Object.fromEntries(categories.map((cat, idx) => [cat, idx]));
        }
        
        // Create actual and predicted values
        const sampleSize = 50;
        const actual = [];
        const predicted = [];
        
        for (let i = 0; i < sampleSize; i++) {
            // Select a random category for the actual value
            const actualCat = categories[Math.floor(Math.random() * categories.length)];
            actual.push(actualCat);
            
            // With 70% probability, prediction matches actual
            // Otherwise, pick a different random category
            if (Math.random() < 0.7) {
                predicted.push(actualCat);
            } else {
                const otherCats = categories.filter(c => c !== actualCat);
                predicted.push(otherCats[Math.floor(Math.random() * otherCats.length)]);
            }
        }
        
        predictions = { actual, predicted, categorical_mapping: targetMapping };
        
        // Update metrics for classification
        metrics = {
            'accuracy': 0.76,
            'precision': 0.74,
            'recall': 0.73,
            'f1_score': 0.73
        };
        
    } else {
        // Numeric predictions (code from before)
        const predictionCount = 50;
        const actual = [];
        const predicted = [];
        
        const mean = isAIAdoption ? 0.5 : 50;
        const std = isAIAdoption ? 0.25 : 20;
        
        for (let i = 0; i < predictionCount; i++) {
            // Generate a random "actual" value
            const actualValue = Math.max(0, mean + (Math.random() - 0.5) * std * 2);
            actual.push(actualValue);
            
            // Add some noise for the predicted value
            const noise = (Math.random() - 0.5) * std * 0.4;
            predicted.push(Math.max(0, actualValue + noise));
        }
        
        predictions = { actual, predicted };
    }
    
    return {
        success: true,
        model_id: generateMockModelId(),
        model_name: modelName,
        target_column: targetColumn,
        model_type: modelType,
        params: params,
        metrics: metrics,
        feature_importance: featureImportance,
        predictions: predictions,
        is_categorical_target: isCategoricalTarget,
        target_mapping: targetMapping,
        created_at: timestamp
    };
}

// Generate a mock model ID
function generateMockModelId() {
    return 'model_' + Math.random().toString(36).substring(2, 15);
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

// Load saved models
function loadSavedModels(datasetId) {
    const loading = document.getElementById('saved-models-loading');
    const empty = document.getElementById('saved-models-empty');
    const container = document.getElementById('saved-models-container');
    
    if (!loading || !empty || !container) return;
    
    // Show loading state
    loading.classList.remove('hidden');
    empty.classList.add('hidden');
    container.classList.add('hidden');
    
    fetch(`/api/saved_models/${datasetId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.models && data.models.length > 0) {
                displaySavedModels(data.models);
            } else {
                showSavedModelsEmpty();
            }
        })
        .catch(error => {
            console.error('Error loading saved models:', error);
            
            // For demo, show mock saved models
            const mockModels = getMockSavedModels();
            if (mockModels.length > 0) {
                displaySavedModels(mockModels);
            } else {
                showSavedModelsEmpty();
            }
        });
}

// Display saved models in the table
function displaySavedModels(models) {
    const loading = document.getElementById('saved-models-loading');
    const empty = document.getElementById('saved-models-empty');
    const container = document.getElementById('saved-models-container');
    const modelsList = document.getElementById('saved-models-list');
    
    if (!loading || !empty || !container || !modelsList) return;
    
    // Hide loading, show container
    loading.classList.add('hidden');
    empty.classList.add('hidden');
    container.classList.remove('hidden');
    
    // Clear the list
    modelsList.innerHTML = '';
    
    // Add each model to the list
    models.forEach(model => {
        const row = document.createElement('tr');
        
        // Format date
        const createdDate = new Date(model.created_at);
        const formattedDate = createdDate.toLocaleString();
        
        // Get primary metric
        let primaryMetric = '';
        let primaryMetricValue = '';
        
        if (model.metrics) {
            if (model.is_categorical_target) {
                primaryMetric = 'Accuracy';
                primaryMetricValue = model.metrics.accuracy ? (model.metrics.accuracy * 100).toFixed(2) + '%' : 'N/A';
            } else {
                primaryMetric = 'R² Score';
                primaryMetricValue = model.metrics.r2_score ? model.metrics.r2_score.toFixed(4) : 'N/A';
            }
        }
        
        row.innerHTML = `
            <td class="px-3 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${model.model_name}</div>
            </td>
            <td class="px-3 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">${model.target_column}</div>
            </td>
            <td class="px-3 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-light text-primary-dark">
                    ${model.model_type}
                </span>
            </td>
            <td class="px-3 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">${formattedDate}</div>
            </td>
            <td class="px-3 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">${primaryMetric}: ${primaryMetricValue}</div>
            </td>
            <td class="px-3 py-4 whitespace-nowrap text-sm font-medium">
                <button class="text-primary hover:text-primary-dark mr-3 load-model-btn" data-model-id="${model.model_id}">
                    <i class="fas fa-eye mr-1"></i> View
                </button>
                <button class="text-danger hover:text-danger-dark delete-model-btn" data-model-id="${model.model_id}">
                    <i class="fas fa-trash mr-1"></i> Delete
                </button>
            </td>
        `;
        
        // Add event listeners for the buttons
        const loadBtn = row.querySelector('.load-model-btn');
        const deleteBtn = row.querySelector('.delete-model-btn');
        
        if (loadBtn) {
            loadBtn.addEventListener('click', function() {
                loadModel(model.model_id);
            });
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                deleteModel(model.model_id);
            });
        }
        
        modelsList.appendChild(row);
    });
}

// Show empty state for saved models
function showSavedModelsEmpty() {
    const loading = document.getElementById('saved-models-loading');
    const empty = document.getElementById('saved-models-empty');
    const container = document.getElementById('saved-models-container');
    
    if (!loading || !empty || !container) return;
    
    loading.classList.add('hidden');
    empty.classList.remove('hidden');
    container.classList.add('hidden');
}

// Load a specific model
function loadModel(modelId) {
    showLoading('Loading model...');
    
    fetch(`/api/model/${modelId}`)
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.success) {
                // Display model results
                displayModelResults(data);
                
                // Store model for export
                window.modelResults = data;
                
                // Scroll to results section
                document.getElementById('model-section')?.scrollIntoView({ behavior: 'smooth' });
            } else {
                showError(data.error || 'Error loading model');
            }
        })
        .catch(error => {
            hideLoading();
            showError(`Error loading model: ${error.message}`);
            
            // For demo, load mock model
            const mockModels = getMockSavedModels();
            const mockModel = mockModels.find(m => m.model_id === modelId);
            
            if (mockModel) {
                displayModelResults(mockModel);
                window.modelResults = mockModel;
                document.getElementById('model-section')?.scrollIntoView({ behavior: 'smooth' });
            }
        });
}

// Delete a model
function deleteModel(modelId) {
    if (!confirm('Are you sure you want to delete this model? This action cannot be undone.')) {
        return;
    }
    
    showLoading('Deleting model...');
    
    fetch(`/api/model/${modelId}`, {
        method: 'DELETE'
    })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.success) {
                // Refresh the models list
                loadSavedModels(window.datasetId);
            } else {
                showError(data.error || 'Error deleting model');
            }
        })
        .catch(error => {
            hideLoading();
            showError(`Error deleting model: ${error.message}`);
            
            // For demo, remove from mock models
            removeMockSavedModel(modelId);
            
            // Refresh the list with updated mock data
            const mockModels = getMockSavedModels();
            if (mockModels.length > 0) {
                displaySavedModels(mockModels);
            } else {
                showSavedModelsEmpty();
            }
        });
}

// Get mock saved models for demo
function getMockSavedModels() {
    // Try to get saved models from localStorage
    const savedModels = localStorage.getItem('mockSavedModels');
    if (savedModels) {
        try {
            return JSON.parse(savedModels);
        } catch (e) {
            return [];
        }
    }
    return [];
}

// Add a mock saved model
function addMockSavedModel(model) {
    const models = getMockSavedModels();
    models.push(model);
    localStorage.setItem('mockSavedModels', JSON.stringify(models));
    
    // Refresh the displayed models
    displaySavedModels(models);
}

// Remove a mock saved model
function removeMockSavedModel(modelId) {
    const models = getMockSavedModels();
    const updatedModels = models.filter(model => model.model_id !== modelId);
    localStorage.setItem('mockSavedModels', JSON.stringify(updatedModels));
}