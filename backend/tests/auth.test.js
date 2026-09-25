const request = require('supertest');
const app = require('../src/index');

describe('Auth & Health Endpoint Tests', () => {
  it('GET /api/v1/health should return 200 OK and healthy status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('healthy');
    expect(res.body.airGapped).toBe(true);
  });

  it('POST /api/v1/auth/login with missing fields should return 400 Bad Request', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
  });
});
