/**
 * Tests US-3.5 CA3 : orchestration des 3 phases (création, enrichissement, analyse IA).
 */
import { executerOrchestrationTraitements } from './orchestration-traitements.js';
import type { PortsOrchestrationTraitements } from './orchestration-traitements.js';

describe('orchestration-traitements', () => {
  it('exécute les trois phases dans l\'ordre (phase1, phase2, phase3) et une seule fois chacune', async () => {
    const order: string[] = [];
    const phase1 = jest.fn().mockImplementation(async () => {
      order.push('phase1');
    });
    const phase2 = jest.fn().mockImplementation(async () => {
      order.push('phase2');
    });
    const phase3 = jest.fn().mockImplementation(async () => {
      order.push('phase3');
    });
    const ports: PortsOrchestrationTraitements = {
      phase1Creation: phase1,
      phase2Enrichissement: phase2,
      phase3AnalyseIA: phase3,
    };
    await executerOrchestrationTraitements(ports);
    expect(order).toEqual(['phase1', 'phase2', 'phase3']);
    expect(phase1).toHaveBeenCalledTimes(1);
    expect(phase2).toHaveBeenCalledTimes(1);
    expect(phase3).toHaveBeenCalledTimes(1);
  });

  it('après exécution des 3 phases, retourne un résultat explicite termine: true sans schedule next / timer', async () => {
    const ports: PortsOrchestrationTraitements = {
      phase1Creation: jest.fn().mockResolvedValue(undefined),
      phase2Enrichissement: jest.fn().mockResolvedValue(undefined),
      phase3AnalyseIA: jest.fn().mockResolvedValue(undefined),
    };
    const result = await executerOrchestrationTraitements(ports);
    expect(result.termine).toBe(true);
    expect(result).not.toHaveProperty('scheduleNext');
    expect(result).not.toHaveProperty('scheduleNextAt');
    expect(Object.keys(result)).toEqual(['termine']);
  });
});
