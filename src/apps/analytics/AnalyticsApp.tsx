import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { applyFilters, columnSum, csvText, distinct, formatNumber, group, insights, metricIndex, parseCSV, profile, sampleData,
  type Aggregate, type ChartKind, type DataSet, type Filter, type Point } from './data';
import { parseXLSX } from './xlsx';
import './analytics.css';

const fmt = (n: number) => formatNumber(n);
const isSpreadsheet = (name: string) => /\.(?:csv|tsv|xlsx)$/i.test(name);
const palette = ['#6cf6c1', '#bfff80', '#6baefa', '#e9a5ff', '#f5c96f', '#ff8e9d', '#83dbc8', '#b8b7ff'];

function Visualization({ data, kind }: { data: Point[]; kind: ChartKind }) {
  if (!data.length) return <div className="ana-no-chart">NO MATCHING RECORDS<br /><small>Adjust your filters or chart fields.</small></div>;
  const max = Math.max(...data.map(p => Math.abs(p.value)), 1);
  if (kind === 'donut') {
    const total = data.reduce((s, p) => s + Math.max(0, p.value), 0);
    if (total <= 0) return <div className="ana-no-chart">A donut chart needs positive values.</div>;
    let progress = 0;
    return <div className="ana-donut-wrap">
      <svg viewBox="0 0 250 250" role="img" aria-label="Donut chart showing grouped proportions" className="ana-donut">
        <circle cx="125" cy="125" r="88" fill="none" stroke="#15312e" strokeWidth="34" />
        {data.map((p, i) => { const width = Math.max(0, p.value) / total * 100;
          const start = progress; progress += width;
          return <circle key={`${p.name}-${i}`} cx="125" cy="125" r="88" fill="none" stroke={palette[i % palette.length]}
            strokeWidth="32" strokeDasharray={`${width} ${100 - width}`} pathLength={100}
            strokeDashoffset={-start} transform="rotate(-90 125 125)" aria-label={`${p.name}: ${fmt(p.value)}`} />;
        })}
        <text x="125" y="116" textAnchor="middle" fill="#75b5a4" fontSize="11" letterSpacing="2">TOTAL</text>
        <text x="125" y="143" textAnchor="middle" fill="#e7ffef" fontWeight="bold" fontSize="22">{fmt(total)}</text>
      </svg>
      <div className="ana-legend">{data.map((p, i) => <div key={i} className="ana-legend-row">
        <span className="ana-swatch" style={{ background: palette[i % palette.length] }} />
        <span title={p.name}>{p.name}</span><strong>{(Math.max(0, p.value) / total * 100).toFixed(1)}%</strong></div>)}</div>
    </div>;
  }
  const left = 58, top = 25, plotH = 195, plotW = 820, xStep = plotW / data.length;
  const maxAxis = Math.max(max * 1.16, 1);
  const baseline = top + plotH;
  const values = data.map((p, i) => ({ x: left + xStep * (i + .5), y: baseline - Math.max(0, p.value) / maxAxis * plotH }));
  return <svg className="ana-chart-svg" viewBox="0 0 940 285" role="img" aria-label={`${kind} chart of ${data.length} grouped values`}>
    {[0, 1, 2, 3, 4].map(t => {
      const y = top + t * plotH / 4;
      return <g key={t}><line x1={left} y1={y} x2={left + plotW} y2={y} stroke="#2a514c" strokeDasharray="4 7" />
        <text x={left - 12} y={y + 4} fill="#8fb7a8" textAnchor="end" fontSize="12">{fmt(maxAxis * (1 - t / 4))}</text></g>;
    })}
    {kind === 'line'
      ? <><polyline points={values.map(v => `${v.x},${v.y}`).join(' ')} stroke="#73fbc0" strokeWidth="3" fill="none" strokeLinejoin="round" />
        {values.map((v, i) => <circle key={i} cx={v.x} cy={v.y} r="4" fill="#c7ff86"><title>{`${data[i].name}: ${fmt(data[i].value)}`}</title></circle>)}</>
      : data.map((p, i) => {
        const x = left + xStep * i + xStep * .15; const width = Math.max(xStep * .7, 1);
        const h = Math.max(0, p.value) / maxAxis * plotH;
        return <rect key={i} x={x} y={baseline - h} width={width} height={h} rx="3" fill={palette[i % palette.length]} opacity=".88">
          <title>{`${p.name}: ${fmt(p.value)}`}</title></rect>;
      })}
    {data.map((p, i) => <text key={i} x={left + xStep * (i + .5)} y={baseline + 18} fill="#a0cab9" textAnchor="middle" fontSize="11">
      {p.name.length > 11 ? `${p.name.slice(0, 9)}…` : p.name}</text>)}
  </svg>;
}

