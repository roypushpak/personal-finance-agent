from flask import Flask, render_template, request, jsonify, redirect, url_for, session
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
import pandas as pd
import re
import time

# --- LangChain Imports ---
from langchain_openai import ChatOpenAI
from langchain.agents import tool, AgentExecutor, create_react_agent
from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "supersecretkey")

PLAID_CLIENT_ID = os.getenv('PLAID_CLIENT_ID')
PLAID_SECRET = os.getenv('PLAID_SECRET')
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')

if not PLAID_CLIENT_ID or not PLAID_SECRET:
    print("ERROR: PLAID_CLIENT_ID and PLAID_SECRET environment variables must be set.")
    print("Please create a .env file with your Plaid credentials.")
    exit()

if not OPENROUTER_API_KEY:
    print("ERROR: OPENROUTER_API_KEY environment variable must be set.")
    print("Please get a key from https://openrouter.ai/keys and add it to your .env file.")
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

access_token = None
item_id = None

CACHE_FILE = 'transactions_cache.json'

BUDGET_CATEGORIES = [
    "Groceries", "Restaurants", "Shopping", "Transportation", "Bills & Utilities",
    "Entertainment", "Health & Wellness", "Housing", "Taxes",
    "Gifts & Donations", "Travel", "Personal Care", "Savings & Transfers"
]

# --- Shared LLM ---
# Initialize the LLM that will be used for both categorization and the agent.
# We use the ChatOpenAI class and point it to the OpenRouter API.
llm = ChatOpenAI(
    model="deepseek/deepseek-chat-v3-0324:free", # Corrected model name
    temperature=0,
    openai_api_key=OPENROUTER_API_KEY,
    openai_api_base="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": "http://localhost:5003",
        "X-Title": "Personal Finance Agent"
    },
    max_retries=3, # Add some resilience
)

# --- Constants ---
BUDGET_FILE = 'budget.json'

def get_budget():
    """Loads the budget from a JSON file."""
    if not os.path.exists(BUDGET_FILE):
        return {"overall_limit": None, "category_budgets": {}}
    with open(BUDGET_FILE, 'r') as f:
        return json.load(f)

def save_budget(budget_data):
    """Saves the budget to a JSON file."""
    with open(BUDGET_FILE, 'w') as f:
        json.dump(budget_data, f, indent=2)

def json_date_serializer(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, (datetime.date, datetime.datetime)):
        return obj.isoformat()
    raise TypeError ("Type %s not serializable" % type(obj))

