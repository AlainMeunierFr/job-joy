/**
 * Tests TDD API traitement (US-1.4) : POST /api/traitement.
 */
import type { ServerResponse } from 'node:http';
import { handlePostTraitement } from './api-handlers.js';

function createMockRes(): ServerResponse & { _writeHead: unknown; _end: unknown } {
  const res = {
    writeHead: jest.fn(),
    end: jest.fn(),
  } as unknown as ServerResponse;
  return res as ServerResponse & { _writeHead: unknown; _end: unknown };
}

describe('handlePostTraitement', () => {
  it('répond 200 avec JSON contenant ok', async () => {
    const res = createMockRes();
    await handlePostTraitement('/tmp/data', res);
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'Content-Type': 'application/json; charset=utf-8' }));
    expect(res.end).toHaveBeenCalledTimes(1);
    const body = JSON.parse((res.end as jest.Mock).mock.calls[0][0]);
    expect(body).toHaveProperty('ok');
  });
});