function exportFile(name: string, text: string) {
  const file = new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(file); const a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function AnalyticsApp() {
  const [data, setData] = useState<DataSet>(sampleData);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [dimension, setDimension] = useState('Category');
  const [measure, setMeasure] = useState('Revenue');
  const [aggregate, setAggregate] = useState<Aggregate>('sum');
  const [chart, setChart] = useState<ChartKind>('bar');
  const [tab, setTab] = useState<'visual' | 'quality' | 'rows'>('visual');
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const columns = useMemo(() => profile(data), [data]);
  const categories = useMemo(() => columns.filter(c => c.kind !== 'number' && c.unique >= 2 && c.unique <= 30), [columns]);
  const numbers = useMemo(() => columns.filter(c => c.kind === 'number'), [columns]);
  const dim = columns.find(c => c.name === dimension) ?? categories[0] ?? columns[0];
  const met = columns.find(c => c.name === measure && c.kind === 'number') ?? numbers[0];
  const displayed = useMemo(() => applyFilters(data.rows, filters, search), [data.rows, filters, search]);
  const pts = useMemo(() => group(displayed, dim, met?.index ?? 0, met ? aggregate : 'count'), [displayed, dim, met, aggregate]);
  const descriptions = useMemo(() => insights(displayed, columns, dim, met?.index ?? 0, met ? aggregate : 'count'), [displayed, columns, dim, met, aggregate]);
  const revenueIdx = metricIndex(columns, /revenue|sales|amount|total|turnover/i);
  const costIdx = metricIndex(columns, /cost|expense/i);
  const totalRevenue = revenueIdx < 0 ? null : columnSum(displayed, revenueIdx);
  const totalCost = costIdx < 0 ? null : columnSum(displayed, costIdx);
  const missing = columns.reduce((sum, c) => sum + displayed.filter(r => !r[c.index]).length, 0);
  const duplicates = useMemo(() => displayed.length - new Set(displayed.map(r => JSON.stringify(r))).size, [displayed]);
  const filtersActive = filters.filter(f => f.value).length + (search.trim() ? 1 : 0);

  const selectData = (next: DataSet) => {
    const nextProfiles = profile(next);
    const cat = nextProfiles.find(c => c.kind === 'date') ?? nextProfiles.find(c => c.kind === 'category' && c.unique > 1);
    const num = nextProfiles.find(c => c.kind === 'number' && /revenue|sales|amount|total/i.test(c.name)) ?? nextProfiles.find(c => c.kind === 'number');
    setData(next); setDimension(cat?.name ?? next.columns[0]); setMeasure(num?.name ?? next.columns[0]);
    setAggregate(num ? 'sum' : 'count'); setFilters([]); setSearch(''); setTab('visual'); setError('');
    setChart(cat?.kind === 'date' ? 'line' : 'bar');
  };
  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!isSpreadsheet(file.name)) { setError('Only .csv, .tsv and .xlsx files are supported.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Files must be under 5 MB. Please reduce the data or export CSV.'); return; }
    setBusy(true); setError('');
    try {
      const next = /\.xlsx$/i.test(file.name) ? await parseXLSX(await file.arrayBuffer(), file.name)
        : parseCSV(await file.text(), file.name);
      selectData(next);
    } catch (e) { setError(e instanceof Error ? e.message : 'File could not be read.'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  const drop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDrag(false); void handleFile(e.dataTransfer.files[0]); };
  const fileChange = (e: ChangeEvent<HTMLInputElement>) => { void handleFile(e.target.files?.[0]); };
  const setFilter = (index: number, value: string) => setFilters(prev => [...prev.filter(f => f.index !== index), { index, value }]);
  const download = () => exportFile('data-command-filtered.csv', csvText(data.columns, displayed));
  const exportSummary = () => exportFile('data-command-chart.csv', csvText([dim.name, aggregate === 'count' ? 'Records' : `${aggregate} ${met?.name ?? 'Records'}`],
    pts.map(p => [p.name, String(p.value)])));

  return <div className="ana-app" onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false); }} onDrop={drop}>
    {drag && <div className="ana-drop">DROP CSV / XLSX TO ANALYZE</div>}
    <header className="ana-header">
      <div><div className="ana-eyebrow">PRAVINVERSE / DATA ANALYST WORKSPACE / PHASE 05</div>
        <h2>DATA<span>_COMMAND</span><small>V1.0</small></h2>
        <p>Interactive analytics · Built for data-driven decisions</p></div>
      <div className="ana-header-actions">
        <span className={`ana-tag ${data.demo ? '' : 'ana-user'}`}>{data.demo ? 'SYNTHETIC DEMO' : 'LOCAL FILE'}</span>
        <input ref={input} className="sr-only" type="file" accept=".csv,.tsv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={fileChange} aria-label="Choose analytics data file" />
        <button className="ana-btn ana-primary" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'PROCESSING…' : '↑ IMPORT FILE'}</button>
        <button className="ana-btn" onClick={() => selectData(sampleData())}>↻ DEMO</button>
      </div>
    </header>
    <div className="ana-source"><span>●</span> {data.name} <span className="ana-source-desc">{formatNumber(data.rows.length, false)} records · {data.columns.length} columns · CSV / XLSX (first sheet)</span></div>
    {error && <div role="alert" className="ana-error">⚠ {error}</div>}
    <div className="ana-kpis">
      <div className="ana-kpi"><small>RECORDS MATCHED</small><strong>{formatNumber(displayed.length)}</strong><span>{filtersActive ? `${filtersActive} filters active` : 'All records'}</span></div>
      <div className="ana-kpi"><small>{totalRevenue !== null ? 'TOTAL REVENUE' : 'DATA FIELDS'}</small><strong>{totalRevenue !== null ? formatNumber(totalRevenue) : columns.length}</strong><span>{totalRevenue !== null ? 'Auto-detected numeric metric' : 'Detected columns'}</span></div>
      <div className="ana-kpi"><small>{totalRevenue !== null && totalCost !== null ? 'GROSS DIFFERENCE' : 'NUMERIC FIELDS'}</small><strong>{totalRevenue !== null && totalCost !== null ? formatNumber(totalRevenue - totalCost) : numbers.length}</strong><span>{totalRevenue !== null && totalCost !== null ? 'Revenue minus cost; not net profit' : 'Ready for aggregation'}</span></div>
      <div className="ana-kpi"><small>EMPTY CELLS</small><strong>{formatNumber(missing)}</strong><span>{displayed.length ? (100 * missing / (displayed.length * columns.length)).toFixed(1) : '0'}% of filtered cells</span></div>
    </div>
    <div className="ana-layout">
      <aside className="ana-side">
        <div className="ana-panel-title">⌁ QUERY CONTROLS <button className="ana-link" onClick={() => { setFilters([]); setSearch(''); }}>RESET</button></div>
        <label className="ana-field">SEARCH ALL COLUMNS<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find rows…" aria-label="Search uploaded rows" /></label>
        {categories.slice(0, 4).map(col => <label className="ana-field" key={col.index}>{col.name.toUpperCase()}
          <select value={filters.find(f => f.index === col.index)?.value ?? ''} onChange={e => setFilter(col.index, e.target.value)}>
            <option value="">All values</option>
            {distinct(data.rows, col.index).map(v => <option key={v} value={v}>{v}</option>)}
          </select></label>)}
        <div className="ana-panel-title ana-field-gap">◈ VISUAL BUILDER</div>
        <label className="ana-field">GROUP BY<select aria-label="Group by" value={dim.name} onChange={e => setDimension(e.target.value)}>
          {columns.map(c => <option key={c.index} value={c.name}>{c.name}</option>)}</select></label>
        <label className="ana-field">MEASURE<select aria-label="Measure" value={met?.name ?? ''} disabled={!met} onChange={e => setMeasure(e.target.value)}>
          {numbers.length ? numbers.map(c => <option key={c.index} value={c.name}>{c.name}</option>) : <option value="">Records only</option>}</select></label>
        <label className="ana-field">CALCULATION<select aria-label="Aggregation" value={met ? aggregate : 'count'} onChange={e => setAggregate(e.target.value as Aggregate)}>
          <option value="sum" disabled={!met}>Sum</option><option value="average" disabled={!met}>Average</option><option value="count">Count</option>
        </select></label>
        <button className="ana-btn ana-export" onClick={download}>↓ EXPORT FILTERED CSV</button>
        <p className="ana-privacy">◉ Private by design. Files are processed in this tab only. Nothing is uploaded to a server. Files are not saved across refreshes.</p>
      </aside>
      <section className="ana-workspace">
        <div className="ana-tabs" role="tablist" aria-label="Analytics views">
          <button role="tab" aria-selected={tab === 'visual'} className={tab === 'visual' ? 'on' : ''} onClick={() => setTab('visual')}>◭ DASHBOARD</button>
          <button role="tab" aria-selected={tab === 'quality'} className={tab === 'quality' ? 'on' : ''} onClick={() => setTab('quality')}>◇ DATA QUALITY</button>
          <button role="tab" aria-selected={tab === 'rows'} className={tab === 'rows' ? 'on' : ''} onClick={() => setTab('rows')}>≡ RAW DATA</button>
        </div>
        {tab === 'visual' && <div role="tabpanel" className="ana-visual">
          <div className="ana-visual-head"><div><h3>{dim.name} <span>/ {met ? `${aggregate.toUpperCase()} ${met.name}` : 'RECORD COUNT'}</span></h3>
            <p>{pts.length} groups shown · {formatNumber(displayed.length, false)} records included</p></div>
            <div className="ana-chart-tools" role="group" aria-label="Chart type">
              {(['bar', 'line', 'donut'] as const).map(t => <button key={t} aria-pressed={chart === t} className={chart === t ? 'on' : ''} onClick={() => setChart(t)}>{t === 'bar' ? '▥ BAR' : t === 'line' ? '⌁ LINE' : '◉ DONUT'}</button>)}
            </div></div>
          <div className="ana-chart"><Visualization kind={chart} data={pts} /></div>
          <div className="ana-chart-foot"><span>Visuals are calculated from the selected rows.</span><button className="ana-link" onClick={exportSummary}>↓ EXPORT CHART</button></div>
          <div className="ana-insights"><h4>◇ ANALYST OBSERVATIONS <small>RULE-BASED · NOT GENERATED BY AI</small></h4>
            {descriptions.map((v, i) => <p key={i}><span>0{i + 1}</span>{v}</p>)}</div>
        </div>}
        {tab === 'quality' && <div role="tabpanel" className="ana-detail"><h3>DATA QUALITY <span>/ PROFILE</span></h3>
          <div className="ana-quality-stats"><div>ROWS<strong>{formatNumber(displayed.length)}</strong></div><div>COLUMNS<strong>{columns.length}</strong></div>
            <div>DUPLICATE ROWS<strong>{formatNumber(duplicates)}</strong></div><div>BLANK CELLS<strong>{formatNumber(missing)}</strong></div></div>
          <div className="ana-table-scroll"><table className="ana-table"><thead><tr><th>FIELD</th><th>TYPE (INFERRED)</th><th>EMPTY</th><th>DISTINCT</th></tr></thead><tbody>
            {columns.map(c => <tr key={c.index}><td>{c.name}</td><td><span className="ana-type">{c.kind}</span></td><td>{displayed.filter(r => !r[c.index]).length}</td>
              <td>{new Set(displayed.map(r => r[c.index]).filter(Boolean)).size}</td></tr>)}</tbody></table></div>
          <p className="ana-note">Type detection uses basic heuristics. Duplicates mean identical full rows in the current filter. Validate business meaning before making decisions.</p>
        </div>}
        {tab === 'rows' && <div role="tabpanel" className="ana-detail"><h3>RAW DATA <span>/ PREVIEW</span></h3>
          <p className="ana-note">Showing first 100 matching rows. Export CSV for all {formatNumber(displayed.length, false)} matched records.</p>
          <div className="ana-table-scroll"><table className="ana-table"><thead><tr><th>#</th>{data.columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead><tbody>
            {displayed.slice(0, 100).map((row, i) => <tr key={i}><td>{i + 1}</td>{row.map((v, j) => <td key={j} title={v}>{v || '—'}</td>)}</tr>)}</tbody></table></div>
          <button className="ana-btn" onClick={download}>↓ DOWNLOAD MATCHING ROWS</button>
        </div>}
      </section>
    </div>
    <footer className="ana-footer">ANALYSIS ENGINE: LOCAL / OFFLINE <span>DATA ANALYST · PYTHON · SQL · POWER BI · EXCEL</span></footer>
  </div>;
}
