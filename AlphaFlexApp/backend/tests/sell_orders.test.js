const request = require('supertest');
const { app } = require('../server');
const storageManager = require('../storage-manager');

describe('Sell Orders API', () => {
  let server;

  beforeAll(() => {
    server = app;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should reject sell order outside trading hours', async () => {
    const response = await request(server)
      .post('/api/robinhood/sell-all')
      .send({
        holdings: [
          { Stock: 'AAPL', 'Stock Allocation Weight (%)': 50 },
          { Stock: 'GOOGL', 'Stock Allocation Weight (%)': 50 }
        ]
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Orders can only be placed between 9:00 AM and 2:30 PM CDT, Monday through Friday');
  });

  test('should validate holdings exist', async () => {
    const response = await request(server)
      .post('/api/robinhood/sell-all')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Holdings are required');
  });

  test('should update user data after successful sell', async () => {
    // Mock successful sell order
    const response = await request(server)
      .post('/api/robinhood/sell-all')
      .send({
        holdings: [
          { Stock: 'AAPL', quantity: 10 }
        ]
      });

    expect(storageManager.updateUserData).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        isInvested: false,
        isSoldOut: true,
        totalInvested: 0,
        holdings: []
      })
    );
  });
});