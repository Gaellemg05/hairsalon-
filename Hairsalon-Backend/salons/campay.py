import logging
import time
import uuid
import re
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

_cached_token = None
_token_expiry = 0

def get_base_url():
    env = getattr(settings, 'CAMPAY_ENVIRONMENT', 'DEMO').upper()
    if env == 'PROD':
        return 'https://www.campay.net/api/'
    return 'https://demo.campay.net/api/'

def format_cameroon_phone(phone):
    """
    Cleans and standardizes Cameroon phone number into 237xxxxxxxxx format.
    """
    digits = re.sub(r'\D', '', str(phone or ''))
    if digits.startswith('237') and len(digits) == 12:
        return digits
    if len(digits) == 9:
        return f"237{digits}"
    return digits

def get_campay_token():
    """
    Retrieves or refreshes the Campay JWT access token.
    """
    global _cached_token, _token_expiry
    now = time.time()
    if _cached_token and now < _token_expiry:
        return _cached_token

    base_url = get_base_url()
    username = getattr(settings, 'CAMPAY_USERNAME', '')
    password = getattr(settings, 'CAMPAY_PASSWORD', '')

    if not username or not password:
        raise ValueError("CamPay credentials (CAMPAY_USERNAME / CAMPAY_PASSWORD) are not configured.")

    token_url = f"{base_url}token/"
    response = requests.post(
        token_url,
        json={'username': username, 'password': password},
        headers={'Content-Type': 'application/json'},
        timeout=30
    )

    if response.status_code != 200:
        logger.error(f"Failed to obtain CamPay token: {response.status_code} {response.text}")
        raise ValueError(f"CamPay authentication failed: {response.text}")

    data = response.json()
    token = data.get('token')
    expires_in = data.get('expires_in', 3600)

    _cached_token = token
    _token_expiry = now + int(expires_in) - 120  # refresh 2 minutes before expiry
    return token

def collect_payment(phone_number, amount=25, description="Salon Subscription", external_reference=None):
    """
    Requests a Mobile Money payment collect from the user's phone via CamPay.
    """
    token = get_campay_token()
    base_url = get_base_url()
    formatted_phone = format_cameroon_phone(phone_number)
    ext_ref = external_reference or str(uuid.uuid4())

    payload = {
        'amount': str(int(amount)),
        'currency': 'XAF',
        'from': formatted_phone,
        'description': description,
        'external_reference': ext_ref,
    }

    collect_url = f"{base_url}collect/"
    headers = {
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json',
    }

    logger.info(f"Initiating CamPay collect: {payload['amount']} XAF for {formatted_phone} (ref: {ext_ref})")
    response = requests.post(collect_url, json=payload, headers=headers, timeout=30)

    if response.status_code not in (200, 201):
        logger.error(f"CamPay collect error: {response.status_code} - {response.text}")
        try:
            err_data = response.json()
            err_msg = err_data.get('message') or err_data.get('detail') or str(err_data)
        except Exception:
            err_msg = response.text
        raise ValueError(f"CamPay collect request failed: {err_msg}")

    res_json = response.json()
    res_json['external_reference'] = ext_ref
    return res_json

def check_transaction_status(reference):
    """
    Queries the current status of a CamPay transaction by reference.
    Returns dict containing status ('SUCCESSFUL', 'PENDING', 'FAILED', etc.)
    """
    token = get_campay_token()
    base_url = get_base_url()
    status_url = f"{base_url}transaction/{reference}/"
    headers = {
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json',
    }

    response = requests.get(status_url, headers=headers, timeout=30)
    if response.status_code != 200:
        logger.error(f"CamPay transaction check error: {response.status_code} - {response.text}")
        raise ValueError(f"Unable to verify transaction status: {response.text}")

    return response.json()
