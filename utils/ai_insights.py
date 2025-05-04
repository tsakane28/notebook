"""
AI Insights Module

This module generates AI-powered insights from data
using various analysis techniques.
"""

import pandas as pd
import numpy as np
from scipy import stats
import json


def generate_insights(data, filters=None, prompt=None):
    """
    Generate insights from the provided data.
    
    Args:
        data: List of dictionaries containing the data
        filters: Dictionary of filters to apply
        prompt: Optional prompt to guide insight generation
        
    Returns:
        dict: Dictionary containing insights
    """
    # Convert to DataFrame
    df = pd.DataFrame(data)
    
    # Apply filters if provided
    if filters:
        for column, values in filters.items():
            if column in df.columns:
                df = df[df[column].isin(values)]
    
    # Check if we have enough data
    if len(df) < 5:
        return {
            "success": False,
            "message": "Not enough data to generate insights. Please select different filters."
        }
    
    # Generate insights based on data
    insights = []
    
    # 1. Basic statistics
    basic_stats = _generate_basic_stats(df)
    insights.append({
        "title": "Data Overview",
        "type": "summary",
        "content": basic_stats
    })
    
    # 2. Correlations
    correlation_insights = _generate_correlation_insights(df)
    if correlation_insights:
        insights.append({
            "title": "Correlations",
            "type": "correlation",
            "content": correlation_insights
        })
    
    # 3. Outliers
    outlier_insights = _generate_outlier_insights(df)
    if outlier_insights:
        insights.append({
            "title": "Outliers",
            "type": "outlier",
            "content": outlier_insights
        })
    
    # 4. Trends
    trend_insights = _generate_trend_insights(df)
    if trend_insights:
        insights.append({
            "title": "Trends",
            "type": "trend",
            "content": trend_insights
        })
    
    # 5. Custom prompt-based insights
    if prompt:
        custom_insights = _generate_custom_insights(df, prompt)
        if custom_insights:
            insights.append({
                "title": "Custom Analysis",
                "type": "custom",
                "content": custom_insights
            })
    
    return {
        "success": True,
        "insights": insights
    }


def _generate_basic_stats(df):
    """Generate basic statistics about the dataset."""
    # Get column types
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
    
    stats = {
        "row_count": len(df),
        "column_count": len(df.columns),
        "numeric_columns": len(numeric_cols),
        "categorical_columns": len(categorical_cols),
    }
    
    # Add summary for numeric columns
    if numeric_cols:
        numeric_summary = {}
        for col in numeric_cols[:5]:  # Limit to first 5 columns
            numeric_summary[col] = {
                "mean": round(float(df[col].mean()), 2),
                "median": round(float(df[col].median()), 2),
                "min": round(float(df[col].min()), 2),
                "max": round(float(df[col].max()), 2)
            }
        stats["numeric_summary"] = numeric_summary
    
    # Add summary for categorical columns
    if categorical_cols:
        categorical_summary = {}
        for col in categorical_cols[:5]:  # Limit to first 5 columns
            value_counts = df[col].value_counts().head(3).to_dict()
            # Convert keys to strings for JSON serialization
            value_counts = {str(k): int(v) for k, v in value_counts.items()}
            categorical_summary[col] = {
                "unique_values": len(df[col].unique()),
                "top_values": value_counts
            }
        stats["categorical_summary"] = categorical_summary
    
    return stats


def _generate_correlation_insights(df):
    """Generate insights about correlations in the data."""
    # Get numeric columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    # We need at least 2 numeric columns
    if len(numeric_cols) < 2:
        return None
    
    # Calculate correlation matrix
    corr_matrix = df[numeric_cols].corr().abs()
    
    # Get strong correlations (above 0.7 and not self-correlations)
    strong_correlations = []
    for i in range(len(numeric_cols)):
        for j in range(i+1, len(numeric_cols)):
            if abs(corr_matrix.iloc[i, j]) > 0.7:
                strong_correlations.append({
                    "col1": numeric_cols[i],
                    "col2": numeric_cols[j],
                    "correlation": round(float(corr_matrix.iloc[i, j]), 2)
                })
    
    # Get weak correlations (below 0.3 but not zero)
    weak_correlations = []
    for i in range(len(numeric_cols)):
        for j in range(i+1, len(numeric_cols)):
            if 0 < abs(corr_matrix.iloc[i, j]) < 0.3:
                weak_correlations.append({
                    "col1": numeric_cols[i],
                    "col2": numeric_cols[j],
                    "correlation": round(float(corr_matrix.iloc[i, j]), 2)
                })
    
    # Return only if we have insights
    if not strong_correlations and not weak_correlations:
        return None
    
    return {
        "strong_correlations": strong_correlations[:5],  # Limit to top 5
        "weak_correlations": weak_correlations[:5]  # Limit to top 5
    }


