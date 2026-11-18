import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../server.js';

describe('GET /api/health', () => {
  it('should return 200 and health status', async () => {
    const res = await request(app).get('/api/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'PassTheAux API');
    assert.ok(res.body.timestamp);
  });
});
