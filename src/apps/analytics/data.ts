/** Offline, deterministic analytics. All uploaded data stays in this browser tab. */
export type DataSet = { name: string; columns: string[]; rows: string[][]; demo: boolean };
export type ColumnKind = 'number' | 'date' | 'category';
export type ColumnProfile = { name: string; index: number; kind: ColumnKind; missing: number; unique: number; numericCount: number };
export type Aggregate = 'sum' | 'average' | 'count';
export type ChartKind = 'bar' | 'line' | 'donut';
export type Point = { name: string; value: number; count: number };
export type Filter = { index: number; value: string };

const money = (n: number) => String(Math.round(n * 100) / 100);
export function sampleData(): DataSet {
  const columns = ['Date', 'Region', 'Category', 'Channel', 'Revenue', 'Cost', 'Units', 'Satisfaction'];
  const regions = ['North', 'South', 'East', 'West'];
  const categories = ['Analytics', 'Automation', 'Reporting', 'Consulting'];
  const channels = ['Direct', 'Online', 'Partner'];
  const rows: string[][] = [];
  for (let month = 0; month < 12; month++) for (let i = 0; i < 24; i++) {
    const region = regions[(i + month) % regions.length];
    const category = categories[(i * 3 + Math.floor(i / 4) + month) % categories.length];
    const channel = channels[(i + month * 2) % channels.length];
    const units = 4 + ((i * 7 + month * 3) % 19);
    const base = [540, 720, 460, 920][categories.indexOf(category)];
    const revenue = units * base * (1 + month * 0.028 + ((i % 5) - 2) * 0.02);
    const cost = revenue * (0.51 + (i % 6) * 0.038);
    rows.push([`2026-${String(month + 1).padStart(2, '0')}-${String(1 + ((i * 7) % 27)).padStart(2, '0')}`,
      region, category, channel, money(revenue), money(cost), String(units), String(3 + (i % 3))]);
  }
  return { name: 'DEMO // Synthetic business activity', columns, rows, demo: true };
}

const maxRows = 15000;
const maxColumns = 50;
const maxCellLength = 5000;
export function normalize(columns: unknown[], input: unknown[][], name: string, demo = false): DataSet {
  if (!Array.isArray(columns) || !columns.length || columns.length > maxColumns) throw Error(`Use 1–${maxColumns} columns.`);
  if (!Array.isArray(input) || input.length > maxRows) throw Error(`Maximum ${maxRows.toLocaleString()} data rows per file.`);
  const safeHeaders = columns.map((x, i) => String(x ?? '').trim().slice(0, 100) || `Column ${i + 1}`);
  const seen = new Map<string, number>();
  const headers = safeHeaders.map(s => {
    const key = s.toLowerCase(); const n = (seen.get(key) ?? 0) + 1; seen.set(key, n);
    return n === 1 ? s : `${s} (${n})`;
  });
  const rows = input.map(row => headers.map((_, i) => String(row[i] ?? '').trim().slice(0, maxCellLength)))
    .filter(row => row.some(cell => cell !== ''));
  if (!rows.length) throw Error('No data rows found. The first row must contain column headers.');
  return { name: name.slice(0, 140), columns: headers, rows, demo };
}

/** RFC 4180 quoted fields, escaped double quotes, embedded newlines and BOM. */
export function parseCSV(text: string, name = 'data.csv'): DataSet {
  if (!text.trim()) throw Error('This CSV file is empty.');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const first = text.slice(0, 2500).split(/\r?\n/, 1)[0];
  const delimiters = [',', '\t', ';'];
  const delimiter = delimiters.reduce((a, b) => first.split(b).length > first.split(a).length ? b : a);
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quote = false;
      else cell += ch;
    } else if (ch === '"' && !cell) quote = true;
    else if (ch === delimiter) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); if (row.some(v => v.trim())) rows.push(row);
      if (rows.length > maxRows + 1) throw Error(`Maximum ${maxRows.toLocaleString()} data rows per file.`);
      row = []; cell = '';
    } else cell += ch;
  }
  if (quote) throw Error('CSV has an unclosed quoted field.');
  row.push(cell); if (row.some(v => v.trim())) rows.push(row);
  const [header, ...body] = rows;
  if (!header) throw Error('CSV has no header row.');
  return normalize(header, body, name);
}

