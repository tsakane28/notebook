"""
Data Processor Module

This module handles data validation, transformation, and analysis
for the dashboard application.
"""

import os
import csv
import json
import re
from collections import defaultdict
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, OneHotEncoder
import pickle

# Constants
ENCODERS_DIR = 'data/encoders'
os.makedirs(ENCODERS_DIR, exist_ok=True)


def validate_csv(file_path):
    """
    Validate a CSV file to ensure it contains the required columns and data.
    
    Args:
        file_path: Path to the CSV file
        
    Returns:
        dict: Validation result with keys 'valid' and 'message'
    """
    if not os.path.exists(file_path):
        return {'valid': False, 'message': 'File not found.'}
    
    try:
        # Check if file is empty
        if os.path.getsize(file_path) == 0:
            return {'valid': False, 'message': 'File is empty.'}
        
        # Read the CSV file
        df = pd.read_csv(file_path)
        
        if df.empty:
            return {'valid': False, 'message': 'No data found in the file.'}
        
        # Basic column count check
        if len(df.columns) < 2:
            return {'valid': False, 'message': 'File must contain at least 2 columns.'}
        
        # Check for duplicate column names
        if len(df.columns) != len(set(df.columns)):
            return {'valid': False, 'message': 'File contains duplicate column names.'}
        
        # Check for empty columns
        empty_cols = [col for col in df.columns if df[col].isna().all()]
        if empty_cols:
            return {
                'valid': False, 
                'message': f'File contains empty columns: {", ".join(empty_cols)}'
            }
        
        # Ensure there are at least some numeric columns for visualization
        numeric_cols = df.select_dtypes(include=['number']).columns
        if len(numeric_cols) == 0:
            return {
                'valid': False, 
                'message': 'File must contain at least one numeric column for visualization.'
            }
        
        return {'valid': True, 'message': 'File validation successful.'}
        
    except Exception as e:
        return {'valid': False, 'message': f'Error validating file: {str(e)}'}


def transform_data(file_path, save_encoders=True, encoders_dir=ENCODERS_DIR):
    """
    Transform CSV data for analysis and visualization.
    
    Args:
        file_path: Path to the CSV file
        save_encoders: Whether to save encoders for later use
        encoders_dir: Directory to save encoders
        
    Returns:
        list: Transformed data as a list of dictionaries
    """
    # Read the CSV file
    df = pd.read_csv(file_path)
    
    # Remove rows with all NaN values
    df = df.dropna(how='all')
    
    # Fill NaN values
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            # Fill numeric columns with median
            df[col] = df[col].fillna(df[col].median())
        else:
            # Fill categorical columns with 'Unknown'
            df[col] = df[col].fillna('Unknown')
    
    # Identify categorical columns (non-numeric with few unique values)
    categorical_cols = []
    for col in df.columns:
        if not pd.api.types.is_numeric_dtype(df[col]) and df[col].nunique() < 20:
            categorical_cols.append(col)
    
    # Identify numeric columns
    numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
    
    # Store encoders
    encoders = {}
    
    # Encode categorical columns
    for col in categorical_cols:
        # Get unique values for the column
        unique_values = df[col].unique().tolist()
        
        # Create an encoder
        encoder = {value: i for i, value in enumerate(unique_values)}
        encoders[col] = encoder
    
    # Save encoders if requested
    if save_encoders:
        os.makedirs(encoders_dir, exist_ok=True)
        with open(os.path.join(encoders_dir, 'encoders.pkl'), 'wb') as f:
            pickle.dump(encoders, f)
    
    # Convert to list of dictionaries
    return df.to_dict(orient='records')


def analyze_data(data):
    """
    Analyze data to extract statistics and filter options.
    
    Args:
        data: List of dictionaries containing the data
        
    Returns:
        dict: Analysis results including statistics and filter options
    """
    if not data:
        return {'stats': {}, 'filter_options': {}}
    
    # Convert to DataFrame for easier analysis
    df = pd.DataFrame(data)
    
    # Initialize stats dictionary
    stats = {}
    filter_options = {}
    
    # Analyze each column
    for col in df.columns:
        # Check if column is numeric
        is_numeric = pd.api.types.is_numeric_dtype(df[col])
        
        if is_numeric:
            # Numeric column stats
            stats[col] = {
                'type': 'numeric',
                'min': float(df[col].min()),
                'max': float(df[col].max()),
                'mean': float(df[col].mean()),
                'median': float(df[col].median()),
                'std': float(df[col].std()),
                'unique_values': int(df[col].nunique())
            }
        else:
            # Categorical column stats
            value_counts = df[col].value_counts().to_dict()
            
            # Convert any non-string keys to strings for JSON compatibility
            value_counts = {str(k): int(v) for k, v in value_counts.items()}
            
            stats[col] = {
                'type': 'categorical',
                'unique_values': int(df[col].nunique()),
                'value_counts': value_counts
            }
            
            # Add to filter options if it has a reasonable number of unique values
            if df[col].nunique() < 20:
                filter_options[col] = sorted(df[col].unique().tolist())
    
    return {
        'stats': stats,
        'filter_options': filter_options
    } 