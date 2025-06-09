import json
import os

import pandas as pd
from dotenv import load_dotenv
from langchain.agents import AgentExecutor, create_react_agent, tool
from langchain.prompts import PromptTemplate
from langchain_community.callbacks.manager import get_openai_callback
from pydantic import BaseModel, Field

from services.budget_service import get_budget, save_budget
from services.llm_service import get_llm
from services.transaction_service import get_processed_transactions

load_dotenv()

MEMORY_FILE = "agent_memory.json"


def load_memory():
    """Loads the conversation history from a JSON file."""
    if not os.path.exists(MEMORY_FILE):
        return []
    with open(MEMORY_FILE, "r") as f:
        return json.load(f)


def save_memory(memory):
    """Saves the conversation history to a JSON file."""
    with open(MEMORY_FILE, "w") as f:
        json.dump(memory, f, indent=2)


def create_agent_executor(access_token):
    class GetTransactionDataInput(BaseModel):
        pass

    @tool(args_schema=GetTransactionDataInput)
    def get_transaction_data() -> str:
        """
        Tool to get the user's recent financial transactions and budget.
        Returns a JSON string with keys 'incoming' and 'outgoing' for transactions,
        and 'budget' for budget information.
        """
        incoming, outgoing, error = get_processed_transactions(access_token)
        if error:
            return json.dumps({"error": "Could not retrieve transaction data."})

        budget = get_budget()

        # Combine into a single pandas DataFrame for analysis
        df_incoming = pd.DataFrame(incoming)
        df_outgoing = pd.DataFrame(outgoing)

        # Convert date columns to datetime objects
        if not df_incoming.empty:
            df_incoming["date"] = pd.to_datetime(df_incoming["date"])
        if not df_outgoing.empty:
            df_outgoing["date"] = pd.to_datetime(df_outgoing["date"])

        # Get high-level summaries
        total_income = df_incoming["amount"].abs().sum()
        total_spending = df_outgoing["amount"].sum()
        net_flow = total_income - total_spending

        # Spending by category
        spending_by_category = {}
        if not df_outgoing.empty:
            spending_by_category = (
                df_outgoing.groupby("category")["amount"].sum().to_dict()
            )

        summary = {
            "total_income": total_income,
            "total_spending": total_spending,
            "net_cash_flow": net_flow,
            "spending_by_category": {
                k: round(v, 2) for k, v in spending_by_category.items()
            },
            "budget": budget,
            "transactions_count": {
                "income": len(df_incoming),
                "outgoing": len(df_outgoing),
            },
        }
        return json.dumps(summary, indent=2)

    class BudgetAdvisorInput(BaseModel):
        query: str = Field(
            description="The user's question about their budget or financial goals."
        )

    @tool(args_schema=BudgetAdvisorInput)
    def BudgetAdvisor(query: str) -> str:
        """
        Tool to provide budget advice. Use this tool when the user asks for advice on their budget,
        asks how to save money, or asks for a plan to meet their financial goals.
        """
        llm = get_llm()
        _, outgoing, _ = get_processed_transactions(access_token)
        budget = get_budget()

        df_outgoing = pd.DataFrame(outgoing)
        spending_by_category = df_outgoing.groupby("category")["amount"].sum().to_dict()

        advice_prompt = f"""
        The user wants advice on their budget. Here is their spending by category:
        {json.dumps(spending_by_category, indent=2)}

        Here is their budget:
        {json.dumps(budget, indent=2)}

        Here is their question: {query}

        Provide advice on how they can meet their budget and suggest areas where they could cut back.
        """

        response = llm.invoke(advice_prompt)
        return response.content

    # --- Agent Setup ---
    prompt_template = """
    You are a friendly and helpful personal finance assistant.
    Your goal is to help the user understand their spending and budget.
    You have access to two tools: `get_transaction_data` and `BudgetAdvisor`.

    - Use the `get_transaction_data` tool to get a summary of the user's recent transactions and budget.
    - Use the `BudgetAdvisor` tool to get advice on their budget.
    - Do not make up transaction data. If you don't have the data, use the tool.
    - When asked about spending, analyze the `spending_by_category` data.
    - When asked about budget, compare the spending with the `budget` data.
    - When asked for budget advice, use the "BudgetAdvisor" tool.
    - Provide clear, concise, and actionable advice.
    - Your responses should be in Markdown format.

    Here is the conversation history:
    {history}

    Here is the user's question:
    {input}

    {agent_scratchpad}
    """

    prompt = PromptTemplate(
        input_variables=["input", "agent_scratchpad", "history"],
        template=prompt_template,
    )

    tools = [get_transaction_data, BudgetAdvisor]
    llm = get_llm()
    agent = create_react_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(
        agent=agent, tools=tools, verbose=True, handle_parsing_errors=True
    )
    return agent_executor


def ask_agent(agent_executor, user_query):
    """Invokes the agent with a user query and self-critiques the response."""
    # Load conversation history
    memory = load_memory()
    conversation_history = "\n".join(
        [f"Q: {item['query']}\nA: {item['response']}" for item in memory]
    )

    try:
        with get_openai_callback() as cb:
            # Initial response from the agent
            initial_response = agent_executor.invoke(
                {"input": user_query, "history": conversation_history}
            )

            # Self-critique prompt
            critique_prompt = f"""
            Original query: {user_query}
            Initial answer: {initial_response['output']}

            Critique this answer. Is it helpful? Is it accurate? Is it actionable?
            Rewrite the answer to be more helpful, empathetic, and clear.
            """

            # Get the revised answer from the LLM
            llm = get_llm()
            critique_response = llm.invoke(critique_prompt)
            final_response = critique_response.content

            # Save the interaction to memory
            memory.append({"query": user_query, "response": final_response})
            # Keep memory to the last 5 interactions
            save_memory(memory[-5:])

            cost_info = {
                "total_tokens": cb.total_tokens,
                "total_cost": f"${cb.total_cost:.5f}",
            }
            return final_response, cost_info

    except Exception as e:
        print(f"Error invoking agent: {e}")
        return "Sorry, I encountered an error. Please try again.", None
