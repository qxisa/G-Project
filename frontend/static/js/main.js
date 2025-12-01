/**
 * main.js - Main JavaScript for Interactive Data Analytics Dashboard
 * 
 * This script handles all frontend interactions including:
 * - CSV file upload
 * - Data analysis display
 * - Chart generation and switching
 * - Forecasting
 * - Error handling and notifications
 */

// ============================================
// Global Variables
// ============================================

// API base URL (same origin)
const API_BASE = '';

// Current state
let currentChart = 'line';
let dataLoaded = false;

// ============================================
// DOM Elements
// ============================================

const elements = {
    // Upload section
    fileInput: document.getElementById('file-input'),
    fileName: document.getElementById('file-name'),
    uploadBtn: document.getElementById('upload-btn'),
    uploadForm: document.getElementById('upload-form'),
    uploadStatus: document.getElementById('upload-status'),
    
    // Alerts and loading
    loading: document.getElementById('loading'),
    errorAlert: document.getElementById('error-alert'),
    successAlert: document.getElementById('success-alert'),
    
    // Summary section
    summarySection: document.getElementById('summary-section'),
    overviewCards: document.getElementById('overview-cards'),
    insightsList: document.getElementById('insights-list'),
    numericStats: document.getElementById('numeric-stats'),
    categoricalStats: document.getElementById('categorical-stats'),
    categoricalStatsContainer: document.getElementById('categorical-stats-container'),
    
    // Visualization section
    vizSection: document.getElementById('viz-section'),
    chartContainer: document.getElementById('chart'),
    chartButtons: document.querySelectorAll('.btn-chart'),
    
    // Forecast section
    forecastSection: document.getElementById('forecast-section'),
    periodsInput: document.getElementById('periods-input'),
    forecastBtn: document.getElementById('forecast-btn'),
    forecastResults: document.getElementById('forecast-results'),
    forecastChart: document.getElementById('forecast-chart')
};

// ============================================
// Utility Functions
// ============================================

/**
 * Show loading spinner
 */
function showLoading() {
    elements.loading.classList.remove('hidden');
}

/**
 * Hide loading spinner
 */
function hideLoading() {
    elements.loading.classList.add('hidden');
}

/**
 * Show error alert
 * @param {string} message - Error message to display
 */
function showError(message) {
    elements.errorAlert.textContent = `❌ ${message}`;
    elements.errorAlert.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        elements.errorAlert.classList.add('hidden');
    }, 5000);
}

/**
 * Show success alert
 * @param {string} message - Success message to display
 */
function showSuccess(message) {
    elements.successAlert.textContent = `✅ ${message}`;
    elements.successAlert.classList.remove('hidden');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        elements.successAlert.classList.add('hidden');
    }, 3000);
}

/**
 * Hide all alerts
 */
function hideAlerts() {
    elements.errorAlert.classList.add('hidden');
    elements.successAlert.classList.add('hidden');
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ============================================
// File Upload Handling
// ============================================

/**
 * Handle file selection
 */
elements.fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    const fileLabel = document.querySelector('.file-label');
    
    if (file) {
        // Update file name display
        elements.fileName.textContent = file.name;
        fileLabel.classList.add('has-file');
        
        // Enable upload button
        elements.uploadBtn.disabled = false;
    } else {
        // Reset file display
        elements.fileName.textContent = 'Choose a CSV file...';
        fileLabel.classList.remove('has-file');
        elements.uploadBtn.disabled = true;
    }
});

/**
 * Handle form submission (file upload)
 */
elements.uploadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const file = elements.fileInput.files[0];
    if (!file) {
        showError('Please select a file to upload.');
        return;
    }
    
    // Prepare form data
    const formData = new FormData();
    formData.append('file', file);
    
    // Show loading state
    hideAlerts();
    showLoading();
    elements.uploadBtn.disabled = true;
    elements.uploadBtn.textContent = 'Uploading...';
    
    try {
        // Upload file
        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(result.message);
            dataLoaded = true;
            
            // Automatically fetch and display analysis
            await fetchAnalysis();
            
            // Load initial chart
            await loadChart('line');
        } else {
            showError(result.error || 'Upload failed. Please try again.');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showError('Network error. Please check your connection and try again.');
    } finally {
        hideLoading();
        // Only re-enable the button if there's still a file selected
        elements.uploadBtn.disabled = !elements.fileInput.files[0];
        elements.uploadBtn.textContent = 'Upload & Analyze';
    }
});

// ============================================
// Data Analysis
// ============================================

/**
 * Fetch and display data analysis
 */
