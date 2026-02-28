import { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { fragilityClass, moatCssClass, scoreToColor } from '../utils/scoring';

const COLUMNS = [
  { key: 'Ticker', label: 'Ticker', align: 'left', width: 80 },
  { key: 'Sector', label: 'Sector', align: 'left', width: 110 },
  { key: 'qualityScore', label: 'Quality', align: 'right', width: 80, score: true },
  { key: 'growthScore', label: 'Growth', align: 'right', width: 80, score: true },
  { key: 'defensiveScore', label: 'Defensive', align: 'right', width: 85, score: true },
  { key: 'fragilityScore', label: 'Fragility', align: 'right', width: 80, risk: true },
  { key: 'moatScore', label: 'Moat', align: 'right', width: 75, score: true },
  { key: 'moatLabel', label: 'Moat Class', align: 'center', width: 100 },
  { key: 'ROIC', label: 'ROIC %', align: 'right', width: 75, pct: true },
  { key: 'ROIC_Trajectory', label: 'ROIC Traj.', align: 'right', width: 85, pct: true },
  { key: 'Revenue_Growth', label: 'Rev. Growth %', align: 'right', width: 100, pct: true },
  { key: 'FCF_Margin', label: 'FCF Margin %', align: 'right', width: 100, pct: true },
  { key: 'Net_Debt_to_EBITDA', label: 'Net Debt/EBITDA', align: 'right', width: 115 },
  { key: 'Beta', label: 'Beta', align: 'right', width: 65 },
];

export default function DataGrid({ data }) {
  const [sortKey, setSortKey] = useState('qualityScore');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(0);
  };

  const filtered = useMemo(() => {
    let rows = data;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(r =>
        r.Ticker?.toLowerCase().includes(q) ||
        r.Sector?.toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (va === undefined || va === null) return 1;
      if (vb === undefined || vb === null) return -1;
      const aNum = typeof va === 'number' ? va : parseFloat(va);
      const bNum = typeof vb === 'number' ? vb : parseFloat(vb);
      if (!isNaN(aNum) && !isNaN(bNum)) return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }, [data, sortKey, sortDir, search]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const exportToCSV = () => {
    const headers = COLUMNS.map(c => c.label);
    const rows = filtered.map(r => COLUMNS.map(c => {
      const v = r[c.key];
      if (typeof v === 'number' && !isNaN(v)) return v.toFixed(c.score || c.risk ? 1 : 2);
      return v ?? '';
    }));
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv' }), 'quality_growth_analysis.csv');
  };

  const exportToExcel = () => {
    const wsData = [
      COLUMNS.map(c => c.label),
      ...filtered.map(r => COLUMNS.map(c => {
        const v = r[c.key];
        return typeof v === 'number' ? v : v ?? '';
      }))
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Analysis');
    XLSX.writeFile(wb, 'quality_growth_analysis.xlsx');
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fs-panel">
      <div className="fs-panel-header flex items-center justify-between">
        <span>Universe Data Grid — {filtered.length} Names</span>
        <div className="flex items-center gap-2">
          <input
            className="fs-input"
            style={{ width: 180 }}
            placeholder="Search ticker or sector..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
          <button className="fs-btn fs-btn-secondary flex items-center gap-1.5" onClick={exportToCSV}>
            <Download size={11} /> CSV
          </button>
          <button className="fs-btn fs-btn-secondary flex items-center gap-1.5" onClick={exportToExcel}>
            <Download size={11} /> Excel
          </button>
        </div>
      </div>
      <div className="overflow-auto" style={{ maxHeight: 480 }}>
        <table className="fs-table" style={{ minWidth: 1100 }}>
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  style={{ width: col.width, textAlign: col.align }}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    {col.label}
                    {sortKey === col.key
                      ? sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
                      : <ArrowUpDown size={9} className="text-[#ced4da]" />
                    }
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <GridRow key={row.Ticker + i} row={row} />
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-[#f1f3f5] bg-[#fafbfc]">
          <span className="text-[11px] text-[#868e96]">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="fs-btn fs-btn-secondary text-[11px] px-2 py-0.5"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              ‹ Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i : Math.max(0, Math.min(page - 3, totalPages - 7)) + i;
              return (
                <button
                  key={p}
                  className={`fs-btn text-[11px] px-2 py-0.5 ${page === p ? 'fs-btn-primary' : 'fs-btn-secondary'}`}
                  onClick={() => setPage(p)}
                >
                  {p + 1}
                </button>
              );
            })}
            <button
              className="fs-btn fs-btn-secondary text-[11px] px-2 py-0.5"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GridRow({ row }) {
  return (
    <tr>
      {COLUMNS.map(col => {
        const val = row[col.key];
        let content;
        let style = {};

        if (col.key === 'moatLabel') {
          content = (
            <span className={`moat-badge ${moatCssClass(val)}`}>{val || '—'}</span>
          );
          style.textAlign = 'center';
        } else if (col.score) {
          const v = typeof val === 'number' ? val : parseFloat(val);
          content = (
            <div className="flex items-center justify-end gap-2">
              <div className="score-bar" style={{ width: 50 }}>
                <div
                  className="score-bar-fill"
                  style={{
                    width: `${Math.round(v)}%`,
                    background: scoreToColor(v),
                  }}
                />
              </div>
              <span className="font-mono text-xs">{isNaN(v) ? '—' : v.toFixed(1)}</span>
            </div>
          );
        } else if (col.risk) {
          const v = typeof val === 'number' ? val : parseFloat(val);
          content = (
            <span className={`font-mono ${fragilityClass(v)}`}>
              {isNaN(v) ? '—' : v.toFixed(1)}
            </span>
          );
        } else if (col.pct) {
          const v = typeof val === 'number' ? val : parseFloat(val);
          if (!isNaN(v)) {
            const color = col.key === 'Net_Debt_to_EBITDA'
              ? v > 3 ? '#b02a30' : v > 1.5 ? '#7a5200' : '#2d8a4e'
              : v >= 0 ? '#212529' : '#b02a30';
            content = <span style={{ color, fontFamily: 'monospace' }}>{v.toFixed(1)}</span>;
          } else {
            content = <span className="text-[#ced4da]">—</span>;
          }
        } else if (col.key === 'Ticker') {
          content = <span className="font-mono font-semibold text-[#1c6ea4] text-xs">{val}</span>;
        } else {
          const v = typeof val === 'number' ? val : parseFloat(val);
          content = isNaN(v) ? (val || <span className="text-[#ced4da]">—</span>) : <span className="font-mono">{v.toFixed(2)}</span>;
        }

        return (
          <td key={col.key} style={{ textAlign: col.align, ...style }}>
            {content}
          </td>
        );
      })}
    </tr>
  );
}
