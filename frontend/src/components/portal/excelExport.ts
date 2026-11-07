/** Exportador XLSX sem dependências externas. Gera um pacote OOXML válido. */
const encoder = new TextEncoder();
const xml = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
const col = (index: number): string => { let s = ""; for (let n = index + 1; n; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : c >>> 1; return c >>> 0; });
const crc32 = (bytes: Uint8Array) => { let c = 0xFFFFFFFF; for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const zip = (files: [string, string][]) => {
  const parts: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0;
  const u16 = (v: DataView, at: number, n: number) => v.setUint16(at, n, true);
  const u32 = (v: DataView, at: number, n: number) => v.setUint32(at, n >>> 0, true);
  for (const [path, contents] of files) {
    const name = encoder.encode(path); const data = encoder.encode(contents); const crc = crc32(data);
    const local = new Uint8Array(30 + name.length); const lv = new DataView(local.buffer);
    u32(lv, 0, 0x04034b50); u16(lv, 4, 20); u16(lv, 6, 0x800); u32(lv, 14, crc); u32(lv, 18, data.length); u32(lv, 22, data.length); u16(lv, 26, name.length); local.set(name, 30);
    parts.push(local, data);
    const cd = new Uint8Array(46 + name.length); const cv = new DataView(cd.buffer);
    u32(cv, 0, 0x02014b50); u16(cv, 4, 20); u16(cv, 6, 20); u16(cv, 8, 0x800); u32(cv, 16, crc); u32(cv, 20, data.length); u32(cv, 24, data.length); u16(cv, 28, name.length); u32(cv, 42, offset); cd.set(name, 46); central.push(cd);
    offset += local.length + data.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22); const ev = new DataView(end.buffer);
  u32(ev, 0, 0x06054b50); u16(ev, 8, files.length); u16(ev, 10, files.length); u32(ev, 12, centralSize); u32(ev, 16, offset);
  return new Blob([...parts, ...central, end] as BlobPart[], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
};
export function downloadExcel(filename: string, rows: unknown[][], sheetName = "Relatório") {
  const safeRows = rows.length ? rows : [["Sem dados"]];
  const widths = Array.from({ length: Math.max(...safeRows.map(row => row.length)) }, (_, i) => Math.min(65, Math.max(12, ...safeRows.map(row => String(row[i] ?? "").length + 2))));
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${safeRows.map((row, ri) => `<row r="${ri + 1}">${row.map((value, ci) => { const address = `${col(ci)}${ri + 1}`; const style = ri === 0 ? ' s="1"' : ""; return typeof value === "number" && Number.isFinite(value) ? `<c r="${address}"${style}><v>${value}</v></c>` : `<c r="${address}" t="inlineStr"${style}><is><t>${xml(value)}</t></is></c>`; }).join("")}</row>`).join("")}</sheetData><autoFilter ref="A1:${col(widths.length - 1)}${safeRows.length}"/></worksheet>`;
  const files: [string, string][] = [
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(sheetName.slice(0,31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml", `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF176B52"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`],
    ["xl/worksheets/sheet1.xml", sheet]
  ];
  const blob = zip(files); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename.replace(/\.csv$/i, ".xlsx").replace(/\.xlsx$/i, "") + ".xlsx"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Lê o formato CSV histórico dos relatórios salvos (aspas e separador ;). */
export function savedCsvRows(csv: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
  for (let i = 0; i < csv.length; i++) { const ch = csv[i]; if (ch === '"') { if (quoted && csv[i+1] === '"') { field += '"'; i++; } else quoted = !quoted; } else if (!quoted && ch === ';') { row.push(field); field = ""; } else if (!quoted && (ch === '\n' || ch === '\r')) { if (ch === '\r' && csv[i+1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ""; } else field += ch; }
  if (field || row.length) { row.push(field); rows.push(row); }
  if (rows[0]?.[0]?.startsWith('\uFEFF')) rows[0][0] = rows[0][0].slice(1);
  return rows;
}
