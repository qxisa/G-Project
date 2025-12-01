"""
app.py - Flask Backend Application

This is the main Flask application that serves as the backend for the
Interactive Data Analytics Dashboard. It provides endpoints for:
- CSV file upload
- Data analysis
- Visualization generation
- Forecasting

All data is stored in memory (no database).
"""

import os
import sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
from io import StringIO

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.analysis.preprocessing import clean_dataframe, detect_columns, get_dataframe_info
from backend.analysis.analysis import compute_summary, get_quick_insights
from backend.analysis.forecast import simple_forecast
from backend.visualization.charts import generate_chart, get_available_charts

# Initialize Flask app
app = Flask(__name__, static_folder='../frontend/static')
CORS(app)  # Enable CORS for frontend requests

# In-memory storage for uploaded data
# Using a dictionary to store the DataFrame and metadata
data_store = {
    'df': None,
    'filename': None,
    'uploaded': False
}


# ============================================
# UTILITY FUNCTIONS
# ============================================

def get_dataframe() -> pd.DataFrame:
    """
    Retrieve the currently stored DataFrame.
    
    Returns:
        The stored DataFrame or None if not available
    """
    return data_store.get('df')


def is_data_loaded() -> bool:
    """
    Check if data has been uploaded and is available.
    
    Returns:
        Boolean indicating if data is loaded
    """
    return data_store.get('uploaded', False) and data_store.get('df') is not None


# ============================================
# ROUTES - File Upload
# ============================================

@app.route('/upload', methods=['POST'])
def upload_file():
    """
    Handle CSV file upload.
    
    Accepts a CSV file via multipart form data, validates it,
    loads it into a Pandas DataFrame, and stores it in memory.
    
    Returns:
        JSON response with success/error status
    """
    try:
        # Check if file was provided
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided. Please select a CSV file to upload.'
            }), 400
        
        file = request.files['file']
        
        # Check if filename is empty
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected. Please choose a CSV file.'
            }), 400
        
        # Validate file extension
        if not file.filename.lower().endswith('.csv'):
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Only CSV files are supported.'
            }), 400
        
        # Try to read the CSV file
        try:
            # Read file content
            content = file.read().decode('utf-8')
            
            # Check if file is empty
            if not content.strip():
                return jsonify({
                    'success': False,
                    'error': 'The uploaded file is empty.'
                }), 400
            
            # Parse CSV into DataFrame
            df = pd.read_csv(StringIO(content))
            
            # Validate that DataFrame has data
            if df.empty:
                return jsonify({
                    'success': False,
                    'error': 'The CSV file contains no data rows.'
                }), 400
            
            if len(df.columns) == 0:
                return jsonify({
                    'success': False,
                    'error': 'The CSV file contains no columns.'
                }), 400
            
        except pd.errors.EmptyDataError:
            return jsonify({
                'success': False,
                'error': 'The CSV file is empty or contains no valid data.'
            }), 400
        except pd.errors.ParserError as e:
            return jsonify({
                'success': False,
                'error': f'Error parsing CSV file: {str(e)}'
            }), 400
        except UnicodeDecodeError:
            return jsonify({
                'success': False,
                'error': 'Unable to read file. Please ensure the file is UTF-8 encoded.'
            }), 400
        
        # Clean and preprocess the DataFrame
        df = clean_dataframe(df)
        
        # Store in memory
        data_store['df'] = df
        data_store['filename'] = file.filename
        data_store['uploaded'] = True
        
        # Get basic info about the uploaded data
        info = get_dataframe_info(df)
        
        return jsonify({
            'success': True,
            'message': f'File "{file.filename}" uploaded successfully.',
            'info': info
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Unexpected error during upload: {str(e)}'
        }), 500


# ============================================
# ROUTES - Data Analysis
# ============================================

@app.route('/analyze', methods=['GET'])
def analyze_data():
    """
    Analyze the uploaded data and return summary statistics.
    
    Returns:
        JSON response with comprehensive summary statistics
    """
    try:
        # Check if data is loaded
        if not is_data_loaded():
            return jsonify({
                'success': False,
                'error': 'No data available. Please upload a CSV file first.'
            }), 400
        
        df = get_dataframe()
        
        # Compute summary statistics
        summary = compute_summary(df)
        
        # Generate quick insights
        insights = get_quick_insights(summary)
        
        # Get available chart types
        available_charts = get_available_charts(df)
        
        return jsonify({
            'success': True,
            'summary': summary,
            'insights': insights,
            'available_charts': available_charts
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error during analysis: {str(e)}'
        }), 500


