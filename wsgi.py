from app import app

# This is used by Vercel for serverless deployment
app.debug = False

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8080) 