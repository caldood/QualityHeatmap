import { useMemo } from 'react';
import { median, moatCssClass, fragilityClass, scoreToColor } from '../utils/scoring';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function OverviewPanel({ data }) {
  const stats = useMemo(() => {
    if (!data.length) return null;
    const scores = ['qualityScore', 'growthScore', 'defensiveScore', 'fragilityScore', 'moatScore'];
    const medians = {};
    scores.forEach(s => { medians[s] = median(data.map(r => r[s])); });
    const moatCounts = { Expanding: 0, Emerging: 0, 'Peak Risk': 0, Deteriorating: 0 };
    data.forEach(r => { if (moatCounts[r.moatLabel] !== undefined) moatCounts[r.moatLabel]++; });
    const topQ = [...data].sort((a, b) => b.qualityScore - a.qualityScore).slice(0, 5);
    const topG = [...data].sort((a, b) => b.growthScore - a.growthScore).slice(0, 5);
    const topM = [...data].sort((a, b) => b.moatScore - a.moatScore).slice(0, 5);
    const topF = [...data].sort((a, b) => b.fragilityScore - a.fragilityScore).slice(0, 5);
    return { medians, moatCounts, topQ, topG, topM, topF, n: data.length };
  }, [data]);

  if (!stats) return null;

  const radarData = [
    { factor: 'Quality', value: stats.medians.qualityScore },
    { factor: 'Growth', value: stats.medians.growthScore },
    { factor: 'Defensive', value: stats.medians.defensiveScore },
    { factor: 'Moat', value: stats.medians.moatScore },
    { factor: 'Low Fragility', value: 100 - stats.medians.fragilityScore },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Quality (Median)', val: stats.medians.qualityScore, score: true },
          { label: 'Growth (Median)', val: stats.medians.growthScore, score: true },
          { label: 'Defensive (Median)', val: stats.medians.defensiveScore, score: true },
          { label: 'Moat (Median)', val: stats.medians.moatScore, score: true },
          { label: 'Fragility (Median)', val: stats.medians.fragilityScore, risk: true },
        ].map(({ label, val, score, risk }) => (
          <div key={label} className="fs-panel p-4">
            <div className="text-[10px] uppercase tracking-wide text-[#868e96] font-semibold mb-1">{label}</div>
            <div
              className="text-2xl font-bold font-mono"
              style={{ color: score ? scoreToColor(val) : risk && val >= 65 ? '#b02a30' : '#212529' }}
            >
              {val.toFixed(1)}
            </div>
            <div className="score-bar mt-2">
              <div
                className="score-bar-fill"
                style={{ width: `${val}%`, background: score ? scoreToColor(val) : risk ? '#b02a30' : '#1c6ea4' }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Radar Chart */}
        <div className="fs-panel col-span-1">
          <div className="fs-panel-header">Universe Factor Profile (Median)</div>
          <div style={{ height: 260 }} className="p-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#e9ecef" />
                <PolarAngleAxis
                  dataKey="factor"
                  tick={{ fontSize: 10, fill: '#495057', fontFamily: 'Inter, sans-serif' }}
                />
                <Radar
                  dataKey="value"
                  stroke="#1c6ea4"
                  fill="#1c6ea4"
                  fillOpacity={0.18}
                  strokeWidth={1.5}
                />
                <Tooltip
                  formatter={(v) => [v.toFixed(1), 'Score']}
                  contentStyle={{ fontSize: 11, border: '1px solid #dee2e6', borderRadius: 2 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Moat Distribution */}
        <div className="fs-panel col-span-1">
          <div className="fs-panel-header">Moat Trajectory Distribution</div>
          <div className="p-4 space-y-3">
            {Object.entries(stats.moatCounts).map(([label, count]) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`moat-badge ${moatCssClass(label)}`}>{label}</span>
                  <span className="text-xs font-mono font-semibold">{count} <span className="text-[#868e96] font-normal">({((count / stats.n) * 100).toFixed(1)}%)</span></span>
                </div>
                <div className="score-bar">
                  <div
                    className="score-bar-fill"
                    style={{
                      width: `${(count / stats.n) * 100}%`,
                      background: label === 'Expanding' ? '#2d8a4e' : label === 'Emerging' ? '#6741a5' : label === 'Peak Risk' ? '#7a5200' : '#b02a30'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Names */}
        <div className="fs-panel col-span-1">
          <div className="fs-panel-header">Top 5 by Score</div>
          <div className="p-3 space-y-2">
            {[
              { label: 'Quality', list: stats.topQ, field: 'qualityScore', color: '#1c6ea4' },
              { label: 'Growth', list: stats.topG, field: 'growthScore', color: '#2d8a4e' },
              { label: 'Moat', list: stats.topM, field: 'moatScore', color: '#7a5200' },
            ].map(({ label, list, field, color }) => (
              <div key={label}>
                <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color }}>{label}</div>
                <div className="flex flex-wrap gap-1">
                  {list.map(r => (
                    <span
                      key={r.Ticker}
                      className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-sm border"
                      style={{ color, borderColor: color + '44', background: color + '11' }}
                      title={`${r[field].toFixed(1)}`}
                    >
                      {r.Ticker}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide mb-1 text-[#b02a30]">High Fragility ⚠</div>
              <div className="flex flex-wrap gap-1">
                {stats.topF.map(r => (
                  <span
                    key={r.Ticker}
                    className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-sm border border-[#f1c0c0] bg-[#fff5f5] text-[#b02a30]"
                    title={`Fragility: ${r.fragilityScore.toFixed(1)}`}
                  >
                    {r.Ticker}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
