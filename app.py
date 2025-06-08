from flask import Flask, render_template, request, jsonify, redirect, url_for
import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
import os
from dotenv import load_dotenv
import datetime
import json
import google.generativeai as genai
import pandas as pd
from google.generativeai.types import HarmCategory, HarmBlockThreshold
import re
import time

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "supersecretkey")

PLAID_CLIENT_ID = os.getenv('PLAID_CLIENT_ID')
PLAID_SECRET = os.getenv('PLAID_SECRET')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

if not PLAID_CLIENT_ID or not PLAID_SECRET:
    print("ERROR: PLAID_CLIENT_ID and PLAID_SECRET environment variables must be set.")
    print("Please create a .env file with your Plaid credentials.")
    exit()

if not GEMINI_API_KEY:
    print("ERROR: GEMINI_API_KEY environment variable must be set.")
    print("Please add your Gemini API key to the .env file.")
    exit()

# Define the cache file path
CACHE_FILE = 'transactions_cache.json'

# --- Ensure cache is cleared on startup for this testing phase ---
if os.path.exists(CACHE_FILE):
    os.remove(CACHE_FILE)
    print("INFO: Cleared existing transaction cache to force re-categorization.")
# ----------------------------------------------------------------

# Plaid client setup
host = plaid.Environment.Sandbox # or Development or Production
configuration = plaid.Configuration(
    host=host,
    api_key={
        'clientId': PLAID_CLIENT_ID,
        'secret': PLAID_SECRET,
    }
)
api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

access_token = None
item_id = None

CACHE_FILE = 'transactions_cache.json'

BUDGET_CATEGORIES = [
    "Groceries", "Restaurants", "Shopping", "Transportation", "Bills & Utilities",
    "Entertainment", "Health & Wellness", "Housing", "Taxes",
    "Gifts & Donations", "Travel", "Personal Care", "Savings & Transfers"
]

def json_date_serializer(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, (datetime.date, datetime.datetime)):
        return obj.isoformat()
    raise TypeError ("Type %s not serializable" % type(obj))

def categorize_transaction(transaction_name):
    """
    Categorizes a transaction using the AI model, with a retry mechanism.
    """
    safety_settings = {
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
    }

    for attempt in range(2):
        print(f"Categorizing '{transaction_name}' (Attempt {attempt + 1})")
        
        # Use a stricter prompt on the second attempt
        if attempt == 1:
            prompt = f"""
            STRICT MODE: Classify the transaction into one of these categories:
            {', '.join(BUDGET_CATEGORIES)}.
            Respond with ONLY the single, most appropriate category name from the list.
            Transaction: "{transaction_name}"
            Category:
            """
        else:
            prompt = f"""
            Analyze the following transaction and classify it into one of these categories:
            {', '.join(BUDGET_CATEGORIES)}.
            Respond with ONLY the single category name and nothing else.
            Transaction: "{transaction_name}"
            Category:
            """
        
        try:
            response = model.generate_content(prompt, safety_settings=safety_settings)
            cleaned_response = response.text.strip().lower()
            
            found_categories = []
            for cat in BUDGET_CATEGORIES:
                if re.search(r'\b' + re.escape(cat.lower()) + r'\b', cleaned_response):
                    found_categories.append(cat)
            
            if len(found_categories) == 1:
                print(f"  -> Successfully categorized '{transaction_name}' as '{found_categories[0]}'")
                return found_categories[0]
            else:
                print(f"  -> Attempt {attempt + 1} failed. Found {len(found_categories)} matches.")

        except Exception as e:
            print(f"  -> ERROR on attempt {attempt + 1}: {e}")
            
            # Check for rate limit error and extract retry delay
            error_str = str(e)
            retry_after_match = re.search(r'retry_delay {\s*seconds: (\d+)\s*}', error_str)
            
            wait_time = 2 # Default wait time if no specific delay is found
            if retry_after_match:
                wait_time = int(retry_after_match.group(1)) + 1 # Add a 1s buffer
                print(f"  -> Rate limit hit. Waiting for {wait_time} seconds before retrying.")

            # Wait before retrying
            time.sleep(wait_time)

    print(f"WARN: All attempts failed for '{transaction_name}'. Defaulting to 'Shopping'.")
    return "Shopping"

@app.route('/')
def index():
    if access_token:
        return redirect(url_for('outgoing'))
    return render_template('index.html')

@app.route('/api/create_link_token', methods=['POST'])
def create_link_token():
    try:
        request = LinkTokenCreateRequest(
            user=LinkTokenCreateRequestUser(
                client_user_id= 'user-id'
            ),
            client_name="Personal Finance Agent",
            products=[Products('transactions')],
            country_codes=[CountryCode('CA')],
            language='en'
        )
        response = client.link_token_create(request)
        return jsonify(response.to_dict())
    except plaid.ApiException as e:
        return jsonify(json.loads(e.body))

@app.route('/api/set_access_token', methods=['POST'])
def set_access_token():
    global access_token, item_id
    public_token = request.json['public_token']
    try:
        exchange_request = ItemPublicTokenExchangeRequest(
            public_token=public_token
        )
        exchange_response = client.item_public_token_exchange(exchange_request)
        access_token = exchange_response['access_token']
        item_id = exchange_response['item_id']
        # Clear cache when linking a new account
        if os.path.exists(CACHE_FILE):
            os.remove(CACHE_FILE)
        return jsonify({'status': 'success', 'redirect_url': url_for('outgoing')})
    except plaid.ApiException as e:
        return jsonify(json.loads(e.body))

