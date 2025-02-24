# robinhood_auth.py

import sys
import json
import robin_stocks.robinhood as r
import logging
from pathlib import Path
import os
import time

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clear_session():
    """Clear any existing Robinhood session."""
    try:
        r.logout()
    except:
        pass

    pickle_path = Path.home() / '.tokens' / 'robin_stocks.pickle'
    try:
        if pickle_path.exists():
            os.remove(pickle_path)
            logger.info("Removed existing pickle file")
    except Exception as e:
        logger.warning(f"Error removing pickle file: {e}")

def perform_login(username, password):
    """Handle login with interactive MFA"""
    try:
        clear_session()

        try:
            # Initial login attempt
            r.login(
                username=username,
                password=password,
                expiresIn=3600,
                scope='internal',
                by_sms=True,
                store_session=False
            )

            # Get account info after successful login
            account_profile = r.load_account_profile()
            portfolio_profile = r.load_portfolio_profile()
            user_profile = r.load_user_profile()

            result = {
                'success': True,
                'buying_power': float(account_profile.get('buying_power', 0)),
                'cash_available': float(portfolio_profile.get('withdrawable_amount', 0)),
                'user': {
                    'email': username,
                    'first_name': user_profile.get('first_name', ''),
                    'last_name': user_profile.get('last_name', '')
                }
            }

            r.logout()
            return result

        except Exception as e:
            error_str = str(e).lower()
            if 'invalid password' in error_str or 'invalid username' in error_str:
                return {
                    'success': False,
                    'error': 'Invalid username or password'
                }
            elif 'mfa' in error_str or 'challenge' in error_str:
                return {
                    'success': False,
                    'requires_mfa': True,
                    'message': 'MFA required'
                }
            else:
                raise

    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
    finally:
        clear_session()

if __name__ == "__main__":
    if len(sys.argv) < 4:
        result = {
            'success': False,
            'error': 'Invalid arguments'
        }
    else:
        username = sys.argv[2]
        password = sys.argv[3]
        
        result = perform_login(username, password)
    
    print(json.dumps(result))
    sys.exit(0 if result.get('success', False) else 1)