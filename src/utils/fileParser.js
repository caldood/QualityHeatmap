import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export const REQUIRED_COLUMNS = ['Ticker', 'ROIC', 'ROIC_Trajectory', 'FCF_Margin', 'Revenue_Growth', 'Net_Debt_to_EBITDA', 'Beta'];
export const OPTIONAL_COLUMNS = ['Market_Cap', 'Sector', 'Country'];
export const ALL_EXPECTED = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

/**
 * Parse file (xlsx or csv) and return raw row objects
 */
export async function parseFile(file) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => resolve({ data: results.data, headers: results.meta.fields }),
        error: (err) => reject(new Error(`CSV parse error: ${err.message}`)),
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
          const headers = data.length > 0 ? Object.keys(data[0]) : [];
          resolve({ data, headers });
        } catch (err) {
          reject(new Error(`Excel parse error: ${err.message}`));
        }
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error(`Unsupported file type: .${ext}. Please upload .xlsx or .csv`));
    }
  });
}

/**
 * Validate that required columns exist (or are mapped)
 * Returns { valid: bool, missing: [], warnings: [] }
 */
export function validateColumns(headers, mapping = {}) {
  const effectiveHeaders = headers.map(h => {
    const mapped = Object.entries(mapping).find(([, v]) => v === h);
    return mapped ? mapped[0] : h;
  });
  const effectiveSet = new Set([...headers, ...Object.keys(mapping)]);

  const missing = REQUIRED_COLUMNS.filter(col => !effectiveSet.has(col));
  const warnings = [];

  OPTIONAL_COLUMNS.forEach(col => {
    if (!effectiveSet.has(col)) warnings.push(`Optional column "${col}" not found — some features will be limited.`);
  });

  return { valid: missing.length === 0, missing, warnings };
}

/**
 * Apply column mapping and coerce numeric fields
 */
export function applyMapping(data, mapping = {}) {
  // Invert: { standardName: originalHeader }
  const inverse = {};
  Object.entries(mapping).forEach(([std, orig]) => { inverse[orig] = std; });

  return data.map(row => {
    const newRow = {};
    Object.entries(row).forEach(([key, val]) => {
      const mapped = inverse[key] || key;
      newRow[mapped] = val;
    });
    return newRow;
  }).map(row => {
    const numericFields = ['ROIC', 'ROIC_Trajectory', 'FCF_Margin', 'Revenue_Growth',
      'Net_Debt_to_EBITDA', 'Beta', 'Market_Cap'];
    numericFields.forEach(f => {
      if (row[f] !== undefined && row[f] !== '') {
        const cleaned = String(row[f]).replace(/[,%$]/g, '').trim();
        row[f] = parseFloat(cleaned);
      } else {
        row[f] = NaN;
      }
    });
    row.Ticker = String(row.Ticker || '').trim().toUpperCase();
    row.Sector = String(row.Sector || 'Unknown').trim();
    row.Country = String(row.Country || '').trim();
    return row;
  }).filter(row => row.Ticker && row.Ticker !== '');
}
