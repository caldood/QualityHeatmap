import { useState, useMemo } from 'react';
import { RefreshCw, Upload, BarChart2, Table, TrendingUp, Info } from 'lucide-react';
import FileUpload from './components/FileUpload';
import QuadrantChart from './components/QuadrantChart';
import DataGrid from './components/DataGrid';
import AnalyticsSummary from './components/AnalyticsSummary';
import OverviewPanel from './components/OverviewPanel';
import FilterPanel, { defaultFilters, applyFilters } from './components/FilterPanel';
import { processData } from './utils/scoring';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart2 },
  { id: 'quadrant', label: 'Quadrant Analysis', icon: TrendingUp },
  { id: 'table', label: 'Data Grid', icon: Table },
  { id: 'analytics', label: 'Analytics', icon: Info },
];

export default function App() {
  const [rawData, setRawData] = useState(null);
  const [scoredData, setScoredData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [filters, setFilters] = useState(defaultFilters());

  const handleDataReady = (data) => {
    const processed = processData(data);
    setScoredData(processed);
    setRawData(data);
    setFilters(defaultFilters());
    setTab('overview');
  };

  const filteredData = useMemo(() => {
    if (!scoredData) return [];
    return applyFilters(scoredData, filters);
  }, [scoredData, filters]);

  const handleReset = () => {
    setScoredData(null);
    setRawData(null);
    setFilters(defaultFilters());
  };

  if (!scoredData) {
    return <FileUpload onDataReady={handleDataReady} />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#f8f9fa' }}>
      {/* Top Bar */}
      <header style={{
        background: '#ffffff',
        borderBottom: '2px solid #1c6ea4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 48,
        zIndex: 10,
        flexShrink: 0,
      }}>
        <div className="flex items-center gap-3">
          <div style={{ width: 3, height: 22, background: '#1c6ea4', borderRadius: 1 }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#212529', letterSpacing: '-0.01em' }}>
            Quality vs Growth Analytics
          </span>
          <span style={{
            fontSize: 10,
            background: '#e8f4fd',
            color: '#1c6ea4',
            padding: '2px 6px',
            borderRadius: 2,
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            {scoredData.length} Names
          </span>
          {filteredData.length !== scoredData.length && (
            <span style={{
              fontSize: 10,
              background: '#fff3bf',
              color: '#7a5200',
              padding: '2px 6px',
              borderRadius: 2,
              fontWeight: 600,
            }}>
              {filteredData.length} Filtered
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="fs-btn fs-btn-secondary flex items-center gap-1.5"
            onClick={handleReset}
          >
            <Upload size={11} /> Load New File
          </button>
          <button
            className="fs-btn fs-btn-secondary flex items-center gap-1.5"
            onClick={() => {
              const processed = processData(rawData);
              setScoredData(processed);
            }}
            title="Recalculate scores"
          >
            <RefreshCw size={11} /> Recalculate
          </button>
        </div>
      </header>

      {/* Tab Nav */}
      <div className="tab-nav" style={{ flexShrink: 0 }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`tab-item flex items-center gap-1.5 ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Filter Panel */}
        <div style={{
          width: 224,
          flexShrink: 0,
          borderRight: '1px solid #dee2e6',
          background: '#ffffff',
          overflowY: 'auto',
          padding: 8,
        }}>
          <FilterPanel
            data={scoredData}
            filters={filters}
            onChange={setFilters}
          />
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {tab === 'overview' && <OverviewPanel data={filteredData} />}
          {tab === 'quadrant' && <QuadrantChart data={filteredData} filters={filters} />}
          {tab === 'table' && <DataGrid data={filteredData} />}
          {tab === 'analytics' && <AnalyticsSummary data={filteredData} />}
        </div>
      </div>

      {/* Status Bar */}
      <div style={{
        background: '#f1f3f5',
        borderTop: '1px solid #dee2e6',
        padding: '3px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div className="flex gap-4">
          <StatusItem label="Universe" value={`${scoredData.length} securities`} />
          <StatusItem label="Filtered" value={`${filteredData.length} names`} />
          <StatusItem label="Active Filters" value={countActiveFilters(filters)} />
        </div>
        <span style={{ fontSize: 10, color: '#adb5bd' }}>
          Quality vs Growth Analytics Dashboard — Scores percentile-ranked within uploaded universe
        </span>
      </div>
    </div>
  );
}

function StatusItem({ label, value }) {
  return (
    <span style={{ fontSize: 10, color: '#868e96' }}>
      <span style={{ color: '#495057', fontWeight: 500 }}>{label}:</span> {value}
    </span>
  );
}

function countActiveFilters(f) {
  let n = 0;
  if (f.sectors.length > 0) n++;
  if (f.minQuality > 0) n++;
  if (f.minGrowth > 0) n++;
  if (f.minMoat > 0) n++;
  if (f.maxFragility < 100) n++;
  if (f.topQuartileQuality) n++;
  if (f.expandingMoats) n++;
  if (f.highlightFragility) n++;
  if (f.minMktCap !== null) n++;
  return n === 0 ? 'None' : `${n} active`;
}
