import pytest
from agent.agent import create_agent_executor, ask_agent
from unittest.mock import patch, MagicMock


@patch("agent.agent.get_processed_transactions")
def test_ask_agent_not_empty(mock_get_transactions):
    """
    Tests that the ask_agent function returns a non-empty response.
    """
    # Mock the transaction data to avoid Plaid calls
    mock_get_transactions.return_value = ([], [], None)

    # Create a mock LLM that returns a predictable response
    mock_llm = MagicMock()
    mock_llm.invoke.return_value.content = "This is a test response."

    with patch("agent.agent.llm", mock_llm):
        # We need a fake access token for the agent executor
        agent_executor = create_agent_executor("fake_access_token")
        response = ask_agent(agent_executor, "What is my budget?")

        assert isinstance(response, str)
        assert len(response) > 0
        assert response == "This is a test response."
