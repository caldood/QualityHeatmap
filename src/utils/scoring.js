/**
 * Factor Scoring Engine
 * Converts raw financial metrics to percentile-based factor scores (0–100)
 */

/**
 * Calculate percentile rank of a value within an array (higher = better unless inverted)
 */
export function percentileRank(arr, value) {
  if (!arr || arr.length === 0 || value === null || value === undefined || isNaN(value)) return 50;
  const valid = arr.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (valid.length === 0) return 50;
  const below = valid.filter(v => v < value).length;
  const equal = valid.filter(v => v === value).length;
  return ((below + 0.5 * equal) / valid.length) * 100;
}

/**
 * Convert all raw metrics to percentile ranks for each ticker
 */
export function computePercentiles(data) {
  const fields = ['ROIC', 'ROIC_Trajectory', 'FCF_Margin', 'Revenue_Growth', 'Net_Debt_to_EBITDA', 'Beta'];
  const arrays = {};

  fields.forEach(f => {
    arrays[f] = data.map(r => parseFloat(r[f])).filter(v => !isNaN(v));
  });

  return data.map(row => {
    const p = {};
    fields.forEach(f => {
      const val = parseFloat(row[f]);
      p[`${f}_pct`] = isNaN(val) ? 50 : percentileRank(arrays[f], val);
    });
    // Inverted percentiles (lower raw = higher percentile rank)
    p.LowLeverage_pct = 100 - p.Net_Debt_to_EBITDA_pct;
    p.LowBeta_pct = 100 - p.Beta_pct;
    p.NegROIC_Traj_pct = 100 - p.ROIC_Trajectory_pct;
    return { ...row, ...p };
  });
}

/**
 * Compute all factor scores for a row that already has percentile fields
 */
export function computeScores(row) {
  // A. Quality Score
  const qualityScore =
    (row.ROIC_pct * 0.40) +
    (row.FCF_Margin_pct * 0.30) +
    (row.LowLeverage_pct * 0.20) +
    (row.LowBeta_pct * 0.10);

  // B. Growth Score
  const growthScore =
    (row.Revenue_Growth_pct * 0.70) +
    (row.ROIC_Trajectory_pct * 0.30);

  // C. Defensive Score
  const defensiveScore =
    (row.LowBeta_pct * 0.40) +
    (row.FCF_Margin_pct * 0.30) +
    (row.LowLeverage_pct * 0.30);

  // D. Fragility Score (risk indicator)
  const fragilityScore =
    (row.Beta_pct * 0.30) +
    (row.Net_Debt_to_EBITDA_pct * 0.30) +
    ((100 - row.FCF_Margin_pct) * 0.20) +
    (row.NegROIC_Traj_pct * 0.20);

  // E. Moat Trajectory Score
  const moatScore =
    (row.ROIC_Trajectory_pct * 0.60) +
    (row.ROIC_pct * 0.40);

  return {
    qualityScore: Math.round(qualityScore * 10) / 10,
    growthScore: Math.round(growthScore * 10) / 10,
    defensiveScore: Math.round(defensiveScore * 10) / 10,
    fragilityScore: Math.round(fragilityScore * 10) / 10,
    moatScore: Math.round(moatScore * 10) / 10,
  };
}

/**
 * Classify moat trajectory based on ROIC level and trajectory
 */
export function getMoatLabel(row) {
  const highROIC = row.ROIC_pct >= 50;
  const risingTraj = row.ROIC_Trajectory_pct >= 50;

  if (risingTraj && highROIC) return 'Expanding';
  if (risingTraj && !highROIC) return 'Emerging';
  if (!risingTraj && highROIC) return 'Peak Risk';
  return 'Deteriorating';
}

/**
 * Full pipeline: raw data → scored data
 */
export function processData(rawData) {
  const withPercentiles = computePercentiles(rawData);
  return withPercentiles.map(row => {
    const scores = computeScores(row);
    const moatLabel = getMoatLabel(row);
    return { ...row, ...scores, moatLabel };
  });
}

