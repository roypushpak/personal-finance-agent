# 💰 Personal Finance App

A comprehensive personal finance management application built with React, Convex, and modern web technologies.

## 🚀 Features

### 📊 Core Financial Management
- **Transaction Tracking**: Add, edit, and categorize income and expenses
- **Budget Management**: Set monthly/yearly budgets and track spending
- **Goal Setting**: Create and monitor financial goals with progress tracking
- **Monthly Statistics**: View comprehensive financial summaries

### 🏦 Bank Integration (Plaid)
- **Secure Bank Connection**: Connect bank accounts using Plaid's secure API
- **Automatic Transaction Sync**: Import transactions automatically
- **Account Overview**: View all connected accounts with current balances
- **Transaction History**: See recent bank transactions alongside manual entries

### 🤖 AI Financial Assistant
- **Natural Language Queries**: Ask questions about your finances in plain English
- **Intelligent Insights**: Get personalized advice based on spending patterns
- **Monthly Summaries**: Auto-generate comprehensive financial summaries
- **Contextual Responses**: AI has access to your complete financial data

### 💡 Smart Insights
- **Budget Alerts**: Get notified when approaching budget limits
- **Spending Patterns**: Analyze your spending habits
- **Goal Progress**: Track progress towards financial goals
- **Saving Opportunities**: Discover areas to save money

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Convex (real-time database and functions)
- **Authentication**: Convex Auth
- **Bank Integration**: Plaid API
- **AI**: LangChain + DeepSeek via OpenRouter
- **Deployment**: Vercel

## 🔧 Setup & Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Convex account
- Plaid account (for bank integration)
- OpenRouter account (for AI features)

### Environment Variables

Set up these environment variables in your Convex deployment:

```bash
# Plaid Integration
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret_key

# AI Assistant
OPENROUTER_API_KEY=your_openrouter_api_key
```

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd personal-finance-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Convex**
   ```bash
   npx convex dev
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Configure environment variables**
   - Go to your Convex dashboard
   - Navigate to Settings → Environment Variables
   - Add the required environment variables listed above

## 📱 Usage

### Getting Started
1. **Sign up/Login**: Create an account or sign in
2. **Connect Bank Account**: Use the Banking tab to securely connect your bank
3. **Add Transactions**: Manually add transactions or let bank sync populate data
4. **Set Budgets**: Create budgets for different spending categories
5. **Create Goals**: Set financial goals and track progress
6. **Use AI Assistant**: Ask questions about your finances

### Key Features

#### Bank Connection
- Navigate to the "Banking" tab
- Click "Connect Bank" to start Plaid Link flow
- Select your bank and authenticate securely
- Transactions will sync automatically

#### AI Assistant
- Go to the "AI Assistant" tab
- Ask questions like:
  - "How am I doing with my budget this month?"
  - "What are my biggest spending categories?"
  - "Where can I cut expenses?"
- Generate monthly summaries for insights

#### Budget Management
- Set monthly or yearly budgets by category
- Monitor spending with visual progress bars
- Get alerts when approaching limits

#### Goal Tracking
- Create savings goals with target amounts and dates
- Add progress incrementally
- Track completion percentage

## 🔒 Security

- **Bank Security**: All bank connections secured through Plaid's encryption
- **Data Protection**: Financial data stored securely in Convex
- **API Security**: Environment variables protect sensitive keys
- **No Credential Storage**: Bank credentials never stored, only secure tokens

## 🚀 Deployment

### Vercel Deployment

1. **Connect to Vercel**
   ```bash
   npm i -g vercel
   vercel
   ```

2. **Set Environment Variables**
   - In Vercel dashboard, go to Project Settings
   - Add environment variables:
     - `CONVEX_DEPLOYMENT`: Your Convex deployment URL

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Manual Deployment

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your hosting provider

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. **Environment Variables**: Ensure all required variables are set correctly
2. **Plaid Setup**: Verify your Plaid account is in sandbox mode for development
3. **OpenRouter Credits**: Check that your OpenRouter API key has sufficient credits
4. **Convex Deployment**: Make sure your Convex deployment is active

## 🙏 Acknowledgments

- [Convex](https://convex.dev) for the real-time backend
- [Plaid](https://plaid.com) for secure bank integration
- [OpenRouter](https://openrouter.ai) for AI model access
- [Tailwind CSS](https://tailwindcss.com) for styling
- [React](https://react.dev) for the frontend framework
