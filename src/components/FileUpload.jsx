import { useState, useRef, useCallback } from 'react';
import { Upload, AlertCircle, CheckCircle, ChevronDown, ChevronUp, ArrowRight, Play } from 'lucide-react';
import { parseFile, validateColumns, applyMapping, REQUIRED_COLUMNS, OPTIONAL_COLUMNS } from '../utils/fileParser';
import { generateSampleData } from '../utils/sampleData';

export default function FileUpload({ onDataReady }) {
  const handleLoadDemo = () => {
    const data = generateSampleData();
    onDataReady(data);
  };
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [step, setStep] = useState('upload'); // upload | map | preview
  const [previewRows, setPreviewRows] = useState([]);
  const [showMapping, setShowMapping] = useState(false);
  const fileRef = useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const processFile = async (f) => {
    setErrors([]);
    setWarnings([]);
    setFile(f);
    try {
      const { data, headers: hdrs } = await parseFile(f);
      setHeaders(hdrs);
      setRawData(data);

      // Auto-map if headers match exactly
      const autoMap = {};
      const normalise = s => s.toLowerCase().replace(/[\s_\-()%\/]/g, '');
      const knownAliases = {
        ticker: 'Ticker', symbol: 'Ticker',
        roic: 'ROIC', 'returnoninvestedcapital': 'ROIC',
        roictrajectory: 'ROIC_Trajectory', roicslope: 'ROIC_Trajectory', roicdelta: 'ROIC_Trajectory',
        fcfmargin: 'FCF_Margin', freecashflowmargin: 'FCF_Margin', fcf: 'FCF_Margin',
        revenuegrowth: 'Revenue_Growth', revenuegrowthraterevgrowth: 'Revenue_Growth', revgrowth: 'Revenue_Growth',
        netdebttoebitda: 'Net_Debt_to_EBITDA', netdebt: 'Net_Debt_to_EBITDA', debtcapital: 'Net_Debt_to_EBITDA', leverage: 'Net_Debt_to_EBITDA',
        beta: 'Beta',
        marketcap: 'Market_Cap', mktcap: 'Market_Cap', mcap: 'Market_Cap',
        sector: 'Sector', industry: 'Sector',
        country: 'Country',
      };

      hdrs.forEach(h => {
        const key = normalise(h);
        if (knownAliases[key]) autoMap[knownAliases[key]] = h;
      });
      setMapping(autoMap);

      const val = validateColumns(hdrs, autoMap);
      if (val.missing.length > 0) {
        setStep('map');
        setShowMapping(true);
        setErrors(val.missing.map(m => `Required column "${m}" not found — please map it below.`));
      } else {
        setWarnings(val.warnings);
        setPreviewRows(data.slice(0, 10));
        setStep('preview');
      }
    } catch (err) {
      setErrors([err.message]);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, []);

  const handleFileInput = (e) => {
    const f = e.target.files[0];
    if (f) processFile(f);
  };

  const handleMappingChange = (stdCol, origHeader) => {
    setMapping(prev => ({ ...prev, [stdCol]: origHeader === '' ? undefined : origHeader }));
  };

  const applyAndPreview = () => {
    const val = validateColumns(headers, mapping);
    if (!val.valid) {
      setErrors(val.missing.map(m => `Required column "${m}" still not mapped.`));
      return;
    }
    setErrors([]);
    setWarnings(val.warnings);
    setPreviewRows(rawData.slice(0, 10));
    setStep('preview');
  };

  const handleProcess = () => {
    const processed = applyMapping(rawData, mapping);
    onDataReady(processed);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-[#1c6ea4]"></div>
            <h1 className="text-xl font-semibold text-[#212529] tracking-tight">
              Quality vs Growth Analytics Dashboard
            </h1>
          </div>
          <p className="text-[#868e96] text-xs ml-4 pl-3">
            Institutional equity factor scoring & quadrant analysis — Upload your universe to begin
          </p>
        </div>

        {/* Upload Area */}
        {(step === 'upload' || step === 'map') && (
          <div className="fs-panel mb-4">
            <div className="fs-panel-header">Data Import</div>
            <div className="p-6">
              <div
                className={`border-2 border-dashed rounded-sm p-10 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-[#1c6ea4] bg-[#e8f4fd]'
                    : 'border-[#ced4da] bg-[#fafbfc] hover:border-[#adb5bd]'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mx-auto mb-3 text-[#adb5bd]" size={32} strokeWidth={1.5} />
                <p className="text-[#495057] font-medium text-sm mb-1">
                  Drop your universe file here or click to browse
                </p>
                <p className="text-[#868e96] text-xs">
                  Supports .xlsx and .csv — up to 2,000 tickers
                </p>
                {file && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-[#e8f4fd] px-3 py-1.5 rounded-sm">
                    <CheckCircle size={13} className="text-[#1c6ea4]" />
                    <span className="text-[#1c6ea4] text-xs font-medium">{file.name}</span>
                  </div>
                )}
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileInput} />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-px bg-[#dee2e6]" />
                <span className="text-[11px] text-[#adb5bd]">or</span>
                <div className="flex-1 h-px bg-[#dee2e6]" />
              </div>
              <div className="mt-4 flex justify-center">
                <button
                  className="fs-btn fs-btn-secondary flex items-center gap-2 px-6"
                  onClick={handleLoadDemo}
                >
                  <Play size={12} className="text-[#1c6ea4]" />
                  Load Demo Universe (80 S&amp;P 500 equities)
                </button>
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="mt-4 bg-[#fff5f5] border border-[#f1c0c0] rounded-sm p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={13} className="text-[#b02a30]" />
                    <span className="text-[#b02a30] text-xs font-semibold uppercase tracking-wide">Validation Errors</span>
                  </div>
                  {errors.map((e, i) => (
                    <p key={i} className="text-[#b02a30] text-xs pl-5">{e}</p>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="mt-4 bg-[#fffbeb] border border-[#f0d080] rounded-sm p-3">
                  {warnings.map((w, i) => (
                    <p key={i} className="text-[#7a5200] text-xs">{w}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Column Mapping */}
        {step === 'map' && headers.length > 0 && (
          <div className="fs-panel mb-4">
            <div
              className="fs-panel-header flex items-center justify-between cursor-pointer"
              onClick={() => setShowMapping(!showMapping)}
            >
              <span>Column Mapping</span>
              {showMapping ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </div>
            {showMapping && (
              <div className="p-4">
                <p className="text-[#868e96] text-xs mb-4">
                  Map your file's column headers to the required fields. Leave blank if the column doesn't exist.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].map(col => (
                    <div key={col} className="flex items-center gap-3">
                      <div className="w-40 shrink-0">
                        <span className="text-xs font-medium text-[#212529]">{col}</span>
                        {REQUIRED_COLUMNS.includes(col) && (
                          <span className="ml-1 text-[9px] text-[#b02a30] font-bold">*</span>
                        )}
                      </div>
                      <ArrowRight size={12} className="text-[#adb5bd] shrink-0" />
                      <select
                        className="fs-input text-xs"
                        value={mapping[col] || ''}
                        onChange={e => handleMappingChange(col, e.target.value)}
                      >
                        <option value="">— Not mapped —</option>
                        {headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="fs-btn fs-btn-primary" onClick={applyAndPreview}>
                    Apply Mapping & Preview
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {step === 'preview' && rawData && (
          <div className="fs-panel mb-4">
            <div className="fs-panel-header flex items-center justify-between">
              <span>Data Preview — First 10 Rows ({rawData.length} total)</span>
              <div className="flex gap-2">
                <button className="fs-btn fs-btn-secondary" onClick={() => setStep('map')}>
                  Edit Mapping
                </button>
                <button className="fs-btn fs-btn-primary" onClick={handleProcess}>
                  Process Universe →
                </button>
              </div>
            </div>
            <div className="overflow-x-auto" style={{ maxHeight: 320 }}>
              <table className="fs-table">
                <thead>
                  <tr>
                    {Object.keys(previewRows[0] || {}).map(col => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((val, j) => (
                        <td key={j}>{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {warnings.length > 0 && (
              <div className="px-4 py-2 bg-[#fffbeb] border-t border-[#f0d080]">
                {warnings.map((w, i) => (
                  <p key={i} className="text-[#7a5200] text-xs">{w}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scoring Framework */}
        <ScoringFramework />
      </div>
    </div>
  );
}

function ScoringFramework() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fs-panel">
      <div
        className="fs-panel-header flex items-center justify-between cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <span>Scoring Framework Methodology</span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </div>
      {open && (
        <div className="p-4 text-xs text-[#495057] space-y-3">
          <p className="font-semibold text-[#212529]">All metrics are converted to universe percentile ranks (0–100 scale) before weighting.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold text-[#212529] mb-1">Quality Score</p>
              <p>ROIC percentile ×40% + FCF Margin ×30% + Low Leverage ×20% + Low Beta ×10%</p>
            </div>
            <div>
              <p className="font-semibold text-[#212529] mb-1">Growth Score</p>
              <p>Revenue Growth ×70% + ROIC Trajectory ×30%</p>
            </div>
            <div>
              <p className="font-semibold text-[#212529] mb-1">Defensive Score</p>
              <p>Low Beta ×40% + FCF Margin ×30% + Low Leverage ×30%</p>
            </div>
            <div>
              <p className="font-semibold text-[#212529] mb-1">Fragility Score (risk)</p>
              <p>High Beta ×30% + High Leverage ×30% + Low FCF Margin ×20% + Neg. ROIC Trajectory ×20%</p>
            </div>
            <div>
              <p className="font-semibold text-[#212529] mb-1">Moat Trajectory Score</p>
              <p>ROIC Trajectory ×60% + Current ROIC ×40%</p>
              <p className="mt-1 text-[#868e96]">Expanding: Rising+High ROIC | Emerging: Rising+Low ROIC | Peak Risk: Falling+High ROIC | Deteriorating: Falling+Low ROIC</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