def _generate_outlier_insights(df):
    """Generate insights about outliers in the data."""
    # Get numeric columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    if not numeric_cols:
        return None
    
    outliers = {}
    
    for col in numeric_cols:
        # Skip columns with all same values
        if df[col].std() == 0:
            continue
        
        # Use z-score to detect outliers
        z = np.abs(stats.zscore(df[col].dropna()))
        outlier_indices = np.where(z > 3)[0]
        
        if len(outlier_indices) > 0:
            # Get outlier values
            outlier_values = df[col].dropna().iloc[outlier_indices].tolist()
            
            # Limit to 5 outliers
            if len(outlier_values) > 5:
                outlier_values = outlier_values[:5]
            
            outliers[col] = {
                "count": len(outlier_indices),
                "percent": round(100 * len(outlier_indices) / len(df), 2),
                "examples": [round(float(x), 2) for x in outlier_values]
            }
    
    # Return only if we have outliers
    if not outliers:
        return None
    
    return outliers


def _generate_trend_insights(df):
    """Generate insights about trends in the data."""
    # Try to find date columns
    date_cols = []
    for col in df.columns:
        # Check if column name contains date-related keywords
        if any(kw in col.lower() for kw in ['date', 'time', 'year', 'month', 'day']):
            # Try to convert to datetime
            try:
                df[col] = pd.to_datetime(df[col])
                date_cols.append(col)
            except:
                pass
    
    if not date_cols:
        return None
    
    trends = {}
    
    # Get numeric columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    if not numeric_cols:
        return None
    
    # Analyze trends over time
    for date_col in date_cols:
        for num_col in numeric_cols[:3]:  # Limit to first 3 numeric columns
            # Group by year-month
            try:
                df['month'] = df[date_col].dt.to_period('M')
                monthly_avg = df.groupby('month')[num_col].mean()
                
                # Check if we have enough months
                if len(monthly_avg) < 3:
                    continue
                
                # Calculate trend (simple linear regression)
                x = np.arange(len(monthly_avg))
                y = monthly_avg.values
                slope, _, r_value, p_value, _ = stats.linregress(x, y)
                
                # Only include significant trends
                if p_value < 0.05:
                    trend_direction = "increasing" if slope > 0 else "decreasing"
                    trends[f"{num_col}_over_{date_col}"] = {
                        "direction": trend_direction,
                        "strength": round(float(r_value), 2),
                        "slope": round(float(slope), 2),
                        "significance": round(float(p_value), 3)
                    }
            except:
                pass  # Skip if there's an error
    
    # Return only if we have trends
    if not trends:
        return None
    
    return trends


def _generate_custom_insights(df, prompt):
    """Generate custom insights based on user prompt."""
    # This function would normally use an LLM or other AI service
    # For now, we'll implement a simple version
    
    insights = []
    
    # Parse the prompt for keywords
    prompt_lower = prompt.lower()
    
    # Check for distribution analysis requests
    if any(word in prompt_lower for word in ['distribution', 'histogram', 'frequency']):
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        for col in numeric_cols[:2]:  # Limit to first 2 columns
            # Calculate distribution metrics
            mean = df[col].mean()
            median = df[col].median()
            mode = df[col].mode()[0]
            skew = df[col].skew()
            
            skew_text = "normally distributed"
            if skew < -1:
                skew_text = "negatively skewed (left-tailed)"
            elif skew < -0.5:
                skew_text = "slightly negatively skewed"
            elif skew > 1:
                skew_text = "positively skewed (right-tailed)"
            elif skew > 0.5:
                skew_text = "slightly positively skewed"
            
            insights.append(f"The distribution of {col} has mean {round(float(mean), 2)}, " +
                          f"median {round(float(median), 2)}, and is {skew_text}.")
    
    # Check for comparison requests
    if any(word in prompt_lower for word in ['compare', 'comparison', 'versus', 'vs']):
        categorical_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if categorical_cols and numeric_cols:
            cat_col = categorical_cols[0]  # Take first categorical column
            num_col = numeric_cols[0]  # Take first numeric column
            
            # Get top categories
            top_categories = df[cat_col].value_counts().head(3).index.tolist()
            
            # Compare mean values
            comparison = {}
            for category in top_categories:
                subset = df[df[cat_col] == category]
                comparison[str(category)] = round(float(subset[num_col].mean()), 2)
            
            # Find highest and lowest
            highest = max(comparison.items(), key=lambda x: x[1])
            lowest = min(comparison.items(), key=lambda x: x[1])
            
            insights.append(f"Comparing {num_col} across {cat_col} categories: " +
                          f"{highest[0]} has the highest average at {highest[1]}, " +
                          f"while {lowest[0]} has the lowest at {lowest[1]}.")
    
    # Return insights
    return insights if insights else None