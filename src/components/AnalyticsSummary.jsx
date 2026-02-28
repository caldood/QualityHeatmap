import { useMemo } from 'react';
import { median } from '../utils/scoring';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

export default function AnalyticsSummary({ data }) {
  const stats = useMemo(() => {
    if (!data.length) return null;

    const medQ = median(data.map(r => r.qualityScore));
    const medG = median(data.map(r => r.growthScore));
    const medM = median(data.map(r => r.moatScore));
    const medF = median(data.map(r => r.fragilityScore));

    const expanding = data.filter(r => r.moatLabel === 'Expanding');
    const deteriorating = data.filter(r => r.moatLabel === 'Deteriorating');
    const highFragility = data.filter(r => r.fragilityScore >= 65);

    // Quadrant split
    const quadrants = { tr: 0, tl: 0, br: 0, bl: 0 };
    data.forEach(r => {
      const hq = r.qualityScore >= medQ, hg = r.growthScore >= medG;
      if (hq && hg) quadrants.tr++;
      else if (hq && !hg) quadrants.tl++;
      else if (!hq && hg) quadrants.br++;
      else quadrants.bl++;
    });

    const top10Expanding = [...expanding]
      .sort((a, b) => b.moatScore - a.moatScore)
      .slice(0, 10);

    const top10Fragility = [...highFragility]
      .sort((a, b) => b.fragilityScore - a.fragilityScore)
      .slice(0, 10);

    // Distribution histograms
    const buildHist = (vals, label) => {
      const n = 10;
      const valid = vals.filter(v => !isNaN(v));
      const min = 0, max = 100;
      const size = (max - min) / n;
      const bins = Array.from({ length: n }, (_, i) => ({
        range: `${i * 10}–${(i + 1) * 10}`,
        count: 0,
      }));
      valid.forEach(v => {
        const idx = Math.min(Math.floor((v - min) / size), n - 1);
        bins[idx].count++;
      });
      return bins;
    };

    const qualHist = buildHist(data.map(r => r.qualityScore), 'Quality');
    const growHist = buildHist(data.map(r => r.growthScore), 'Growth');
    const moatHist = buildHist(data.map(r => r.moatScore), 'Moat');

    // Correlation matrix
    const scoreFields = ['qualityScore', 'growthScore', 'defensiveScore', 'fragilityScore', 'moatScore'];
    const corr = {};
    scoreFields.forEach(a => {
      corr[a] = {};
      scoreFields.forEach(b => {
        const xa = data.map(r => r[a]).filter(v => !isNaN(v));
        const xb = data.map(r => r[b]).filter(v => !isNaN(v));
        const n = Math.min(xa.length, xb.length);
        if (n < 2) { corr[a][b] = 0; return; }
        const ax = xa.slice(0, n), bx = xb.slice(0, n);
        const ma = ax.reduce((s, v) => s + v, 0) / n;
        const mb = bx.reduce((s, v) => s + v, 0) / n;
        const num = ax.reduce((s, v, i) => s + (v - ma) * (bx[i] - mb), 0);
        const den = Math.sqrt(ax.reduce((s, v) => s + (v - ma) ** 2, 0) * bx.reduce((s, v) => s + (v - mb) ** 2, 0));
        corr[a][b] = den === 0 ? 0 : Math.round((num / den) * 100) / 100;
      });
    });

    // Z-score dispersion
    const zDispersion = {};
    scoreFields.forEach(f => {
      const vals = data.map(r => r[f]).filter(v => !isNaN(v));
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      const std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
      zDispersion[f] = { mean: Math.round(mean * 10) / 10, std: Math.round(std * 10) / 10 };
    });

    return {
      n: data.length,
      medQ, medG, medM, medF,
      quadrants,
      pctExpanding: ((expanding.length / data.length) * 100).toFixed(1),
      pctDeteriorating: ((deteriorating.length / data.length) * 100).toFixed(1),
      pctHighFragility: ((highFragility.length / data.length) * 100).toFixed(1),
      top10Expanding, top10Fragility,
      qualHist, growHist, moatHist,
      corr, zDispersion, scoreFields,
    };
  }, [data]);

  if (!stats) return null;

  const scoreLabels = {
    qualityScore: 'Quality',
    growthScore: 'Growth',
    defensiveScore: 'Defensive',
    fragilityScore: 'Fragility',
    moatScore: 'Moat',
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Universe Size" value={stats.n} unit="names" />
        <StatCard label="Median Quality" value={stats.medQ.toFixed(1)} unit="/ 100" />
        <StatCard label="Median Growth" value={stats.medG.toFixed(1)} unit="/ 100" />
        <StatCard label="Median Moat" value={stats.medM.toFixed(1)} unit="/ 100" />
        <StatCard label="Expanding Moats" value={`${stats.pctExpanding}%`} unit={`${stats.top10Expanding.length} names`} accent="positive" />
        <StatCard label="Deteriorating Moats" value={`${stats.pctDeteriorating}%`} unit="of universe" accent="negative" />
        <StatCard label="High Fragility" value={`${stats.pctHighFragility}%`} unit="score ≥ 65" accent="warning" />
        <StatCard label="Median Fragility" value={stats.medF.toFixed(1)} unit="/ 100" />
      </div>

      {/* Quadrant Distribution */}
      <div className="fs-panel">
        <div className="fs-panel-header">Quadrant Distribution</div>
        <div className="p-4 grid grid-cols-2 gap-px bg-[#dee2e6]">
          {[
            { q: 'tl', label: 'Defensive Compounders', desc: 'High Quality / Lower Growth', color: '#e8f4fd' },
            { q: 'tr', label: 'High Quality / High Growth', desc: 'Core long candidates', color: '#d3f9d8' },
            { q: 'bl', label: 'Lower Quality / Lower Growth', desc: 'Avoid or short candidates', color: '#fff5f5' },
            { q: 'br', label: 'High Growth / Lower Quality', desc: 'Growth at a price', color: '#fff3bf' },
          ].map(({ q, label, desc, color }) => (
            <div key={q} style={{ background: color }} className="p-4">
              <div className="text-xs font-semibold text-[#212529] mb-0.5">{label}</div>
              <div className="text-[10px] text-[#868e96] mb-2">{desc}</div>
              <div className="text-2xl font-bold text-[#212529]">{stats.quadrants[q]}</div>
              <div className="text-[10px] text-[#868e96]">
                {((stats.quadrants[q] / stats.n) * 100).toFixed(1)}% of universe
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution Histograms */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { hist: stats.qualHist, label: 'Quality Score Distribution', color: '#1c6ea4' },
          { hist: stats.growHist, label: 'Growth Score Distribution', color: '#2d8a4e' },
          { hist: stats.moatHist, label: 'Moat Score Distribution', color: '#7a5200' },
        ].map(({ hist, label, color }) => (
          <div key={label} className="fs-panel">
            <div className="fs-panel-header">{label}</div>
            <div className="p-3" style={{ height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hist} margin={{ top: 4, right: 4, bottom: 14, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" vertical={false} />
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 8, fill: '#868e96' }}
                    axisLine={false}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={30}
                  />
                  <YAxis tick={{ fontSize: 9, fill: '#868e96' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, border: '1px solid #dee2e6', borderRadius: 2 }}
                    cursor={{ fill: '#f8f9fa' }}
                  />
                  <Bar dataKey="count" fill={color} opacity={0.75} radius={[1, 1, 0, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* Correlation Matrix */}
      <div className="fs-panel">
        <div className="fs-panel-header">Factor Correlation Matrix (Pearson)</div>
        <div className="p-4 overflow-x-auto">
          <table className="text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="w-24 text-right pr-3 text-[#868e96] font-normal"></th>
                {stats.scoreFields.map(f => (
                  <th key={f} className="px-3 py-2 text-center text-[10px] font-semibold text-[#495057] w-20">
                    {scoreLabels[f]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.scoreFields.map(a => (
                <tr key={a}>
                  <td className="pr-3 py-1.5 text-right text-[10px] font-semibold text-[#495057] whitespace-nowrap">
                    {scoreLabels[a]}
                  </td>
                  {stats.scoreFields.map(b => {
                    const v = stats.corr[a][b];
                    const abs = Math.abs(v);
                    const bg = a === b
                      ? '#f1f3f5'
                      : v > 0
                        ? `rgba(44, 138, 78, ${abs * 0.45})`
                        : `rgba(176, 42, 48, ${abs * 0.45})`;
                    return (
                      <td
                        key={b}
                        style={{ background: bg, textAlign: 'center', padding: '6px 12px', fontFamily: 'monospace', fontSize: 11 }}
                        className="text-[#212529] border border-[#f1f3f5]"
                        title={`${scoreLabels[a]} vs ${scoreLabels[b]}: ${v}`}
                      >
                        {v.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Z-Score Dispersion */}
      <div className="fs-panel">
        <div className="fs-panel-header">Z-Score Dispersion (Mean ± Std Dev)</div>
        <div className="p-4">
          <div className="grid grid-cols-5 gap-3">
            {stats.scoreFields.map(f => (
              <div key={f} className="text-center">
                <div className="text-[10px] font-semibold text-[#495057] mb-2">{scoreLabels[f]}</div>
                <div className="text-base font-bold text-[#212529] font-mono">{stats.zDispersion[f].mean}</div>
                <div className="text-[10px] text-[#868e96]">mean</div>
                <div className="text-sm font-semibold text-[#495057] font-mono mt-1">±{stats.zDispersion[f].std}</div>
                <div className="text-[10px] text-[#868e96]">std dev</div>
                <div className="mt-2 text-[10px] text-[#868e96]">
                  CV: {stats.zDispersion[f].mean > 0
                    ? ((stats.zDispersion[f].std / stats.zDispersion[f].mean) * 100).toFixed(0)
                    : '—'}%
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[10px] text-[#868e96]">
            CV = Coefficient of Variation (dispersion / crowding signal). Higher CV indicates greater spread and lower crowding in that factor.
          </div>
        </div>
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-2 gap-3">
        <div className="fs-panel">
          <div className="fs-panel-header">Top 10 Expanding Moats</div>
          <div className="p-3">
            {stats.top10Expanding.length === 0 && (
              <p className="text-[#adb5bd] text-xs">No expanding moats in filtered universe.</p>
            )}
            {stats.top10Expanding.map((r, i) => (
              <div key={r.Ticker} className="flex items-center justify-between py-1.5 border-b border-[#f8f9fa] last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#adb5bd] w-4 text-right">{i + 1}.</span>
                  <span className="font-mono text-xs font-semibold text-[#1c6ea4]">{r.Ticker}</span>
                  {r.Sector !== 'Unknown' && (
                    <span className="text-[10px] text-[#868e96]">{r.Sector}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#868e96]">Moat</span>
                  <span className="font-mono text-xs font-semibold">{r.moatScore.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="fs-panel">
          <div className="fs-panel-header">Top 10 High Fragility Names</div>
          <div className="p-3">
            {stats.top10Fragility.length === 0 && (
              <p className="text-[#adb5bd] text-xs">No high-fragility names (score ≥ 65) in universe.</p>
            )}
            {stats.top10Fragility.map((r, i) => (
              <div key={r.Ticker} className="flex items-center justify-between py-1.5 border-b border-[#f8f9fa] last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#adb5bd] w-4 text-right">{i + 1}.</span>
                  <span className="font-mono text-xs font-semibold text-[#b02a30]">{r.Ticker}</span>
                  {r.Sector !== 'Unknown' && (
                    <span className="text-[10px] text-[#868e96]">{r.Sector}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#868e96]">Fragility</span>
                  <span className="font-mono text-xs font-semibold text-[#b02a30]">{r.fragilityScore.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Memo-style Summary */}
      <div className="fs-panel">
        <div className="fs-panel-header">Structured Summary — Copy/Paste Ready</div>
        <div className="p-4">
          <pre className="text-xs text-[#495057] whitespace-pre-wrap font-mono leading-relaxed bg-[#f8f9fa] p-4 rounded-sm border border-[#dee2e6]">
{`QUALITY VS GROWTH UNIVERSE ANALYSIS
Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
─────────────────────────────────────────────────────────

UNIVERSE: ${stats.n} securities

KEY METRICS:
  • Median Quality Score:     ${stats.medQ.toFixed(1)} / 100
  • Median Growth Score:      ${stats.medG.toFixed(1)} / 100
  • Median Moat Score:        ${stats.medM.toFixed(1)} / 100
  • Median Fragility Score:   ${stats.medF.toFixed(1)} / 100

QUADRANT DISTRIBUTION:
  • High Quality / High Growth:        ${stats.quadrants.tr} names (${((stats.quadrants.tr / stats.n) * 100).toFixed(1)}%)
  • Defensive Compounders:             ${stats.quadrants.tl} names (${((stats.quadrants.tl / stats.n) * 100).toFixed(1)}%)
  • High Growth / Lower Quality:       ${stats.quadrants.br} names (${((stats.quadrants.br / stats.n) * 100).toFixed(1)}%)
  • Lower Quality / Lower Growth:      ${stats.quadrants.bl} names (${((stats.quadrants.bl / stats.n) * 100).toFixed(1)}%)

MOAT TRAJECTORY:
  • Expanding moats:      ${stats.pctExpanding}% of universe
  • Deteriorating moats:  ${stats.pctDeteriorating}% of universe

RISK FLAGS:
  • High fragility names (score ≥ 65): ${stats.pctHighFragility}% of universe

TOP EXPANDING MOATS:
${stats.top10Expanding.map((r, i) => `  ${String(i + 1).padStart(2)}. ${r.Ticker.padEnd(8)} Moat: ${r.moatScore.toFixed(1).padStart(5)}  Quality: ${r.qualityScore.toFixed(1).padStart(5)}  ROIC: ${(r.ROIC ?? 0).toFixed(1)}%`).join('\n')}

TOP FRAGILITY NAMES:
${stats.top10Fragility.map((r, i) => `  ${String(i + 1).padStart(2)}. ${r.Ticker.padEnd(8)} Fragility: ${r.fragilityScore.toFixed(1).padStart(5)}  Beta: ${(r.Beta ?? 0).toFixed(2)}  Net Debt/EBITDA: ${(r.Net_Debt_to_EBITDA ?? 0).toFixed(1)}x`).join('\n')}
`}
          </pre>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, accent }) {
  const colors = {
    positive: 'text-[#2d8a4e]',
    negative: 'text-[#b02a30]',
    warning: 'text-[#7a5200]',
  };
  return (
    <div className="fs-panel p-4">
      <div className="text-[10px] uppercase tracking-wide text-[#868e96] font-semibold mb-1">{label}</div>
      <div className={`text-xl font-bold font-mono ${colors[accent] || 'text-[#212529]'}`}>{value}</div>
      {unit && <div className="text-[10px] text-[#adb5bd] mt-0.5">{unit}</div>}
    </div>
  );
}
