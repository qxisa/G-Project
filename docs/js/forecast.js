/**
 * forecast.js - Client-side Forecasting Module
 * 
 * This module provides simple linear regression forecasting.
 * Converted from the Python backend analysis/forecast.py module.
 */

// ============================================
// Linear Regression
// ============================================

/**
 * Perform simple linear regression
 * @param {Array} X - Independent variable values
 * @param {Array} Y - Dependent variable values
 * @returns {Object} slope and intercept
 */
function linearRegression(X, Y) {
    const n = X.length;
    
    if (n < 2) {
        throw new Error('Need at least 2 data points for regression');
    }
    
    // Calculate means
    const xMean = X.reduce((a, b) => a + b, 0) / n;
    const yMean = Y.reduce((a, b) => a + b, 0) / n;
    
    // Calculate slope and intercept
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
        numerator += (X[i] - xMean) * (Y[i] - yMean);
        denominator += Math.pow(X[i] - xMean, 2);
    }
    
    if (denominator === 0) {
        throw new Error('Cannot compute regression with zero variance in X');
    }
    
    const slope = numerator / denominator;
    const intercept = yMean - slope * xMean;
    
    return { slope, intercept };
}

/**
 * Calculate R-squared (coefficient of determination)
 * @param {Array} yActual - Actual Y values
 * @param {Array} yPredicted - Predicted Y values
 * @returns {number}
 */
function calculateRSquared(yActual, yPredicted) {
    const yMean = yActual.reduce((a, b) => a + b, 0) / yActual.length;
    
    let ssRes = 0;
    let ssTot = 0;
    
    for (let i = 0; i < yActual.length; i++) {
        ssRes += Math.pow(yActual[i] - yPredicted[i], 2);
        ssTot += Math.pow(yActual[i] - yMean, 2);
    }
    
    if (ssTot === 0) return 0;
    
    return 1 - (ssRes / ssTot);
}

// ============================================
// Main Forecast Function
// ============================================

/**
 * Perform simple linear regression forecast
 * @param {Array} data - Data array
 * @param {Object} columnTypes - Column types
 * @param {number} periods - Number of periods to forecast
 * @returns {Object} Forecast result
 */
function simpleForecast(data, columnTypes, periods = 5) {
    // Check for required columns
    if (!columnTypes.date || columnTypes.date.length === 0) {
        return {
            success: false,
            error: 'No date column detected. Forecasting requires a date column.'
        };
    }
    
    if (!columnTypes.numeric || columnTypes.numeric.length === 0) {
        return {
            success: false,
            error: 'No numeric columns detected. Forecasting requires numeric data.'
        };
    }
    
    const dateCol = columnTypes.date[0];
    const valueCol = columnTypes.numeric[0];
    
    try {
        // Prepare data - filter valid rows and sort by date
        const validData = data
            .filter(row => {
                const date = row[dateCol];
                const value = row[valueCol];
                return date !== null && value !== null && !isNaN(value);
            })
            .sort((a, b) => {
                const dateA = a[dateCol] instanceof Date ? a[dateCol] : new Date(a[dateCol]);
                const dateB = b[dateCol] instanceof Date ? b[dateCol] : new Date(b[dateCol]);
                return dateA - dateB;
            });
        
        if (validData.length < 2) {
            return {
                success: false,
                error: 'Not enough data points for forecasting (need at least 2).'
            };
        }
        
        // Convert dates to days from start
        const dates = validData.map(row => {
            const d = row[dateCol];
            return d instanceof Date ? d : new Date(d);
        });
        const startDate = dates[0];
        
        const X = dates.map(d => (d - startDate) / (1000 * 60 * 60 * 24)); // Convert to days
        const Y = validData.map(row => row[valueCol]);
        
        // Perform regression
        const { slope, intercept } = linearRegression(X, Y);
        
        // Calculate predictions for historical data
        const yPredicted = X.map(x => slope * x + intercept);
        const rSquared = calculateRSquared(Y, yPredicted);
        
        // Generate historical data points (last 20)
        const historicalStartIndex = Math.max(0, validData.length - 20);
        const historical = [];
        for (let i = historicalStartIndex; i < validData.length; i++) {
            historical.push({
                date: dates[i].toISOString(),
                actual: Math.round(Y[i] * 100) / 100,
                predicted: Math.round(yPredicted[i] * 100) / 100
            });
        }
        
        // Calculate average interval between data points
        const lastX = X[X.length - 1];
        const avgInterval = X.length > 1 ? (X[X.length - 1] - X[0]) / (X.length - 1) : 1;
        const lastDate = dates[dates.length - 1];
        
        // Generate future forecasts
        const forecast = [];
        for (let i = 1; i <= periods; i++) {
            const futureX = lastX + (avgInterval * i);
            const futureY = slope * futureX + intercept;
            const futureDate = new Date(lastDate.getTime() + avgInterval * i * 24 * 60 * 60 * 1000);
            
            forecast.push({
                date: futureDate.toISOString(),
                predicted: Math.round(futureY * 100) / 100,
                period: i
            });
        }
        
        return {
            success: true,
            date_column: dateCol,
            value_column: valueCol,
            model: {
                slope: Math.round(slope * 10000) / 10000,
                intercept: Math.round(intercept * 10000) / 10000,
                r_squared: Math.round(rSquared * 10000) / 10000,
                interpretation: `For each day, ${valueCol} changes by ${Math.round(slope * 10000) / 10000}`
            },
            historical_count: historical.length,
            historical: historical,
            forecast: forecast
        };
        
    } catch (error) {
        return {
            success: false,
            error: `Forecasting error: ${error.message}`
        };
    }
}

// Export functions
window.Forecast = {
    simpleForecast
};
