import { describe, it, expect } from 'vitest';
import { coercePlanState } from '../persistence';
import { DEFAULT_STATE } from '../../data/defaultState';

const clone = (o) => JSON.parse(JSON.stringify(o));

// An imported plan is fully untrusted (hand-edited, foreign, partial). coercePlanState must
// reject the obviously-wrong shapes and backfill anything merely missing so the engine never
// dereferences an undefined account.
describe('coercePlanState — untrusted import hardening', () => {
  it('backfills missing nested accounts instead of letting them crash the engine', () => {
    const partial = clone(DEFAULT_STATE);
    partial.assets.superAccounts = {}; // empty — would crash runProjection at p1Super.*
    const safe = coercePlanState(partial, 'Now');
    expect(safe.assets.superAccounts.p1Super).toEqual(DEFAULT_STATE.assets.superAccounts.p1Super);
  });

  it('keeps user-provided values (provided wins over default)', () => {
    const partial = clone(DEFAULT_STATE);
    partial.personal.person1.name = 'Imported Person';
    const safe = coercePlanState(partial, 'Now');
    expect(safe.personal.person1.name).toBe('Imported Person');
  });

  it('rejects files missing whole containers', () => {
    expect(() => coercePlanState({ personal: {} }, 'Now')).toThrow();
    expect(() => coercePlanState(null, 'Now')).toThrow();
    expect(() => coercePlanState({ personal: { person1: {}, person2: {} } }, 'Now')).toThrow();
  });

  it('preserves extra keys the file has that defaults do not', () => {
    const partial = clone(DEFAULT_STATE);
    partial.goals = [{ id: 'x', kind: 'custom', label: 'Boat' }];
    const safe = coercePlanState(partial, 'Now');
    expect(safe.goals).toEqual([{ id: 'x', kind: 'custom', label: 'Boat' }]);
  });
});
