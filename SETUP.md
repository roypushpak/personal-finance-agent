# Personal Finance App Setup Guide

## Required Environment Variables

To use the bank integration and AI assistant features, you need to set up the following environment variables in your Convex deployment:

### 1. Plaid Integration (Bank Account Connection)

1. Sign up for a Plaid account at https://plaid.com/
2. Get your Plaid credentials from the dashboard
3. In your Convex dashboard, go to Settings → Environment Variables
4. Add these variables:
   - `PLAID_CLIENT_ID`: Your Plaid client ID
   - `PLAID_SECRET`: Your Plaid secret key (use sandbox secret for development)

### 2. AI Assistant (OpenRouter + DeepSeek)

1. Sign up for an OpenRouter account at https://openrouter.ai/
2. Get your API key from the dashboard
3. Add this environment variable:
   - `OPENROUTER_API_KEY`: Your OpenRouter API key

## Features

### 🏦 Bank Account Integration
- Connect your bank accounts securely using Plaid
- Automatically sync transactions
- View account balances and transaction history
- Categorize bank transactions

### 🤖 AI Financial Assistant
- Ask questions about your finances in plain English
- Get personalized financial insights and advice
- Generate monthly financial summaries
- Powered by DeepSeek AI model via OpenRouter

### 📊 Core Features
- Track income and expenses
- Set and monitor budgets
- Create and track financial goals
- Get intelligent insights about spending patterns
- Real-time financial dashboard

## Getting Started

1. Set up the environment variables as described above
2. Connect your bank account using the Banking tab
3. Add some manual transactions or let bank sync populate your data
4. Set up budgets and financial goals
5. Use the AI assistant to get insights about your finances

## Security Notes

- All bank connections are secured through Plaid's industry-standard encryption
- Your financial data is stored securely in Convex
- API keys are stored as environment variables and never exposed to the client
- Bank account credentials are never stored - only secure access tokens

## Support

If you encounter any issues:
1. Check that all environment variables are set correctly
2. Ensure your Plaid account is in sandbox mode for development
3. Verify your OpenRouter API key has sufficient credits
