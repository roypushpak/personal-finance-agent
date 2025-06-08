import yfinance as yf
import pandas as pd
import argparse

def get_stock_data(ticker):
    """
    Fetches stock data for a given ticker and calculates technical indicators.
    """
    stock = yf.Ticker(ticker)
    # Get historical market data
    hist = stock.history(period="1y")

    # Calculate moving averages
    hist['MA50'] = hist['Close'].rolling(window=50).mean()
    hist['MA200'] = hist['Close'].rolling(window=200).mean()

    # Calculate RSI
    delta = hist['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    hist['RSI'] = 100 - (100 / (1 + rs))

    return hist

def main():
    """
    Main function to run the personal finance agent.
    """
    parser = argparse.ArgumentParser(description="Personal Finance AI Agent")
    parser.add_argument("ticker", type=str, help="Stock ticker symbol (e.g., AAPL)")
    args = parser.parse_args()

    print(f"Fetching data for {args.ticker}...")
    stock_data = get_stock_data(args.ticker)
    print("Recent Data:")
    print(stock_data.tail())

if __name__ == "__main__":
    main()
