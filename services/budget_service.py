import os
import json
from typing import Dict, Optional

from pydantic import BaseModel, Field, condecimal


class BudgetUpdate(BaseModel):
    overall_limit: Optional[condecimal(ge=0, decimal_places=2)] = None
    category_budgets: Dict[
        str, Optional[condecimal(ge=0, decimal_places=2)]
    ] = Field(default_factory=dict)


BUDGET_FILE = "budget.json"


def get_budget():
    """Loads the budget from a JSON file."""
    if not os.path.exists(BUDGET_FILE):
        return {"overall_limit": None, "category_budgets": {}}
    with open(BUDGET_FILE, "r") as f:
        return json.load(f)


def save_budget(budget_data: dict):
    """Saves the budget to a JSON file."""
    # This will raise a validation error if the data is invalid
    validated_data = BudgetUpdate(**budget_data).model_dump()

    with open(BUDGET_FILE, "w") as f:
        # Pydantic's model_dump converts decimals, but let's ensure floats for JSON
        to_save = {
            "overall_limit": (
                float(validated_data["overall_limit"])
                if validated_data["overall_limit"] is not None
                else None
            ),
            "category_budgets": {
                k: (float(v) if v is not None else None)
                for k, v in validated_data["category_budgets"].items()
            },
        }
        json.dump(to_save, f, indent=2)
