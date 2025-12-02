/**
 * analysis.js - Client-side Data Analysis Module
 * 
 * This module provides functions for computing summary statistics and insights.
 * Converted from the Python backend analysis.py module.
 */

// ============================================
// Statistical Functions
// ============================================

/**
 * Calculate mean of an array
 * @param {Array} arr - Array of numbers
 * @returns {number}
 */
function mean(arr) {
    const validValues = arr.filter(v => v !== null && !isNaN(v));
    if (validValues.length === 0) return 0;
    return validValues.reduce((a, b) => a + b, 0) / validValues.length;
}

/**
 * Calculate median of an array
 * @param {Array} arr - Array of numbers
 * @returns {number}
 */
function calculateMedian(arr) {
    const sorted = arr.filter(v => v !== null && !isNaN(v)).sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate standard deviation
 * @param {Array} arr - Array of numbers
 * @returns {number}
 */
function stdDev(arr) {
    const validValues = arr.filter(v => v !== null && !isNaN(v));
    if (validValues.length < 2) return 0;
    const avg = mean(validValues);
    const squareDiffs = validValues.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / (validValues.length - 1));
}

/**
 * Count occurrences in array
 * @param {Array} arr - Array of values
 * @returns {Object}
 */
function valueCounts(arr) {
    const counts = {};
    arr.forEach(val => {
        if (val !== null && val !== undefined && val !== '') {
            const key = String(val);
            counts[key] = (counts[key] || 0) + 1;
        }
    });
    return counts;
}

// ============================================
// Numeric Statistics
// ============================================

/**
 * Check if a column name suggests it's an ID column
 * @param {string} colName - Column name
 * @returns {boolean}
 */
function isIdColumn(colName) {
    const lowerName = colName.toLowerCase();
    // Check for common ID patterns
    return lowerName === 'id' || 
           lowerName.endsWith('_id') || 
           lowerName.endsWith('id') ||
           lowerName.startsWith('id_') ||
           lowerName === 'index' ||
           lowerName === 'idx' ||
           lowerName === 'row_number' ||
           lowerName === 'rownumber' ||
           lowerName === 'row' ||
           lowerName === 'key' ||
           lowerName.endsWith('_key') ||
           lowerName.endsWith('_idx');
}

/**
 * Check if a numeric column appears to be an ID based on its values
 * @param {Array} data - Array of row objects
 * @param {string} colName - Column name
 * @returns {boolean}
 */
function isSequentialId(data, colName) {
    if (data.length < 2) return false;
    
    const values = data.map(row => row[colName]).filter(v => v !== null && !isNaN(v));
    if (values.length < 2) return false;
    
    // First check: if column name suggests ID, be more lenient
    if (isIdColumn(colName)) {
        return true; // Rely on name-based detection
    }
    
    // Check if all values are integers
    const allIntegers = values.every(v => Number.isInteger(v));
    if (!allIntegers) return false; // Non-integers are not IDs
    
    // Check if values are sequential integers starting from 0 or 1
    const sorted = [...values].sort((a, b) => a - b);
    let isSequential = true;
    
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] - sorted[i-1] !== 1) {
            isSequential = false;
            break;
        }
    }
    
    // If sequential starting from 0 or 1, it's likely an ID
    if (isSequential && (sorted[0] === 0 || sorted[0] === 1)) {
        return true;
    }
    
    return false; // Otherwise, not an ID
}

/**
 * Determine if a column should be featured/displayed to users
 * @param {string} colName - Column name
 * @param {Array} data - Array of row objects
 * @param {Object} stats - Column statistics
 * @returns {boolean}
 */
function shouldFeatureColumn(colName, data, stats) {
    // Don't feature ID columns
    if (isIdColumn(colName)) return false;
    
    // Don't feature sequential IDs
    if (stats && isSequentialId(data, colName)) return false;
    
    // Feature columns with meaningful variance
    if (stats && stats.std !== undefined) {
        // If standard deviation is 0 or very low, data is not interesting
        if (stats.std === 0) return false;
        
        // If coefficient of variation is very low, might not be interesting
        // (unless the mean is also very low)
        if (stats.mean !== 0 && Math.abs(stats.std / stats.mean) < 0.01 && Math.abs(stats.mean) > 1) {
            return false;
        }
    }
    
    return true;
}

