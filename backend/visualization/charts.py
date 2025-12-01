"""
charts.py - Visualization Module

This module provides functions for generating interactive Plotly charts.
Supports line, bar, scatter, and histogram charts.
"""

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from typing import Dict, Any, Optional, List
from backend.analysis.preprocessing import detect_columns


def generate_line_chart(df: pd.DataFrame, x_col: Optional[str] = None, 
                        y_col: Optional[str] = None, title: str = "Line Chart") -> str:
    """
    Generate an interactive line chart.
    
    Auto-selects columns if not specified:
    - X: First date column, or index
    - Y: First numeric column
    
    Args:
        df: Input DataFrame
        x_col: Column name for X axis
        y_col: Column name for Y axis
        title: Chart title
        
    Returns:
        JSON string representation of the Plotly figure
    """
    column_types = detect_columns(df)
    
    # Auto-select X column (prefer date, fallback to index)
    if x_col is None:
        if column_types['date']:
            x_col = column_types['date'][0]
        else:
            # Use index as X axis
            df = df.reset_index()
            x_col = 'index'
    
    # Auto-select Y column (first numeric)
    if y_col is None:
        if column_types['numeric']:
            y_col = column_types['numeric'][0]
        else:
            raise ValueError("No numeric column available for Y axis")
    
    # Create line chart
    fig = px.line(
        df, 
        x=x_col, 
        y=y_col, 
        title=title,
        labels={x_col: x_col.replace('_', ' ').title(), 
                y_col: y_col.replace('_', ' ').title()}
    )
    
    # Customize layout
    fig.update_layout(
        template='plotly_white',
        hovermode='x unified',
        xaxis_title=x_col.replace('_', ' ').title(),
        yaxis_title=y_col.replace('_', ' ').title()
    )
    
    # Add markers for better visibility
    fig.update_traces(mode='lines+markers', marker=dict(size=6))
    
    return fig.to_json()


def generate_bar_chart(df: pd.DataFrame, x_col: Optional[str] = None,
                       y_col: Optional[str] = None, title: str = "Bar Chart") -> str:
    """
    Generate an interactive bar chart.
    
    Auto-selects columns if not specified:
    - X: First categorical column, or first date column
    - Y: First numeric column (aggregated by sum)
    
    Args:
        df: Input DataFrame
        x_col: Column name for X axis (categories)
        y_col: Column name for Y axis (values)
        title: Chart title
        
    Returns:
        JSON string representation of the Plotly figure
    """
    column_types = detect_columns(df)
    
    # Auto-select X column (prefer categorical)
    if x_col is None:
        if column_types['categorical']:
            x_col = column_types['categorical'][0]
        elif column_types['date']:
            x_col = column_types['date'][0]
        else:
            # Use index
            df = df.reset_index()
            x_col = 'index'
    
    # Auto-select Y column
    if y_col is None:
        if column_types['numeric']:
            y_col = column_types['numeric'][0]
        else:
            raise ValueError("No numeric column available for Y axis")
    
    # Aggregate data if categorical
    if x_col in column_types['categorical']:
        agg_df = df.groupby(x_col)[y_col].sum().reset_index()
        # Show top categories if too many (configurable via max_categories parameter)
        max_categories = 30
        if len(agg_df) > max_categories:
            agg_df = agg_df.sort_values(y_col, ascending=False).head(max_categories)
    else:
        agg_df = df[[x_col, y_col]].dropna()
    
    # Create bar chart
    fig = px.bar(
        agg_df,
        x=x_col,
        y=y_col,
        title=title,
        labels={x_col: x_col.replace('_', ' ').title(),
                y_col: y_col.replace('_', ' ').title()}
    )
    
    # Customize layout
    fig.update_layout(
        template='plotly_white',
        xaxis_tickangle=-45,
        xaxis_title=x_col.replace('_', ' ').title(),
        yaxis_title=y_col.replace('_', ' ').title()
    )
    
    return fig.to_json()


