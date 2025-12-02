/**
 * ai-summary.js - AI-Powered Summary Generation Module
 * 
 * This module provides AI-generated insights using the Hugging Face Inference API.
 * Uses a free text generation model to analyze data and provide meaningful insights.
 */

// ============================================
// Constants
// ============================================

const HF_API_URL = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2';
const API_KEY_STORAGE_KEY = 'hf_api_key';
const MAX_SUMMARY_LENGTH = 500;

// ============================================
// API Key Management
// ============================================

/**
 * Save API key to localStorage
 * @param {string} apiKey - Hugging Face API key
 */
function saveApiKey(apiKey) {
    try {
        localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
        return true;
    } catch (error) {
        console.error('Error saving API key:', error);
        return false;
    }
}

/**
 * Get API key from localStorage
 * @returns {string|null}
 */
function getApiKey() {
    try {
        return localStorage.getItem(API_KEY_STORAGE_KEY);
    } catch (error) {
        console.error('Error retrieving API key:', error);
        return null;
    }
}

/**
 * Clear API key from localStorage
 */
function clearApiKey() {
    try {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
        return true;
    } catch (error) {
        console.error('Error clearing API key:', error);
        return false;
    }
}

/**
 * Check if API key is set
 * @returns {boolean}
 */
function hasApiKey() {
    const key = getApiKey();
    return key !== null && key.trim().length > 0;
}

// ============================================
// Data Analysis Preparation
// ============================================

/**
 * Prepare data summary for AI analysis
 * @param {Array} data - Full dataset
 * @param {Array} selectedColumns - Columns selected for analysis
 * @param {Object} columnTypes - Column type information
 * @returns {Object} Summary data for AI
 */
function prepareDataForAI(data, selectedColumns, columnTypes) {
    const summary = {
        total_rows: data.length,
        selected_columns: selectedColumns,
        column_stats: {}
    };
    
    selectedColumns.forEach(col => {
        const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined);
        
        // Check if numeric
        if (columnTypes.numeric.includes(col)) {
            const numericValues = values.filter(v => !isNaN(v));
            summary.column_stats[col] = {
                type: 'numeric',
                count: numericValues.length,
                mean: Math.round(numericValues.reduce((a, b) => a + b, 0) / numericValues.length * 100) / 100,
                min: Math.round(Math.min(...numericValues) * 100) / 100,
                max: Math.round(Math.max(...numericValues) * 100) / 100,
                median: calculateMedian(numericValues)
            };
        } else if (columnTypes.categorical.includes(col)) {
            const counts = {};
            values.forEach(v => {
                const key = String(v);
                counts[key] = (counts[key] || 0) + 1;
            });
            const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            
            summary.column_stats[col] = {
                type: 'categorical',
                unique_count: Object.keys(counts).length,
                most_common: sortedEntries[0] ? sortedEntries[0][0] : 'N/A',
                most_common_count: sortedEntries[0] ? sortedEntries[0][1] : 0,
                top_3: sortedEntries.slice(0, 3).map(([val, count]) => ({ value: val, count }))
            };
        } else if (columnTypes.date.includes(col)) {
            summary.column_stats[col] = {
                type: 'date',
                count: values.length,
                earliest: values[0],
                latest: values[values.length - 1]
            };
        }
    });
    
    return summary;
}

/**
 * Calculate median of array
 * @param {Array} arr - Array of numbers
 * @returns {number}
 */
function calculateMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2 * 100) / 100;
}

// ============================================
// AI Summary Generation
// ============================================

/**
 * Create a prompt for the AI model
 * @param {Object} dataSummary - Prepared data summary
 * @returns {string}
 */
function createPrompt(dataSummary) {
    let prompt = `[INST] You are a data analyst. Analyze the following dataset statistics and provide 3-5 key insights in a clear, concise format. Focus on patterns, trends, and actionable observations.\n\n`;
    
    prompt += `Dataset Overview:\n`;
    prompt += `- Total Rows: ${dataSummary.total_rows}\n`;
    prompt += `- Columns Analyzed: ${dataSummary.selected_columns.join(', ')}\n\n`;
    
    prompt += `Column Statistics:\n`;
    Object.entries(dataSummary.column_stats).forEach(([col, stats]) => {
        if (stats.type === 'numeric') {
            prompt += `- ${col} (numeric): Mean=${stats.mean}, Min=${stats.min}, Max=${stats.max}, Median=${stats.median}\n`;
        } else if (stats.type === 'categorical') {
            prompt += `- ${col} (categorical): ${stats.unique_count} unique values, Most common: "${stats.most_common}" (${stats.most_common_count} occurrences)\n`;
        }
    });
    
    prompt += `\nProvide insights in numbered format (1., 2., 3., etc.). Keep each insight to 1-2 sentences. [/INST]`;
    
    return prompt;
}