/**
 * Compute summary statistics for numeric columns
 * @param {Array} data - Array of row objects
 * @param {Array} numericCols - List of numeric column names
 * @returns {Object}
 */
function computeNumericStats(data, numericCols) {
    const stats = {};
    
    numericCols.forEach(col => {
        const values = data.map(row => row[col]).filter(v => v !== null && !isNaN(v));
        
        if (values.length > 0) {
            const colStats = {
                mean: Math.round(mean(values) * 100) / 100,
                median: Math.round(calculateMedian(values) * 100) / 100,
                std: Math.round(stdDev(values) * 100) / 100,
                min: Math.round(Math.min(...values) * 100) / 100,
                max: Math.round(Math.max(...values) * 100) / 100,
                count: values.length,
                sum: Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100,
                isIdColumn: isIdColumn(col) || isSequentialId(data, col)
            };
            
            // Only include columns that should be featured
            stats[col] = colStats;
        }
    });
    
    return stats;
}

// ============================================
// Categorical Statistics
// ============================================

/**
 * Compute summary statistics for categorical columns
 * @param {Array} data - Array of row objects
 * @param {Array} categoricalCols - List of categorical column names
 * @returns {Object}
 */
function computeCategoricalStats(data, categoricalCols) {
    const stats = {};
    
    categoricalCols.forEach(col => {
        const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
        
        if (values.length > 0) {
            const counts = valueCounts(values);
            const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            const uniqueCount = Object.keys(counts).length;
            
            // Skip if it looks like an ID column (very high unique count)
            const isLikelyId = isIdColumn(col) || uniqueCount / values.length > 0.95;
            
            if (!isLikelyId) {
                stats[col] = {
                    unique_count: uniqueCount,
                    most_common: sortedEntries.length > 0 ? sortedEntries[0][0] : null,
                    most_common_count: sortedEntries.length > 0 ? sortedEntries[0][1] : 0,
                    top_values: Object.fromEntries(sortedEntries.slice(0, 10))
                };
            }
        }
    });
    
    return stats;
}

// ============================================
// Period Analysis
// ============================================

/**
 * Analyze performance across date periods
 * @param {Array} data - Array of row objects
 * @param {Array} dateCols - List of date column names
 * @param {Array} numericCols - List of numeric column names
 * @returns {Object}
 */
function analyzeDatePeriods(data, dateCols, numericCols) {
    const periodAnalysis = {};
    
    if (!dateCols.length || !numericCols.length) {
        return periodAnalysis;
    }
    
    const dateCol = dateCols[0];
    
    numericCols.forEach(numCol => {
        const validData = data.filter(row => 
            row[dateCol] !== null && row[numCol] !== null && !isNaN(row[numCol])
        );
        
        if (validData.length === 0) return;
        
        // Find best and worst
        let bestRow = validData[0];
        let worstRow = validData[0];
        
        validData.forEach(row => {
            if (row[numCol] > bestRow[numCol]) bestRow = row;
            if (row[numCol] < worstRow[numCol]) worstRow = row;
        });
        
        periodAnalysis[numCol] = {
            best_period: {
                date: bestRow[dateCol] instanceof Date ? bestRow[dateCol].toISOString() : String(bestRow[dateCol]),
                value: Math.round(bestRow[numCol] * 100) / 100
            },
            worst_period: {
                date: worstRow[dateCol] instanceof Date ? worstRow[dateCol].toISOString() : String(worstRow[dateCol]),
                value: Math.round(worstRow[numCol] * 100) / 100
            }
        };
    });
    
    return periodAnalysis;
}

// ============================================
// Correlations
// ============================================

/**
 * Compute correlation between two arrays
 * @param {Array} x - First array
 * @param {Array} y - Second array
 * @returns {number}
 */
function correlation(x, y) {
    const n = x.length;
    if (n < 2) return 0;
    
    const xMean = mean(x);
    const yMean = mean(y);
    
    let numerator = 0;
    let xSumSq = 0;
    let ySumSq = 0;
    
    for (let i = 0; i < n; i++) {
        const xDiff = x[i] - xMean;
        const yDiff = y[i] - yMean;
        numerator += xDiff * yDiff;
        xSumSq += xDiff * xDiff;
        ySumSq += yDiff * yDiff;
    }
    
    const denominator = Math.sqrt(xSumSq * ySumSq);
    if (denominator === 0) return 0;
    
    return numerator / denominator;
}

