process.env.NODE_ENV = 'test';

// Mock storage-manager
jest.mock('../storage-manager', () => ({
  getUserData: jest.fn(),
  updateUserData: jest.fn(),
  saveOrder: jest.fn(),
  getOrders: jest.fn(),
  updateOrderStatus: jest.fn(),
  saveSession: jest.fn(),
  getSession: jest.fn(),
  clearSession: jest.fn()
}));

// Mock order_monitor
jest.mock('../scripts/order_monitor', () => {
  return jest.fn().mockImplementation(() => ({
    startMonitoring: jest.fn(),
    stopMonitoring: jest.fn()
  }));
});

// Mock Python script execution
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

// Mock express-session
jest.mock('express-session', () => {
  return () => (req, res, next) => {
    req.session = {
      email: null
    };
    next();
  };
});