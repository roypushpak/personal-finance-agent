from flask import Flask, render_template, request, jsonify
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

BUDGET_CATEGORIES = [
    "Groceries", "Restaurants", "Shopping", "Transportation", "Bills & Utilities",
    "Entertainment", "Health & Wellness", "Income", "Housing", "Taxes",
    "Gifts & Donations", "Investments", "Travel", "Personal Care", "General Merchandise"
]

def categorize_transaction(transaction_name):
    try:
        prompt = f"""
        Categorize the following transaction into one of these categories:
        {', '.join(BUDGET_CATEGORIES)}.
        Return only the category name.
        Transaction: "{transaction_name}"
        Category:
        """
        response = model.generate_content(prompt)
        category = response.text.strip()
        if category in BUDGET_CATEGORIES:
            return category
        return "General Merchandise"
    except Exception as e:
        print(f"Could not categorize '{transaction_name}': {e}")
        return "Uncategorized"

@app.route('/')
def index():
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
        return jsonify({'status': 'success'})
    except plaid.ApiException as e:
        return jsonify(json.loads(e.body))

@app.route('/dashboard')
def dashboard():
    if not access_token:
        return render_template('index.html', error="Please link an account first.")

    try:
        start_date = datetime.date.today() - datetime.timedelta(days=30)
        end_date = datetime.date.today()

        request = TransactionsGetRequest(
            access_token=access_token,
            start_date=start_date,
            end_date=end_date,
        )
        response = client.transactions_get(request)
        
        categorized_transactions = []
        for t in response['transactions']:
            # Plaid's transaction object is not directly modifiable, so we create a dict
            transaction_data = t.to_dict()
            transaction_data['ai_category'] = categorize_transaction(t.name)
            categorized_transactions.append(transaction_data)

        return render_template('dashboard.html', transactions=categorized_transactions)
    except plaid.ApiException as e:
        error_data = json.loads(e.body)
        if error_data.get('error_code') == 'PRODUCT_NOT_READY':
            return render_template('dashboard.html', product_not_ready=True)
        else:
            return render_template('dashboard.html', error=error_data)

if __name__ == '__main__':
    app.run(debug=True)
