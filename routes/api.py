from flask import Blueprint, request, jsonify, session
from services.plaid_service import (
    create_link_token as create_plaid_link_token,
    exchange_public_token,
)
from services.budget_service import get_budget, save_budget
from agent.agent import create_agent_executor, ask_agent as run_agent
from extensions import limiter
from pydantic import ValidationError

api_bp = Blueprint("api", __name__)


# Maintain a single agent executor instance per session
def get_agent_executor():
    if "access_token" in session:
        return create_agent_executor(session["access_token"])
    return None


@api_bp.route("/create_link_token", methods=["POST"])
def create_link_token():
    try:
        # For simplicity, we'll use a hardcoded user_id.
        # In a real application, you would manage user IDs.
        client_user_id = "user-id-cortex"
        token_response = create_plaid_link_token(client_user_id)
        return jsonify(token_response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route("/set_access_token", methods=["POST"])
def set_access_token():
    public_token = request.json.get("public_token")
    if not public_token:
        return jsonify({"error": "public_token not provided"}), 400

    try:
        access_token, item_id = exchange_public_token(public_token)
        session["access_token"] = access_token
        session["item_id"] = item_id
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route("/ask_agent", methods=["POST"])
@limiter.limit("30 per minute")
def ask_agent():
    user_query = request.json.get("query")
    if not user_query:
        return jsonify({"error": "Query not provided"}), 400

    agent_executor = get_agent_executor()
    if not agent_executor:
        return (
            jsonify({"error": "Agent not initialized. Please link your bank account."}),
            400,
        )

    response, cost_info = run_agent(agent_executor, user_query)

    return jsonify({"response": response, "cost": cost_info})


@api_bp.route("/budget", methods=["GET", "POST"])
def api_budget():
    if request.method == "GET":
        budget_data = get_budget()
        return jsonify(budget_data)

    if request.method == "POST":
        budget_data = request.json
        if not budget_data:
            return jsonify({"error": "Budget data not provided"}), 400
        try:
            save_budget(budget_data)
            return jsonify({"status": "success"})
        except ValidationError as e:
            return jsonify({"error": "Invalid budget data", "details": e.errors()}), 422