def generate_histogram(df: pd.DataFrame, col: Optional[str] = None,
                       bins: int = 30, title: str = "Histogram") -> str:
    """
    Generate a histogram for a numeric column.
    
    Args:
        df: Input DataFrame
        col: Column name for histogram
        bins: Number of bins
        title: Chart title
        
    Returns:
        JSON string representation of the Plotly figure
    """
    column_types = detect_columns(df)
    
    # Auto-select column (first numeric)
    if col is None:
        if column_types['numeric']:
            col = column_types['numeric'][0]
        else:
            raise ValueError("No numeric column available for histogram")
    
    # Create histogram
    fig = px.histogram(
        df,
        x=col,
        nbins=bins,
        title=title,
        labels={col: col.replace('_', ' ').title()}
    )
    
    # Customize layout
    fig.update_layout(
        template='plotly_white',
        bargap=0.1,
        xaxis_title=col.replace('_', ' ').title(),
        yaxis_title='Frequency'
    )
    
    return fig.to_json()


def generate_scatter_plot(df: pd.DataFrame, x_col: Optional[str] = None,
                          y_col: Optional[str] = None, color_col: Optional[str] = None,
                          title: str = "Scatter Plot") -> str:
    """
    Generate an interactive scatter plot.
    
    Auto-selects columns if not specified:
    - X: First numeric column
    - Y: Second numeric column
    
    Args:
        df: Input DataFrame
        x_col: Column name for X axis
        y_col: Column name for Y axis
        color_col: Column name for color coding (optional)
        title: Chart title
        
    Returns:
        JSON string representation of the Plotly figure
    """
    column_types = detect_columns(df)
    
    if len(column_types['numeric']) < 2:
        raise ValueError("Scatter plot requires at least 2 numeric columns")
    
    # Auto-select columns
    if x_col is None:
        x_col = column_types['numeric'][0]
    if y_col is None:
        y_col = column_types['numeric'][1]
    
    # Auto-select color column if available
    if color_col is None and column_types['categorical']:
        # Only use color if limited categories
        potential_color = column_types['categorical'][0]
        if df[potential_color].nunique() <= 10:
            color_col = potential_color
    
    # Create scatter plot
    fig = px.scatter(
        df,
        x=x_col,
        y=y_col,
        color=color_col,
        title=title,
        labels={x_col: x_col.replace('_', ' ').title(),
                y_col: y_col.replace('_', ' ').title()}
    )
    
    # Customize layout
    fig.update_layout(
        template='plotly_white',
        xaxis_title=x_col.replace('_', ' ').title(),
        yaxis_title=y_col.replace('_', ' ').title()
    )
    
    # Add trendline
    fig.update_traces(marker=dict(size=8, opacity=0.7))
    
    return fig.to_json()


def generate_chart(df: pd.DataFrame, chart_type: str, 
                   x_col: Optional[str] = None, y_col: Optional[str] = None,
                   **kwargs) -> Dict[str, Any]:
    """
    Main function to generate charts based on type.
    
    Args:
        df: Input DataFrame
        chart_type: Type of chart ('line', 'bar', 'histogram', 'scatter')
        x_col: Column name for X axis
        y_col: Column name for Y axis
        **kwargs: Additional arguments passed to specific chart functions
        
    Returns:
        Dictionary with:
        - success: Boolean
        - chart_json: JSON string of the chart (if successful)
        - error: Error message (if failed)
    """
    chart_functions = {
        'line': generate_line_chart,
        'bar': generate_bar_chart,
        'histogram': generate_histogram,
        'scatter': generate_scatter_plot
    }
    
    if chart_type not in chart_functions:
        return {
            'success': False,
            'error': f"Unknown chart type: {chart_type}. Supported types: {list(chart_functions.keys())}"
        }
    
    try:
        if chart_type == 'histogram':
            chart_json = chart_functions[chart_type](df, col=x_col, **kwargs)
        else:
            chart_json = chart_functions[chart_type](df, x_col=x_col, y_col=y_col, **kwargs)
        
        return {
            'success': True,
            'chart_type': chart_type,
            'chart_json': chart_json
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f"Error generating {chart_type} chart: {str(e)}"
        }


def get_available_charts(df: pd.DataFrame) -> Dict[str, bool]:
    """
    Determine which chart types are available for the given DataFrame.
    
    Args:
        df: Input DataFrame
        
    Returns:
        Dictionary mapping chart types to availability
    """
    column_types = detect_columns(df)
    num_count = len(column_types['numeric'])
    
    return {
        'line': num_count >= 1,
        'bar': num_count >= 1,
        'histogram': num_count >= 1,
        'scatter': num_count >= 2
    }