/**
 * Generate AI summary using Hugging Face API
 * @param {Array} data - Dataset
 * @param {Array} selectedColumns - Selected columns
 * @param {Object} columnTypes - Column types
 * @returns {Promise<Object>}
 */
async function generateAISummary(data, selectedColumns, columnTypes) {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        return {
            success: false,
            error: 'No API key found. Please enter your Hugging Face API key.'
        };
    }
    
    if (!selectedColumns || selectedColumns.length === 0) {
        return {
            success: false,
            error: 'Please select at least one column to analyze.'
        };
    }
    
    try {
        // Prepare data summary
        const dataSummary = prepareDataForAI(data, selectedColumns, columnTypes);
        
        // Create prompt
        const prompt = createPrompt(dataSummary);
        
        // Call Hugging Face API
        const response = await fetch(HF_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: 400,
                    temperature: 0.7,
                    top_p: 0.95,
                    return_full_text: false
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            if (response.status === 401 || response.status === 403) {
                return {
                    success: false,
                    error: 'Invalid API key. Please check your Hugging Face API key and try again.'
                };
            } else if (response.status === 503) {
                return {
                    success: false,
                    error: 'The AI model is currently loading. Please wait 20-30 seconds and try again.'
                };
            } else {
                return {
                    success: false,
                    error: `API error (${response.status}): ${errorData.error || 'Unknown error'}`
                };
            }
        }
        
        const result = await response.json();
        
        // Extract generated text
        let generatedText = '';
        if (Array.isArray(result) && result.length > 0) {
            generatedText = result[0].generated_text || '';
        } else if (result.generated_text) {
            generatedText = result.generated_text;
        }
        
        if (!generatedText) {
            return {
                success: false,
                error: 'No insights generated. Please try again.'
            };
        }
        
        return {
            success: true,
            summary: generatedText.trim(),
            columns_analyzed: selectedColumns,
            data_summary: dataSummary
        };
        
    } catch (error) {
        console.error('AI Summary Error:', error);
        return {
            success: false,
            error: `Failed to generate summary: ${error.message}`
        };
    }
}

/**
 * Generate a simple statistical summary as fallback
 * @param {Array} data - Dataset
 * @param {Array} selectedColumns - Selected columns
 * @param {Object} columnTypes - Column types
 * @returns {Object}
 */
function generateSimpleSummary(data, selectedColumns, columnTypes) {
    const dataSummary = prepareDataForAI(data, selectedColumns, columnTypes);
    
    let summary = `📊 Statistical Analysis Summary\n\n`;
    summary += `Dataset contains ${dataSummary.total_rows} rows.\n`;
    summary += `Analyzing ${selectedColumns.length} column(s): ${selectedColumns.join(', ')}\n\n`;
    
    summary += `Key Findings:\n\n`;
    
    let insightNum = 1;
    Object.entries(dataSummary.column_stats).forEach(([col, stats]) => {
        if (stats.type === 'numeric') {
            summary += `${insightNum}. ${col}: Values range from ${stats.min} to ${stats.max} with an average of ${stats.mean}. `;
            const range = stats.max - stats.min;
            if (range > stats.mean * 2) {
                summary += `High variability detected in this metric.\n\n`;
            } else {
                summary += `Values are relatively consistent.\n\n`;
            }
            insightNum++;
        } else if (stats.type === 'categorical') {
            summary += `${insightNum}. ${col}: Contains ${stats.unique_count} distinct categories. `;
            summary += `The most frequent category is "${stats.most_common}" appearing ${stats.most_common_count} times`;
            const percentage = Math.round((stats.most_common_count / dataSummary.total_rows) * 100);
            summary += ` (${percentage}% of data).\n\n`;
            insightNum++;
        }
    });
    
    return {
        success: true,
        summary: summary,
        columns_analyzed: selectedColumns,
        data_summary: dataSummary,
        is_fallback: true
    };
}

// Export functions
window.AISummary = {
    saveApiKey,
    getApiKey,
    clearApiKey,
    hasApiKey,
    generateAISummary,
    generateSimpleSummary
};
