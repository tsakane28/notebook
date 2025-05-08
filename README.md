# AI Adoption Dashboard

A comprehensive tool for data analysis and AI model training with an intuitive web interface.

## Features

- Data upload and visualization
- Exploratory data analysis with statistics
- Machine learning model training
- Model evaluation and comparison
- Saved models management
- Interactive data preview with search and pagination

## Setup and Installation

### Prerequisites

- Python 3.7+
- pip (Python package manager)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/ai-adoption-dashboard.git
   cd ai-adoption-dashboard
   ```

2. Create a virtual environment:
   ```
   python -m venv env
   source env/bin/activate  # On Windows: env\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Run the application:
   ```
   python app.py
   ```

5. Access the dashboard at http://127.0.0.1:5000/

## Deployment

This application can be deployed to Vercel. See [README_DEPLOY.md](README_DEPLOY.md) for detailed deployment instructions.

## Usage

1. Upload a CSV file containing your dataset
2. Explore the data with automatic visualizations and statistics
3. Train machine learning models on your data
4. Compare model performance and select the best one
5. Save models for future use

## Project Structure

```
.
├── app.py                  # Main Flask application
├── static/                 # Static files (CSS, JS)
├── templates/              # HTML templates
├── data/                   # Data storage
│   ├── uploads/            # Uploaded datasets
│   └── models/             # Saved models
├── utils/                  # Utility modules
│   ├── data_processor.py   # Data processing functions
│   └── model_trainer.py    # Model training functions
└── requirements.txt        # Python dependencies
```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 