export const numeric = (raw: string): number | null => {
  const clean = raw.trim().replace(/[₹$£€,\s]/g, '').replace(/^\((.*)\)$/, '-$1');
  if (!clean || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?%?$/.test(clean)) return null;
  const percent = clean.endsWith('%'); const value = Number(percent ? clean.slice(0, -1) : clean);
  return Number.isFinite(value) ? (percent ? value / 100 : value) : null;
};
export const dateValue = (s: string): number | null => {
  if (!/^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:\s.*)?$/.test(s.trim())) return null;
  const time = Date.parse(s);
  return Number.isFinite(time) ? time : null;
};
export function profile(data: DataSet): ColumnProfile[] {
  return data.columns.map((name, index) => {
    const values = data.rows.map(r => r[index] ?? '');
    const good = values.filter(Boolean);
    const numericCount = good.filter(x => numeric(x) !== null).length;
    const dates = good.filter(x => dateValue(x) !== null).length;
    const kind: ColumnKind = good.length && numericCount / good.length >= .85 ? 'number'
      : good.length && dates / good.length >= .85 ? 'date' : 'category';
    return { name, index, kind, numericCount, missing: values.length - good.length, unique: new Set(good).size };
  });
}
export function applyFilters(rows: string[][], filters: Filter[], search: string): string[][] {
  const q = search.trim().toLowerCase();
  return rows.filter(row => filters.every(f => !f.value || row[f.index] === f.value)
    && (!q || row.some(v => v.toLowerCase().includes(q))));
}
export function group(rows: string[][], dimension: ColumnProfile, measure: number, aggregate: Aggregate, limit = 12): Point[] {
  const map = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    const original = row[dimension.index] || '(blank)';
    const key = dimension.kind === 'date' && dateValue(original) !== null ? original.slice(0, 7).replace('/', '-') : original;
    const v = numeric(row[measure] ?? '');
    if (aggregate !== 'count' && v === null) continue;
    const current = map.get(key) ?? { sum: 0, count: 0 };
    current.count++; current.sum += v ?? 0; map.set(key, current);
  }
  const points = [...map].map(([name, v]) => ({ name, value: aggregate === 'count' ? v.count : aggregate === 'average' ? v.sum / v.count : v.sum, count: v.count }));
  if (dimension.kind === 'date') points.sort((a, b) => (dateValue(a.name) ?? 0) - (dateValue(b.name) ?? 0));
  else points.sort((a, b) => b.value - a.value);
  return points.slice(0, limit);
}
export function distinct(rows: string[][], index: number, max = 80): string[] {
  return [...new Set(rows.map(r => r[index]).filter(Boolean))].sort((a, b) => a.localeCompare(b)).slice(0, max);
}
export function columnSum(rows: string[][], index: number): number { return rows.reduce((sum, row) => sum + (numeric(row[index] ?? '') ?? 0), 0); }
export function metricIndex(columns: ColumnProfile[], pattern: RegExp): number {
  return columns.find(c => c.kind === 'number' && pattern.test(c.name))?.index ?? -1;
}
export function formatNumber(n: number, compact = true): string {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-IN', { notation: compact && Math.abs(n) >= 10000 ? 'compact' : 'standard', maximumFractionDigits: n % 1 ? 1 : 0 }).format(n);
}
export function csvText(columns: string[], rows: string[][]): string {
  const cell = (x: string) => {
    // Defuse spreadsheet formula injection in downloaded exports.
    const safe = /^[\s]*[=+@-]/.test(x) && numeric(x) === null ? `'${x}` : x;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return [columns, ...rows].map(r => r.map(cell).join(',')).join('\r\n');
}
export function insights(rows: string[][], columns: ColumnProfile[], dim: ColumnProfile, measure: number, agg: Aggregate): string[] {
  if (!rows.length) return ['No records match the active filters.'];
  const points = group(rows, dim, measure, agg, 500);
  const top = points[0]; const low = points[points.length - 1];
  const blanks = columns.reduce((sum, c) => sum + rows.filter(r => !r[c.index]).length, 0);
  const out = [`${formatNumber(rows.length, false)} records are currently included in the analysis.`];
  if (top && points.length > 1) out.push(`${top.name} has the highest ${agg === 'count' ? 'record count' : `${agg} of ${columns[measure].name}`} (${formatNumber(top.value)}).`);
  if (low && points.length > 1) out.push(`${low.name} is the lowest in the same comparison (${formatNumber(low.value)}).`);
  if (blanks) out.push(`${formatNumber(blanks, false)} blank cells were found across the filtered data.`);
  else out.push('No missing values were found in the filtered data.');
  return out;
}
