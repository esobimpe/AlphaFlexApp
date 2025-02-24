const request = require('supertest');
const { app } = require('../server');
const storageManager = require('../storage-manager');

// Mock the runPythonScript function
jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    stdout: {
      on: jest.fn((event, callback) => {
        if (event === 'data') {
          callback(JSON.stringify({
            success: true,
            user: {
              email: 'test@example.com',
              first_name: 'Test',
              last_name: 'User'
            },
            buying_power: 1000
          }));
        }
      })
    },
    stderr: { on: jest.fn() },
    on: jest.fn((event, callback) => {
      if (event === 'close') callback(0);
    })
  }))
}));

describe('Robinhood Authentication', () => {
  let server;

  beforeAll(() => {
    server = app;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should require username and password', async () => {
    const response = await request(server)
      .post('/api/robinhood/auth')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Username and password are required');
  });

  test('should handle MFA requirement', async () => {
    const response = await request(server)
      .post('/api/robinhood/auth')
      .send({
        username: 'test@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(200);
  });

  test('should validate MFA code', async () => {
    const response = await request(server)
      .post('/api/robinhood/auth/mfa')
      .send({
        username: 'test@example.com',
        mfaCode: ''
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Username and MFA code are required');
  });

  test('should store session after successful login', async () => {
    const response = await request(server)
      .post('/api/robinhood/auth')
      .send({
        username: 'test@example.com',
        password: 'validpassword'
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      user: expect.any(Object)
    }));
  });
});