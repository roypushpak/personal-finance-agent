import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import (
    ItemPublicTokenExchangeRequest,
)
from plaid.model.transactions_get_request import TransactionsGetRequest
import os
from dotenv import load_dotenv
import datetime
import json

load_dotenv()

PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
PLAID_SECRET = os.getenv("PLAID_SECRET")

if not PLAID_CLIENT_ID or not PLAID_SECRET:
    raise ValueError(
        "PLAID_CLIENT_ID and PLAID_SECRET environment variables must be set."
    )

# Plaid client setup
host = plaid.Environment.Sandbox  # or Development or Production
configuration = plaid.Configuration(
    host=host,
    api_key={
        "clientId": PLAID_CLIENT_ID,
        "secret": PLAID_SECRET,
    },
)
api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)


def create_link_token(client_user_id):
    """Creates a Plaid Link token."""
    request = LinkTokenCreateRequest(
        user=LinkTokenCreateRequestUser(client_user_id=client_user_id),
        client_name="Personal Finance Agent",
        products=[Products("transactions")],
        country_codes=[CountryCode("CA")],
        language="en",
    )
    response = client.link_token_create(request)
    return response.to_dict()


def exchange_public_token(public_token):
    """Exchanges a public token for an access token."""
    request = ItemPublicTokenExchangeRequest(public_token=public_token)
    response = client.item_public_token_exchange(request)
    return response["access_token"], response["item_id"]


def get_transactions(access_token, start_date, end_date):
    """Fetches transactions from Plaid."""
    request = TransactionsGetRequest(
        access_token=access_token,
        start_date=start_date,
        end_date=end_date,
    )
    response = client.transactions_get(request)
    return response["transactions"]
