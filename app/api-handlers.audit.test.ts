import type { ServerResponse } from 'node:http';
import { handleGetAuditStatus, handlePostAuditStart } from './api-handlers.js';

function createMockRes(): ServerResponse {
  return {
    writeHead: jest.fn(),
    end: jest.fn(),
  } as unknown as ServerResponse;
}

function getJsonBody(res: ServerResponse): Record<string, unknown> {
  const endMock = res.end as unknown as jest.Mock;
  return JSON.parse(String(endMock.mock.calls[0][0] ?? '{}')) as Record<string, unknown>;
}

describe('api audit handlers', () => {
  it('POST /api/audit/start crée une task et GET /api/audit/status retourne done', async () => {
    const resStart = createMockRes();
    handlePostAuditStart('/tmp/data', resStart, async () => ({
      ok: true,
      nbEmailsScannes: 4,
      nbSourcesCreees: 2,
      nbSourcesExistantes: 2,
      synthese: [
        { emailExpéditeur: 'jobs@linkedin.com', algo: 'Linkedin', actif: 'Oui', nbEmails: 3 },
        { emailExpéditeur: 'alerte@wttj.com', algo: 'Inconnu', actif: 'Non', nbEmails: 1 },
      ],
      sousTotauxPrevisionnels: {
        emailsÀArchiver: 3,
        emailsÀAnalyser: 3,
      },
    }));

    const startBody = getJsonBody(resStart);
    expect(startBody.ok).toBe(true);
    const taskId = String(startBody.taskId ?? '');
    expect(taskId).not.toBe('');

    await new Promise((resolve) => setTimeout(resolve, 0));

    const resStatus = createMockRes();
    handleGetAuditStatus(taskId, resStatus);

    expect(resStatus.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'Content-Type': 'application/json; charset=utf-8' }));
    const statusBody = getJsonBody(resStatus);
    expect(statusBody.ok).toBe(true);
    expect(statusBody.status).toBe('done');
    expect(statusBody.percent).toBe(100);
    expect(statusBody.result).toEqual({
      ok: true,
      nbEmailsScannes: 4,
      nbSourcesCreees: 2,
      nbSourcesExistantes: 2,
      synthese: [
        { emailExpéditeur: 'jobs@linkedin.com', algo: 'Linkedin', actif: 'Oui', nbEmails: 3 },
        { emailExpéditeur: 'alerte@wttj.com', algo: 'Inconnu', actif: 'Non', nbEmails: 1 },
      ],
      sousTotauxPrevisionnels: {
        emailsÀArchiver: 3,
        emailsÀAnalyser: 3,
      },
    });
  });

  it('GET /api/audit/status task inconnue -> 404', () => {
    const resStatus = createMockRes();
    handleGetAuditStatus('task-inconnue', resStatus);
    expect(resStatus.writeHead).toHaveBeenCalledWith(404, expect.objectContaining({ 'Content-Type': 'application/json; charset=utf-8' }));
    const body = getJsonBody(resStatus);
    expect(body).toEqual({ ok: false, message: 'task introuvable' });
  });
});
