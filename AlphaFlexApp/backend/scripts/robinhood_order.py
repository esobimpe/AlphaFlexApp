import sys
import json
import robin_stocks.robinhood as r
import logging
from decimal import Decimal
from pathlib import Path
import os
import time
from datetime import datetime, time as dt_time
import pytz
import random

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

def check_market_hours():
    """Check if it's currently market hours"""
    import pytz
    from datetime import datetime, time as dt_time
    
    # Get current time in Chicago timezone (CDT/CST)
    cdt = pytz.timezone('America/Chicago')
    now = datetime.now(cdt)
    
    # Check if it's a weekday
    if now.weekday() >= 5:  # 5 = Saturday, 6 = Sunday
        return False
        
    current_time = now.time()
    market_open = dt_time(9, 0)  # 9:00 AM CDT
    market_close = dt_time(14, 30)  # 2:30 PM CDT
    
    return market_open <= current_time <= market_close

def verify_authentication():
    """Verify that we have an active authenticated session"""
    try:
        # Try to get account info as a verification
        account = r.load_account_profile()
        if not account or 'account_number' not in account:
            return False
        return True
    except Exception as e:
        logger.error(f"Authentication verification failed: {str(e)}")
        return False

def place_orders(total_amount, holdings):
    """Place multiple orders based on allocation weights"""
    try:
        # Verify market hours
        if not check_market_hours():
            raise Exception("Orders can only be placed during market hours (9:00 AM - 2:30 PM CDT, Mon-Fri)")

        # Verify authentication
        if not verify_authentication():
            raise Exception("Authentication required or has expired")

        # Get account info to verify buying power
        account = r.load_account_profile()
        buying_power = float(account.get('buying_power', 0))
        
        if buying_power < total_amount:
            raise Exception(f"Insufficient buying power. Available: ${buying_power}, Required: ${total_amount}")

        orders = []
        total_allocated = 0
        failed_orders = []

        # Get all stock prices first to verify total investment
        stock_prices = {}
        for holding in holdings:
            symbol = holding['Stock']
            try:
                price = float(r.stocks.get_latest_price(symbol)[0])
                stock_prices[symbol] = price
            except Exception as e:
                logger.error(f"Error getting price for {symbol}: {str(e)}")
                failed_orders.append({
                    'symbol': symbol,
                    'error': f"Failed to get current price: {str(e)}"
                })

        # Place orders for each stock
        for holding in holdings:
            try:
                symbol = holding['Stock']
                if symbol not in stock_prices:
                    continue

                # Calculate allocation amount
                allocation_percentage = float(holding['Stock Allocation Weight (%)'])
                amount = (allocation_percentage / 100) * total_amount
                total_allocated += amount

                price = stock_prices[symbol]
                quantity = round(amount / price, 6)  # Round to 6 decimal places

                if quantity > 0:
                    # Place market order with retry logic
                    retries = 3
                    order = None
                    for attempt in range(retries):
                        try:
                            order = r.orders.order_buy_fractional_by_quantity(
                                symbol=symbol,
                                quantity=quantity,
                                timeInForce='gfd',
                                extendedHours=False
                            )
                            break
                        except Exception as e:
                            if attempt == retries - 1:
                                raise
                            time.sleep(1 * (attempt + 1))

                    if order:
                        orders.append({
                            'symbol': symbol,
                            'shares': quantity,
                            'amount': amount,
                            'price': price,
                            'order_id': order['id'],
                            'status': order['state']
                        })
                        logger.info(f"Placed order for {quantity} shares of {symbol}")
                        
                        # Add random delay between 5-10 seconds before processing the next order
                        delay_seconds = random.uniform(5, 10)
                        logger.info(f"Waiting {delay_seconds:.2f} seconds before placing next order...")
                        time.sleep(delay_seconds)

            except Exception as e:
                logger.error(f"Error placing order for {symbol}: {str(e)}")
                failed_orders.append({
                    'symbol': symbol,
                    'error': str(e),
                    'allocation_amount': amount if 'amount' in locals() else None
                })

        return {
            'success': True,
            'orders': orders,
            'failed_orders': failed_orders,
            'total_amount': total_amount,
            'total_allocated': total_allocated,
            'timestamp': datetime.now().isoformat(),
            'partial_success': len(failed_orders) > 0 and len(orders) > 0,
            'all_failed': len(orders) == 0 and len(failed_orders) > 0
        }

    except Exception as e:
        logger.error(f"Error in place_orders: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'error_type': 'authentication_error' if 'Authentication required' in str(e) else 'order_error',
            'timestamp': datetime.now().isoformat()
        }

