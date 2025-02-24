import sys
import json
import pandas as pd
from alpha_flex import get_portfolio
import contextlib

# Function to redirect stdout to stderr
@contextlib.contextmanager
def redirect_stdout_to_stderr():
    old_stdout = sys.stdout
    sys.stdout = sys.stderr
    try:
        yield
    finally:
        sys.stdout = old_stdout

try:
    # Fetch the portfolio data, redirecting any print statements to stderr
    with redirect_stdout_to_stderr():
        portfolio_df = get_portfolio()

        # Round the 'Stock Allocation Weight (%)' column to 0 decimal places
        portfolio_df['Stock Allocation Weight (%)'] = portfolio_df['Stock Allocation Weight (%)'].round(0)

        # Prepare the data for JSON output
        portfolio_data = {
            "Portfolio Name": "AlphaFlex Growth",
            "Holdings": []
        }

        # Loop through each row of the DataFrame and append the data to the 'Holdings' list
        for _, row in portfolio_df.iterrows():
            portfolio_data["Holdings"].append({
                "Stock": row["Stock"],
                "Market Cap": float(row["Market Cap"]),
                "Revenue": float(row["Revenue"]),
                "Volatility": float(row["Volatility"]),
                "Stock Allocation Weight (%)": float(row["Stock Allocation Weight (%)"])
            })

        # Output only the JSON string to stdout
        json_output = json.dumps(portfolio_data, allow_nan=False)
    
    # Print the JSON outside the redirect context
    print(json_output)

except Exception as e:
    # Print error messages to stderr
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)