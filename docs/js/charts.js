/**
 * charts.js - Client-side Visualization Module
 * 
 * This module provides functions for generating Plotly charts.
 * Converted from the Python backend visualization/charts.py module.
 */

// ============================================
// Constants
// ============================================

const MAX_CHART_CATEGORIES = 30;
const MAX_COLOR_CATEGORIES = 10;

// ============================================
// Line Chart
// ============================================

/**
 * Generate a line chart
 * @param {Array} data - Data array
 * @param {Object} columnTypes - Column types
 * @param {string} xCol - X column (optional)
 * @param {string} yCol - Y column (optional)
 * @returns {Object} Plotly data and layout
 */
function generateLineChart(data, columnTypes, xCol = null, yCol = null) {
    // Auto-select X column (prefer date)
    if (!xCol) {
        if (columnTypes.date.length > 0) {
            xCol = columnTypes.date[0];
        } else {
            xCol = '_index';
        }
    }
    
    // Auto-select Y column (first numeric)
    if (!yCol) {
        if (columnTypes.numeric.length > 0) {
            yCol = columnTypes.numeric[0];
        } else {
            throw new Error('No numeric column available for Y axis');
        }
    }
    
    // Prepare data - sort by x if date
    let sortedData = [...data];
    if (columnTypes.date.includes(xCol)) {
        sortedData.sort((a, b) => {
            const dateA = a[xCol] instanceof Date ? a[xCol] : new Date(a[xCol]);
            const dateB = b[xCol] instanceof Date ? b[xCol] : new Date(b[xCol]);
            return dateA - dateB;
        });
    }
    
    const xValues = xCol === '_index' 
        ? sortedData.map((_, i) => i)
        : sortedData.map(row => {
            const val = row[xCol];
            return val instanceof Date ? val.toISOString().split('T')[0] : val;
        });
    const yValues = sortedData.map(row => row[yCol]);
    
    const traces = [{
        x: xValues,
        y: yValues,
        mode: 'lines+markers',
        type: 'scatter',
        name: formatColumnName(yCol),
        line: { color: '#4a90d9' },
        marker: { size: 6 }
    }];
    
    const layout = {
        title: 'Line Chart',
        template: 'plotly_white',
        hovermode: 'x unified',
        xaxis: { title: formatColumnName(xCol === '_index' ? 'Index' : xCol) },
        yaxis: { title: formatColumnName(yCol) }
    };
    
    return { data: traces, layout };
}

// ============================================
// Bar Chart
// ============================================

/**
 * Generate a bar chart
 * @param {Array} data - Data array
 * @param {Object} columnTypes - Column types
 * @param {string} xCol - X column (optional)
 * @param {string} yCol - Y column (optional)
 * @returns {Object} Plotly data and layout
 */
function generateBarChart(data, columnTypes, xCol = null, yCol = null) {
    // Auto-select X column (prefer categorical)
    if (!xCol) {
        if (columnTypes.categorical.length > 0) {
            xCol = columnTypes.categorical[0];
        } else if (columnTypes.date.length > 0) {
            xCol = columnTypes.date[0];
        } else {
            xCol = '_index';
        }
    }
    
    // Auto-select Y column
    if (!yCol) {
        if (columnTypes.numeric.length > 0) {
            yCol = columnTypes.numeric[0];
        } else {
            throw new Error('No numeric column available for Y axis');
        }
    }
    
    let xValues, yValues;
    
    // Aggregate if categorical
    if (columnTypes.categorical.includes(xCol)) {
        const aggregated = {};
        data.forEach(row => {
            const key = row[xCol];
            if (key !== null && key !== undefined && key !== '') {
                aggregated[key] = (aggregated[key] || 0) + (row[yCol] || 0);
            }
        });
        
        // Sort by value and limit categories
        const entries = Object.entries(aggregated).sort((a, b) => b[1] - a[1]);
        const limited = entries.slice(0, MAX_CHART_CATEGORIES);
        
        xValues = limited.map(e => e[0]);
        yValues = limited.map(e => e[1]);
    } else {
        xValues = xCol === '_index' ? data.map((_, i) => i) : data.map(row => {
            const val = row[xCol];
            return val instanceof Date ? val.toISOString().split('T')[0] : val;
        });
        yValues = data.map(row => row[yCol]);
    }
    
    const traces = [{
        x: xValues,
        y: yValues,
        type: 'bar',
        marker: { color: '#4a90d9' }
    }];
    
    const layout = {
        title: 'Bar Chart',
        template: 'plotly_white',
        xaxis: { 
            title: formatColumnName(xCol === '_index' ? 'Index' : xCol),
            tickangle: -45
        },
        yaxis: { title: formatColumnName(yCol) }
    };
    
    return { data: traces, layout };
}

