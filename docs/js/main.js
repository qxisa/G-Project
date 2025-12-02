/**
 * main.js - Main JavaScript for Interactive Data Analytics Dashboard
 * 
 * Client-side version that runs entirely in the browser without a backend.
 * This script handles all frontend interactions including:
 * - CSV file upload and processing
 * - Data analysis display
 * - Chart generation and switching
 * - Forecasting
 * - Error handling and notifications
 */

// ============================================
// Constants
// ============================================

const DEFAULT_FORECAST_PERIODS = 5;
const MAX_FORECAST_PERIODS = 30;
const MIN_FORECAST_PERIODS = 1;

// ============================================
// Global Variables
// ============================================

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
    xColumnSelect: document.getElementById('x-column-select'),
    yColumnSelect: document.getElementById('y-column-select'),
    updateChartBtn: document.getElementById('update-chart-btn'),
    exportChartBtn: document.getElementById('export-chart-btn'),
    
    // Forecast section
    forecastSection: document.getElementById('forecast-section'),
    forecastColumnSelect: document.getElementById('forecast-column-select'),
    periodsInput: document.getElementById('periods-input'),
    forecastBtn: document.getElementById('forecast-btn'),
    exportForecastBtn: document.getElementById('export-forecast-btn'),
    forecastResults: document.getElementById('forecast-results'),
    forecastChart: document.getElementById('forecast-chart'),
    
    // AI Summary section
    aiSummarySection: document.getElementById('ai-summary-section'),
    aiColumnsSelect: document.getElementById('ai-columns-select'),
    generateAiSummaryBtn: document.getElementById('generate-ai-summary-btn'),
    aiSummaryResults: document.getElementById('ai-summary-results'),
    aiSummaryContent: document.getElementById('ai-summary-content'),
    hfApiKey: document.getElementById('hf-api-key'),
    saveApiKeyBtn: document.getElementById('save-api-key-btn'),
    clearApiKeyBtn: document.getElementById('clear-api-key-btn'),
    apiKeyStatus: document.getElementById('api-key-status')
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

/**
 * Populate column select dropdowns
 * @param {Object} columnTypes - Object containing column types
 */
function populateColumnSelects(columnTypes) {
    const allColumns = [
        ...(columnTypes.numeric || []),
        ...(columnTypes.categorical || []),
        ...(columnTypes.date || [])
    ];
    
    // Populate X-axis select
    elements.xColumnSelect.innerHTML = '<option value="">Auto Select</option>';
    allColumns.forEach(col => {
        const option = document.createElement('option');
        option.value = col;
        option.textContent = col;
        elements.xColumnSelect.appendChild(option);
    });
    
    // Populate Y-axis select (numeric only)
    elements.yColumnSelect.innerHTML = '<option value="">Auto Select</option>';
    (columnTypes.numeric || []).forEach(col => {
        const option = document.createElement('option');
        option.value = col;
        option.textContent = col;
        elements.yColumnSelect.appendChild(option);
    });
    
    // Populate forecast column select (numeric only)
    elements.forecastColumnSelect.innerHTML = '<option value="">Auto Select</option>';
    (columnTypes.numeric || []).forEach(col => {
        const option = document.createElement('option');
        option.value = col;
        option.textContent = col;
        elements.forecastColumnSelect.appendChild(option);
    });
    
    // Populate AI columns select (all columns)
    elements.aiColumnsSelect.innerHTML = '';
    allColumns.forEach(col => {
        const option = document.createElement('option');
        option.value = col;
        option.textContent = col;
        elements.aiColumnsSelect.appendChild(option);
    });
}

/**
 * Export chart as image
 */
async function exportChart() {
    try {
        showLoading();
        const chartDiv = document.getElementById('chart');
        
        // Use Plotly's built-in image export
        const imgData = await Plotly.toImage(chartDiv, {
            format: 'png',
            width: 1200,
            height: 800
        });
        
        // Create download link
        const link = document.createElement('a');
        link.download = `chart-${currentChart}-${new Date().getTime()}.png`;
        link.href = imgData;
        link.click();
        
        showSuccess('Chart exported successfully!');
    } catch (error) {
        console.error('Export error:', error);
        showError('Failed to export chart. Please try again.');
    } finally {
        hideLoading();
    }
}

/**
 * Export forecast as image
 */
async function exportForecast() {
    try {
        showLoading();
        const forecastDiv = document.getElementById('forecast-chart');
        
        // Use Plotly's built-in image export
        const imgData = await Plotly.toImage(forecastDiv, {
            format: 'png',
            width: 1200,
            height: 800
        });
        
        // Create download link
        const link = document.createElement('a');
        link.download = `forecast-${new Date().getTime()}.png`;
        link.href = imgData;
        link.click();
        
        showSuccess('Forecast exported successfully!');
    } catch (error) {
        console.error('Export error:', error);
        showError('Failed to export forecast. Please try again.');
    } finally {
        hideLoading();
    }
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
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showError('Invalid file type. Only CSV files are supported.');
        return;
    }
    
    // Show loading state
    hideAlerts();
    showLoading();
    elements.uploadBtn.disabled = true;
    elements.uploadBtn.textContent = 'Processing...';
    
    try {
        // Process the CSV file
        const result = await DataProcessor.processCSVFile(file);
        
        if (result.success) {
            showSuccess(result.message);
            dataLoaded = true;
            
            // Perform analysis and display
            performAnalysis();
            
            // Load initial chart
            loadChart('line');
        } else {
            showError(result.error || 'Processing failed. Please try again.');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showError(error.message || 'Error processing file. Please try again.');
    } finally {
        hideLoading();
        elements.uploadBtn.disabled = !elements.fileInput.files[0];
        elements.uploadBtn.textContent = 'Upload & Analyze';
    }
});

