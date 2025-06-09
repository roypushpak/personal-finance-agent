import pytest
from services.budget_service import get_budget, save_budget
import os
import json

BUDGET_FILE = 'test_budget.json'

@pytest.fixture
def temp_budget_file():
    """Creates a temporary budget file for testing."""
    budget_data = {
        "overall_limit": 1000,
        "category_budgets": {
            "Groceries": 300,
            "Shopping": 200
        }
    }
    with open(BUDGET_FILE, 'w') as f:
        json.dump(budget_data, f)
    
    yield BUDGET_FILE
    
    os.remove(BUDGET_FILE)

def test_get_budget(temp_budget_file):
    """Tests loading a budget from a file."""
    # Temporarily point the service to the test file
    from services import budget_service
    original_file = budget_service.BUDGET_FILE
    budget_service.BUDGET_FILE = temp_budget_file
    
    budget = get_budget()
    assert budget['overall_limit'] == 1000
    assert budget['category_budgets']['Groceries'] == 300
    
    # Restore original file path
    budget_service.BUDGET_FILE = original_file

def test_save_budget(temp_budget_file):
    """Tests saving a budget to a file."""
    from services import budget_service
    original_file = budget_service.BUDGET_FILE
    budget_service.BUDGET_FILE = temp_budget_file
    
    new_budget = {
        "overall_limit": 1500,
        "category_budgets": {
            "Travel": 500
        }
    }
    save_budget(new_budget)
    
    loaded_budget = get_budget()
    assert loaded_budget == new_budget
    
    budget_service.BUDGET_FILE = original_file 