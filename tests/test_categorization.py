import pytest
from unittest.mock import patch

from langchain_core.runnables import RunnableLambda
from services.transaction_service import batch_categorize_transactions


@patch("services.transaction_service.get_llm")
def test_batch_categorization(mock_get_llm):
    """Tests that the batch categorization function returns a valid mapping."""
    transactions = ["Coffee Shop", "Amazon Purchase", "Monthly Subscription"]

    # Return a fake LLM that outputs predictable JSON
    fake_response = (
        "["
        "{\"id\": 1, \"category\": \"Restaurants\"},"
        "{\"id\": 2, \"category\": \"Shopping\"},"
        "{\"id\": 3, \"category\": \"Bills & Utilities\"}"
        "]"
    )
    mock_get_llm.return_value = RunnableLambda(lambda _: fake_response)

    category_map = batch_categorize_transactions(transactions)

    assert isinstance(category_map, dict)
    assert len(category_map) == len(transactions)
    for name in transactions:
        assert name in category_map
        assert isinstance(category_map[name], str)
