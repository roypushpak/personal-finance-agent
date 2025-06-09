import pytest
from agent.agent import create_agent_executor, ask_agent
from unittest.mock import patch, MagicMock


@patch("agent.agent.get_processed_transactions")
@patch("agent.agent.get_llm")
@patch("agent.agent.create_react_agent")
@patch("agent.agent.AgentExecutor")
def test_ask_agent_not_empty(mock_agent_executor_cls, mock_create_agent, mock_get_llm, mock_get_transactions):
    """
    Tests that the ask_agent function returns a non-empty response.
    """
    # Mock the transaction data to avoid Plaid calls
    mock_get_transactions.return_value = ([], [], None)

    # Create a mock LLM that returns a predictable response
    mock_llm = MagicMock()
    mock_llm.invoke.return_value.content = "This is a test response."
    mock_get_llm.return_value = mock_llm

    # Mock the agent and executor to avoid langchain internals
    mock_create_agent.return_value = MagicMock()
    mock_executor = MagicMock()
    mock_executor.invoke.return_value = {"output": "This is a test response."}
    mock_agent_executor_cls.return_value = mock_executor

    # We need a fake access token for the agent executor
    agent_executor = create_agent_executor("fake_access_token")
    response, cost_info = ask_agent(agent_executor, "What is my budget?")

    assert isinstance(response, str)
    assert len(response) > 0
    assert response == "This is a test response."
    assert isinstance(cost_info, dict)
    assert "total_tokens" in cost_info
    assert "total_cost" in cost_info
