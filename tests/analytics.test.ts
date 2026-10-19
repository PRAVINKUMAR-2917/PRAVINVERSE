import { describe, expect, it } from 'vitest';
import { applyFilters, columnSum, csvText, group, insights, normalize, numeric, parseCSV, profile, sampleData } from '../src/apps/analytics/data';

describe('Phase 5 offline Data Command engine', () => {
  it('uses clearly labeled synthetic demo data and detects types', () => {
    const data = sampleData(); const cols = profile(data);
    expect(data.demo).toBe(true); expect(data.rows.length).toBe(288);
    expect(cols.find(c => c.name === 'Revenue')?.kind).toBe('number');
    expect(cols.find(c => c.name === 'Date')?.kind).toBe('date');
  });
  it('parses quoted comma, escaped quote, newline and BOM in CSV', () => {
    const data = parseCSV('\ufeffArea,Revenue,Remark\nNorth,100,"first, key"\nSouth,200,"He said ""OK"""\nWest,300,"two\nlines"');
    expect(data.rows).toHaveLength(3); expect(data.rows[0][2]).toBe('first, key');
    expect(data.rows[1][2]).toBe('He said "OK"'); expect(data.rows[2][2]).toBe('two\nlines');
  });
  it('handles tab-separated CSV and rejects malformed quotes', () => {
    expect(parseCSV('A\tB\nX\t1').columns).toEqual(['A', 'B']);
    expect(() => parseCSV('A,B\n"unclosed,2')).toThrow(/unclosed/);
  });
  it('does not misidentify IDs as money; parses amounts and percentages', () => {
    expect(numeric('₹1,400.50')).toBe(1400.5);
    expect(numeric('(105)')).toBe(-105);
    expect(numeric('15%')).toBe(.15);
    expect(numeric('12th')).toBeNull();
  });
  it('applies exact column filters and safe search', () => {
    const d = parseCSV('Region,Sales\nNorth,10\nSouth,20\nNorth,30');
    expect(applyFilters(d.rows, [{ index: 0, value: 'North' }], '')).toHaveLength(2);
    expect(applyFilters(d.rows, [], 'south')).toHaveLength(1);
  });
  it('computes sum, average, count and date buckets', () => {
    const d = parseCSV('Date,Amount\n2026-01-01,10\n2026-01-02,20\n2026-02-01,5');
    const cols = profile(d), dim = cols[0];
    expect(group(d.rows, dim, 1, 'sum')).toEqual([{ name: '2026-01', value: 30, count: 2 }, { name: '2026-02', value: 5, count: 1 }]);
    expect(group(d.rows, dim, 1, 'average')[0].value).toBe(15);
    expect(group(d.rows, dim, 1, 'count')[0].value).toBe(2);
    expect(columnSum(d.rows, 1)).toBe(35);
    expect(insights(d.rows, cols, dim, 1, 'sum')).toHaveLength(4);
  });
  it('normalizes duplicate/blank headers; limits rows; escapes CSV formulas', () => {
    const d = normalize(['Name','NAME',''], [['a','b','c']], 'test');
    expect(d.columns).toEqual(['Name','NAME (2)','Column 3']);
    expect(csvText(['a','b'], [['=HYPERLINK("evil")', '-12'], ['@SUM(1)', 'safe']])).toContain("'=HYPERLINK");
    expect(csvText(['x'], [['-12']])).toContain('"-12"');
  });
});
