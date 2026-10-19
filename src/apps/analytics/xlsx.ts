import { normalize, type DataSet } from './data';

/** Read-only parser for ordinary .xlsx files. No dependencies, network requests or macro execution. */
const decoder = new TextDecoder();
const MAX_UNCOMPRESSED = 30 * 1024 * 1024;
const u16 = (view: DataView, off: number) => view.getUint16(off, true);
const u32 = (view: DataView, off: number) => view.getUint32(off, true);

async function unzipSelected(bytes: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const view = new DataView(bytes); const arr = new Uint8Array(bytes);
  let end = -1;
  for (let pos = arr.length - 22; pos >= Math.max(0, arr.length - 65557); pos--) {
    if (u32(view, pos) === 0x06054b50) { end = pos; break; }
  }
  if (end < 0) throw Error('Invalid XLSX: ZIP directory not found.');
  const count = u16(view, end + 10); const dir = u32(view, end + 16);
  if (count > 2000 || dir === 0xffffffff) throw Error('Spreadsheet archive is too complex. Try exporting to CSV.');
  const files = new Map<string, Uint8Array>(); let pos = dir; let total = 0;
  for (let n = 0; n < count; n++) {
    if (pos + 46 > view.byteLength || u32(view, pos) !== 0x02014b50) throw Error('Malformed XLSX archive.');
    const flags = u16(view, pos + 8); const method = u16(view, pos + 10);
    const compressed = u32(view, pos + 20); const uncompressed = u32(view, pos + 24);
    const namelen = u16(view, pos + 28), extra = u16(view, pos + 30), comment = u16(view, pos + 32);
    const offset = u32(view, pos + 42);
    const name = decoder.decode(arr.subarray(pos + 46, pos + 46 + namelen));
    pos += 46 + namelen + extra + comment;
    if (!(/^(xl\/workbook\.xml|xl\/_rels\/workbook\.xml\.rels|xl\/sharedStrings\.xml|xl\/worksheets\/[^/]+\.xml)$/.test(name))) continue;
    if ((flags & 1) || uncompressed > MAX_UNCOMPRESSED || compressed > MAX_UNCOMPRESSED) throw Error('Unsupported/encrypted spreadsheet. Export to CSV.');
    if (offset + 30 > view.byteLength || u32(view, offset) !== 0x04034b50) throw Error('Malformed XLSX file entry.');
    const start = offset + 30 + u16(view, offset + 26) + u16(view, offset + 28);
    if (start + compressed > arr.length) throw Error('Truncated XLSX file entry.');
    let content: Uint8Array;
    if (method === 0) content = arr.slice(start, start + compressed);
    else if (method === 8) {
      if (typeof DecompressionStream === 'undefined') throw Error('Your browser cannot read XLSX directly. Export the file as CSV.');
      try {
        // Deflate-raw is the ZIP standard, supported by modern Chromium browsers.
        const stream = new Blob([arr.slice(start, start + compressed) as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw' as CompressionFormat));
        const decompressed = await new Response(stream).arrayBuffer();
        content = new Uint8Array(decompressed);
      } catch { throw Error('XLSX decompression failed in this browser. Please use CSV.'); }
    } else throw Error('Unsupported XLSX compression. Export to CSV.');
    if (content.byteLength > MAX_UNCOMPRESSED || (uncompressed !== 0xffffffff && content.length !== uncompressed)) throw Error('XLSX file is too large or corrupt.');
    total += content.byteLength; if (total > MAX_UNCOMPRESSED) throw Error('XLSX data exceeds the safe size limit.');
    files.set(name, content);
  }
  return files;
}
const parseXml = (bytes: Uint8Array | undefined, label: string): Document => {
  if (!bytes) throw Error(`XLSX missing ${label}.`);
  const str = decoder.decode(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(str)) throw Error('XLSX with XML entities is unsupported.');
  const xml = new DOMParser().parseFromString(str, 'application/xml');
  if (xml.querySelector('parsererror')) throw Error(`Invalid XML in ${label}.`);
  return xml;
};
const els = (parent: Element | Document, tag: string): Element[] => Array.from(parent.getElementsByTagName(tag));
const textRuns = (parent: Element): string => els(parent, 't').map(x => x.textContent ?? '').join('');
const colIndex = (name: string): number => {
  const part = /^[A-Z]+/i.exec(name)?.[0] || ''; let value = 0;
  for (const c of part.toUpperCase()) value = value * 26 + c.charCodeAt(0) - 64;
  return value - 1;
};
export async function parseXLSX(bytes: ArrayBuffer, name: string): Promise<DataSet> {
  const files = await unzipSelected(bytes);
  const book = parseXml(files.get('xl/workbook.xml'), 'workbook');
  const sheet = els(book, 'sheet')[0]; if (!sheet) throw Error('The workbook has no sheets.');
  const rid = sheet.getAttribute('r:id') ?? sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  const rels = parseXml(files.get('xl/_rels/workbook.xml.rels'), 'sheet relationships');
  const rel = els(rels, 'Relationship').find(r => r.getAttribute('Id') === rid);
  if (!rel || rel.getAttribute('TargetMode') === 'External') throw Error('XLSX sheet relationship is unavailable.');
  const target = rel.getAttribute('Target') || '';
  const normalized = target.startsWith('/') ? target.slice(1) : target.startsWith('xl/') ? target : `xl/${target}`;
  // Do not allow path traversal or external assets.
  const parts: string[] = [];
  for (const s of normalized.split('/')) { if (s === '..') parts.pop(); else if (s && s !== '.') parts.push(s); }
  const path = parts.join('/');
  if (!/^xl\/worksheets\/[^/]+\.xml$/.test(path)) throw Error('Unsupported XLSX worksheet path.');
  const xml = parseXml(files.get(path), 'worksheet');
  const sharedXml = files.get('xl/sharedStrings.xml');
  const strings = sharedXml ? els(parseXml(sharedXml, 'shared strings'), 'si').map(textRuns) : [];
  const raw: string[][] = [];
  for (const row of els(xml, 'sheetData').flatMap(el => els(el, 'row'))) {
    if (raw.length > 15000) throw Error('XLSX exceeds 15,000 rows.');
    const values: string[] = [];
    for (const cell of els(row, 'c')) {
      const index = colIndex(cell.getAttribute('r') || '');
      if (index < 0 || index >= 50) continue;
      const type = cell.getAttribute('t');
      const literal = els(cell, 'v')[0]?.textContent ?? '';
      values[index] = type === 's' ? (strings[Number(literal)] ?? '')
        : type === 'inlineStr' ? textRuns(cell) : type === 'b' ? (literal === '1' ? 'TRUE' : 'FALSE') : literal;
    }
    if (values.some(x => x !== undefined && x !== '')) raw.push(values);
  }
  const [header, ...rows] = raw;
  if (!header) throw Error('The first Excel sheet has no data.');
  return normalize(header, rows, `${name} / ${sheet.getAttribute('name') || 'Sheet 1'}`);
}