def batch_categorize_transactions(transactions_to_categorize: list) -> dict:
    """
    Categorizes a batch of transactions using a single API call.
    """
    if not transactions_to_categorize:
        return {}

    print(f"Batch categorizing {len(transactions_to_categorize)} transactions with Deepseek...")

    # Create a numbered list of transactions for the prompt
    transaction_list_str = "\n".join([f"{i+1}. {name}" for i, name in enumerate(transactions_to_categorize)])

    categorization_prompt_template = """
    You are an expert financial assistant. Analyze the following list of bank transactions.
    For each transaction, classify it into one of these categories: {categories}.

    Return your response as a valid JSON array where each object contains the 'id' of the transaction from the list and its 'category'.
    For example: `[
      {{"id": 1, "category": "Shopping"}},
      {{"id": 2, "category": "Restaurants"}}
    ]`

    Here is the list of transactions:
    {transactions}
    """
    
    prompt = PromptTemplate(
        template=categorization_prompt_template,
        input_variables=["transactions", "categories"],
    )

    categorization_chain = prompt | llm | StrOutputParser()
    
    try:
        response_str = categorization_chain.invoke({
            "transactions": transaction_list_str,
            "categories": ", ".join(BUDGET_CATEGORIES)
        })
        
        # Clean the response to ensure it's valid JSON
        json_response_str = re.search(r'\[.*\]', response_str, re.DOTALL).group(0)
        categorized_results = json.loads(json_response_str)

        # Create a mapping from transaction name back to its category
        # The original index is used to link back to the original transaction name.
        category_map = {}
        for result in categorized_results:
            original_index = result['id'] - 1
            transaction_name = transactions_to_categorize[original_index]
            category_map[transaction_name] = result['category']

        print("Batch categorization successful.")
        return category_map

    except Exception as e:
        print(f"  -> ERROR during batch categorization: {e}")
        # On error, fallback to a default for all
        return {name: "Shopping" for name in transactions_to_categorize}

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
        transactions_to_categorize = []

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
                # This is a standard outgoing transaction that needs categorization.
                transactions_to_categorize.append(transaction_data)

        # --- Batch Categorization Step ---
        if transactions_to_categorize:
            # Get a list of just the names for the batch call
            names_to_categorize = [t['name'] for t in transactions_to_categorize]
            
            # Make a single API call to categorize all of them
            category_map = batch_categorize_transactions(names_to_categorize)
            
            # Apply the results back to our transactions
            for t in transactions_to_categorize:
                t['ai_category'] = category_map.get(t['name'], 'Shopping') # Default to shopping if not found

        # Combine the categorized transactions with the others
        outgoing_transactions.extend(transactions_to_categorize)
        
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
                income_chart_data=default_chart_data,
                total_income=0
            )
        return render_template(
            'overview.html',
            error=error,
            expense_chart_data=default_chart_data,
            income_chart_data=default_chart_data,
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
    income_chart_data = get_chart_data(incoming)
    total_income = sum(t['amount'] for t in incoming) if incoming else 0
    
    # Calculate overall budget summary
    budget = get_budget()
    overall_limit = budget.get('overall_limit')
    total_spent = sum(t['amount'] for t in outgoing) if outgoing else 0
    
    overall_summary = None
    if overall_limit:
        overall_summary = {
            "spent": total_spent,
            "limit": overall_limit,
            "remaining": overall_limit - total_spent,
            "percentage": (total_spent / overall_limit) * 100 if overall_limit > 0 else 0
        }

    return render_template(
        'overview.html',
        expense_chart_data=expense_chart_data,
        income_chart_data=income_chart_data,
        overall_summary=overall_summary
    )

@app.route('/outgoing')
def outgoing():
    if not access_token:
        return redirect(url_for('index'))
    
    _, outgoing_transactions, error = get_processed_transactions()
    if error:
        return redirect(url_for('overview'))
    
    # Process budget data
    budget = get_budget()
    category_budgets = budget.get('category_budgets', {})
    
    # Calculate spending per category
    spending_summary = {}
    if outgoing_transactions:
        df = pd.DataFrame(outgoing_transactions)
        category_spending = df.groupby('ai_category')['amount'].sum().to_dict()

        for category, budget_amount in category_budgets.items():
            if budget_amount: # Only include categories with a set budget
                spent = category_spending.get(category, 0)
                spending_summary[category] = {
                    "spent": spent,
                    "budget": budget_amount,
                    "remaining": budget_amount - spent,
                    "percentage": (spent / budget_amount) * 100 if budget_amount > 0 else 0
                }

    return render_template(
        'expenses.html', 
        outgoing=outgoing_transactions,
        spending_summary=spending_summary
    )

@app.route('/incoming')
def incoming():
    if not access_token:
        return redirect(url_for('index'))
    
    incoming_transactions, _, error = get_processed_transactions()

    if error:
        return redirect(url_for('overview'))

    return render_template('income.html', incoming=incoming_transactions)

@app.route('/agent')
def agent():
    if not access_token:
        return redirect(url_for('index'))
    return render_template('agent.html')

@app.route('/budget', methods=['GET'])
def budget():
    if not access_token:
        return redirect(url_for('index'))
    return render_template('budget.html')

@app.route('/api/budget', methods=['GET', 'POST'])
def api_budget():
    if not access_token:
        return jsonify({"error": "Not authenticated"}), 401

    if request.method == 'POST':
        new_budget = request.json
        save_budget(new_budget)
        return jsonify({"status": "success", "budget": new_budget})
    
    # GET request
    budget_data = get_budget()
    return jsonify({"budget": budget_data, "categories": BUDGET_CATEGORIES})

@app.route('/api/ask_agent', methods=['POST'])
def ask_agent():
    print("\n[AGENT] /api/ask_agent endpoint hit.")
    if not access_token:
        print("[AGENT] ERROR: Not authenticated.")
        return jsonify({"error": "Not authenticated"}), 401

    user_question = request.json.get('question')
    if not user_question:
        print("[AGENT] ERROR: No question provided.")
        return jsonify({"error": "No question provided"}), 400
    
    print(f"[AGENT] User question: {user_question}")

    try:
        # --- LangChain Agent Implementation ---
        
        # 2. Define the tools the agent can use
        @tool
        def get_transaction_data() -> str:
            """
            Fetches the user's recent transaction data and budget limits.
            This tool takes no arguments or input.
            Call this to get the financial context needed to answer questions about spending, income, or budgeting.
            """
            print("[AGENT TOOL] get_transaction_data() called.")
            
            # 1. Fetch transactions
            incoming, outgoing, error = get_processed_transactions()
            if error:
                return "Error: Could not retrieve transactions."

            inc_df = pd.DataFrame(incoming)
            out_df = pd.DataFrame(outgoing)
            inc_md = "No incoming transactions."
            out_md = "No outgoing transactions."

            if not inc_df.empty:
                inc_md = inc_df[['date', 'name', 'amount', 'ai_category']].rename(columns={'ai_category': 'category'}).to_markdown(index=False)
            
            if not out_df.empty:
                out_md = out_df[['date', 'name', 'amount', 'ai_category']].rename(columns={'ai_category': 'category'}).to_markdown(index=False)

            # 2. Fetch budget data (with robust type conversion)
            budget_md = "No budget data found."
            try:
                with open(BUDGET_FILE, 'r') as f:
                    budget_data = json.load(f)
                
                overall_budget_value = budget_data.get('overall_budget')
                category_budgets = budget_data.get('category_budgets', {})
                
                budget_lines = []
                
                # --- Robust Overall Budget Processing ---
                try:
                    overall_budget_float = float(overall_budget_value)
                    budget_lines.append(f"Overall Monthly Budget: ${overall_budget_float:,.2f}")
                except (ValueError, TypeError):
                    budget_lines.append("Overall Monthly Budget: Not Set")

                # --- Robust Category Budget Processing ---
                if category_budgets:
                    for category, limit in category_budgets.items():
                        try:
                            limit_float = float(limit)
                            budget_lines.append(f"'{category}' category budget: ${limit_float:,.2f}")
                        except (ValueError, TypeError):
                            budget_lines.append(f"'{category}' category budget: Not Set")
                
                budget_md = "\n".join(budget_lines)

            except (FileNotFoundError, json.JSONDecodeError):
                print("[AGENT TOOL] budget.json not found or is invalid.")
                pass

            return f"BUDGET DATA:\n{budget_md}\n\nINCOMING TRANSACTIONS:\n{inc_md}\n\nOUTGOING TRANSACTIONS:\n{out_md}"

        tools = [get_transaction_data]

        # 3. Define the Agent's Prompt
        # This is where you can customize the agent's personality and instructions.
        AGENT_PROMPT_TEMPLATE = """
You are a professional financial analyst AI. Your tone is formal, and your purpose is to provide precise, data-driven answers regarding the user's finances.
You must base your analysis STRICTLY on the transaction and budget data provided in the tools.
When analyzing expenses, you MUST compare them against the provided budget limits to assess the user's performance.
Do not make assumptions or provide information not present in the data.
If the data is insufficient to answer the question, state that clearly and concisely.
Your final answer must be plain text, without any markdown formatting (e.g., no `**bold**` or `*italics*`).

You have access to the following tools:
{tools}

Use the following format for your thought process:

Question: The user's question you must answer.
Thought: Your methodical analysis of the user's request and the steps needed to answer it.
Action: The action to take, which must be one of the available tools: [{tool_names}].
Action Input: The input to the action. If the tool takes no input, use an empty string.
Observation: The data returned by the tool.
... (this Thought/Action/Action Input/Observation sequence can repeat)
Thought: I have now analyzed the data and can formulate a final answer.
Final Answer: Your final, conclusive answer to the user's question. This must be plain text and not use any markdown.

Begin.

Question: {input}
Thought:{agent_scratchpad}
"""
        prompt = PromptTemplate.from_template(AGENT_PROMPT_TEMPLATE)
        
        # 4. Create the agent
        agent = create_react_agent(llm, tools, prompt)

        # 5. Create the Agent Executor
        # This is what runs the agent and its tools.
        agent_executor = AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=True,
            handle_parsing_errors=True  # Add this to handle LLM output parsing errors
        )

        # 6. Run the agent with the user's question
        print(f"[AGENT] User question: {user_question}")
        response = agent_executor.invoke({"input": user_question})
        
        return jsonify({'answer': response['output']})

    except Exception as e:
        print(f"[AGENT] ERROR: Unhandled exception during LangChain agent execution: {e}")
        return jsonify({"error": "Failed to get response from AI"}), 500

