"""
Data Analytics Dashboard - Main Application

This module serves as the entry point for the dashboard application,
defining routes, API endpoints, and business logic.
"""

import os
import json
import uuid
import sqlite3
from datetime import datetime
from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.svm import SVR
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
import joblib
import pickle

# Local imports
from utils.data_processor import validate_csv, transform_data, analyze_data
from utils.model_trainer import train_model, evaluate_model

# Initialize Flask application
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'data/uploads'
app.config['MODELS_FOLDER'] = 'data/models'
app.config['DATABASE'] = 'data/dashboard.db'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
app.secret_key = os.urandom(24)  # For session management

# Ensure required directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['MODELS_FOLDER'], exist_ok=True)
os.makedirs('data', exist_ok=True)

# Database initialization
def get_db_connection():
    """Get a connection to the SQLite database"""
    conn = sqlite3.connect(app.config['DATABASE'])
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with required tables"""
    conn = get_db_connection()
    conn.execute('''
    CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        path TEXT NOT NULL,
        upload_date TEXT NOT NULL,
        processed INTEGER DEFAULT 0,
        stats TEXT,
        filter_options TEXT
    )
    ''')
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

# Create a directory for storing models if it doesn't exist
if not os.path.exists('models'):
    os.makedirs('models')

# Database of datasets (in-memory for demo)
datasets = {}

# Database of models (in-memory for demo)
models = {}

@app.route('/')
def index():
    """Render the landing page"""
    # Get recent datasets for the homepage
    conn = get_db_connection()
    datasets = conn.execute('SELECT id, filename, upload_date FROM datasets ORDER BY upload_date DESC LIMIT 5').fetchall()
    conn.close()
    
    # Convert to a list of dictionaries
    dataset_list = [dict(dataset) for dataset in datasets] if datasets else []
    
    return render_template('index.html', 
                          current_year=datetime.now().year,
                          datasets=dataset_list)


@app.route('/upload', methods=['GET', 'POST'])
def upload_file():
    """Handle file upload form and validation"""
    if request.method == 'GET':
        # Render the upload form for GET requests
        return render_template('upload.html', current_year=datetime.now().year)
    
    # Process the file upload for POST requests
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400
    
    if file and file.filename.endswith('.csv'):
        # Generate unique ID for the dataset
        dataset_id = str(uuid.uuid4())
        
        # Save file
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{dataset_id}.csv")
        file.save(file_path)
        
        # Validate and process file
        validation_result = validate_csv(file_path)
        
        if validation_result['valid']:
            # Store dataset info in database
            conn = get_db_connection()
            conn.execute(
                'INSERT INTO datasets (id, filename, path, upload_date) VALUES (?, ?, ?, ?)',
                (dataset_id, file.filename, file_path, datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
            )
            conn.commit()
            conn.close()
            
            # Check if request wants JSON response (for API clients)
            if request.headers.get('Accept') == 'application/json':
                return jsonify({
                    'success': True, 
                    'dataset_id': dataset_id,
                    'message': 'File uploaded successfully',
                    'redirect_url': url_for('dashboard', dataset_id=dataset_id)
                })
            
            # For regular form submissions, redirect to dashboard
            return redirect(url_for('dashboard', dataset_id=dataset_id))
        else:
            # If validation failed, return error
            os.remove(file_path)  # Clean up the invalid file
            return jsonify({
                'success': False,
                'error': f"Validation failed: {validation_result['message']}"
            }), 400
    
    return jsonify({'success': False, 'error': 'Invalid file type'}), 400


@app.route('/dashboard/<dataset_id>')
def dashboard(dataset_id):
    """Render the dashboard for a specific dataset"""
    # Get dataset from database
    conn = get_db_connection()
    dataset = conn.execute('SELECT * FROM datasets WHERE id = ?', (dataset_id,)).fetchone()
    conn.close()
    
    if not dataset:
        return redirect(url_for('index'))
    
    # Convert to dictionary
    dataset = dict(dataset)
    
    return render_template(
        'dashboard.html',
        dataset_id=dataset_id,
        dataset_name=dataset['filename'],
        upload_date=dataset['upload_date'],
        current_year=datetime.now().year
    )


@app.route('/api/data/<dataset_id>')
def get_data(dataset_id):
    """API endpoint to get processed data for the dashboard"""
    # Get dataset from database
    conn = get_db_connection()
    dataset = conn.execute('SELECT * FROM datasets WHERE id = ?', (dataset_id,)).fetchone()
    
    if not dataset:
        return jsonify({'success': False, 'error': 'Dataset not found'}), 404
    
    # Convert to dictionary
    dataset = dict(dataset)
    
    # Process data if not already processed
    if not dataset.get('processed'):
        try:
            # Process and analyze data
            transformed_data = transform_data(dataset['path'])
            analysis_result = analyze_data(transformed_data)
            
            # Store processed data in database
            conn.execute(
                'UPDATE datasets SET processed = 1, stats = ?, filter_options = ? WHERE id = ?',
                (
                    json.dumps(analysis_result['stats']),
                    json.dumps(analysis_result.get('filter_options', {})),
                    dataset_id
                )
            )
            conn.commit()
            
            # Update our local copy
            dataset['stats'] = analysis_result['stats']
            dataset['filter_options'] = analysis_result.get('filter_options', {})
            
        except Exception as e:
            conn.close()
            return jsonify({'success': False, 'error': str(e)}), 500
    else:
        # Parse JSON strings from database
        try:
            dataset['stats'] = json.loads(dataset['stats'])
            dataset['filter_options'] = json.loads(dataset.get('filter_options', '{}'))
        except:
            dataset['stats'] = {}
            dataset['filter_options'] = {}
    
    conn.close()
    
    # Return data for dashboard
    return jsonify({
        'success': True,
        'row_count': len(transform_data(dataset['path'])) if os.path.exists(dataset['path']) else 0,
        'column_count': len(dataset['stats']) if dataset['stats'] else 0,
        'stats': dataset['stats'],
        'filter_options': dataset['filter_options']
    })


@app.route('/api/data-preview/<dataset_id>')
def get_data_preview(dataset_id):
    """API endpoint to get a data preview for the dashboard"""
    # Get dataset from database
    conn = get_db_connection()
    dataset = conn.execute('SELECT * FROM datasets WHERE id = ?', (dataset_id,)).fetchone()
    conn.close()
    
    if not dataset:
        return jsonify({'success': False, 'error': 'Dataset not found'}), 404
    
    # Convert to dictionary
    dataset = dict(dataset)
    
    try:
        # Load data but limit to first 10 rows for preview
        file_path = dataset['path']
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'error': 'Dataset file not found'}), 404
        
        # Get the data
        all_data = transform_data(file_path)
        
        # Limit to first 10 rows for preview
        preview_data = all_data[:10]
        
        if not preview_data:
            return jsonify({'success': False, 'error': 'No data available for preview'}), 400
        
        # Extract columns from first row
        columns = list(preview_data[0].keys())
        
        # Convert to rows for table display
        rows = []
        for item in preview_data:
            row = [item.get(col, '') for col in columns]
            rows.append(row)
        
        return jsonify({
            'success': True,
            'preview': {
                'columns': columns,
                'rows': rows
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/filter-data', methods=['POST'])
def filter_data():
    """API endpoint to filter data based on criteria"""
    data = request.json
    dataset_id = data.get('id')
    filters = data.get('filters', {})
    
    # Get dataset from database
    conn = get_db_connection()
    dataset = conn.execute('SELECT * FROM datasets WHERE id = ?', (dataset_id,)).fetchone()
    conn.close()
    
    if not dataset:
        return jsonify({'success': False, 'error': 'Dataset not found'}), 404
    
    # Convert to dictionary
    dataset = dict(dataset)
    
    if not dataset.get('processed'):
        return jsonify({'success': False, 'error': 'Dataset not processed yet'}), 400
    
    try:
        # Load the data
        all_data = transform_data(dataset['path'])
        
        # Apply filters
        filtered_data = all_data
        for column, value in filters.items():
            filtered_data = [row for row in filtered_data if str(row.get(column, '')).lower() == str(value).lower()]
        
        # Analyze filtered data
        analysis_result = analyze_data(filtered_data)
        
        return jsonify({
            'success': True,
            'row_count': len(filtered_data),
            'column_count': len(analysis_result['stats']),
            'stats': analysis_result['stats'],
            'filter_options': analysis_result['filter_options']
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/train_model/<dataset_id>', methods=['POST'])
def train_model(dataset_id):
    """
    Train a machine learning model on the dataset.
    
    Args:
        dataset_id: The ID of the dataset to train the model on.
        
    Returns:
        JSON response with model results or error.
    """
    try:
        # Get the request data
        data = request.get_json()
        target_column = data.get('target_column')
        model_type = data.get('model_type', 'LinearRegression')
        params = data.get('params', {})
        test_size = data.get('test_size', 0.2)
        use_cross_validation = data.get('use_cross_validation', False)
        model_name = data.get('model_name', f"{target_column}_{model_type}_model")
        
        # Validate inputs
        if not target_column:
            return jsonify({"success": False, "error": "Target column is required"})
        
        # Get the dataset
        conn = get_db_connection()
        dataset = conn.execute('SELECT * FROM datasets WHERE id = ?', (dataset_id,)).fetchone()
        conn.close()
        
        if not dataset:
            return jsonify({"success": False, "error": "Dataset not found"})
        
        # Convert to dictionary
        dataset = dict(dataset)
        
        # Load the actual data from the file
        if not os.path.exists(dataset['path']):
            return jsonify({"success": False, "error": "Dataset file not found"})
        
        # Load data using pandas
        try:
            df = pd.read_csv(dataset['path'])
        except Exception as e:
            return jsonify({"success": False, "error": f"Error reading dataset: {str(e)}"})
        
        # Check if target column exists in the dataset
        if target_column not in df.columns:
            return jsonify({"success": False, "error": f"Target column '{target_column}' not found in dataset"})
        
        # Check if target column is categorical and convert if needed
        target = df[target_column]
        target_mapping = {}
        is_categorical_target = False
        
        # Check if target column has string values
        if target.dtype == 'object' or pd.api.types.is_categorical_dtype(target):
            is_categorical_target = True
            # Create a mapping from categorical values to numbers
            unique_values = target.unique()
            target_mapping = {val: idx for idx, val in enumerate(unique_values)}
            # Convert target to numeric values
            target = target.map(target_mapping)
            
            # Check if conversion succeeded
            if target.isna().any():
                return jsonify({
                    "success": False, 
                    "error": f"Could not convert all values in target column '{target_column}' to numeric"
                })
        
        # Extract features
        features = df.drop(columns=[target_column])
        
        # Handle categorical features in the feature set
        features = pd.get_dummies(features)
        
        # Split the data
        X_train, X_test, y_train, y_test = train_test_split(
            features, target, test_size=test_size, random_state=42
        )
        
        # Initialize the model based on type
        model = initialize_model(model_type, params)
        
        # Train the model
        if use_cross_validation:
            # Import cross_val_score if needed
            from sklearn.model_selection import cross_val_score
            # Perform cross-validation
            cv_scores = cross_val_score(model, features, target, cv=5)
            model.fit(X_train, y_train)
        else:
            # Standard training
            model.fit(X_train, y_train)
        
        # Make predictions on test set
        y_pred = model.predict(X_test)
        
        # Calculate metrics
        metrics = calculate_metrics(y_test, y_pred)
        
        # Get feature importance if applicable
        feature_importance = {}
        if hasattr(model, 'feature_importances_'):
            # For tree-based models
            feature_importance = dict(zip(features.columns, model.feature_importances_))
        elif hasattr(model, 'coef_'):
            # For linear models
            if len(model.coef_.shape) == 1:
                # Regression
                importance_values = abs(model.coef_)
                # Normalize to sum to 1
                importance_values = importance_values / importance_values.sum()
                feature_importance = dict(zip(features.columns, importance_values))
            else:
                # Classification
                importance_values = np.mean(abs(model.coef_), axis=0)
                # Normalize to sum to 1
                importance_values = importance_values / importance_values.sum()
                feature_importance = dict(zip(features.columns, importance_values))
        
        # Add cross-validation results if applicable
        if use_cross_validation:
            metrics['cv_mean_score'] = cv_scores.mean()
            metrics['cv_std_score'] = cv_scores.std()
        
        # Prepare sample of predictions for visualization
        sample_indices = np.random.choice(len(y_test), min(50, len(y_test)), replace=False)
        
        # If target was categorical, map predictions back to original categories for display
        if is_categorical_target:
            # Reverse the mapping for display
            reverse_mapping = {idx: val for val, idx in target_mapping.items()}
            
            # For actual values, map from numeric back to original categories
            actual_values = [reverse_mapping.get(val, val) for val in y_test.iloc[sample_indices].tolist()]
            
            # For predictions, we need to round to nearest integer first (for regression models)
            # then map back to original categories
            pred_values = [reverse_mapping.get(round(val), val) for val in y_pred[sample_indices].tolist()]
            
            predictions = {
                'actual': actual_values,
                'predicted': pred_values,
                'categorical_mapping': target_mapping  # Include the mapping for reference
            }
        else:
            # For numeric targets, use values directly
            predictions = {
                'actual': y_test.iloc[sample_indices].tolist(),
                'predicted': y_pred[sample_indices].tolist()
            }
        
        # Save the trained model
        model_info = {
            'is_categorical_target': is_categorical_target,
            'target_mapping': target_mapping if is_categorical_target else {}
        }
        model_id = save_model(dataset_id, model, target_column, model_type, metrics, model_name, model_info)
        
        # Return the results
        return jsonify({
            "success": True,
            "model_id": model_id,
            "model_name": model_name,
            "target_column": target_column,
            "model_type": model_type,
            "params": params,
            "metrics": metrics,
            "feature_importance": feature_importance,
            "predictions": predictions,
            "is_categorical_target": is_categorical_target,
            "target_mapping": target_mapping if is_categorical_target else {}
        })
    
    except Exception as e:
        app.logger.error(f"Error training model: {str(e)}")
        return jsonify({"success": False, "error": f"Error training model: {str(e)}"})

def initialize_model(model_type, params):
    """
    Initialize a machine learning model based on the given type and parameters.
    
    Args:
        model_type: Type of model to initialize
        params: Parameters for the model
        
    Returns:
        Initialized model
    """
    if model_type == 'LinearRegression':
        return LinearRegression(
            fit_intercept=params.get('fit_intercept', True),
            normalize=params.get('normalize', False)
        )
    elif model_type == 'RandomForest':
        return RandomForestRegressor(
            n_estimators=params.get('n_estimators', 100),
            max_depth=params.get('max_depth', None),
            min_samples_split=params.get('min_samples_split', 2),
            min_samples_leaf=params.get('min_samples_leaf', 1),
            random_state=42
        )
    elif model_type == 'GradientBoosting':
        return GradientBoostingRegressor(
            n_estimators=params.get('n_estimators', 100),
            learning_rate=params.get('learning_rate', 0.1),
            max_depth=params.get('max_depth', 3),
            subsample=params.get('subsample', 1.0),
            random_state=42
        )
    elif model_type == 'SVM':
        return SVR(
            kernel=params.get('kernel', 'rbf'),
            C=params.get('C', 1.0),
            gamma=params.get('gamma', 'scale')
        )
    else:
        raise ValueError(f"Unsupported model type: {model_type}")

def calculate_metrics(y_true, y_pred):
    """
    Calculate regression metrics.
    
    Args:
        y_true: True values
        y_pred: Predicted values
        
    Returns:
        Dict of metrics
    """
    metrics = {
        'r2_score': r2_score(y_true, y_pred),
        'mean_absolute_error': mean_absolute_error(y_true, y_pred),
        'mean_squared_error': mean_squared_error(y_true, y_pred),
        'root_mean_squared_error': np.sqrt(mean_squared_error(y_true, y_pred))
    }
    return metrics

def save_model(dataset_id, model, target_column, model_type, metrics, model_name, model_info=None):
    """
    Save the trained model for future use.
    
    Args:
        dataset_id: ID of the dataset
        model: Trained model
        target_column: Target column name
        model_type: Type of model
        metrics: Model performance metrics
        model_name: User-provided name for the model
        model_info: Additional model information like categorical mappings
    """
    # Create a models directory if it doesn't exist
    os.makedirs('models', exist_ok=True)
    
    # Generate a unique model ID
    model_id = str(uuid.uuid4())
    
    # Save the model with pickle
    model_path = f"models/{model_id}.pkl"
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    
    # Current timestamp for created_at
    now = datetime.now().isoformat()
    
    # Create model info
    model_data = {
        'id': model_id,
        'dataset_id': dataset_id,
        'name': model_name,
        'target_column': target_column,
        'model_type': model_type,
        'model_path': model_path,
        'metrics': metrics,
        'created_at': now
    }
    
    # Add any additional model info
    if model_info:
        model_data.update(model_info)
    
    # Save model info to JSON file
    info_path = f"models/{model_id}_info.json"
    with open(info_path, 'w') as f:
        json.dump(model_data, f, indent=2)
    
    # Add to in-memory models database
    models[model_id] = model_data
    
    return model_id

@app.route('/api/insights', methods=['POST'])
def generate_insights():
    """API endpoint to generate insights about the data"""
    data = request.json
    dataset_id = data.get('dataset_id')
    prompt = data.get('prompt')
    
    if not dataset_id or not prompt:
        return jsonify({'success': False, 'error': 'Missing dataset ID or prompt'}), 400
    
    # Get dataset from database
    conn = get_db_connection()
    dataset = conn.execute('SELECT * FROM datasets WHERE id = ?', (dataset_id,)).fetchone()
    conn.close()
    
    if not dataset:
        return jsonify({'success': False, 'error': 'Dataset not found'}), 404
    
    # Convert to dictionary
    dataset = dict(dataset)
    
    try:
        # Load the data
        all_data = transform_data(dataset['path'])
        
        # Generate a simple insight (in a real app, this would use LLM or other AI)
        # Here we're just returning a template response
        stats = json.loads(dataset['stats']) if isinstance(dataset['stats'], str) else dataset['stats']
        
        columns = list(stats.keys())
        row_count = len(all_data)
        
        # Create a simple insight
        insight = f"""
        <h3>Analysis of "{prompt}"</h3>
        <p>Your dataset contains {row_count} rows and {len(columns)} columns. 
        The main columns are: {', '.join(columns[:5])}.</p>
        
        <p>Based on your question, here are some key observations:</p>
        <ul>
        """
        
        # Add some sample insights
        numeric_columns = [col for col, info in stats.items() if info.get('type') == 'numeric']
        categorical_columns = [col for col, info in stats.items() if info.get('type') == 'categorical']
        
        if numeric_columns:
            for col in numeric_columns[:2]:
                col_stats = stats[col]
                insight += f"<li>The average {col} is {col_stats.get('mean', 0):.2f}, ranging from {col_stats.get('min', 0):.2f} to {col_stats.get('max', 0):.2f}.</li>"
        
        if categorical_columns:
            for col in categorical_columns[:2]:
                col_stats = stats[col]
                top_category = max(col_stats.get('value_counts', {}).items(), key=lambda x: x[1])[0]
                total = sum(col_stats.get('value_counts', {}).values())
                percentage = col_stats.get('value_counts', {}).get(top_category, 0) / total * 100 if total else 0
                insight += f"<li>The most common {col} is '{top_category}' ({percentage:.1f}% of all records).</li>"
        
        insight += "</ul>"
        
        # Add a simple recommendation
        insight += """
        <h4>Recommendations</h4>
        <p>Based on this analysis, you might want to:</p>
        <ol>
            <li>Explore the correlation between numeric variables to find relationships</li>
            <li>Check for outliers in the data that might be skewing results</li>
            <li>Consider creating visualizations to better understand patterns</li>
        </ol>
        """
        
        return jsonify({
            'success': True,
            'insights': insight
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# Serve static files if needed
@app.route('/static/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory('static', path)

@app.route('/api/saved_models/<dataset_id>')
def get_saved_models(dataset_id):
    # Get all models for this dataset
    dataset_models = [model for model_id, model in models.items() if model['dataset_id'] == dataset_id]
    
    # Sort by creation date, newest first
    dataset_models.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    
    return jsonify({
        'success': True,
        'models': dataset_models
    })

@app.route('/api/model/<model_id>')
def get_model(model_id):
    # Check if model exists
    if model_id not in models:
        return jsonify({
            'success': False,
            'error': 'Model not found'
        })
    
    # Return model info
    return jsonify({
        'success': True,
        **models[model_id]
    })

@app.route('/api/model/<model_id>', methods=['DELETE'])
def delete_model(model_id):
    # Check if model exists
    if model_id not in models:
        return jsonify({
            'success': False,
            'error': 'Model not found'
        })
    
    try:
        # Delete model file
        model_path = os.path.join('models', f'{model_id}.pkl')
        if os.path.exists(model_path):
            os.remove(model_path)
        
        # Delete model info file
        model_info_path = os.path.join('models', f'{model_id}_info.json')
        if os.path.exists(model_info_path):
            os.remove(model_info_path)
        
        # Remove from in-memory database
        models.pop(model_id)
        
        return jsonify({
            'success': True,
            'message': 'Model deleted successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error deleting model: {str(e)}'
        })

# Load saved models on startup
def load_saved_models():
    if os.path.exists('models'):
        for filename in os.listdir('models'):
            if filename.endswith('_info.json'):
                try:
                    model_id = filename.replace('_info.json', '')
                    with open(os.path.join('models', filename), 'r') as f:
                        model_info = json.load(f)
                        models[model_id] = model_info
                except Exception as e:
                    print(f"Error loading model {filename}: {e}")

# Call on startup
load_saved_models()

# Start the app
if __name__ == '__main__':
    app.run(debug=True) 
