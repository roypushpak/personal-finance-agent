import os
import json

BUDGET_FILE = "budget.json"


def get_budget():
    """Loads the budget from a JSON file."""
    if not os.path.exists(BUDGET_FILE):
        return {"overall_limit": None, "category_budgets": {}}
    with open(BUDGET_FILE, "r") as f:
        return json.load(f)


def save_budget(budget_data):
    """Saves the budget to a JSON file."""
    with open(BUDGET_FILE, "w") as f:
        json.dump(budget_data, f, indent=2)