@app.route('/')
def index():
    # If we have an access token, go to the main dashboard. Otherwise, show the Plaid Link page.
    if access_token:
        return redirect(url_for('overview'))
    return render_template('index.html')

@app.route('/api/create_link_token', methods=['POST'])
def create_link_token():
    try:
        request = LinkTokenCreateRequest(
            user=LinkTokenCreateRequestUser(client_user_id='user-id'),
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
        exchange_request = ItemPublicTokenExchangeRequest(public_token=public_token)
        exchange_response = client.item_public_token_exchange(exchange_request)
        access_token = exchange_response['access_token']
        item_id = exchange_response['item_id']
        if os.path.exists(CACHE_FILE):
            os.remove(CACHE_FILE)
        return jsonify({'status': 'success', 'redirect_url': url_for('overview')})
    except plaid.ApiException as e:
        return jsonify(json.loads(e.body))

@app.route('/save_budget', methods=['POST'])
def save_budget():
    """Saves the user's budget to a JSON file."""
    try:
        data = request.get_json()
        overall_budget_str = data.get('overall_budget')
        category_budgets_str = data.get('category_budgets', {})

        # Convert budget values from string to float, handling empty inputs
        overall_budget = float(overall_budget_str) if overall_budget_str else None
        
        category_budgets = {}
        if category_budgets_str:
            for category, limit_str in category_budgets_str.items():
                if limit_str: # Only add if a limit is provided
                    try:
                        category_budgets[category] = float(limit_str)
                    except (ValueError, TypeError):
                        print(f"Skipping invalid category budget for {category}: {limit_str}")
                        pass # Skip if conversion fails

        budget_data = {
            'overall_budget': overall_budget,
            'category_budgets': category_budgets
        }

        with open(BUDGET_FILE, 'w') as f:
            json.dump(budget_data, f, indent=4)
            
        return jsonify({'status': 'success', 'message': 'Budget saved successfully.'})

    except (ValueError, TypeError) as e:
        print(f"[ERROR] Invalid budget data received for overall budget: {e}")
        return jsonify({'status': 'error', 'message': 'Invalid data format for overall budget. Please enter a valid number.'}), 400
    except Exception as e:
        print(f"[ERROR] Could not save budget: {e}")
        return jsonify({'status': 'error', 'message': 'Failed to save budget.'}), 500

@app.route('/get_budget', methods=['GET'])
def get_budget_route():
    try:
        budget_data = get_budget()
        return jsonify(budget_data)
    except Exception as e:
        print(f"[ERROR] Could not load budget for route: {e}")
        return jsonify({}), 500

if __name__ == '__main__':
    # Use a different port to avoid conflicts
    # Adhere to Gunicorn's expected format HOST:PORT
    app.run(debug=True, host='127.0.0.1', port=5001)
