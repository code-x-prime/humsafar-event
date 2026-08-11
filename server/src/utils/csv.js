// Minimal CSV parse/generate — no external dependency needed for the simple,
// flat, comma-delimited rows this project uses (pincode import/export).

export function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
  });

  return { headers, rows };
}

export function generateCsv(rows, columns) {
  const header = columns.join(',');
  const body = rows
    .map((row) => columns.map((col) => String(row[col] ?? '').replace(/,/g, ' ')).join(','))
    .join('\n');

  return `${header}\n${body}`;
}
