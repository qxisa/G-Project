# Interactive Data Analytics Dashboard

A simple, clean web application for uploading CSV files and viewing summary statistics, interactive charts, and optional forecasting. Built with Flask (Python backend) and vanilla JavaScript frontend.

## 📊 Features

- **CSV Upload**: Upload any generic CSV dataset
- **Data Cleaning**: Automatic column standardization, missing value handling, and date parsing
- **Summary Statistics**: 
  - Row and column counts
  - Numeric statistics (mean, median, std, min, max)
  - Categorical summaries (unique values, most common)
  - Best/worst periods (if date column exists)
- **Interactive Charts** (powered by Plotly.js):
  - Line Chart
  - Bar Chart
  - Histogram
  - Scatter Plot
- **Forecasting**: Simple linear regression predictions for time-series data
- **Error Handling**: Robust error feedback for invalid files, empty data, etc.

## 🏗️ Architecture

```
├── backend/
│   ├── app.py                  # Flask application (main entry point)
│   ├── analysis/
│   │   ├── preprocessing.py    # Data cleaning and preparation
│   │   ├── analysis.py         # Summary statistics computation
│   │   └── forecast.py         # Linear regression forecasting
│   └── visualization/
│       └── charts.py           # Plotly chart generation
├── frontend/
│   ├── index.html              # Main HTML page
│   └── static/
│       ├── css/
│       │   └── style.css       # Stylesheet
│       └── js/
│           └── main.js         # Frontend JavaScript
├── requirements.txt            # Python dependencies
└── README.md                   # This file
```

## 🚀 How to Run

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Clone the repository** (if not already):
   ```bash
   git clone <repository-url>
   cd G-Project
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the backend server**:
   ```bash
   cd backend
   python app.py
   ```
   
   The server will start on `http://localhost:5000`
   
   **For development with debug mode enabled:**
   ```bash
   FLASK_DEBUG=true python app.py
   ```

4. **Open the dashboard**:
   Open your browser and navigate to `http://localhost:5000`

### Alternative: Using Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the application
cd backend
python app.py
```

## 📖 Usage

1. **Upload a CSV File**:
   - Click "Choose a CSV file..." or drag and drop
   - Click "Upload & Analyze"
   
2. **View Summary Statistics**:
   - Overview cards show row/column counts
   - Quick insights provide key observations
   - Detailed statistics tables for numeric and categorical columns

3. **Generate Visualizations**:
   - Click chart type buttons (Line, Bar, Histogram, Scatter)
   - Charts are interactive - hover, zoom, pan

4. **Run Forecasting** (if date column exists):
   - Set number of forecast periods (1-30)
   - Click "Generate Forecast"
   - View predictions and forecast chart

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/upload` | POST | Upload CSV file |
| `/analyze` | GET | Get summary statistics |
| `/visualize?chart=<type>` | GET | Generate chart (line/bar/histogram/scatter) |
| `/forecast?periods=<n>` | GET | Generate forecast |
| `/columns` | GET | Get column information |
| `/status` | GET | Check data status |
| `/clear` | POST | Clear uploaded data |

## ⚠️ Error Handling

The application handles various error scenarios:

- **No file selected**: Prompts user to select a file
- **Invalid file type**: Only .csv files are accepted
- **Empty file**: Detects and reports empty files
- **Parse errors**: Reports CSV parsing issues
- **Missing columns**: Gracefully handles missing data
- **Insufficient data for charts**: Disables unavailable chart types
- **No date column for forecasting**: Shows informative message

## 🔒 Limitations

- **In-memory storage**: Data is not persisted; refreshing clears data
- **Single user**: Not designed for concurrent users
- **File size**: Very large files may cause performance issues
- **Forecasting**: Uses simple linear regression (not suitable for complex patterns)
- **Date parsing**: May not recognize all date formats

## 🔮 Future Improvements

- [ ] Support for multiple file formats (Excel, JSON)
- [ ] Data export functionality
- [ ] More chart types (pie, box plot, heatmap)
- [ ] Advanced forecasting models (ARIMA, Prophet)
- [ ] Data transformation tools
- [ ] Column selection for charts
- [ ] Dark mode theme
- [ ] File size validation
- [ ] Progress bar for large files
- [ ] Session persistence

## 🛠️ Technologies Used

**Backend**:
- Flask (Python web framework)
- Pandas (Data manipulation)
- NumPy (Numerical computing)
- Plotly (Chart generation)

**Frontend**:
- HTML5
- CSS3 (Custom styling, no frameworks)
- JavaScript (Vanilla JS, no frameworks)
- Plotly.js (Interactive charts)

## 📝 License

This project is open source and available under the MIT License.
