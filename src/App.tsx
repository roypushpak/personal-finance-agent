import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { useState, useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { NetworkStatus } from "./components/NetworkStatus";
import { useServiceWorker } from "./hooks/useServiceWorker";
import { SyncStatus } from "./components/SyncStatus";

// Register service worker on component mount
export default function App() {
  const { isOnline } = useServiceWorker();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-semibold text-primary">💰 Personal Finance</h2>
          <div className="flex items-center">
            {!isOnline && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full flex items-center">
                <span className="w-2 h-2 rounded-full bg-yellow-500 mr-1"></span>
                Offline
              </span>
            )}
          </div>
        </div>
        <Authenticated>
          <SignOutButton />
        </Authenticated>
      </header>
      <main className="flex-1">
        <ErrorBoundary>
          <Content />
        </ErrorBoundary>
      </main>
      <NetworkStatus />
      <SyncStatus />
      <Toaster position="top-center" />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (loggedInUser === null) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-4">
              Take Control of Your Finances
            </h1>
            <p className="text-xl text-secondary">
              Track expenses, set budgets, and achieve your financial goals
            </p>
          </div>
          <SignInForm />
        </div>
      </div>
    );
  }

  return <Dashboard />;
}
