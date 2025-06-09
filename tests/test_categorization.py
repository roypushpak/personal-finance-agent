import pytest
from services.transaction_service import batch_categorize_transactions


def test_batch_categorization():
    """
    Tests that the batch categorization function returns a valid mapping.
    """
    transactions = ["Coffee Shop", "Amazon Purchase", "Monthly Subscription"]

    # This is a mocked test. In a real scenario, you'd mock the LLM call.
    # For this hackathon, we'll just check the output format.
    category_map = batch_categorize_transactions(transactions)

    assert isinstance(category_map, dict)
    assert len(category_map) == len(transactions)
    for name in transactions:
        assert name in category_map
        assert isinstance(category_map[name], str)
