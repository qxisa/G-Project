"""
analysis.py - Data Analysis Module

This module provides functions for computing summary statistics and insights
from CSV data. Includes numeric stats, categorical summaries, and period analysis.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from .preprocessing import detect_columns


# Constants for data analysis
ID_UNIQUENESS_THRESHOLD = 0.95


def is_id_column(col_name: str) -> bool:
    """
    Check if a column name suggests it's an ID column.
    
    Args:
        col_name: Column name to check
        
    Returns:
        True if column appears to be an ID column
    """
    lower_name = col_name.lower()
    return (
        lower_name == 'id' or
        lower_name.endswith('_id') or
        lower_name.endswith('id') or
        lower_name.startswith('id_') or
        lower_name == 'index' or
        lower_name == 'idx' or
        lower_name == 'row_number' or
        lower_name == 'rownumber' or
        lower_name == 'row' or
        lower_name == 'key' or
        lower_name.endswith('_key') or
        lower_name.endswith('_idx')
    )


def is_sequential_id(df: pd.DataFrame, col_name: str) -> bool:
    """
    Check if a numeric column appears to be a sequential ID based on values.
    
    Args:
        df: Input DataFrame
        col_name: Column name to check
        
    Returns:
        True if column appears to be a sequential ID
    """
    if len(df) < 2:
        return False
    
    col_data = df[col_name].dropna()
    if len(col_data) < 2:
        return False
    
    # Check if all values are numeric integers
    try:
        # Convert to numeric, coerce errors to NaN
        numeric_data = pd.to_numeric(col_data, errors='coerce').dropna()
        if len(numeric_data) < 2:
            return False
        
        # Check if all values are integers using modulo for better precision
        if not all(numeric_data.apply(lambda x: x % 1 == 0)):
            return False
    except Exception:
        return False
    
    # Check if values are sequential starting from 0 or 1
    sorted_vals = sorted(numeric_data.values)
    is_sequential = all(
        sorted_vals[i] - sorted_vals[i-1] == 1 
        for i in range(1, len(sorted_vals))
    )
    
    if is_sequential and (sorted_vals[0] == 0 or sorted_vals[0] == 1):
        return True
    
    return False


def compute_numeric_stats(df: pd.DataFrame, numeric_cols: List[str]) -> Dict[str, Dict[str, Any]]:
    """
    Compute summary statistics for numeric columns.
    
    Args:
        df: Input DataFrame
        numeric_cols: List of numeric column names
        
    Returns:
        Dictionary of statistics per numeric column including:
        - mean, median, std, min, max, count, sum
        - is_id_column: boolean flag indicating if column is an ID
    """
    stats = {}
    
    for col in numeric_cols:
        col_data = df[col].dropna()
        if len(col_data) > 0:
            stats[col] = {
                'mean': round(float(col_data.mean()), 2),
                'median': round(float(col_data.median()), 2),
                'std': round(float(col_data.std()), 2) if len(col_data) > 1 else 0,
                'min': round(float(col_data.min()), 2),
                'max': round(float(col_data.max()), 2),
                'count': int(col_data.count()),
                'sum': round(float(col_data.sum()), 2),
                'is_id_column': is_id_column(col) or is_sequential_id(df, col)
            }
    
    return stats


def compute_categorical_stats(df: pd.DataFrame, categorical_cols: List[str]) -> Dict[str, Dict[str, Any]]:
    """
    Compute summary statistics for categorical columns.
    
    Args:
        df: Input DataFrame
        categorical_cols: List of categorical column names
        
    Returns:
        Dictionary of statistics per categorical column including:
        - unique_count, most_common, value_counts (top 10)
        Note: Filters out ID-like columns (highly unique values)
    """
    stats = {}
    
    for col in categorical_cols:
        col_data = df[col].dropna()
        if len(col_data) > 0:
            value_counts = col_data.value_counts()
            unique_count = int(col_data.nunique())
            
            # Skip if it looks like an ID column (very high unique count)
            is_likely_id = is_id_column(col) or (unique_count / len(col_data) > ID_UNIQUENESS_THRESHOLD)
            
            if not is_likely_id:
                stats[col] = {
                    'unique_count': unique_count,
                    'most_common': str(value_counts.index[0]) if len(value_counts) > 0 else None,
                    'most_common_count': int(value_counts.iloc[0]) if len(value_counts) > 0 else 0,
                    'top_values': {str(k): int(v) for k, v in value_counts.head(10).items()}
                }
    
    return stats


def analyze_date_periods(df: pd.DataFrame, date_cols: List[str], numeric_cols: List[str]) -> Dict[str, Any]:
    """
    Analyze performance across date periods.
    
    Identifies best and worst periods based on numeric column values.
    
    Args:
        df: Input DataFrame
        date_cols: List of date column names
        numeric_cols: List of numeric column names
        
    Returns:
        Dictionary containing period analysis for each date-numeric combination
    """
    period_analysis = {}
    
    # Use the first date column if available
    if not date_cols or not numeric_cols:
        return period_analysis
    
    date_col = date_cols[0]
    
    for num_col in numeric_cols:
        # Create a copy to avoid modifying original
        temp_df = df[[date_col, num_col]].dropna()
        
        if len(temp_df) == 0:
            continue
        
        # Find best and worst periods
        if len(temp_df) > 0:
            best_idx = temp_df[num_col].idxmax()
            worst_idx = temp_df[num_col].idxmin()
            
            period_analysis[num_col] = {
                'best_period': {
                    'date': str(temp_df.loc[best_idx, date_col]),
                    'value': round(float(temp_df.loc[best_idx, num_col]), 2)
                },
                'worst_period': {
                    'date': str(temp_df.loc[worst_idx, date_col]),
                    'value': round(float(temp_df.loc[worst_idx, num_col]), 2)
                }
            }
            
            # Monthly aggregation if possible
            try:
                temp_df['month'] = pd.to_datetime(temp_df[date_col]).dt.to_period('M')
                monthly = temp_df.groupby('month')[num_col].mean()
                if len(monthly) > 0:
                    best_month = monthly.idxmax()
                    worst_month = monthly.idxmin()
                    period_analysis[num_col]['best_month'] = {
                        'month': str(best_month),
                        'avg_value': round(float(monthly[best_month]), 2)
                    }
                    period_analysis[num_col]['worst_month'] = {
                        'month': str(worst_month),
                        'avg_value': round(float(monthly[worst_month]), 2)
                    }
            except Exception:
                # Monthly aggregation failed, skip
                pass
    
    return period_analysis


def compute_correlations(df: pd.DataFrame, numeric_cols: List[str]) -> Dict[str, Dict[str, float]]:
    """
    Compute correlation matrix for numeric columns.
    
    Args:
        df: Input DataFrame
        numeric_cols: List of numeric column names
        
    Returns:
        Dictionary representation of correlation matrix
    """
    if len(numeric_cols) < 2:
        return {}
    
    corr_df = df[numeric_cols].corr()
    
    # Convert to nested dictionary
    correlations = {}
    for col1 in corr_df.columns:
        correlations[col1] = {}
        for col2 in corr_df.columns:
            correlations[col1][col2] = round(float(corr_df.loc[col1, col2]), 3)
    
    return correlations


def compute_summary(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Main function to compute comprehensive summary of the DataFrame.
    
    Combines all analysis functions into a single summary.
    
    Args:
        df: Input DataFrame
        
    Returns:
        Dictionary containing:
        - overview: Basic stats (rows, columns)
        - numeric_stats: Statistics for numeric columns
        - categorical_stats: Statistics for categorical columns
        - period_analysis: Date-based period analysis
        - correlations: Correlation matrix for numeric columns
    """
    # Detect column types
    column_types = detect_columns(df)
    
    # Build comprehensive summary
    summary = {
        'overview': {
            'total_rows': len(df),
            'total_columns': len(df.columns),
            'numeric_columns': len(column_types['numeric']),
            'categorical_columns': len(column_types['categorical']),
            'date_columns': len(column_types['date']),
            'column_names': list(df.columns)
        },
        'column_types': column_types,
        'numeric_stats': compute_numeric_stats(df, column_types['numeric']),
        'categorical_stats': compute_categorical_stats(df, column_types['categorical']),
        'period_analysis': analyze_date_periods(df, column_types['date'], column_types['numeric']),
        'correlations': compute_correlations(df, column_types['numeric'])
    }
    
    return summary


def get_quick_insights(summary: Dict[str, Any]) -> List[str]:
    """
    Generate quick human-readable insights from the summary.
    
    Args:
        summary: Summary dictionary from compute_summary()
        
    Returns:
        List of insight strings
    """
    insights = []
    
    # Overview insights
    overview = summary.get('overview', {})
    insights.append(f"Dataset contains {overview.get('total_rows', 0):,} rows and {overview.get('total_columns', 0)} columns")
    
    # Numeric insights - exclude ID columns
    numeric_stats = summary.get('numeric_stats', {})
    for col, stats in numeric_stats.items():
        if not stats.get('is_id_column', False):
            insights.append(f"{col}: ranges from {stats['min']:,} to {stats['max']:,} (avg: {stats['mean']:,})")
    
    # Best/worst period insights - exclude ID columns
    period_analysis = summary.get('period_analysis', {})
    for col, periods in period_analysis.items():
        # Check if this column is an ID in numeric_stats
        is_id = numeric_stats.get(col, {}).get('is_id_column', False)
        if not is_id and 'best_period' in periods:
            insights.append(f"Best {col}: {periods['best_period']['value']:,} on {periods['best_period']['date']}")
    
    return insights
