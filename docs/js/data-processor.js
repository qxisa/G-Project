/**
 * data-processor.js - Client-side Data Processing Module
 * 
 * This module provides all the data processing functionality that was
 * previously handled by the Python backend. It processes CSV files
 * entirely in the browser using JavaScript.
 */

// ============================================
// Data Store (In-memory storage)
// ============================================

const dataStore = {
    rawData: null,
    processedData: null,
    filename: null,
    uploaded: false,
    columnTypes: null
};

// ============================================
// CSV Parsing
// ============================================

/**
 * Parse CSV string into array of objects
 * @param {string} csvString - Raw CSV content
 * @returns {Array} Array of row objects
 */
function parseCSV(csvString) {
    const lines = csvString.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row');
    }
    
    // Parse header row - handle quoted values
    const headers = parseCSVRow(lines[0]);
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            const values = parseCSVRow(line);
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] !== undefined ? values[index] : '';
            });
            data.push(row);
        }
    }
    
    return data;
}

/**
 * Parse a single CSV row handling quoted values and commas
 * @param {string} row - CSV row string
 * @returns {Array} Array of values
 */
function parseCSVRow(row) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        
        if (char === '"') {
            if (inQuotes && row[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());
    
    return values;
}

// ============================================
// Column Standardization
// ============================================

/**
 * Standardize column names (lowercase, underscores)
 * @param {Array} data - Array of row objects
 * @returns {Array} Data with standardized column names
 */
function standardizeColumnNames(data) {
    if (data.length === 0) return data;
    
    const oldKeys = Object.keys(data[0]);
    const keyMap = {};
    
    oldKeys.forEach((key, index) => {
        let newKey = key
            .toLowerCase()
            .trim()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '_');
        
        if (!newKey) {
            newKey = `column_${index}`;
        }
        keyMap[key] = newKey;
    });
    
    return data.map(row => {
        const newRow = {};
        oldKeys.forEach(oldKey => {
            newRow[keyMap[oldKey]] = row[oldKey];
        });
        return newRow;
    });
}

// ============================================
// Type Detection
// ============================================

/**
 * Check if a value looks like a date
 * @param {string} value - Value to check
 * @returns {boolean}
 */
function looksLikeDate(value) {
    if (!value || typeof value !== 'string') return false;
    
    // Common date patterns
    const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/,  // YYYY-MM-DD
        /^\d{2}\/\d{2}\/\d{4}$/,  // MM/DD/YYYY or DD/MM/YYYY
        /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,  // M/D/YY or M/D/YYYY
        /^\d{4}\/\d{2}\/\d{2}$/,  // YYYY/MM/DD
        /^\d{2}-\d{2}-\d{4}$/,  // DD-MM-YYYY or MM-DD-YYYY
        /^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}$/,  // Month Day, Year
        /^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}$/,  // Day Month Year
    ];
    
    return datePatterns.some(pattern => pattern.test(value.trim()));
}

/**
 * Check if a value is numeric
 * @param {string} value - Value to check
 * @returns {boolean}
 */
function isNumeric(value) {
    if (value === null || value === undefined || value === '') return false;
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
}

/**
 * Detect column types in the data
 * @param {Array} data - Array of row objects
 * @returns {Object} Column types categorization
 */
function detectColumnTypes(data) {
    if (data.length === 0) return { numeric: [], categorical: [], date: [] };
    
    const columns = Object.keys(data[0]);
    const types = { numeric: [], categorical: [], date: [] };
    
    columns.forEach(col => {
        const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
        const sampleSize = Math.min(values.length, 20);
        const sample = values.slice(0, sampleSize);
        
        if (sampleSize === 0) {
            types.categorical.push(col);
            return;
        }
        
        // Check for dates first
        const dateKeywords = ['date', 'time', 'timestamp', 'created', 'updated', 'day', 'month', 'year'];
        const isDateColumn = dateKeywords.some(keyword => col.toLowerCase().includes(keyword));
        
        let dateCount = 0;
        let numericCount = 0;
        
        sample.forEach(val => {
            if (looksLikeDate(String(val))) dateCount++;
            if (isNumeric(val)) numericCount++;
        });
        
        // Determine type
        if (isDateColumn && dateCount / sampleSize > 0.3) {
            types.date.push(col);
        } else if (dateCount / sampleSize > 0.5) {
            types.date.push(col);
        } else if (numericCount / sampleSize > 0.8) {
            types.numeric.push(col);
        } else {
            types.categorical.push(col);
        }
    });
    
    return types;
}

// ============================================
// Data Conversion
// ============================================

/**
 * Convert data types based on detected types
 * @param {Array} data - Array of row objects
 * @param {Object} columnTypes - Detected column types
 * @returns {Array} Data with converted types
 */
