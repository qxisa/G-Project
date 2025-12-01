"""
preprocessing.py - Data Preprocessing Module

This module provides functions for cleaning and preparing CSV data for analysis.
Includes column standardization, missing value handling, and date detection.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any


def standardize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """
    Standardize column names to lowercase with underscores.
    
    Args:
        df: Input DataFrame
        
    Returns:
        DataFrame with standardized column names
    """
    # Convert column names to lowercase and replace spaces/special chars with underscores
    new_columns = (
        df.columns
        .str.lower()
        .str.strip()
        .str.replace(r'[^\w\s]', '', regex=True)
        .str.replace(r'\s+', '_', regex=True)
    )
    
    # Handle empty column names by assigning default names
    new_columns = [
        col if col else f'column_{i}' 
        for i, col in enumerate(new_columns)
    ]
    
    df.columns = new_columns
    return df


def handle_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    """
    Handle missing values in the DataFrame.
    
    Strategy:
    - Numeric columns: Fill with median
    - Categorical columns: Fill with mode or 'Unknown'
    
    Args:
        df: Input DataFrame
        
    Returns:
        DataFrame with missing values handled
    """
    for col in df.columns:
        if df[col].dtype in ['int64', 'float64']:
            # Fill numeric columns with median
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val)
        else:
            # Fill categorical columns with mode or 'Unknown'
            if df[col].mode().empty:
                df[col] = df[col].fillna('Unknown')
            else:
                df[col] = df[col].fillna(df[col].mode().iloc[0])
    return df


def parse_dates(df: pd.DataFrame) -> pd.DataFrame:
    """
    Attempt to parse date columns in the DataFrame.
    
    Looks for columns that might contain dates and converts them to datetime.
    
    Args:
        df: Input DataFrame
        
    Returns:
        DataFrame with date columns parsed
    """
    for col in df.columns:
        # Skip if already datetime
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            continue
            
        # Only check object (string) columns
        if df[col].dtype == 'object':
            # Check if column name suggests it's a date
            date_keywords = ['date', 'time', 'timestamp', 'created', 'updated', 'day', 'month', 'year']
            is_date_column = any(keyword in col.lower() for keyword in date_keywords)
            
            if is_date_column:
                try:
                    df[col] = pd.to_datetime(df[col], errors='coerce')
                except Exception:
                    pass
            else:
                # Try to parse if it looks like a date format
                sample = df[col].dropna().head(10)
                if len(sample) > 0:
                    try:
                        # Attempt to parse the first few values
                        test_parse = pd.to_datetime(sample, errors='coerce')
                        # If more than 50% parsed successfully, convert the whole column
                        if test_parse.notna().sum() / len(sample) > 0.5:
                            df[col] = pd.to_datetime(df[col], errors='coerce')
                    except Exception:
                        pass
    return df


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Main function to clean and preprocess a DataFrame.
    
    Applies all preprocessing steps:
    1. Standardize column names
    2. Parse date columns
    3. Handle missing values
    
    Args:
        df: Input DataFrame
        
    Returns:
        Cleaned DataFrame
    """
    # Step 1: Standardize column names
    df = standardize_column_names(df)
    
    # Step 2: Parse dates (before handling missing values to avoid date issues)
    df = parse_dates(df)
    
    # Step 3: Handle missing values
    df = handle_missing_values(df)
    
    return df


def detect_columns(df: pd.DataFrame) -> Dict[str, List[str]]:
    """
    Detect and categorize columns by type.
    
    Args:
        df: Input DataFrame
        
    Returns:
        Dictionary with lists of column names by type:
        - 'numeric': Numeric columns (int, float)
        - 'categorical': Categorical/string columns
        - 'date': Datetime columns
    """
    result = {
        'numeric': [],
        'categorical': [],
        'date': []
    }
    
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            result['date'].append(col)
        elif pd.api.types.is_numeric_dtype(df[col]):
            result['numeric'].append(col)
        else:
            result['categorical'].append(col)
    
    return result


def get_dataframe_info(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Get basic information about the DataFrame.
    
    Args:
        df: Input DataFrame
        
    Returns:
        Dictionary containing:
        - row_count: Number of rows
        - column_count: Number of columns
        - column_types: Dictionary of column types
        - missing_values: Dictionary of missing value counts per column
    """
    return {
        'row_count': len(df),
        'column_count': len(df.columns),
        'columns': list(df.columns),
        'column_types': detect_columns(df),
        'missing_values': df.isnull().sum().to_dict()
    }