/**
 * Get quadrant label based on quality and growth scores relative to medians
 */
export function getQuadrantLabel(qualityScore, growthScore, medianQuality, medianGrowth) {
  const highQ = qualityScore >= medianQuality;
  const highG = growthScore >= medianGrowth;
  if (highQ && highG) return 'High Quality / High Growth';
  if (highQ && !highG) return 'Defensive Compounders';
  if (!highQ && highG) return 'High Growth / Lower Quality';
  return 'Lower Quality / Lower Growth';
}

/**
 * Compute median of array
 */
export function median(arr) {
  const valid = arr.filter(v => v !== null && v !== undefined && !isNaN(v)).sort((a, b) => a - b);
  if (valid.length === 0) return 0;
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 !== 0 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2;
}

/**
 * Compute Pearson correlation between two arrays
 */
export function pearsonCorrelation(x, y) {
  if (x.length !== y.length || x.length === 0) return 0;
  const n = x.length;
  const meanX = x.reduce((s, v) => s + v, 0) / n;
  const meanY = y.reduce((s, v) => s + v, 0) / n;
  const num = x.reduce((s, v, i) => s + (v - meanX) * (y[i] - meanY), 0);
  const den = Math.sqrt(
    x.reduce((s, v) => s + (v - meanX) ** 2, 0) *
    y.reduce((s, v) => s + (v - meanY) ** 2, 0)
  );
  return den === 0 ? 0 : num / den;
}

/**
 * Z-score normalization
 */
export function zScore(arr, value) {
  const valid = arr.filter(v => !isNaN(v));
  const mean = valid.reduce((s, v) => s + v, 0) / valid.length;
  const std = Math.sqrt(valid.reduce((s, v) => s + (v - mean) ** 2, 0) / valid.length);
  return std === 0 ? 0 : (value - mean) / std;
}

/**
 * Build histogram bins for a field
 */
export function buildHistogram(values, bins = 10) {
  const valid = values.filter(v => !isNaN(v));
  if (valid.length === 0) return [];
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const binSize = (max - min) / bins || 1;
  const result = Array.from({ length: bins }, (_, i) => ({
    label: `${Math.round(min + i * binSize)}-${Math.round(min + (i + 1) * binSize)}`,
    min: min + i * binSize,
    max: min + (i + 1) * binSize,
    count: 0,
  }));
  valid.forEach(v => {
    const idx = Math.min(Math.floor((v - min) / binSize), bins - 1);
    result[idx].count++;
  });
  return result;
}

/**
 * Score color interpolation (cool → warm professional palette)
 */
export function scoreToColor(score) {
  // 0 = cool blue-gray, 50 = neutral teal, 100 = warm gold
  const stops = [
    { t: 0, r: 100, g: 130, b: 165 },   // cool blue
    { t: 0.35, r: 70, g: 140, b: 145 }, // teal
    { t: 0.65, r: 95, g: 155, b: 90 },  // olive green
    { t: 1, r: 185, g: 130, b: 40 },    // warm gold
  ];
  const t = Math.max(0, Math.min(100, score)) / 100;
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      lo = stops[i]; hi = stops[i + 1]; break;
    }
  }
  const f = lo.t === hi.t ? 0 : (t - lo.t) / (hi.t - lo.t);
  const r = Math.round(lo.r + f * (hi.r - lo.r));
  const g = Math.round(lo.g + f * (hi.g - lo.g));
  const b = Math.round(lo.b + f * (hi.b - lo.b));
  return `rgb(${r},${g},${b})`;
}

export function fragilityClass(score) {
  if (score >= 65) return 'fragility-high';
  if (score >= 40) return 'fragility-medium';
  return 'fragility-low';
}

export function moatCssClass(label) {
  const map = {
    'Expanding': 'moat-expanding',
    'Emerging': 'moat-emerging',
    'Stable': 'moat-stable',
    'Peak Risk': 'moat-peak',
    'Deteriorating': 'moat-deteriorating',
  };
  return map[label] || 'moat-stable';
}