/**
 * Compute correlation matrix for numeric columns
 * @param {Array} data - Array of row objects
 * @param {Array} numericCols - List of numeric column names
 * @returns {Object}
 */
function computeCorrelations(data, numericCols) {
    if (numericCols.length < 2) return {};
    
    const correlations = {};
    
    numericCols.forEach(col1 => {
        correlations[col1] = {};
        numericCols.forEach(col2 => {
            const x = data.map(row => row[col1]).filter(v => v !== null && !isNaN(v));
            const y = data.map(row => row[col2]).filter(v => v !== null && !isNaN(v));
            
            // Need aligned values
            const aligned = [];
            data.forEach(row => {
                if (row[col1] !== null && !isNaN(row[col1]) && 
                    row[col2] !== null && !isNaN(row[col2])) {
                    aligned.push({ x: row[col1], y: row[col2] });
                }
            });
            
            const xAligned = aligned.map(p => p.x);
            const yAligned = aligned.map(p => p.y);
            
            correlations[col1][col2] = Math.round(correlation(xAligned, yAligned) * 1000) / 1000;
        });
    });
    
    return correlations;
}

// ============================================
// Main Analysis Function
// ============================================

/**
 * Compute comprehensive summary of the data
 * @param {Array} data - Array of row objects
 * @param {Object} columnTypes - Column types object
 * @returns {Object}
 */
function computeSummary(data, columnTypes) {
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    
    return {
        overview: {
            total_rows: data.length,
            total_columns: columns.length,
            numeric_columns: columnTypes.numeric.length,
            categorical_columns: columnTypes.categorical.length,
            date_columns: columnTypes.date.length,
            column_names: columns
        },
        column_types: columnTypes,
        numeric_stats: computeNumericStats(data, columnTypes.numeric),
        categorical_stats: computeCategoricalStats(data, columnTypes.categorical),
        period_analysis: analyzeDatePeriods(data, columnTypes.date, columnTypes.numeric),
        correlations: computeCorrelations(data, columnTypes.numeric)
    };
}

/**
 * Generate quick human-readable insights
 * @param {Object} summary - Summary object
 * @returns {Array}
 */
function getQuickInsights(summary) {
    const insights = [];
    
    // Overview insight
    const overview = summary.overview || {};
    insights.push(`Dataset contains ${overview.total_rows?.toLocaleString() || 0} rows and ${overview.total_columns || 0} columns`);
    
    // Numeric insights - exclude ID columns
    const numericStats = summary.numeric_stats || {};
    Object.entries(numericStats).forEach(([col, stats]) => {
        // Skip ID columns in insights
        if (!stats.isIdColumn) {
            insights.push(`${col}: ranges from ${stats.min.toLocaleString()} to ${stats.max.toLocaleString()} (avg: ${stats.mean.toLocaleString()})`);
        }
    });
    
    // Best period insights - exclude ID columns
    const periodAnalysis = summary.period_analysis || {};
    Object.entries(periodAnalysis).forEach(([col, periods]) => {
        // Skip ID columns in period analysis
        if (!isIdColumn(col) && periods.best_period) {
            const dateStr = periods.best_period.date;
            const formattedDate = dateStr.includes('T') ? new Date(dateStr).toLocaleDateString() : dateStr;
            insights.push(`Best ${col}: ${periods.best_period.value.toLocaleString()} on ${formattedDate}`);
        }
    });
    
    return insights;
}

/**
 * Determine which chart types are available
 * @param {Object} columnTypes - Column types object
 * @returns {Object}
 */
function getAvailableCharts(columnTypes) {
    const numCount = columnTypes.numeric.length;
    
    return {
        line: numCount >= 1,
        bar: numCount >= 1,
        histogram: numCount >= 1,
        scatter: numCount >= 2
    };
}

// Export functions
window.Analysis = {
    computeSummary,
    getQuickInsights,
    getAvailableCharts
};