def sell_all_positions(holdings):
    """Sell only the positions specified in holdings"""
    try:
        if not check_market_hours():
            raise Exception("Orders can only be placed during market hours (9:00 AM - 2:30 PM CDT, Mon-Fri)")

        # Verify authentication
        if not verify_authentication():
            raise Exception("Authentication required or has expired")

        # Create a set of symbols from our holdings for quick lookup
        portfolio_symbols = {holding['Stock'] for holding in holdings}

        # Get current positions to verify shares
        positions = r.get_all_positions()
        position_map = {
            p['symbol']: float(p['quantity'])
            for p in positions 
            if float(p['quantity']) > 0 and p['symbol'] in portfolio_symbols  # Only include portfolio stocks
        }

        orders = []
        failed_orders = []
        skipped_stocks = []

        for holding in holdings:
            try:
                symbol = holding['Stock']
                
                # Check if we have this position
                if symbol not in position_map:
                    logger.warning(f"No position found for {symbol}")
                    skipped_stocks.append({
                        'symbol': symbol,
                        'reason': 'No position found'
                    })
                    continue

                quantity = position_map[symbol]
                if quantity > 0:
                    # Place sell order with retry logic
                    retries = 3
                    order = None
                    for attempt in range(retries):
                        try:
                            order = r.orders.order_sell_fractional_by_quantity(
                                symbol=symbol,
                                quantity=quantity,
                                timeInForce='gfd',
                                extendedHours=False
                            )
                            break
                        except Exception as e:
                            if attempt == retries - 1:
                                raise
                            time.sleep(1 * (attempt + 1))

                    if order:
                        # Get current price for value calculation
                        current_price = float(r.stocks.get_latest_price(symbol)[0])
                        estimated_value = quantity * current_price

                        orders.append({
                            'symbol': symbol,
                            'shares': quantity,
                            'estimated_value': estimated_value,
                            'price_per_share': current_price,
                            'order_id': order['id'],
                            'status': order['state']
                        })
                        logger.info(f"Placed sell order for {quantity} shares of {symbol}")
                        
                        # Add random delay between 5-10 seconds before processing the next sell order
                        delay_seconds = random.uniform(5, 10)
                        logger.info(f"Waiting {delay_seconds:.2f} seconds before placing next sell order...")
                        time.sleep(delay_seconds)

            except Exception as e:
                logger.error(f"Error selling {symbol}: {str(e)}")
                failed_orders.append({
                    'symbol': symbol,
                    'error': str(e),
                    'quantity': position_map.get(symbol, 0)
                })

        total_value = sum(order['estimated_value'] for order in orders)

        return {
            'success': True,
            'orders': orders,
            'failed_orders': failed_orders,
            'skipped_stocks': skipped_stocks,
            'timestamp': datetime.now().isoformat(),
            'total_estimated_value': total_value,
            'stocks_sold': len(orders),
            'stocks_failed': len(failed_orders),
            'stocks_skipped': len(skipped_stocks),
            'partial_success': len(failed_orders) > 0 and len(orders) > 0,
            'all_failed': len(orders) == 0 and len(failed_orders) > 0
        }

    except Exception as e:
        logger.error(f"Error in sell_all_positions: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'error_type': 'authentication_error' if 'Authentication required' in str(e) else 'sell_error',
            'timestamp': datetime.now().isoformat()
        }

def verify_order_status(order_id):
    """Verify the status of a specific order"""
    try:
        # Verify authentication
        if not verify_authentication():
            raise Exception("Authentication required or has expired")
            
        # Get order information
        order_info = r.orders.get_stock_order_info(order_id)
        
        if not order_info:
            return {
                'success': False,
                'error': f"Order {order_id} not found",
                'timestamp': datetime.now().isoformat()
            }
            
        return {
            'success': True,
            'order_id': order_id,
            'status': order_info.get('state', 'unknown'),
            'created_at': order_info.get('created_at'),
            'last_updated': order_info.get('updated_at'),
            'side': order_info.get('side'),
            'quantity': order_info.get('quantity'),
            'symbol': order_info.get('symbol', {}).get('symbol'),
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error verifying order status for {order_id}: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'error_type': 'authentication_error' if 'Authentication required' in str(e) else 'order_error',
            'timestamp': datetime.now().isoformat()
        }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        result = {
            'success': False,
            'error': 'Invalid arguments'
        }
    else:
        command = sys.argv[1]
        
        if command == 'place':
            amount = float(sys.argv[2])
            holdings = json.loads(sys.argv[3])
            result = place_orders(amount, holdings)
        elif command == 'sell':
            holdings = json.loads(sys.argv[2])
            result = sell_all_positions(holdings)
        elif command == 'verify':
            order_id = sys.argv[2]
            result = verify_order_status(order_id)
        else:
            result = {
                'success': False,
                'error': f'Unknown command: {command}'
            }
    
    print(json.dumps(result))
    sys.exit(0 if result.get('success', False) else 1)