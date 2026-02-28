import { useState, useRef, useEffect, useCallback } from 'react';
import { median, scoreToColor, moatCssClass } from '../utils/scoring';

const PADDING = { top: 40, right: 40, bottom: 60, left: 60 };
const FONT = "'Inter', -apple-system, sans-serif";

export default function QuadrantChart({ data, filters }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: 560 });
  const [tooltip, setTooltip] = useState(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [panning, setPanning] = useState(null);

  const medQ = median(data.map(r => r.qualityScore));
  const medG = median(data.map(r => r.growthScore));
  const hasMktCap = data.some(r => !isNaN(r.Market_Cap) && r.Market_Cap > 0);
  const maxMktCap = hasMktCap ? Math.max(...data.map(r => r.Market_Cap).filter(v => !isNaN(v) && v > 0)) : 1;

  // Highlighted set for fragility
  const highlightFragility = filters?.highlightFragility ?? false;

  // Map score (0–100) to canvas coords
  const toX = useCallback((v, w) => {
    const inner = w - PADDING.left - PADDING.right;
    return PADDING.left + (v / 100) * inner;
  }, []);

  const toY = useCallback((v, h) => {
    const inner = h - PADDING.top - PADDING.bottom;
    return PADDING.top + (1 - v / 100) * inner;
  }, []);

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setDims({ w: width, h: Math.max(480, width * 0.62) });
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { w, h } = dims;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    // Apply transform
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    // Background quadrant shading
    const mx = toX(medG, w);
    const my = toY(medQ, h);
    const innerW = w - PADDING.left - PADDING.right;
    const innerH = h - PADDING.top - PADDING.bottom;
    const x0 = PADDING.left;
    const y0 = PADDING.top;

    const quadAlpha = 0.018;
    // Top-right: slight warm
    ctx.fillStyle = `rgba(180,200,150,${quadAlpha})`;
    ctx.fillRect(mx, y0, x0 + innerW - mx, my - y0);
    // Top-left: slight cool
    ctx.fillStyle = `rgba(100,160,200,${quadAlpha})`;
    ctx.fillRect(x0, y0, mx - x0, my - y0);
    // Bottom-right: slight orange
    ctx.fillStyle = `rgba(220,180,100,${quadAlpha})`;
    ctx.fillRect(mx, my, x0 + innerW - mx, y0 + innerH - my);
    // Bottom-left: gray
    ctx.fillStyle = `rgba(160,160,160,${quadAlpha})`;
    ctx.fillRect(x0, my, mx - x0, y0 + innerH - my);

    // Grid lines
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const gx = toX(i * 10, w);
      const gy = toY(i * 10, h);
      ctx.beginPath(); ctx.moveTo(gx, PADDING.top); ctx.lineTo(gx, h - PADDING.bottom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PADDING.left, gy); ctx.lineTo(w - PADDING.right, gy); ctx.stroke();
    }

    // Median lines
    ctx.strokeStyle = '#adb5bd';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(mx, PADDING.top); ctx.lineTo(mx, h - PADDING.bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PADDING.left, my); ctx.lineTo(w - PADDING.right, my); ctx.stroke();
    ctx.setLineDash([]);

    // Axes
    ctx.strokeStyle = '#868e96';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(PADDING.left, PADDING.top); ctx.lineTo(PADDING.left, h - PADDING.bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PADDING.left, h - PADDING.bottom); ctx.lineTo(w - PADDING.right, h - PADDING.bottom); ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#495057';
    ctx.font = `500 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('Growth Score →', w / 2, h - 10);
    ctx.save();
    ctx.translate(14, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Quality Score →', 0, 0);
    ctx.restore();

    // Tick labels
    ctx.fillStyle = '#868e96';
    ctx.font = `10px ${FONT}`;
    ctx.textAlign = 'center';
    for (let i = 0; i <= 10; i += 2) {
      const v = i * 10;
      ctx.fillText(v, toX(v, w), h - PADDING.bottom + 16);
      ctx.textAlign = 'right';
      ctx.fillText(v, PADDING.left - 8, toY(v, h) + 4);
      ctx.textAlign = 'center';
    }

    // Quadrant labels
    ctx.font = `600 10px ${FONT}`;
    ctx.fillStyle = 'rgba(73, 80, 87, 0.55)';
    ctx.textAlign = 'center';
    const labelPad = 14;
    const qLabelX1 = (PADDING.left + mx) / 2;
    const qLabelX2 = (mx + w - PADDING.right) / 2;
    const qLabelY1 = (PADDING.top + my) / 2;
    const qLabelY2 = (my + h - PADDING.bottom) / 2;
    ctx.fillText('HIGH QUALITY / HIGH GROWTH', qLabelX2, qLabelY1 + labelPad);
    ctx.fillText('DEFENSIVE COMPOUNDERS', qLabelX1, qLabelY1 + labelPad);
    ctx.fillText('HIGH GROWTH / LOWER QUALITY', qLabelX2, qLabelY2 + labelPad);
    ctx.fillText('LOWER QUALITY / LOWER GROWTH', qLabelX1, qLabelY2 + labelPad);

    // Draw bubbles
    data.forEach(row => {
      const x = toX(row.growthScore, w);
      const y = toY(row.qualityScore, h);
      const isHighFragility = row.fragilityScore >= 65;

      let r;
      if (hasMktCap && !isNaN(row.Market_Cap) && row.Market_Cap > 0) {
        r = 4 + (Math.sqrt(row.Market_Cap / maxMktCap)) * 14;
      } else {
        r = 6;
      }

      const color = scoreToColor(row.moatScore);

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);

      if (highlightFragility && isHighFragility) {
        ctx.fillStyle = 'rgba(176, 42, 48, 0.25)';
        ctx.strokeStyle = '#b02a30';
        ctx.lineWidth = 1.5;
      } else {
        ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', ', 0.72)');
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
      }

      ctx.fill();
      ctx.stroke();

      // Ticker label if large enough
      if (r >= 9 || data.length <= 30) {
        ctx.fillStyle = '#212529';
        ctx.font = `600 9px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(row.Ticker, x, y - r - 3);
      }
    });

    ctx.restore();

    // Axis border
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;
    ctx.strokeRect(PADDING.left, PADDING.top, w - PADDING.left - PADDING.right, h - PADDING.top - PADDING.bottom);

  }, [data, dims, transform, toX, toY, medQ, medG, hasMktCap, maxMktCap, highlightFragility]);

  // Tooltip hit detection
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - transform.x) / transform.k;
    const my = (e.clientY - rect.top - transform.y) / transform.k;
    const { w, h } = dims;

    let found = null;
    for (const row of data) {
      const cx = toX(row.growthScore, w);
      const cy = toY(row.qualityScore, h);
      const hasMC = hasMktCap && !isNaN(row.Market_Cap) && row.Market_Cap > 0;
      const r = hasMC ? 4 + (Math.sqrt(row.Market_Cap / maxMktCap)) * 14 : 6;
      const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
      if (dist <= r + 3) { found = row; break; }
    }

    if (found) {
      setTooltip({
        row: found,
        x: e.clientX - rect.left + 16,
        y: e.clientY - rect.top - 10,
      });
    } else {
      if (!panning) setTooltip(null);
    }
  }, [data, dims, toX, toY, hasMktCap, maxMktCap, transform, panning]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.85 : 1.18;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setTransform(prev => {
      const k = Math.min(8, Math.max(0.5, prev.k * delta));
      const x = mx - (mx - prev.x) * (k / prev.k);
      const y = my - (my - prev.y) * (k / prev.k);
      return { k, x, y };
    });
  }, []);

  const handleMouseDown = useCallback((e) => {
    setPanning({ startX: e.clientX - transform.x, startY: e.clientY - transform.y });
  }, [transform]);

  const handleMouseUpMove = useCallback((e) => {
    if (panning) {
      setTransform(prev => ({ ...prev, x: e.clientX - panning.startX, y: e.clientY - panning.startY }));
    }
  }, [panning]);

  const handleMouseUp = useCallback(() => setPanning(null), []);

  return (
    <div className="fs-panel">
      <div className="fs-panel-header flex items-center justify-between">
        <span>Quadrant Analysis — Quality vs Growth</span>
        <div className="flex items-center gap-4 text-[10px] text-[#868e96]">
          <span>Bubble color: Moat Score</span>
          {hasMktCap && <span>Bubble size: Market Cap</span>}
          <span>Dashed lines: universe medians</span>
          <button
            className="fs-btn fs-btn-secondary text-[10px] px-2 py-0.5"
            onClick={() => setTransform({ x: 0, y: 0, k: 1 })}
          >
            Reset Zoom
          </button>
        </div>
      </div>
      <div className="p-3">
        {/* Color Legend */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-[#868e96]">Moat Score:</span>
          <div className="flex items-center gap-0.5">
            {[0, 20, 40, 60, 80, 100].map(v => (
              <div
                key={v}
                style={{ width: 24, height: 10, background: scoreToColor(v) }}
                title={`Score ${v}`}
              />
            ))}
          </div>
          <span className="text-[10px] text-[#868e96]">Low → High</span>
        </div>
        <div
          ref={containerRef}
          style={{ position: 'relative', width: '100%', cursor: panning ? 'grabbing' : 'crosshair' }}
        >
          <canvas
            ref={canvasRef}
            onMouseMove={e => { handleMouseMove(e); handleMouseUpMove(e); }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { setTooltip(null); setPanning(null); }}
            onWheel={handleWheel}
            style={{ display: 'block', width: '100%' }}
          />
          {tooltip && (
            <div
              className="pointer-events-none absolute z-50"
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              <div style={{
                background: '#1a1d23',
                color: '#e9ecef',
                border: '1px solid #343a40',
                borderRadius: 3,
                padding: '10px 14px',
                fontSize: 11,
                lineHeight: 1.7,
                minWidth: 210,
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'monospace', marginBottom: 6, borderBottom: '1px solid #343a40', paddingBottom: 6 }}>
                  {tooltip.row.Ticker}
                  {tooltip.row.Sector !== 'Unknown' && (
                    <span style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 400, color: '#868e96', marginLeft: 8 }}>
                      {tooltip.row.Sector}
                    </span>
                  )}
                </div>
                <span className={`moat-badge ${moatCssClass(tooltip.row.moatLabel)}`} style={{ display: 'inline-block', marginBottom: 6 }}>
                  {tooltip.row.moatLabel}
                </span>
                {[
                  ['Quality Score', tooltip.row.qualityScore?.toFixed(1)],
                  ['Growth Score', tooltip.row.growthScore?.toFixed(1)],
                  ['Defensive Score', tooltip.row.defensiveScore?.toFixed(1)],
                  ['Fragility Score', tooltip.row.fragilityScore?.toFixed(1)],
                  ['Moat Score', tooltip.row.moatScore?.toFixed(1)],
                  ['ROIC', `${tooltip.row.ROIC?.toFixed(1)}%`],
                  ['Rev. Growth', `${tooltip.row.Revenue_Growth?.toFixed(1)}%`],
                ].map(([lbl, val]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ color: '#868e96' }}>{lbl}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 500, color: '#e9ecef' }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
