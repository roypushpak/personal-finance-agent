# Personal Finance Agent

This is a personal finance management application that allows users to connect their bank accounts, automatically categorize transactions, set budgets, and interact with an AI agent to gain insights into their spending habits.

![Finance Agent Screenshot](https://i.imgur.com/your-screenshot.png) <!-- Replace with your screenshot -->

## Features

- **Plaid Integration:** Securely connect to your bank accounts using Plaid Link.
- **AI-Powered Categorization:** Transactions are automatically categorized into meaningful groups using a large language model.
- **Budget Management:** Set overall and category-specific monthly budgets to track your spending.
- **Financial Overview:** A dashboard that provides a clear summary of your income, expenses, and spending by category.
- **Interactive AI Agent:** Ask questions in natural language about your finances and get data-driven answers.
- **Modern UI:** A clean and responsive user interface built with Bootstrap.

## Tech Stack

- **Backend:** Python, Flask
- **Frontend:** HTML, CSS, JavaScript, Bootstrap
- **AI:** LangChain, OpenRouter (DeepSeek model)
- **Data:** Plaid API for transaction data

## Getting Started

### Prerequisites

- Python 3.8+
- A Plaid API key (sandbox is free)
- An OpenRouter API key (free tier available)

### Installation & Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/personal-finance-agent.git
    cd personal-finance-agent
    ```

2.  **Create a virtual environment and install dependencies:**

    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    pip install -r requirements.txt
    ```

3.  **Set up your environment variables:**
    - Copy the example `.env.example` file to a new `.env` file:
      ```bash
      cp .env.example .env
      ```
    - Open the `.env` file and add your API keys:
      - `PLAID_CLIENT_ID` and `PLAID_SECRET`: Get these from your [Plaid Dashboard](https://dashboard.plaid.com/team/keys).
      - `OPENROUTER_API_KEY`: Get this from [OpenRouter](https://openrouter.ai/keys).
      - `FLASK_SECRET_KEY`: Generate a random string for this (e.g., `python -c 'import secrets; print(secrets.token_hex(16))'`).

### Running the Application

Once your environment is set up, you can run the Flask application:

```bash
flask run
```

The application will be available at `http://127.0.0.1:5000`.

## How It Works

1.  **Link Account:** On the landing page, click "Link Your Bank Account" to open the Plaid Link modal.
2.  **Select Institution:** Choose your bank and enter your credentials (Plaid's sandbox provides test credentials).
3.  **View Overview:** Once linked, you'll be redirected to the dashboard, where your transactions will be fetched and categorized.
4.  **Set Budgets:** Navigate to the "Budget" page to define your spending limits.
5.  **Ask the Agent:** Go to the "Ask Agent" page to chat with the AI about your financial data.

## Project Structure

```
/
├── agent/                # AI agent logic
│   ├── __init__.py
│   └── agent.py
├── routes/               # Flask blueprints for routes
│   ├── __init__.py
│   ├── api.py            # API endpoints
│   └── main.py           # Main application routes
├── services/             # Business logic and external service integrations
│   ├── __init__.py
│   ├── budget_service.py
│   ├── plaid_service.py
│   └── transaction_service.py
├── templates/            # HTML templates
│   ├── base.html
│   ├── index.html
│   └── ...
├── .env.example          # Example environment variables
├── app.py                # Main Flask application entry point
├── requirements.txt      # Python dependencies
└── README.md
```