// ============================================
// Data Analysis
// ============================================

/**
 * Perform data analysis and display results
 */
function performAnalysis() {
    if (!DataProcessor.isDataLoaded()) {
        showError('No data available. Please upload a CSV file first.');
        return;
    }
    
    const data = DataProcessor.getData();
    const columnTypes = DataProcessor.getColumnTypes();
    
    // Compute summary statistics
    const summary = Analysis.computeSummary(data, columnTypes);
    
    // Generate quick insights
    const insights = Analysis.getQuickInsights(summary);
    
    // Get available chart types
    const availableCharts = Analysis.getAvailableCharts(columnTypes);
    
    // Display everything
    displaySummary({
        summary,
        insights,
        available_charts: availableCharts
    });
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
    
    // Filter and display only helpful insights (limit to top 6)
    const filteredInsights = filterHelpfulInsights(insights);
    displayInsights(filteredInsights);
    
    // Display numeric statistics
    displayNumericStats(summary.numeric_stats);
    
    // Display categorical statistics
    displayCategoricalStats(summary.categorical_stats);
    
    // Update available chart buttons
    updateChartButtons(available_charts);
    
    // Populate column selects
    populateColumnSelects(summary.column_types);
    
    // Show visualization section
    elements.vizSection.classList.remove('hidden');
    
    // Show forecast section only if date columns exist
    if (summary.column_types.date.length > 0) {
        elements.forecastSection.classList.remove('hidden');
    } else {
        elements.forecastSection.classList.add('hidden');
    }
    
    // Always show AI summary section
    elements.aiSummarySection.classList.remove('hidden');
}

/**
 * Filter insights to show only the most helpful ones
 * @param {Array} insights - List of all insights
 * @returns {Array} Filtered list of helpful insights
 */
