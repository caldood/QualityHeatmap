import { useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

export default function FilterPanel({ data, filters, onChange }) {
  const sectors = [...new Set(data.map(r => r.Sector).filter(Boolean))].sort();
  const [sectorOpen, setSectorOpen] = useState(true);
  const [scoresOpen, setScoresOpen] = useState(true);
  const [togglesOpen, setTogglesOpen] = useState(true);

  const hasMktCap = data.some(r => !isNaN(r.Market_Cap));
  const mktCaps = hasMktCap ? data.map(r => r.Market_Cap).filter(v => !isNaN(v)) : [];
  const minMkt = hasMktCap ? Math.min(...mktCaps) : 0;
  const maxMkt = hasMktCap ? Math.max(...mktCaps) : 1000;

  const toggleSector = (s) => {
    const selected = new Set(filters.sectors);
    if (selected.has(s)) selected.delete(s);
    else selected.add(s);
    onChange({ ...filters, sectors: [...selected] });
  };

  const clearSectors = () => onChange({ ...filters, sectors: [] });

  return (
    <div className="w-56 shrink-0 space-y-2">
      {/* Sector Filter */}
      <div className="fs-panel">
        <div
          className="fs-panel-header flex items-center justify-between cursor-pointer"
          onClick={() => setSectorOpen(!sectorOpen)}
        >
          <span>Sector</span>
          <div className="flex items-center gap-1">
            {filters.sectors.length > 0 && (
              <button
                className="text-[#adb5bd] hover:text-[#495057]"
                onClick={e => { e.stopPropagation(); clearSectors(); }}
              >
                <X size={11} />
              </button>
            )}
            {sectorOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </div>
        </div>
        {sectorOpen && (
          <div className="p-2 max-h-52 overflow-y-auto">
            {sectors.length === 0 && (
              <p className="text-[#adb5bd] text-xs p-2">No sector data</p>
            )}
            {sectors.map(s => (
              <label key={s} className="flex items-center gap-2 px-1 py-1 hover:bg-[#f8f9fa] cursor-pointer rounded-sm">
                <input
                  type="checkbox"
                  checked={filters.sectors.includes(s)}
                  onChange={() => toggleSector(s)}
                  className="w-3 h-3 accent-[#1c6ea4]"
                />
                <span className="text-xs text-[#495057] truncate" title={s}>{s}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Score Filters */}
      <div className="fs-panel">
        <div
          className="fs-panel-header flex items-center justify-between cursor-pointer"
          onClick={() => setScoresOpen(!scoresOpen)}
        >
          <span>Score Filters</span>
          {scoresOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </div>
        {scoresOpen && (
          <div className="p-3 space-y-4">
            <SliderFilter
              label="Quality Score ≥"
              value={filters.minQuality}
              onChange={v => onChange({ ...filters, minQuality: v })}
            />
            <SliderFilter
              label="Growth Score ≥"
              value={filters.minGrowth}
              onChange={v => onChange({ ...filters, minGrowth: v })}
            />
            <SliderFilter
              label="Moat Score ≥"
              value={filters.minMoat}
              onChange={v => onChange({ ...filters, minMoat: v })}
            />
            <SliderFilter
              label="Fragility Score ≤"
              value={filters.maxFragility}
              onChange={v => onChange({ ...filters, maxFragility: v })}
              max={100}
              invert
            />
            {hasMktCap && (
              <div>
                <label className="fs-label">Mkt Cap Min (B)</label>
                <input
                  type="range"
                  min={minMkt}
                  max={maxMkt}
                  step={(maxMkt - minMkt) / 100}
                  value={filters.minMktCap ?? minMkt}
                  onChange={e => onChange({ ...filters, minMktCap: parseFloat(e.target.value) })}
                  className="w-full accent-[#1c6ea4]"
                />
                <div className="flex justify-between text-[10px] text-[#868e96] mt-0.5">
                  <span>{fmtMktCap(filters.minMktCap ?? minMkt)}</span>
                  <span>{fmtMktCap(maxMkt)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toggle Views */}
      <div className="fs-panel">
        <div
          className="fs-panel-header flex items-center justify-between cursor-pointer"
          onClick={() => setTogglesOpen(!togglesOpen)}
        >
          <span>Quick Filters</span>
          {togglesOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </div>
        {togglesOpen && (
          <div className="p-2 space-y-1">
            <ToggleRow
              label="Top-Quartile Quality"
              checked={filters.topQuartileQuality}
              onChange={v => onChange({ ...filters, topQuartileQuality: v })}
            />
            <ToggleRow
              label="Expanding Moats Only"
              checked={filters.expandingMoats}
              onChange={v => onChange({ ...filters, expandingMoats: v })}
            />
            <ToggleRow
              label="Highlight High Fragility"
              checked={filters.highlightFragility}
              onChange={v => onChange({ ...filters, highlightFragility: v })}
              accent="red"
            />
          </div>
        )}
      </div>

      {/* Reset */}
      <button
        className="fs-btn fs-btn-secondary w-full text-center"
        onClick={() => onChange(defaultFilters())}
      >
        Reset Filters
      </button>
    </div>
  );
}

function SliderFilter({ label, value, onChange, max = 100, invert = false }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="fs-label mb-0">{label}</label>
        <span className="text-[10px] font-mono text-[#1c6ea4] font-semibold">{Math.round(value)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-[#1c6ea4]"
      />
    </div>
  );
}

function ToggleRow({ label, checked, onChange, accent = 'blue' }) {
  const accentColor = accent === 'red' ? '#b02a30' : '#1c6ea4';
  return (
    <label className="flex items-center gap-2 px-1 py-1.5 hover:bg-[#f8f9fa] cursor-pointer rounded-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-3 h-3"
        style={{ accentColor }}
      />
      <span className="text-xs text-[#495057]">{label}</span>
    </label>
  );
}

function fmtMktCap(v) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}T`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}B`;
  return `$${Math.round(v)}M`;
}

export function defaultFilters() {
  return {
    sectors: [],
    minQuality: 0,
    minGrowth: 0,
    minMoat: 0,
    maxFragility: 100,
    minMktCap: null,
    topQuartileQuality: false,
    expandingMoats: false,
    highlightFragility: false,
  };
}

export function applyFilters(data, filters) {
  const q75 = data.length > 0
    ? [...data].sort((a, b) => a.qualityScore - b.qualityScore)[Math.floor(data.length * 0.75)]?.qualityScore ?? 0
    : 0;

  return data.filter(row => {
    if (filters.sectors.length > 0 && !filters.sectors.includes(row.Sector)) return false;
    if (row.qualityScore < filters.minQuality) return false;
    if (row.growthScore < filters.minGrowth) return false;
    if (row.moatScore < filters.minMoat) return false;
    if (row.fragilityScore > filters.maxFragility) return false;
    if (filters.topQuartileQuality && row.qualityScore < q75) return false;
    if (filters.expandingMoats && row.moatLabel !== 'Expanding') return false;
    if (filters.minMktCap !== null && !isNaN(row.Market_Cap) && row.Market_Cap < filters.minMktCap) return false;
    return true;
  });
}
