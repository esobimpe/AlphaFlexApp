const request = require('supertest');
const { app } = require('../server');
const storageManager = require('../storage-manager');

describe('Order Placement API', () => {
  let server;

  beforeAll(() => {
    server = app;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should reject order outside trading hours', async () => {
    const response = await request(server)
      .post('/api/robinhood/place-order')
      .send({
        amount: 1000,
        holdings: [
          { Stock: 'AAPL', 'Stock Allocation Weight (%)': 50 },
          { Stock: 'GOOGL', 'Stock Allocation Weight (%)': 50 }
        ]
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Orders can only be placed between 9:00 AM and 2:30 PM CDT, Monday through Friday');
  });

  test('should validate required fields', async () => {
    const response = await request(server)
      .post('/api/robinhood/place-order')
      .send({
        amount: 1000
        // missing holdings
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Amount and holdings are required');
  });

  test('should check buying power', async () => {
    storageManager.getUserData.mockResolvedValue({
      buyingPower: 500
    });

    const response = await request(server)
      .post('/api/robinhood/place-order')
      .send({
        amount: 1000,
        holdings: [
          { Stock: 'AAPL', 'Stock Allocation Weight (%)': 100 }
        ]
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Orders can only be placed between 9:00 AM and 2:30 PM CDT, Monday through Friday');
  });
});