"""
Model Trainer Module

This module handles model training and evaluation
for the dashboard application.
"""

import os
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.ensemble import GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score, f1_score, precision_score, recall_score


def train_model(data, target_column, model_type='classifier', preprocessing=None, exclude_columns=None):
    """
    Train a machine learning model on the provided data.
    
    Args:
        data: List of dictionaries containing the data
        target_column: Column to predict
        model_type: Type of model ('classifier' or 'regressor')
        preprocessing: Dictionary of preprocessing options
        exclude_columns: List of columns to exclude from training
        
    Returns:
        dict: Training results including model, features, and metrics
    """
    # Convert to DataFrame
    df = pd.DataFrame(data)
    
    # Ensure target column exists
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' not found in the dataset")
    
    # Get preprocessing options
    if preprocessing is None:
        preprocessing = {}
    
    handle_unknown = preprocessing.get('handle_unknown', 'error')
    handle_missing = preprocessing.get('handle_missing', True)
    encode_categorical = preprocessing.get('encode_categorical', True)
    target_type = preprocessing.get('target_type', None)
    
    # Determine if this is classification or regression
    if target_type is None:
        # Auto-detect if not specified
        if pd.api.types.is_numeric_dtype(df[target_column]):
            target_type = 'numeric'
        else:
            target_type = 'categorical'
    
    # Set model type based on target type
    if target_type == 'numeric' and model_type.lower() in ['classifier', 'classification']:
        model_type = 'regressor'
    elif target_type == 'categorical' and model_type.lower() in ['regressor', 'regression']:
        model_type = 'classifier'
    
    # Create a copy of the target
    y = df[target_column].copy()
    
    # Encode target if it's a classifier
    if model_type.lower() in ['classifier', 'classification']:
        if not pd.api.types.is_numeric_dtype(y):
            label_encoder = LabelEncoder()
            y = label_encoder.fit_transform(y)
    
    # Create features set (X)
    exclude_cols = [target_column]
    if exclude_columns:
        exclude_cols.extend(exclude_columns)
    
    X = df.drop(columns=exclude_cols, errors='ignore')
    
    # Get column names
    feature_names = X.columns.tolist()
    
    # Identify categorical and numeric features
    categorical_cols = []
    numeric_cols = []
    
    for col in feature_names:
        if pd.api.types.is_numeric_dtype(X[col]):
            numeric_cols.append(col)
        else:
            categorical_cols.append(col)
    
    # Create preprocessing pipeline
    # 1. Handle missing values
    if handle_missing:
        # For numeric features
        if numeric_cols:
            # Replace numeric missing values with median
            X[numeric_cols] = X[numeric_cols].fillna(X[numeric_cols].median())
        
        # For categorical features
        if categorical_cols:
            # Replace categorical missing values with 'Unknown'
            X[categorical_cols] = X[categorical_cols].fillna('Unknown')
    
    # 2. Encode categorical features
    if encode_categorical and categorical_cols:
        # Get dummies for categorical columns
        X_encoded = pd.get_dummies(X, columns=categorical_cols, drop_first=False)
        
        # Update feature names
        feature_names = X_encoded.columns.tolist()
        
        # Replace X with encoded version
        X = X_encoded
    
    # Split data into train and test sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Create model based on type
    if model_type.lower() in ['classifier', 'classification']:
        if 'randomforest' in model_type.lower():
            model = RandomForestClassifier(n_estimators=100, random_state=42)
        elif 'gradient' in model_type.lower() or 'boosting' in model_type.lower():
            model = GradientBoostingClassifier(random_state=42)
        else:
            model = LogisticRegression(max_iter=1000, random_state=42)
    else:
        if 'randomforest' in model_type.lower():
            model = RandomForestRegressor(n_estimators=100, random_state=42)
        elif 'gradient' in model_type.lower() or 'boosting' in model_type.lower():
            model = GradientBoostingRegressor(random_state=42)
        else:
            model = LinearRegression()
    
    # Train model
    model.fit(X_train, y_train)
    
    # Convert test data back to original format for evaluation
    test_data = pd.DataFrame(X_test)
    test_data[target_column] = y_test
    test_data = test_data.to_dict(orient='records')
    
    # Convert train data back to original format
    train_data = pd.DataFrame(X_train)
    train_data[target_column] = y_train
    train_data = train_data.to_dict(orient='records')
    
    return {
        'model': model,
        'features': feature_names,
        'test_data': test_data,
        'train_data': train_data,
        'model_type': model_type
    }


def evaluate_model(model, test_data, target_column):
    """
    Evaluate a trained model on test data.
    
    Args:
        model: Trained model
        test_data: Test data as list of dictionaries
        target_column: Target column name
        
    Returns:
        dict: Evaluation metrics
    """
    # Convert to DataFrame
    df = pd.DataFrame(test_data)
    
    # Split features and target
    y_true = df[target_column]
    X_test = df.drop(columns=[target_column])
    
    # Make predictions
    y_pred = model.predict(X_test)
    
    # Calculate metrics based on model type
    metrics = {}
    
    # Check if model is classifier or regressor
    is_classifier = isinstance(model, (RandomForestClassifier, GradientBoostingClassifier, LogisticRegression))
    
    if is_classifier:
        # Classification metrics
        metrics = {
            'accuracy': float(accuracy_score(y_true, y_pred)),
            'f1_score': float(f1_score(y_true, y_pred, average='weighted', zero_division=0)),
            'precision': float(precision_score(y_true, y_pred, average='weighted', zero_division=0)),
            'recall': float(recall_score(y_true, y_pred, average='weighted', zero_division=0))
        }
    else:
        # Regression metrics
        metrics = {
            'mse': float(mean_squared_error(y_true, y_pred)),
            'rmse': float(np.sqrt(mean_squared_error(y_true, y_pred))),
            'r2': float(r2_score(y_true, y_pred))
        }
    
    # Calculate feature importance if available
    feature_importance = {}
    
    if hasattr(model, 'feature_importances_'):
        feature_names = X_test.columns
        importance = model.feature_importances_
        
        # Create a dictionary of feature importances
        for i, feature in enumerate(feature_names):
            feature_importance[feature] = float(importance[i])
        
        # Sort by importance
        feature_importance = dict(sorted(
            feature_importance.items(), 
            key=lambda x: x[1], 
            reverse=True
        ))
    elif hasattr(model, 'coef_'):
        feature_names = X_test.columns
        importance = np.abs(model.coef_)
        
        # Handle multi-class coefficients
        if importance.ndim > 1:
            importance = np.mean(importance, axis=0)
        
        # Create a dictionary of feature importances
        for i, feature in enumerate(feature_names):
            feature_importance[feature] = float(importance[i])
        
        # Sort by importance
        feature_importance = dict(sorted(
            feature_importance.items(), 
            key=lambda x: x[1], 
            reverse=True
        ))
    
    return {
        'metrics': metrics,
        'feature_importance': feature_importance
    } 