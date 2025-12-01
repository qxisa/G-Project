"""
forecast.py - Simple Forecasting Module

This module provides basic forecasting functionality using linear regression.
Predicts future values based on date and numeric column relationships.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from .preprocessing import detect_columns


def prepare_forecast_data(df: pd.DataFrame, date_col: str, value_col: str) -> Tuple[np.ndarray, np.ndarray, pd.Series]:
    """
    Prepare data for forecasting by converting dates to numeric values.
    
    Args:
        df: Input DataFrame
        date_col: Name of the date column
        value_col: Name of the numeric value column
        
    Returns:
        Tuple of (X values as days from start, Y values, date series)
    """
    # Create a clean copy with only needed columns
    forecast_df = df[[date_col, value_col]].dropna().copy()
    
    if len(forecast_df) == 0:
        raise ValueError("No valid data points for forecasting")
    
    # Sort by date
    forecast_df = forecast_df.sort_values(date_col)
    
    # Convert dates to numeric (days from start)
    dates = pd.to_datetime(forecast_df[date_col])
    start_date = dates.min()
    X = (dates - start_date).dt.days.values.astype(float)
    Y = forecast_df[value_col].values.astype(float)
    
    return X, Y, dates


def linear_regression(X: np.ndarray, Y: np.ndarray) -> Tuple[float, float]:
    """
    Perform simple linear regression using least squares.
    
    Formula: Y = slope * X + intercept
    
    Args:
        X: Independent variable values
        Y: Dependent variable values
        
    Returns:
        Tuple of (slope, intercept)
    """
    n = len(X)
    
    if n < 2:
        raise ValueError("Need at least 2 data points for regression")
    
    # Calculate means
    x_mean = np.mean(X)
    y_mean = np.mean(Y)
    
    # Calculate slope and intercept using least squares
    numerator = np.sum((X - x_mean) * (Y - y_mean))
    denominator = np.sum((X - x_mean) ** 2)
    
    if denominator == 0:
        raise ValueError("Cannot compute regression with zero variance in X")
    
    slope = numerator / denominator
    intercept = y_mean - slope * x_mean
    
    return slope, intercept


def calculate_r_squared(Y_actual: np.ndarray, Y_predicted: np.ndarray) -> float:
    """
    Calculate R-squared (coefficient of determination).
    
    Args:
        Y_actual: Actual Y values
        Y_predicted: Predicted Y values
        
    Returns:
        R-squared value (0 to 1, higher is better fit)
    """
    ss_res = np.sum((Y_actual - Y_predicted) ** 2)
    ss_tot = np.sum((Y_actual - np.mean(Y_actual)) ** 2)
    
    if ss_tot == 0:
        return 0.0
    
    return 1 - (ss_res / ss_tot)


def simple_forecast(df: pd.DataFrame, periods: int = 5, value_col: Optional[str] = None) -> Dict[str, Any]:
    """
    Perform simple linear regression forecast on the dataset.
    
    Uses the first available date column and specified (or first) numeric column to make predictions.
    
    Args:
        df: Input DataFrame
        periods: Number of future periods to forecast
        value_col: Optional specific numeric column to forecast
        
    Returns:
        Dictionary containing:
        - success: Boolean indicating if forecast was possible
        - date_column: Name of date column used
        - value_column: Name of value column used
        - historical: List of historical data points
        - forecast: List of forecast data points
        - model: Model parameters (slope, intercept, r_squared)
        - error: Error message if forecast failed
    """
    # Detect column types
    column_types = detect_columns(df)
    
    # Check if we have required columns
    if not column_types['date']:
        return {
            'success': False,
            'error': 'No date column detected. Forecasting requires a date column.'
        }
    
    if not column_types['numeric']:
        return {
            'success': False,
            'error': 'No numeric columns detected. Forecasting requires numeric data.'
        }
    
    # Use first date column
    date_col = column_types['date'][0]
    
    # Use specified value column or default to first numeric
    if value_col and value_col in column_types['numeric']:
        # Use specified column
        pass
    elif value_col and value_col not in df.columns:
        return {
            'success': False,
            'error': f'Column "{value_col}" not found in dataset.'
        }
    elif value_col and value_col not in column_types['numeric']:
        return {
            'success': False,
            'error': f'Column "{value_col}" is not numeric. Please select a numeric column.'
        }
    else:
        # Default to first numeric column
        value_col = column_types['numeric'][0]
    
    try:
        # Prepare data
        X, Y, dates = prepare_forecast_data(df, date_col, value_col)
        
        if len(X) < 2:
            return {
                'success': False,
                'error': 'Not enough data points for forecasting (need at least 2).'
            }
        
        # Perform linear regression
        slope, intercept = linear_regression(X, Y)
        
        # Calculate predictions for historical data
        Y_predicted = slope * X + intercept
        r_squared = calculate_r_squared(Y, Y_predicted)
        
        # Generate historical data points
        historical = []
        for i in range(len(X)):
            historical.append({
                'date': str(dates.iloc[i]),
                'actual': round(float(Y[i]), 2),
                'predicted': round(float(Y_predicted[i]), 2)
            })
        
        # Generate future forecasts
        last_x = X[-1]
        last_date = dates.iloc[-1]
        
        # Estimate average days between data points
        if len(X) > 1:
            avg_interval = (X[-1] - X[0]) / (len(X) - 1)
        else:
            avg_interval = 1  # Default to 1 day if only one point
        
        forecast = []
        for i in range(1, periods + 1):
            future_x = last_x + (avg_interval * i)
            future_y = slope * future_x + intercept
            # Use round() instead of int() to preserve decimal accuracy for date intervals
            future_date = last_date + pd.Timedelta(days=round(avg_interval * i))
            
            forecast.append({
                'date': str(future_date),
                'predicted': round(float(future_y), 2),
                'period': i
            })
        
        return {
            'success': True,
            'date_column': date_col,
            'value_column': value_col,
            'model': {
                'slope': round(float(slope), 4),
                'intercept': round(float(intercept), 4),
                'r_squared': round(float(r_squared), 4),
                'interpretation': f"For each day, {value_col} changes by {round(slope, 4)}"
            },
            'historical_count': len(historical),
            'historical': historical[-20:],  # Last 20 points to avoid huge response
            'forecast': forecast
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f'Forecasting error: {str(e)}'
        }


def forecast_all_numeric(df: pd.DataFrame, periods: int = 5) -> Dict[str, Any]:
    """
    Forecast all numeric columns against the date column.
    
    Args:
        df: Input DataFrame
        periods: Number of future periods to forecast
        
    Returns:
        Dictionary with forecasts for each numeric column
    """
    column_types = detect_columns(df)
    
    if not column_types['date']:
        return {
            'success': False,
            'error': 'No date column detected for forecasting.'
        }
    
    date_col = column_types['date'][0]
    results = {
        'date_column': date_col,
        'forecasts': {}
    }
    
    for value_col in column_types['numeric']:
        try:
            X, Y, dates = prepare_forecast_data(df, date_col, value_col)
            
            if len(X) < 2:
                results['forecasts'][value_col] = {
                    'success': False,
                    'error': 'Not enough data points'
                }
                continue
            
            slope, intercept = linear_regression(X, Y)
            Y_predicted = slope * X + intercept
            r_squared = calculate_r_squared(Y, Y_predicted)
            
            # Generate future forecasts
            last_x = X[-1]
            last_date = dates.iloc[-1]
            avg_interval = (X[-1] - X[0]) / (len(X) - 1) if len(X) > 1 else 1
            
            forecast = []
            for i in range(1, periods + 1):
                future_x = last_x + (avg_interval * i)
                future_y = slope * future_x + intercept
                future_date = last_date + pd.Timedelta(days=int(avg_interval * i))
                forecast.append({
                    'date': str(future_date),
                    'predicted': round(float(future_y), 2)
                })
            
            results['forecasts'][value_col] = {
                'success': True,
                'r_squared': round(float(r_squared), 4),
                'trend': 'increasing' if slope > 0 else 'decreasing',
                'forecast': forecast
            }
            
        except Exception as e:
            results['forecasts'][value_col] = {
                'success': False,
                'error': str(e)
            }
    
    results['success'] = any(f.get('success', False) for f in results['forecasts'].values())
    return results
