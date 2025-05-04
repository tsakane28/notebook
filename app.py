"""
Data Analytics Dashboard - Main Application

This module serves as the entry point for the dashboard application,
defining routes, API endpoints, and business logic.
"""

import os
import json
import uuid
from datetime import datetime
from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory

# Local imports
from utils.data_processor import validate_csv, transform_data, analyze_data
from utils.model_trainer import train_model, evaluate_model

# Initialize Flask application
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'data/uploads'
app.config['MODELS_FOLDER'] = 'data/models'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

# Ensure required directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['MODELS_FOLDER'], exist_ok=True)

# In-memory dataset storage (in production, use a database)
DATASETS = {}


@app.route('/')
def index():
    """Render the landing page"""
    return render_template('index.html', current_year=datetime.now().year)


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
            # Store dataset info
            DATASETS[dataset_id] = {
                'id': dataset_id,
                'filename': file.filename,
                'path': file_path,
                'upload_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'processed': False
            }
            
            return jsonify({
                'success': True, 
                'dataset_id': dataset_id,
                'message': 'File uploaded successfully'
            })
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
    if dataset_id not in DATASETS:
        return redirect(url_for('index'))
    
    dataset = DATASETS[dataset_id]
    
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
    if dataset_id not in DATASETS:
        return jsonify({'success': False, 'error': 'Dataset not found'}), 404
    
    dataset = DATASETS[dataset_id]
    
    # Process data if not already processed
    if not dataset.get('processed'):
        try:
            # Process and analyze data
            transformed_data = transform_data(dataset['path'])
            analysis_result = analyze_data(transformed_data)
            
            # Store processed data
            dataset['data'] = transformed_data
            dataset['stats'] = analysis_result['stats']
            dataset['filter_options'] = analysis_result['filter_options']
            dataset['processed'] = True
            
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    # Return data for dashboard
    return jsonify({
        'success': True,
        'row_count': len(dataset.get('data', [])),
        'column_count': len(dataset.get('stats', {})),
        'stats': dataset.get('stats', {}),
        'filter_options': dataset.get('filter_options', {})
    })


@app.route('/api/filter-data', methods=['POST'])
def filter_data():
    """API endpoint to filter data based on criteria"""
    data = request.json
    dataset_id = data.get('id')
    filters = data.get('filters', {})
    
    if not dataset_id or dataset_id not in DATASETS:
        return jsonify({'success': False, 'error': 'Dataset not found'}), 404
    
    dataset = DATASETS[dataset_id]
    
    if not dataset.get('processed'):
        return jsonify({'success': False, 'error': 'Dataset not processed yet'}), 400
    
    try:
        # Apply filters to data
        filtered_data = dataset['data']
        
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
def train_model_endpoint(dataset_id):
    """API endpoint to train a model on the dataset"""
    if dataset_id not in DATASETS:
        return jsonify({'success': False, 'error': 'Dataset not found'}), 404
    
    dataset = DATASETS[dataset_id]
    
    if not dataset.get('processed'):
        return jsonify({'success': False, 'error': 'Dataset not processed yet'}), 400
    
    data = request.json
    target_column = data.get('target_column')
    model_type = data.get('model_type', 'classifier')
    preprocessing = data.get('preprocessing', {})
    exclude_columns = data.get('exclude_columns', [])
    
    if not target_column:
        return jsonify({'success': False, 'error': 'Target column not specified'}), 400
    
    try:
        # Train model
        model_result = train_model(
            dataset['data'], 
            target_column, 
            model_type=model_type,
            preprocessing=preprocessing,
            exclude_columns=exclude_columns
        )
        
        # Evaluate model
        evaluation = evaluate_model(model_result['model'], model_result['test_data'], target_column)
        
        # Store model info
        model_id = str(uuid.uuid4())
        model_path = os.path.join(app.config['MODELS_FOLDER'], f"{model_id}.pkl")
        
        # Save model info (not the actual model in this example)
        model_info = {
            'id': model_id,
            'dataset_id': dataset_id,
            'target_column': target_column,
            'model_type': model_type,
            'features': model_result['features'],
            'metrics': evaluation['metrics'],
            'feature_importance': evaluation.get('feature_importance', {}),
            'path': model_path,
            'created': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'training_samples': len(model_result['train_data']),
            'test_samples': len(model_result['test_data'])
        }
        
        # Store in dataset
        if 'models' not in dataset:
            dataset['models'] = []
        
        dataset['models'].append(model_info)
        
        return jsonify({
            'success': True,
            'model': model_info
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/insights', methods=['POST'])
def generate_insights():
    """API endpoint to generate AI insights about the data"""
    data = request.json
    dataset_id = data.get('id')
    prompt = data.get('prompt', '')
    filters = data.get('filters', {})
    
    if not dataset_id or dataset_id not in DATASETS:
        return jsonify({'success': False, 'error': 'Dataset not found'}), 404
    
    dataset = DATASETS[dataset_id]
    
    if not dataset.get('processed'):
        return jsonify({'success': False, 'error': 'Dataset not processed yet'}), 400
    
    try:
        # Generate some basic insights based on the data
        # In a real application, this might call an AI model or service
        
        stats = dataset['stats']
        categorical_cols = [col for col, stat in stats.items() if stat.get('type') == 'categorical']
        numeric_cols = [col for col, stat in stats.items() if stat.get('type') == 'numeric']
        
        insights = ""
        
        if prompt:
            insights += f"Based on your question: '{prompt}'\n\n"
        
        # Add categorical insights
        if categorical_cols:
            insights += "**Categorical Data Insights:**\n\n"
            for col in categorical_cols[:3]:  # Limit to first 3
                values = stats[col].get('value_counts', {})
                if values:
                    top_value = max(values.items(), key=lambda x: x[1])
                    insights += f"* The most common {col} is '{top_value[0]}' with {top_value[1]} occurrences.\n"
        
        # Add numeric insights
        if numeric_cols:
            insights += "\n**Numeric Data Insights:**\n\n"
            for col in numeric_cols[:3]:  # Limit to first 3
                mean = stats[col].get('mean')
                median = stats[col].get('median')
                min_val = stats[col].get('min')
                max_val = stats[col].get('max')
                
                if all(v is not None for v in [mean, median, min_val, max_val]):
                    insights += f"* {col}: Average is {mean:.2f} (median: {median:.2f}), ranging from {min_val:.2f} to {max_val:.2f}.\n"
        
        # Add any filter context
        if filters:
            insights += "\n**Filter Context:**\n\n"
            insights += "* This analysis is filtered to include only data where:\n"
            for col, val in filters.items():
                insights += f"  - {col} is '{val}'\n"
        
        # Add a conclusion
        insights += "\n**Summary:**\n\n"
        insights += "* The data shows typical patterns and distributions for this type of dataset.\n"
        insights += "* Consider exploring relationships between variables using the scatter plot feature.\n"
        insights += "* For deeper insights, try training a model with a specific target variable.\n"
        
        return jsonify({
            'success': True,
            'insights': insights,
            'model_used': 'Basic Statistical Analysis'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000) 