function filterHelpfulInsights(insights) {
    // Limit insights to most important ones
    const filteredInsights = [];
    
    // Add dataset overview
    if (insights.length > 0) {
        filteredInsights.push(insights[0]); // Dataset size info
    }
    
    // Add numeric insights for only the first 2-3 numeric columns
    const numericInsights = insights.filter(i => i.includes('ranges from') || i.includes('avg:'));
    filteredInsights.push(...numericInsights.slice(0, 3));
    
    // Add period insights (best/worst)
    const periodInsights = insights.filter(i => i.includes('Best '));
    filteredInsights.push(...periodInsights.slice(0, 2));
    
    return filteredInsights.slice(0, 6); // Max 6 insights
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
    // Filter out ID columns from display
    const filteredStats = Object.entries(stats).filter(([col, colStats]) => !colStats.isIdColumn);
    
    if (filteredStats.length === 0) {
        elements.numericStats.innerHTML = '<p>No meaningful numeric columns found.</p>';
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
    
    for (const [col, colStats] of filteredStats) {
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
function loadChart(chartType) {
    if (!DataProcessor.isDataLoaded()) {
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
        const data = DataProcessor.getData();
        const columnTypes = DataProcessor.getColumnTypes();
        
        // Get selected columns from dropdowns
        const xCol = elements.xColumnSelect.value || null;
        const yCol = elements.yColumnSelect.value || null;
        
        const result = Charts.generateChart(chartType, data, columnTypes, xCol, yCol);
        
        if (result.success) {
            // Configure responsive layout
            result.chartData.layout = {
                ...result.chartData.layout,
                autosize: true,
                margin: { l: 50, r: 30, t: 50, b: 50 }
            };
            
            // Render chart
            Plotly.react('chart', result.chartData.data, result.chartData.layout, {
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

// Add click handler to update chart button
elements.updateChartBtn.addEventListener('click', function() {
    loadChart(currentChart);
});

// Add click handler to export chart button
elements.exportChartBtn.addEventListener('click', exportChart);

// ============================================
// Forecasting
// ============================================

/**
 * Generate and display forecast
 */
function generateForecast() {
    if (!DataProcessor.isDataLoaded()) {
        showError('Please upload a CSV file first.');
        return;
    }
    
    let periods = parseInt(elements.periodsInput.value) || DEFAULT_FORECAST_PERIODS;
    periods = Math.max(MIN_FORECAST_PERIODS, Math.min(periods, MAX_FORECAST_PERIODS));
    
    // Get selected column
    const selectedColumn = elements.forecastColumnSelect.value || null;
    
    showLoading();
    elements.forecastBtn.disabled = true;
    elements.forecastBtn.textContent = 'Generating...';
    
    try {
        const data = DataProcessor.getData();
        const columnTypes = DataProcessor.getColumnTypes();
        
        const result = Forecast.simpleForecast(data, columnTypes, periods, selectedColumn);
        
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

// Add click handler to export forecast button
elements.exportForecastBtn.addEventListener('click', exportForecast);

// ============================================
// AI Summary Functions
// ============================================

/**
 * Handle API key save
 */
function handleSaveApiKey() {
    const apiKey = elements.hfApiKey.value.trim();
    
    if (!apiKey) {
        elements.apiKeyStatus.textContent = '⚠️ Please enter an API key';
        elements.apiKeyStatus.className = 'api-key-status error';
        return;
    }
    
    if (AISummary.saveApiKey(apiKey)) {
        elements.apiKeyStatus.textContent = '✅ API key saved successfully!';
        elements.apiKeyStatus.className = 'api-key-status success';
        elements.hfApiKey.value = '';
    } else {
        elements.apiKeyStatus.textContent = '❌ Failed to save API key';
        elements.apiKeyStatus.className = 'api-key-status error';
    }
}

/**
 * Handle API key clear
 */
function handleClearApiKey() {
    if (AISummary.clearApiKey()) {
        elements.apiKeyStatus.textContent = '🗑️ API key cleared';
        elements.apiKeyStatus.className = 'api-key-status';
        elements.hfApiKey.value = '';
    }
}

/**
 * Generate AI summary
 */
async function handleGenerateAISummary() {
    if (!DataProcessor.isDataLoaded()) {
        showError('Please upload a CSV file first.');
        return;
    }
    
    // Get selected columns
    const selectedOptions = Array.from(elements.aiColumnsSelect.selectedOptions);
    const selectedColumns = selectedOptions.map(opt => opt.value);
    
    if (selectedColumns.length === 0) {
        showError('Please select at least one column to analyze.');
        return;
    }
    
    // Check if API key is set
    if (!AISummary.hasApiKey()) {
        showError('Please enter your Hugging Face API key first.');
        return;
    }
    
    showLoading();
    elements.generateAiSummaryBtn.disabled = true;
    elements.generateAiSummaryBtn.textContent = '⏳ Generating Insights...';
    
    try {
        const data = DataProcessor.getData();
        const columnTypes = DataProcessor.getColumnTypes();
        
        const result = await AISummary.generateAISummary(data, selectedColumns, columnTypes);
        
        if (result.success) {
            displayAISummaryResults(result);
            showSuccess('AI insights generated successfully!');
        } else {
            // Try fallback to simple summary
            if (result.error.includes('model is currently loading') || result.error.includes('API')) {
                showError(result.error + ' Using statistical summary instead...');
                const fallbackResult = AISummary.generateSimpleSummary(data, selectedColumns, columnTypes);
                displayAISummaryResults(fallbackResult);
            } else {
                showError(result.error);
            }
        }
    } catch (error) {
        console.error('AI Summary Error:', error);
        showError('Failed to generate AI summary. Please try again.');
    } finally {
        hideLoading();
        elements.generateAiSummaryBtn.disabled = false;
        elements.generateAiSummaryBtn.textContent = '🔍 Generate AI Insights';
    }
}

/**
 * Display AI summary results
 * @param {Object} result - AI summary result
 */
function displayAISummaryResults(result) {
    elements.aiSummaryResults.classList.remove('hidden');
    
    let html = '';
    
    if (result.is_fallback) {
        html += '<div style="background: rgba(255, 193, 7, 0.1); padding: 10px; border-radius: 5px; margin-bottom: 15px;">';
        html += '⚠️ <strong>Note:</strong> Using statistical analysis. For AI-powered insights, ensure your API key is valid and the model is loaded.';
        html += '</div>';
    }
    
    html += `<p><strong>Columns Analyzed:</strong> ${result.columns_analyzed.join(', ')}</p>`;
    html += '<hr style="margin: 15px 0; border: none; border-top: 1px solid var(--border-color);">';
    
    // Format the summary text
    const summaryText = result.summary.replace(/\n/g, '<br>');
    html += `<div style="line-height: 1.8;">${summaryText}</div>`;
    
    elements.aiSummaryContent.innerHTML = html;
}

// Add click handlers for AI summary
elements.saveApiKeyBtn.addEventListener('click', handleSaveApiKey);
elements.clearApiKeyBtn.addEventListener('click', handleClearApiKey);
elements.generateAiSummaryBtn.addEventListener('click', handleGenerateAISummary);

// ============================================
// Initialization
// ============================================

/**
 * Initialize the dashboard
 */
function init() {
    console.log('Interactive Data Analytics Dashboard initialized (Static Version)');
    console.log('Running entirely in the browser - no backend required!');
    
    // Check if API key is stored and show status
    if (AISummary.hasApiKey()) {
        elements.apiKeyStatus.textContent = '✅ API key is configured';
        elements.apiKeyStatus.className = 'api-key-status success';
    }
}

// Run initialization when DOM is ready
document.addEventListener('DOMContentLoaded', init);
