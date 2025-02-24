module.exports = {
    login: jest.fn(),
    logout: jest.fn(),
    orders: {
      order_buy_market: jest.fn(),
      order_sell_market: jest.fn(),
      order_buy_fractional_by_quantity: jest.fn(),
      order_sell_fractional_by_quantity: jest.fn()
    },
    stocks: {
      get_latest_price: jest.fn()
    },
    load_account_profile: jest.fn(),
    load_portfolio_profile: jest.fn(),
    load_user_profile: jest.fn()
  };