# ============================================
# ROUTES - Visualization
# ============================================

@app.route('/visualize', methods=['GET'])
def visualize_data():
    """
    Generate a visualization based on the specified chart type.
    
    Query Parameters:
        chart: Type of chart ('line', 'bar', 'scatter', 'histogram')
        x: Column name for X axis (optional)
        y: Column name for Y axis (optional)
    
    Returns:
        JSON response with Plotly chart data
    """
    try:
        # Check if data is loaded
        if not is_data_loaded():
            return jsonify({
                'success': False,
                'error': 'No data available. Please upload a CSV file first.'
            }), 400
        
        # Get chart type from query parameters
        chart_type = request.args.get('chart', 'line').lower()
        x_col = request.args.get('x')
        y_col = request.args.get('y')
        
        # Validate chart type
        valid_charts = ['line', 'bar', 'scatter', 'histogram']
        if chart_type not in valid_charts:
            return jsonify({
                'success': False,
                'error': f'Invalid chart type. Supported types: {valid_charts}'
            }), 400
        
        df = get_dataframe()
        
        # Generate chart
        result = generate_chart(df, chart_type, x_col=x_col, y_col=y_col)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error generating visualization: {str(e)}'
        }), 500


# ============================================
# ROUTES - Forecasting
# ============================================

@app.route('/forecast', methods=['GET'])
def forecast_data():
    """
    Generate a simple forecast using linear regression.
    
    Query Parameters:
        periods: Number of future periods to forecast (default: 5)
    
    Returns:
        JSON response with forecast data
    """
    try:
        # Check if data is loaded
        if not is_data_loaded():
            return jsonify({
                'success': False,
                'error': 'No data available. Please upload a CSV file first.'
            }), 400
        
        # Get number of periods from query parameters
        try:
            periods = int(request.args.get('periods', 5))
            periods = max(1, min(periods, 30))  # Limit between 1 and 30
        except ValueError:
            periods = 5
        
        df = get_dataframe()
        
        # Generate forecast
        result = simple_forecast(df, periods=periods)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error during forecasting: {str(e)}'
        }), 500


# ============================================
# ROUTES - Utility
# ============================================

@app.route('/columns', methods=['GET'])
def get_columns():
    """
    Get information about available columns in the uploaded data.
    
    Returns:
        JSON response with column information
    """
    try:
        if not is_data_loaded():
            return jsonify({
                'success': False,
                'error': 'No data available. Please upload a CSV file first.'
            }), 400
        
        df = get_dataframe()
        column_types = detect_columns(df)
        
        return jsonify({
            'success': True,
            'columns': list(df.columns),
            'column_types': column_types
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error getting columns: {str(e)}'
        }), 500


@app.route('/clear', methods=['POST'])
def clear_data():
    """
    Clear the stored data from memory.
    
    Returns:
        JSON response indicating success
    """
    data_store['df'] = None
    data_store['filename'] = None
    data_store['uploaded'] = False
    
    return jsonify({
        'success': True,
        'message': 'Data cleared successfully.'
    })


@app.route('/status', methods=['GET'])
def get_status():
    """
    Get the current status of the application.
    
    Returns:
        JSON response with status information
    """
    return jsonify({
        'success': True,
        'data_loaded': is_data_loaded(),
        'filename': data_store.get('filename'),
        'row_count': len(data_store['df']) if is_data_loaded() else 0
    })


# ============================================
# ROUTES - Serve Frontend
# ============================================

@app.route('/')
def serve_frontend():
    """Serve the main frontend HTML page."""
    return send_from_directory('../frontend', 'index.html')


@app.route('/static/<path:path>')
def serve_static(path):
    """Serve static files (CSS, JS)."""
    return send_from_directory('../frontend/static', path)


# ============================================
# ERROR HANDLERS
# ============================================

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors."""
    return jsonify({
        'success': False,
        'error': 'Endpoint not found.'
    }), 404


@app.errorhandler(500)
def server_error(e):
    """Handle 500 errors."""
    return jsonify({
        'success': False,
        'error': 'Internal server error.'
    }), 500


# ============================================
# MAIN
# ============================================

if __name__ == '__main__':
    # Run the Flask development server
    # Debug mode is controlled by FLASK_DEBUG environment variable (default: False)
    import os
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() in ('true', '1', 'yes')
    
    print("Starting Interactive Data Analytics Dashboard Backend...")
    print("Server running at http://localhost:5000")
    print("Open http://localhost:5000 in your browser to access the dashboard.")
    print(f"Debug mode: {debug_mode}")
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)
