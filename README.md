# Data Analytics Dashboard

A professional data visualization and analytics dashboard for exploring CSV datasets, running machine learning models, and generating insights.

![Dashboard Screenshot](docs/dashboard_screenshot.png)

## Features

- **Modern UI**: Clean, responsive interface with intuitive controls
- **Interactive Visualizations**: Dynamic charts and graphs powered by Chart.js
- **Data Filtering**: Filter data by various criteria for focused analysis
- **Model Training**: Train machine learning models on your data
- **AI Insights**: Generate AI-powered insights and recommendations
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Frontend
- HTML5, CSS3, JavaScript
- Chart.js for visualizations
- Modern dashboard layout with grid/flexbox
- Responsive design for multiple devices

### Backend
- Python with Flask
- Data processing with Pandas and NumPy
- Machine learning with Scikit-learn
- Statistical analysis with SciPy

## Getting Started

### Prerequisites
- Python 3.8 or higher
- Virtual environment (recommended)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/tsakane28/data-analytics-dashboard.git
   cd data-analytics-dashboard
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the application:
   ```bash
   python app.py
   ```

5. Open your browser and navigate to http://localhost:5000

## Project Structure

```
data-analytics-dashboard/
├── app.py                  # Main application file
├── requirements.txt        # Python dependencies
├── static/                 # Static assets
│   ├── css/
│   │   └── styles.css      # Main stylesheet
│   ├── js/
│   │   └── dashboard.js    # Dashboard functionality
│   └── img/                # Images and icons
├── templates/              # HTML templates
│   ├── index.html          # Landing page
│   └── dashboard.html      # Dashboard template
├── utils/                  # Utility modules
│   ├── data_processor.py   # Data processing functions
│   ├── model_trainer.py    # ML model training functions
│   └── ai_insights.py      # AI insights generation
├── data/                   # Data storage
│   ├── uploads/            # Uploaded CSV files
│   ├── models/             # Saved ML models
│   └── encoders/           # Saved encoders
└── docs/                   # Documentation
```

## Usage Guide

### Uploading Data
1. From the landing page, click "Upload CSV"
2. Select a CSV file from your computer
3. The system will validate your file and redirect to the dashboard

### Analyzing Data
1. Use the filter options on the left sidebar to refine the data view
2. Explore the automatically generated charts and visualizations
3. Hover over elements to see detailed information

### Training Models
1. Select a target column from the dropdown menu
2. Choose a model type (classifier or regressor)
3. Click "Train Model"
4. View training results and model performance metrics

### Generating Insights
1. Apply filters to focus on specific data segments
2. Enter an optional prompt for custom insights
3. Click "Generate Insights"
4. Review the AI-generated insights displayed in the insights panel

## API Endpoints

The dashboard provides several API endpoints for programmatic interaction:

- `GET /api/data/<dataset_id>`: Retrieve processed dataset
- `POST /api/filter-data`: Filter data based on criteria
- `POST /api/train_model/<dataset_id>`: Train a model on the dataset
- `POST /api/insights`: Generate insights from the data

## Customization

### Themes and Styling
You can customize the dashboard appearance by modifying the CSS variables at the top of `static/css/styles.css`:

```css
:root {
    --primary-color: #2c6bed;
    --secondary-color: #6c757d;
    /* Other variables */
}
```

### Adding New Chart Types
To add new chart types, extend the `createCharts` function in `static/js/dashboard.js` with your custom chart implementation.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Chart.js for the powerful visualization library
- Scikit-learn team for the machine learning tools
- Inspired by modern dashboards like BoldBI and Tableau 