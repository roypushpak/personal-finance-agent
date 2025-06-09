import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()


def get_llm():
    """Initializes and returns the shared LLM instance, checking for the API key."""
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY environment variable must be set.")

    llm = ChatOpenAI(
        model="deepseek/deepseek-chat-v3-0324:free",
        temperature=0,
        openai_api_key=OPENROUTER_API_KEY,
        openai_api_base="https://openrouter.ai/api/v1",
        default_headers={
            "HTTP-Referer": "http://localhost:5003",
            "X-Title": "Personal Finance Agent",
        },
        max_retries=3,
    )
    return llm 