// ============================================
// Histogram
// ============================================

/**
 * Generate a histogram
 * @param {Array} data - Data array
 * @param {Object} columnTypes - Column types
 * @param {string} col - Column name (optional)
 * @returns {Object} Plotly data and layout
 */
function generateHistogram(data, columnTypes, col = null) {
    // Auto-select column (first numeric)
    if (!col) {
        if (columnTypes.numeric.length > 0) {
            col = columnTypes.numeric[0];
        } else {
            throw new Error('No numeric column available for histogram');
        }
    }
    
    const values = data.map(row => row[col]).filter(v => v !== null && !isNaN(v));
    
    const traces = [{
        x: values,
        type: 'histogram',
        nbinsx: 30,
        marker: { 
            color: '#4a90d9',
            line: { color: '#357abd', width: 1 }
        }
    }];
    
    const layout = {
        title: 'Histogram',
        template: 'plotly_white',
        bargap: 0.1,
        xaxis: { title: formatColumnName(col) },
        yaxis: { title: 'Frequency' }
    };
    
    return { data: traces, layout };
}

// ============================================
// Scatter Plot
// ============================================

/**
 * Generate a scatter plot
 * @param {Array} data - Data array
 * @param {Object} columnTypes - Column types
 * @param {string} xCol - X column (optional)
 * @param {string} yCol - Y column (optional)
 * @returns {Object} Plotly data and layout
 */
function generateScatterPlot(data, columnTypes, xCol = null, yCol = null) {
    if (columnTypes.numeric.length < 2) {
        throw new Error('Scatter plot requires at least 2 numeric columns');
    }
    
    // Auto-select columns
    if (!xCol) xCol = columnTypes.numeric[0];
    if (!yCol) yCol = columnTypes.numeric[1];
    
    const xValues = data.map(row => row[xCol]);
    const yValues = data.map(row => row[yCol]);
    
    // Try to find a categorical column for color
    let colorValues = null;
    if (columnTypes.categorical.length > 0) {
        const colorCol = columnTypes.categorical[0];
        const uniqueValues = [...new Set(data.map(row => row[colorCol]))];
        if (uniqueValues.length <= MAX_COLOR_CATEGORIES) {
            colorValues = data.map(row => row[colorCol]);
        }
    }
    
    const traces = [{
        x: xValues,
        y: yValues,
        mode: 'markers',
        type: 'scatter',
        marker: { 
            size: 8, 
            opacity: 0.7,
            color: colorValues || '#4a90d9'
        },
        text: colorValues
    }];
    
    const layout = {
        title: 'Scatter Plot',
        template: 'plotly_white',
        xaxis: { title: formatColumnName(xCol) },
        yaxis: { title: formatColumnName(yCol) }
    };
    
    return { data: traces, layout };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format column name for display
 * @param {string} col - Column name
 * @returns {string}
 */
function formatColumnName(col) {
    return col
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Main chart generation function
 * @param {string} chartType - Type of chart
 * @param {Array} data - Data array
 * @param {Object} columnTypes - Column types
 * @param {string} xCol - X column (optional)
 * @param {string} yCol - Y column (optional)
 * @returns {Object} Result with success status and chart data
 */
function generateChart(chartType, data, columnTypes, xCol = null, yCol = null) {
    try {
        let chartData;
        
        switch (chartType) {
            case 'line':
                chartData = generateLineChart(data, columnTypes, xCol, yCol);
                break;
            case 'bar':
                chartData = generateBarChart(data, columnTypes, xCol, yCol);
                break;
            case 'histogram':
                chartData = generateHistogram(data, columnTypes, xCol);
                break;
            case 'scatter':
                chartData = generateScatterPlot(data, columnTypes, xCol, yCol);
                break;
            default:
                return { success: false, error: `Unknown chart type: ${chartType}` };
        }
        
        return {
            success: true,
            chart_type: chartType,
            chartData: chartData
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Export functions
window.Charts = {
    generateChart,
    generateLineChart,
    generateBarChart,
    generateHistogram,
    generateScatterPlot
};
