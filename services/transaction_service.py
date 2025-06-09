import os
import json
import re
from dotenv import load_dotenv
import datetime
import hashlib

from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from services.llm_service import get_llm
from services.plaid_service import get_transactions

load_dotenv()

CACHE_FILE = "transactions_cache.json"
BUDGET_CATEGORIES = [
    "Groceries",
    "Restaurants",
    "Shopping",
    "Transportation",
    "Bills & Utilities",
    "Entertainment",
    "Health & Wellness",
    "Housing",
    "Taxes",
    "Gifts & Donations",
    "Travel",
    "Personal Care",
    "Savings & Transfers",
]


def batch_categorize_transactions(transactions_to_categorize: list) -> dict:
    """
    Categorizes a batch of transactions using a single API call.
    """
    if not transactions_to_categorize:
        return {}

    print(
        f"Batch categorizing {len(transactions_to_categorize)} transactions with Deepseek..."
    )

    transaction_list_str = "\n".join(
        [f"{i+1}. {name}" for i, name in enumerate(transactions_to_categorize)]
    )

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

    try:
        llm = get_llm()
        categorization_chain = prompt | llm | StrOutputParser()
        response_str = categorization_chain.invoke(
            {
                "transactions": transaction_list_str,
                "categories": ", ".join(BUDGET_CATEGORIES),
            }
        )

        json_response_str = re.search(r"\[.*\]", response_str, re.DOTALL).group(0)
        categorized_results = json.loads(json_response_str)

        category_map = {}
        for result in categorized_results:
            original_index = result["id"] - 1
            transaction_name = transactions_to_categorize[original_index]
            category_map[transaction_name] = result["category"]

        print("Batch categorization successful.")
        return category_map

    except Exception as e:
        print(f"  -> ERROR during batch categorization: {e}")
        return {name: "Shopping" for name in transactions_to_categorize}


def mask_pii(data_string):
    """Hashes a string to mask PII."""
    return hashlib.sha256(data_string.encode()).hexdigest()


def get_processed_transactions(access_token):
    """
    Helper function to fetch and process transactions from Plaid.
    It uses a local cache to avoid re-fetching and re-categorizing.
    """
    if os.path.exists(CACHE_FILE):
        print("Loading transactions from cache.")
        with open(CACHE_FILE, "r") as f:
            cached_data = json.load(f)
        return cached_data["incoming"], cached_data["outgoing"], None

    if not access_token:
        return None, None, {"error_code": "NO_ACCESS_TOKEN"}

    try:
        start_date = datetime.date.today() - datetime.timedelta(days=30)
        end_date = datetime.date.today()

        transactions = get_transactions(access_token, start_date, end_date)

        print(
            f"Fetched {len(transactions)} transactions. Now categorizing expenses with AI..."
        )
        incoming_transactions = []
        outgoing_transactions = []

        transactions_to_categorize = [
            t["name"] for t in transactions if t["amount"] > 0
        ]
        category_map = batch_categorize_transactions(transactions_to_categorize)

        for t in transactions:
            transaction_date = t["date"]
            if isinstance(transaction_date, str):
                transaction_date = datetime.datetime.strptime(
                    transaction_date, "%Y-%m-%d"
                ).date()

            transaction_data = {
                "date": transaction_date.isoformat(),
                "name": mask_pii(t["name"]),
                "amount": t["amount"],
            }

            if t["amount"] > 0:
                transaction_data["category"] = category_map.get(
                    t["name"], "Uncategorized"
                )
                outgoing_transactions.append(transaction_data)
            else:
                transaction_data["category"] = "Income"
                incoming_transactions.append(transaction_data)

        # Cache the results
        with open(CACHE_FILE, "w") as f:
            json.dump(
                {"incoming": incoming_transactions, "outgoing": outgoing_transactions},
                f,
                indent=2,
            )

        return incoming_transactions, outgoing_transactions, None

    except Exception as e:
        print(f"Error fetching or processing transactions: {e}")
        return (
            None,
            None,
            {"error_code": "TRANSACTION_PROCESSING_ERROR", "message": str(e)},
        )


def json_date_serializer(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, (datetime.date, datetime.datetime)):
        return obj.isoformat()
    raise TypeError("Type %s not serializable" % type(obj))
