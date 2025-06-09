from flask import Flask, session, redirect, url_for
import os
from dotenv import load_dotenv
from extensions import limiter

# --- Import Blueprints ---
from routes.main import main_bp
from routes.api import api_bp

# --- Load Environment Variables ---
load_dotenv()

# --- App Initialization ---
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY")

# --- Initialize Extensions ---
limiter.init_app(app)

if not app.secret_key:
    raise ValueError("FLASK_SECRET_KEY environment variable not set. Please generate a random key and add it to your .env file.")

# --- Sanity Checks for Environment Variables ---
required_env_vars = ['PLAID_CLIENT_ID', 'PLAID_SECRET', 'OPENROUTER_API_KEY']
missing_vars = [var for var in required_env_vars if not os.getenv(var)]

if missing_vars:
    raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}. Please check your .env file.")

# --- Register Blueprints ---
app.register_blueprint(main_bp)
app.register_blueprint(api_bp, url_prefix='/api')


# --- Clear transaction cache on startup (for development) ---
CACHE_FILE = 'transactions_cache.json'
if os.path.exists(CACHE_FILE):
    os.remove(CACHE_FILE)
    print("INFO: Cleared existing transaction cache for a fresh start.")


# --- Main execution ---
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5003)), debug=True)