async function fetchAnalysis() {
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE}/analyze`);
        const result = await response.json();
        
        if (result.success) {
            displaySummary(result);
            
            // Show visualization and forecast sections
            elements.vizSection.classList.remove('hidden');
            
            // Show forecast section only if date columns exist
            if (result.summary.column_types.date.length > 0) {
                elements.forecastSection.classList.remove('hidden');
            } else {
                elements.forecastSection.classList.add('hidden');
            }
        } else {
            showError(result.error || 'Analysis failed.');
        }
    } catch (error) {
        console.error('Analysis error:', error);
        showError('Failed to analyze data. Please try again.');
    } finally {
        hideLoading();
    }
}

/**
 * Display summary statistics
 * @param {Object} data - Analysis result data
 */
function displaySummary(data) {
    const { summary, insights, available_charts } = data;
    
    // Show summary section
    elements.summarySection.classList.remove('hidden');
    
    // Display overview cards
    displayOverviewCards(summary.overview);
    
    // Display insights
    displayInsights(insights);
    
    // Display numeric statistics
    displayNumericStats(summary.numeric_stats);
    
    // Display categorical statistics
    displayCategoricalStats(summary.categorical_stats);
    
    // Update available chart buttons
    updateChartButtons(available_charts);
}

/**
 * Display overview cards
 * @param {Object} overview - Overview data
 */
function displayOverviewCards(overview) {
    elements.overviewCards.innerHTML = `
        <div class="card">
            <div class="card-value">${formatNumber(overview.total_rows)}</div>
            <div class="card-label">Total Rows</div>
        </div>
        <div class="card">
            <div class="card-value">${overview.total_columns}</div>
            <div class="card-label">Total Columns</div>
        </div>
        <div class="card">
            <div class="card-value">${overview.numeric_columns}</div>
            <div class="card-label">Numeric Columns</div>
        </div>
        <div class="card">
            <div class="card-value">${overview.categorical_columns}</div>
            <div class="card-label">Categorical Columns</div>
        </div>
        <div class="card">
            <div class="card-value">${overview.date_columns}</div>
            <div class="card-label">Date Columns</div>
        </div>
    `;
}

/**
 * Display quick insights
 * @param {Array} insights - List of insight strings
 */
function displayInsights(insights) {
    if (insights && insights.length > 0) {
        elements.insightsList.innerHTML = insights
            .map(insight => `<li>${insight}</li>`)
            .join('');
    } else {
        elements.insightsList.innerHTML = '<li>No insights available</li>';
    }
}

/**
 * Display numeric statistics table
 * @param {Object} stats - Numeric statistics object
 */
function displayNumericStats(stats) {
    const columns = Object.keys(stats);
    
    if (columns.length === 0) {
        elements.numericStats.innerHTML = '<p>No numeric columns found.</p>';
        return;
    }
    
    let html = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>Column</th>
                    <th>Mean</th>
                    <th>Median</th>
                    <th>Std Dev</th>
                    <th>Min</th>
                    <th>Max</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    for (const [col, colStats] of Object.entries(stats)) {
        html += `
            <tr>
                <td><strong>${col}</strong></td>
                <td>${colStats.mean.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                <td>${colStats.median.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                <td>${colStats.std.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                <td>${colStats.min.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                <td>${colStats.max.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
            </tr>
        `;
    }
    
    html += '</tbody></table>';
    elements.numericStats.innerHTML = html;
}

/**
 * Display categorical statistics
 * @param {Object} stats - Categorical statistics object
 */
function displayCategoricalStats(stats) {
    const columns = Object.keys(stats);
    
    if (columns.length === 0) {
        elements.categoricalStatsContainer.classList.add('hidden');
        return;
    }
    
    elements.categoricalStatsContainer.classList.remove('hidden');
    
    let html = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>Column</th>
                    <th>Unique Values</th>
                    <th>Most Common</th>
                    <th>Count</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    for (const [col, colStats] of Object.entries(stats)) {
        html += `
            <tr>
                <td><strong>${col}</strong></td>
                <td>${colStats.unique_count}</td>
                <td>${colStats.most_common || 'N/A'}</td>
                <td>${formatNumber(colStats.most_common_count)}</td>
            </tr>
        `;
    }
    
    html += '</tbody></table>';
    elements.categoricalStats.innerHTML = html;
}

/**
 * Update chart buttons based on available charts
 * @param {Object} availableCharts - Object mapping chart types to availability
 */
function updateChartButtons(availableCharts) {
    elements.chartButtons.forEach(btn => {
        const chartType = btn.dataset.chart;
        if (!availableCharts[chartType]) {
            btn.disabled = true;
            btn.title = 'Not enough data for this chart type';
        } else {
            btn.disabled = false;
            btn.title = '';
        }
    });
}

// ============================================
// Visualization
// ============================================

/**
 * Load and display a chart
 * @param {string} chartType - Type of chart to load
 */
async function loadChart(chartType) {
    if (!dataLoaded) {
        showError('Please upload a CSV file first.');
        return;
    }
    
    showLoading();
    currentChart = chartType;
    
    // Update active button
    elements.chartButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.chart === chartType);
    });
    
    try {
        const response = await fetch(`${API_BASE}/visualize?chart=${chartType}`);
        const result = await response.json();
        
        if (result.success) {
            // Parse and render the Plotly chart
            const chartData = JSON.parse(result.chart_json);
            
            // Configure responsive layout
            chartData.layout = {
                ...chartData.layout,
                autosize: true,
                margin: { l: 50, r: 30, t: 50, b: 50 }
            };
            
            // Render chart
            Plotly.react('chart', chartData.data, chartData.layout, {
                responsive: true,
                displayModeBar: true,
                displaylogo: false
            });
        } else {
            showError(result.error || 'Failed to generate chart.');
            elements.chartContainer.innerHTML = `
                <div class="chart-placeholder">
                    <p>Unable to generate ${chartType} chart. ${result.error || ''}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Chart error:', error);
        showError('Failed to load chart. Please try again.');
    } finally {
        hideLoading();
    }
}

// Add click handlers to chart buttons
elements.chartButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        loadChart(this.dataset.chart);
    });
});