def get_processed_transactions():
    """
    Helper function to fetch and process transactions from Plaid.
    It uses a local cache to avoid re-fetching and re-categorizing.
    """
    # 1. Try to load from cache
    if os.path.exists(CACHE_FILE):
        print("Loading transactions from cache.")
        with open(CACHE_FILE, 'r') as f:
            cached_data = json.load(f)
        return cached_data['incoming'], cached_data['outgoing'], None

    # 2. If cache doesn't exist, fetch from Plaid
    print("Cache not found. Fetching new transactions from Plaid.")
    if not access_token:
        return None, None, {"error_code": "NO_ACCESS_TOKEN"}

    try:
        start_date = datetime.date.today() - datetime.timedelta(days=30)
        end_date = datetime.date.today()

        request = TransactionsGetRequest(
            access_token=access_token,
            start_date=start_date,
            end_date=end_date,
        )
        response = client.transactions_get(request)
        
        print(f"Fetched {len(response['transactions'])} transactions. Now categorizing expenses with AI...")
        incoming_transactions = []
        outgoing_transactions = []

        # Keywords to identify income transactions by name. Case-insensitive.
        INCOME_KEYWORDS = ['gusto', 'ach electronic credit', 'direct deposit', 'payroll']
        SAVINGS_KEYWORDS = ['cd deposit']
        INTEREST_KEYWORDS = ['intrst pymnt', 'interest']

        for t in response['transactions']:
            transaction_data = t.to_dict()
            transaction_name_lower = t.name.lower()

            # Rule 1: Check for explicit income keywords first. This is the most reliable signal.
            if any(keyword in transaction_name_lower for keyword in INCOME_KEYWORDS):
                transaction_data['amount'] = abs(transaction_data['amount']) # Ensure amount is positive for display
                transaction_data['ai_category'] = 'Income'
                incoming_transactions.append(transaction_data)
            
            # Rule 2: If not income, check if it's another form of credit (refund).
            # Plaid uses negative amounts for credits.
            elif transaction_data['amount'] < 0:
                transaction_data['amount'] = abs(transaction_data['amount'])
                
                # Check if it's interest
                if any(keyword in transaction_name_lower for keyword in INTEREST_KEYWORDS):
                    transaction_data['ai_category'] = 'Interest'
                # Otherwise, it's a refund
                else:
                    transaction_data['ai_category'] = 'Refund'
                
                incoming_transactions.append(transaction_data)

            # Rule 3: Check for explicit savings keywords.
            elif any(keyword in transaction_name_lower for keyword in SAVINGS_KEYWORDS):
                transaction_data['ai_category'] = 'Savings & Transfers'
                outgoing_transactions.append(transaction_data)

            # Rule 4: If it's not income or a refund, it must be an expense.
            else:
                transaction_data['ai_category'] = categorize_transaction(t.name)
                outgoing_transactions.append(transaction_data)
        
        # 3. Save the newly processed data to cache
        print("Saving categorized transactions to cache.")
        with open(CACHE_FILE, 'w') as f:
            json.dump({
                'incoming': incoming_transactions,
                'outgoing': outgoing_transactions
            }, f, indent=2, default=json_date_serializer)

        return incoming_transactions, outgoing_transactions, None
    except plaid.ApiException as e:
        return None, None, json.loads(e.body)

@app.route('/overview')
def overview():
    if not access_token:
        return redirect(url_for('index'))

    default_chart_data = {"labels": [], "data": []}
    incoming, outgoing, error = get_processed_transactions()

    if error:
        if error.get('error_code') == 'PRODUCT_NOT_READY':
            return render_template(
                'overview.html',
                product_not_ready=True,
                expense_chart_data=default_chart_data,
                total_income=0
            )
        return render_template(
            'overview.html',
            error=error,
            expense_chart_data=default_chart_data,
            total_income=0
        )
    
    def get_chart_data(transactions):
        if not transactions:
            return {"labels": [], "data": []}
        df = pd.DataFrame(transactions)
        category_totals = df.groupby('ai_category')['amount'].sum().sort_values(ascending=False)
        return {
            "labels": category_totals.index.tolist(),
            "data": category_totals.values.tolist()
        }

    expense_chart_data = get_chart_data(outgoing)
    total_income = sum(t['amount'] for t in incoming) if incoming else 0

    return render_template(
        'overview.html',
        expense_chart_data=expense_chart_data,
        total_income=total_income
    )

@app.route('/outgoing')
def outgoing():
    if not access_token:
        return redirect(url_for('index'))
    
    _, outgoing_transactions, error = get_processed_transactions()

    if error:
        # If product not ready, redirect to overview which handles the loading state
        return redirect(url_for('overview'))

    return render_template('expenses.html', outgoing=outgoing_transactions)

@app.route('/incoming')
def incoming():
    if not access_token:
        return redirect(url_for('index'))
    
    incoming_transactions, _, error = get_processed_transactions()

    if error:
        return redirect(url_for('overview'))

    return render_template('income.html', incoming=incoming_transactions)

if __name__ == '__main__':
    # Use a different port to avoid conflicts
    app.run(debug=True, port=5002)
