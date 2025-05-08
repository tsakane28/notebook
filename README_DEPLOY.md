# Vercel Deployment Guide for AI Adoption Dashboard

This document provides instructions for deploying the AI Adoption Dashboard to Vercel.

## Prerequisites

1. Create a free [Vercel account](https://vercel.com/signup) if you don't already have one.
2. Install the [Vercel CLI](https://vercel.com/docs/cli) (optional but recommended): `npm i -g vercel`
3. Make sure you have your repository pushed to GitHub, GitLab, or Bitbucket.

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended for First-Time)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your repository from GitHub, GitLab, or Bitbucket
4. Configure your project:
   - Framework Preset: Other
   - Build Command: Leave blank (handled by vercel.json)
   - Output Directory: Leave blank (handled by vercel.json)
   - Install Command: `pip install -r requirements.txt`
5. Add Environment Variables (optional):
   - `SECRET_KEY`: A random string for Flask's secret key
6. Click "Deploy"

### Option 2: Deploy via Vercel CLI

1. Log in to Vercel: `vercel login`
2. Navigate to your project directory
3. Run: `vercel`
4. Follow the interactive prompts to configure your project
5. After deployment, you can update with: `vercel --prod`

## File Structure for Vercel

The key files for Vercel deployment are:

- `vercel.json` - Configuration for Vercel deployment
- `wsgi.py` - Entry point for the Python application
- `requirements.txt` - Python dependencies
- `app.py` - The main Flask application

## Important Notes

1. **Ephemeral Filesystem**: 
   Vercel uses an ephemeral filesystem, meaning any files written during runtime (like uploads) will not persist between function invocations. This application stores temporary files in `/tmp` when running on Vercel.

2. **Cold Starts**:
   Serverless functions may experience cold starts if not used frequently.

3. **Timeout Limits**:
   Vercel has execution timeout limits. If your model training takes too long, you might encounter timeouts.

4. **Environment Variables**:
   Set environment variables through the Vercel dashboard rather than using .env files.

## Troubleshooting

- **ImportError or ModuleNotFoundError**: Make sure all required packages are in requirements.txt
- **Function Execution Timeout**: Check if your model training exceeds Vercel's timeout limits
- **File Storage Issues**: Remember that files stored on the filesystem are temporary

## Useful Commands

- Deploy: `vercel`
- Deploy to production: `vercel --prod`
- See logs: `vercel logs your-project-name.vercel.app`
- List deployments: `vercel ls`
- Pull environment variables: `vercel env pull` 