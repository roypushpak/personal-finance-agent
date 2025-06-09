from flask import Blueprint, render_template, session, redirect, url_for, jsonify
from services.transaction_service import get_processed_transactions, BUDGET_CATEGORIES
from services.budget_service import get_budget
import pandas as pd

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    if 'access_token' in session:
        return redirect(url_for('main.overview'))
    return render_template('index.html')

@main_bp.route('/overview')
def overview():
    if 'access_token' not in session:
        return redirect(url_for('main.index'))
    
    access_token = session['access_token']
    incoming, outgoing, error = get_processed_transactions(access_token)

    if error:
        return render_template('overview.html', error=error)

    df_outgoing = pd.DataFrame(outgoing)
    spending_by_category = {}
    if not df_outgoing.empty:
        spending_by_category = df_outgoing.groupby('category')['amount'].sum().to_dict()

    chart_data = {
        "labels": list(spending_by_category.keys()),
        "data": list(spending_by_category.values()),
    }

    total_income = sum(t['amount'] for t in incoming) if incoming else 0
    total_outgoing = sum(t['amount'] for t in outgoing) if outgoing else 0

    return render_template('overview.html', 
                           chart_data=chart_data,
                           total_income=total_income,
                           total_outgoing=total_outgoing,
                           transactions=outgoing[:5]) # Show recent 5 transactions

@main_bp.route('/outgoing')
def outgoing():
    if 'access_token' not in session:
        return redirect(url_for('main.index'))
    _, outgoing_transactions, error = get_processed_transactions(session['access_token'])
    if error:
        return render_template('outgoing.html', transactions=[], error=error)
    return render_template('outgoing.html', transactions=outgoing_transactions)

@main_bp.route('/incoming')
def incoming():
    if 'access_token' not in session:
        return redirect(url_for('main.index'))
    incoming_transactions, _, error = get_processed_transactions(session['access_token'])
    if error:
        return render_template('incoming.html', transactions=[], error=error)
    return render_template('incoming.html', transactions=incoming_transactions)

@main_bp.route('/agent')
def agent():
    if 'access_token' not in session:
        return redirect(url_for('main.index'))
    return render_template('agent.html')

@main_bp.route('/budget')
def budget():
    budget_data = get_budget()
    return render_template('budget.html', budget=budget_data, budget_categories=BUDGET_CATEGORIES) 