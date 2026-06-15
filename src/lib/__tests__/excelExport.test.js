import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { buildPlanWorkbook } from '../excelExport';
import { runProjection } from '../projection';
import { DEFAULT_STATE } from '../../data/defaultState';

const clone = (o) => JSON.parse(JSON.stringify(o));

// A realistic single-person plan with balances so the projection produces non-zero rows.
function makeNow() {
  const s = clone(DEFAULT_STATE);
  s.personal.person1.name = 'Test Client';
  s.personal.isCouple = false;
  s.assets.superAccounts.p1Super.balance = 400000;
  s.assets.nonSuper.p1NonSuper.balance = 150000;
  s.income.person1.salary = 90000;
  s.expenses.lifestyleExpenses[0].amount = 60000;
  return s;
}

describe('exportPlanToExcel — workbook builder', () => {
  it('builds a workbook with Summary, Assumptions and the Now projection sheet', () => {
    const nowState = makeNow();
    const nowProjectionData = runProjection(nowState, false);
    const wb = buildPlanWorkbook({ nowState, afterState: null, nowProjectionData, afterProjectionData: null });

    expect(wb.SheetNames).toContain('Summary');
    expect(wb.SheetNames).toContain('Assumptions');
    expect(wb.SheetNames).toContain('Projection (Now)');
    // No After scenario → no comparison sheet.
    expect(wb.SheetNames).not.toContain('Projection (After Advice)');
  });

  it('adds the After Advice sheet only when an After scenario exists', () => {
    const nowState = makeNow();
    const afterState = clone(nowState);
    afterState.income.person1.salarySacrifice = 15000; // a real advice change
    const nowProjectionData = runProjection(nowState, false);
    const afterProjectionData = runProjection(afterState, false);

    const wb = buildPlanWorkbook({ nowState, afterState, nowProjectionData, afterProjectionData });
    expect(wb.SheetNames).toContain('Projection (After Advice)');
  });

  it('leads every sheet with the educational-only disclaimer (compliance)', () => {
    const nowState = makeNow();
    const nowProjectionData = runProjection(nowState, false);
    const wb = buildPlanWorkbook({ nowState, afterState: null, nowProjectionData, afterProjectionData: null });

    wb.SheetNames.forEach((name) => {
      const ws = wb.Sheets[name];
      expect(String(ws.A1?.v || '')).toMatch(/not financial advice/i);
    });
  });

  it('includes P2 columns for couples and omits them for singles (gating)', () => {
    // Single plan — no P2 salary column.
    const single = makeNow();
    const singleWb = buildPlanWorkbook({
      nowState: single,
      afterState: null,
      nowProjectionData: runProjection(single, false),
      afterProjectionData: null,
    });
    const singleRows = XLSX.utils.sheet_to_json(singleWb.Sheets['Projection (Now)'], { header: 1, blankrows: false });
    const singleHeader = singleRows.find((r) => r[0] === 'Year');
    expect(singleHeader.some((h) => /Salary/.test(String(h)))).toBe(true); // P1 salary present
    expect(singleHeader.filter((h) => /Salary/.test(String(h))).length).toBe(1); // only one salary column

    // Couple plan — P2 salary column appears, P2 super populates the household balance.
    const couple = makeNow();
    couple.personal.isCouple = true;
    couple.personal.person2.name = 'Partner';
    couple.personal.person2.birthYear = single.personal.person1.birthYear;
    couple.assets.superAccounts.p2Super.balance = 250000;
    couple.income.person2.salary = 70000;
    const coupleWb = buildPlanWorkbook({
      nowState: couple,
      afterState: null,
      nowProjectionData: runProjection(couple, false),
      afterProjectionData: null,
    });
    const coupleRows = XLSX.utils.sheet_to_json(coupleWb.Sheets['Projection (Now)'], { header: 1, blankrows: false });
    const coupleHeader = coupleRows.find((r) => r[0] === 'Year');
    expect(coupleHeader).toContain('Partner Salary');
    expect(coupleHeader.filter((h) => /Salary/.test(String(h))).length).toBe(2); // two salary columns

    // Assumptions sheet lists the second person for couples only.
    const coupleAssume = XLSX.utils.sheet_to_json(coupleWb.Sheets['Assumptions'], { header: 1, blankrows: false });
    expect(coupleAssume.some((r) => r[0] === 'Partner')).toBe(true);
  });

  it('writes one data row per projection year with numeric net assets', () => {
    const nowState = makeNow();
    const nowProjectionData = runProjection(nowState, false);
    const wb = buildPlanWorkbook({ nowState, afterState: null, nowProjectionData, afterProjectionData: null });

    const ws = wb.Sheets['Projection (Now)'];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
    const headerIdx = rows.findIndex((r) => r[0] === 'Year');
    expect(headerIdx).toBeGreaterThan(-1);
    const header = rows[headerIdx];
    const dataRows = rows.slice(headerIdx + 1);
    expect(header).toContain('Net Assets');
    expect(dataRows.length).toBe(nowProjectionData.length);

    const netCol = header.indexOf('Net Assets');
    expect(typeof dataRows[0][netCol]).toBe('number');
  });
});
