from flask import Flask, render_template, request
from main import get_stock_data

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/stock_data', methods=['POST'])
def stock_data():
    ticker = request.form['ticker']
    data = get_stock_data(ticker)
    return render_template('result.html', ticker=ticker, data=data.to_html())

if __name__ == '__main__':
    app.run(debug=True)