// ============================================
// Forecasting
// ============================================

/**
 * Generate and display forecast
 */
async function generateForecast() {
    if (!dataLoaded) {
        showError('Please upload a CSV file first.');
        return;
    }
    
    const periods = elements.periodsInput.value || 5;
    
    showLoading();
    elements.forecastBtn.disabled = true;
    elements.forecastBtn.textContent = 'Generating...';
    
    try {
        const response = await fetch(`${API_BASE}/forecast?periods=${periods}`);
        const result = await response.json();
        
        if (result.success) {
            displayForecastResults(result);
        } else {
            showError(result.error || 'Forecasting failed.');
            elements.forecastResults.innerHTML = `
                <p style="color: var(--error-color);">
                    ⚠️ ${result.error || 'Unable to generate forecast.'}
                </p>
            `;
            elements.forecastChart.innerHTML = '';
        }
    } catch (error) {
        console.error('Forecast error:', error);
        showError('Failed to generate forecast. Please try again.');
    } finally {
        hideLoading();
        elements.forecastBtn.disabled = false;
        elements.forecastBtn.textContent = 'Generate Forecast';
    }
}

/**
 * Display forecast results
 * @param {Object} result - Forecast result data
 */
function displayForecastResults(result) {
    // Display model info
    let html = `
        <h4>📈 Forecast for ${result.value_column}</h4>
        <p><strong>Date Column:</strong> ${result.date_column}</p>
        <p><strong>Model R² Score:</strong> ${(result.model.r_squared * 100).toFixed(2)}% 
            <span style="color: var(--text-light);">(Higher is better fit)</span></p>
        <p><strong>Trend:</strong> ${result.model.interpretation}</p>
        
        <h4 style="margin-top: 20px;">🔮 Predicted Values</h4>
        <table class="forecast-table">
            <thead>
                <tr>
                    <th>Period</th>
                    <th>Date</th>
                    <th>Predicted Value</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    result.forecast.forEach(item => {
        html += `
            <tr>
                <td>${item.period}</td>
                <td>${new Date(item.date).toLocaleDateString()}</td>
                <td>${formatNumber(item.predicted)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    elements.forecastResults.innerHTML = html;
    
    // Create forecast chart
    createForecastChart(result);
}

/**
 * Create forecast chart using Plotly
 * @param {Object} result - Forecast result data
 */
function createForecastChart(result) {
    // Historical data
    const historicalDates = result.historical.map(h => h.date);
    const historicalActual = result.historical.map(h => h.actual);
    const historicalPredicted = result.historical.map(h => h.predicted);
    
    // Forecast data
    const forecastDates = result.forecast.map(f => f.date);
    const forecastPredicted = result.forecast.map(f => f.predicted);
    
    // Traces
    const traces = [
        {
            x: historicalDates,
            y: historicalActual,
            mode: 'lines+markers',
            name: 'Actual',
            line: { color: '#4a90d9' }
        },
        {
            x: historicalDates,
            y: historicalPredicted,
            mode: 'lines',
            name: 'Fitted',
            line: { color: '#28a745', dash: 'dot' }
        },
        {
            x: forecastDates,
            y: forecastPredicted,
            mode: 'lines+markers',
            name: 'Forecast',
            line: { color: '#dc3545' },
            marker: { symbol: 'star', size: 10 }
        }
    ];
    
    const layout = {
        title: `Forecast for ${result.value_column}`,
        xaxis: { title: 'Date' },
        yaxis: { title: result.value_column },
        template: 'plotly_white',
        showlegend: true,
        legend: { orientation: 'h', y: -0.2 },
        autosize: true
    };
    
    Plotly.react('forecast-chart', traces, layout, {
        responsive: true,
        displayModeBar: true,
        displaylogo: false
    });
}

// Add click handler to forecast button
elements.forecastBtn.addEventListener('click', generateForecast);

// ============================================
// Initialization
// ============================================

/**
 * Initialize the dashboard
 */
function init() {
    console.log('Interactive Data Analytics Dashboard initialized');
    
    // Check if data is already loaded (e.g., after page refresh)
    fetch(`${API_BASE}/status`)
        .then(response => response.json())
        .then(result => {
            if (result.data_loaded) {
                dataLoaded = true;
                showSuccess(`Data loaded: ${result.filename} (${formatNumber(result.row_count)} rows)`);
                fetchAnalysis();
                loadChart('line');
            }
        })
        .catch(error => {
            console.log('No existing data loaded');
        });
}

// Run initialization when DOM is ready
document.addEventListener('DOMContentLoaded', init);
