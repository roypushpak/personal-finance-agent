# Personal Finance Management App

Live Demo: https://personal-finance-agent-sz7v.onrender.com

This is a comprehensive personal finance management application built with React, TypeScript, Convex, and Plaid. It provides a modern interface for tracking transactions, managing budgets, setting financial goals, and gaining insights into your spending habits.

## Features

- **Secure Authentication:** User authentication using Clerk.
- **Plaid Integration:** Connect multiple bank accounts securely using Plaid Link.
- **Transaction Syncing:** Automatically sync transactions from your bank accounts.
- **AI-Powered Categorization:** Transactions are automatically categorized using an AI assistant.
- **Manual Transactions:** Manually add, edit, and delete transactions.
- **Budget Management:** Create and manage budgets for different spending categories.
- **Financial Goals:** Set and track your financial goals.
- **Financial Insights:** Get AI-powered insights into your spending patterns and financial health.
- **Responsive Design:** A clean and responsive UI built with Tailwind CSS and Shadcn UI.
- **Offline-First Experience:**
  - Add and view transactions without an internet connection
  - Automatic sync when connection is restored
  - Clear visual indicators of offline status
  - Offline queue for pending operations
- **Mobile-Optimized UI:**
  - Collapsible sidebar for better mobile navigation
  - Touch-friendly controls and forms
  - Responsive layouts that adapt to any screen size
  - Installable PWA for app-like experience on mobile devices

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Convex
- **Authentication:** Clerk
- **Bank Integration:** Plaid
- **Styling:** Tailwind CSS, Shadcn UI
- **Offline Support:** Service Workers, IndexedDB, localStorage
- **Progressive Web App:** Web App Manifest, Service Workers
- **Deployment:** Vercel (or your preferred platform)

## Offline Capabilities

This application is designed to work seamlessly offline with the following features:

- **Service Worker:** Caches static assets and API responses for offline access
- **Offline Queue:** Queues mutations when offline and syncs when back online
- **Network Detection:** Automatically detects online/offline status
- **Data Persistence:** Uses IndexedDB and localStorage to persist data locally
- **Offline Fallback:** Shows a custom offline page when a route isn't cached

## Mobile Experience

The app provides a native-like experience on mobile devices with:

- **Responsive Layouts:** Adapts to different screen sizes and orientations
- **Touch-Friendly UI:** Larger touch targets and gesture support
- **PWA Support:** Install the app to your home screen for full-screen experience
- **Performance Optimizations:** Code splitting and lazy loading for faster load times
- **Offline-First:** Full functionality even without an internet connection

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- Convex account
- Clerk account
- Plaid API keys (for development)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/personal-finance-app.git
    cd personal-finance-app
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up Convex:**

    - Log in to your Convex account:
      ```bash
      npx convex dev
      ```
    - Follow the prompts to link the project to your Convex backend.

4.  **Configure Environment Variables:**

    - Create a `.env.local` file in the root of your project.
    - Add the following environment variables from your Clerk and Plaid accounts:

      ```
      VITE_CLERK_PUBLISHABLE_KEY=...
      CLERK_SECRET_KEY=...

      PLAID_CLIENT_ID=...
      PLAID_SECRET=...
      ```

    - In your Convex dashboard, set the same environment variables.

5.  **Run the application:**

    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:5173`.

## Deployment

This application is configured for deployment on Vercel. Simply connect your Git repository to Vercel and configure the same environment variables as in your `.env.local` file.

## License

This project is licensed under the MIT License.
