# Import necessary modules
import json
import sys
import os
import time
from datetime import datetime, timedelta
from alpha_flex import backtest_portfolio

CACHE_FILE = 'performance_cache.json'
CACHE_DURATION = 24 * 60 * 60  # 24 hours in seconds

def read_cache():
    try:
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, 'r') as f:
                cache_data = json.load(f)
                cache_time = cache_data.get('timestamp', 0)
                
                # Check if cache is still valid (less than 24 hours old)
                if time.time() - cache_time < CACHE_DURATION:
                    print("Using cached performance data", file=sys.stderr)
                    return cache_data.get('data')
    except Exception as e:
        print(f"Error reading cache: {e}", file=sys.stderr)
    
    return None

def write_cache(data):
    try:
        cache_data = {
            'timestamp': time.time(),
            'data': data
        }
        with open(CACHE_FILE, 'w') as f:
            json.dump(cache_data, f)
        print("Wrote new data to cache", file=sys.stderr)
    except Exception as e:
        print(f"Error writing cache: {e}", file=sys.stderr)

def get_all_performance():
    # Try to get cached data first
    cached_data = read_cache()
    if cached_data:
        print(json.dumps(cached_data))
        return

    # If no valid cache, calculate new data
    investment_amount = 10000
    periods = ['1d', '5d', '1m', '3m', 'ytd', '1y']
    performance_data = []

    try:
        for period in periods:
            print(f"Calculating for period: {period}", file=sys.stderr)
            result = backtest_portfolio(investment_amount, period=period)
            
            if isinstance(result, dict) and 'Percentage Return' in result:
                return_value = round(result['Percentage Return'], 2)
            else:
                print(f"Unexpected result format for {period}: {result}", file=sys.stderr)
                return_value = 0
                
            performance_data.append(return_value)

        # Create the response data
        response_data = {
            "performance": {
                "labels": ["1D", "5D", "1M", "3M", "YTD", "1Y"],
                "data": performance_data
            }
        }

        # Cache the new data
        write_cache(response_data)

        # Output the data as JSON
        print(json.dumps(response_data))
    except Exception as e:
        print(f"Error calculating performance: {str(e)}", file=sys.stderr)
        # Return empty data structure but with error message
        error_response = {
            "performance": {
                "labels": ["1D", "5D", "1M", "3M", "YTD", "1Y", "3Y"],
                "data": [0, 0, 0, 0, 0, 0, 0],
                "error": str(e)
            }
        }
        print(json.dumps(error_response))

if __name__ == "__main__":
    get_all_performance()