function convertDataTypes(data, columnTypes) {
    return data.map(row => {
        const newRow = { ...row };
        
        // Convert numeric columns
        columnTypes.numeric.forEach(col => {
            const val = row[col];
            if (val !== null && val !== undefined && val !== '') {
                newRow[col] = parseFloat(val);
            } else {
                newRow[col] = null;
            }
        });
        
        // Convert date columns
        columnTypes.date.forEach(col => {
            const val = row[col];
            if (val) {
                const date = new Date(val);
                newRow[col] = isNaN(date.getTime()) ? null : date;
            } else {
                newRow[col] = null;
            }
        });
        
        return newRow;
    });
}

// ============================================
// Missing Value Handling
// ============================================

/**
 * Calculate median of an array
 * @param {Array} arr - Array of numbers
 * @returns {number}
 */
function median(arr) {
    const sorted = [...arr].filter(v => v !== null && !isNaN(v)).sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Find mode (most common value) of an array
 * @param {Array} arr - Array of values
 * @returns {*}
 */
function mode(arr) {
    const counts = {};
    let maxCount = 0;
    let modeValue = null;
    
    arr.forEach(val => {
        if (val !== null && val !== undefined && val !== '') {
            counts[val] = (counts[val] || 0) + 1;
            if (counts[val] > maxCount) {
                maxCount = counts[val];
                modeValue = val;
            }
        }
    });
    
    return modeValue || 'Unknown';
}

/**
 * Handle missing values in the data
 * @param {Array} data - Array of row objects
 * @param {Object} columnTypes - Detected column types
 * @returns {Array} Data with missing values handled
 */
function handleMissingValues(data, columnTypes) {
    // Calculate fill values
    const fillValues = {};
    
    columnTypes.numeric.forEach(col => {
        const values = data.map(row => row[col]).filter(v => v !== null && !isNaN(v));
        fillValues[col] = median(values);
    });
    
    columnTypes.categorical.forEach(col => {
        const values = data.map(row => row[col]);
        fillValues[col] = mode(values);
    });
    
    // Fill missing values
    return data.map(row => {
        const newRow = { ...row };
        
        columnTypes.numeric.forEach(col => {
            if (newRow[col] === null || isNaN(newRow[col])) {
                newRow[col] = fillValues[col];
            }
        });
        
        columnTypes.categorical.forEach(col => {
            if (newRow[col] === null || newRow[col] === undefined || newRow[col] === '') {
                newRow[col] = fillValues[col];
            }
        });
        
        return newRow;
    });
}

// ============================================
// Main Processing Function
// ============================================

/**
 * Process uploaded CSV file
 * @param {File} file - File object from input
 * @returns {Promise<Object>} Processing result
 */
async function processCSVFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                
                // Check if empty
                if (!content.trim()) {
                    reject(new Error('The uploaded file is empty.'));
                    return;
                }
                
                // Parse CSV
                let data = parseCSV(content);
                
                if (data.length === 0) {
                    reject(new Error('The CSV file contains no data rows.'));
                    return;
                }
                
                // Standardize column names
                data = standardizeColumnNames(data);
                
                // Detect column types
                const columnTypes = detectColumnTypes(data);
                
                // Convert data types
                data = convertDataTypes(data, columnTypes);
                
                // Handle missing values
                data = handleMissingValues(data, columnTypes);
                
                // Store processed data
                dataStore.rawData = data;
                dataStore.processedData = data;
                dataStore.filename = file.name;
                dataStore.uploaded = true;
                dataStore.columnTypes = columnTypes;
                
                resolve({
                    success: true,
                    message: `File "${file.name}" uploaded successfully.`,
                    info: {
                        row_count: data.length,
                        column_count: Object.keys(data[0] || {}).length,
                        columns: Object.keys(data[0] || {}),
                        column_types: columnTypes
                    }
                });
                
            } catch (error) {
                reject(new Error(`Error processing CSV file: ${error.message}`));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Error reading file.'));
        };
        
        reader.readAsText(file);
    });
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if data is loaded
 * @returns {boolean}
 */
function isDataLoaded() {
    return dataStore.uploaded && dataStore.processedData !== null;
}

/**
 * Get current data
 * @returns {Array}
 */
function getData() {
    return dataStore.processedData;
}

/**
 * Get column types
 * @returns {Object}
 */
function getColumnTypes() {
    return dataStore.columnTypes;
}

/**
 * Get filename
 * @returns {string}
 */
function getFilename() {
    return dataStore.filename;
}

/**
 * Clear stored data
 */
function clearData() {
    dataStore.rawData = null;
    dataStore.processedData = null;
    dataStore.filename = null;
    dataStore.uploaded = false;
    dataStore.columnTypes = null;
}

/**
 * Get data status
 * @returns {Object}
 */
function getStatus() {
    return {
        data_loaded: isDataLoaded(),
        filename: dataStore.filename,
        row_count: dataStore.processedData ? dataStore.processedData.length : 0
    };
}

// Export functions for use in other modules
window.DataProcessor = {
    processCSVFile,
    isDataLoaded,
    getData,
    getColumnTypes,
    getFilename,
    clearData,
    getStatus
};
