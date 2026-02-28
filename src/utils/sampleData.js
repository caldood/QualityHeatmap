/**
 * Generate realistic sample equity universe data for demo purposes
 */
const SECTORS = ['Technology', 'Healthcare', 'Financials', 'Consumer Staples', 'Industrials',
  'Energy', 'Materials', 'Utilities', 'Real Estate', 'Communication Services', 'Consumer Discretionary'];

const SAMPLE_TICKERS = [
  // Technology
  ['MSFT', 'Technology'], ['AAPL', 'Technology'], ['NVDA', 'Technology'], ['GOOGL', 'Technology'],
  ['META', 'Technology'], ['ORCL', 'Technology'], ['ADBE', 'Technology'], ['CRM', 'Technology'],
  ['INTC', 'Technology'], ['AMD', 'Technology'], ['AMAT', 'Technology'], ['KLAC', 'Technology'],
  ['SNPS', 'Technology'], ['CDNS', 'Technology'], ['NOW', 'Technology'],
  // Healthcare
  ['LLY', 'Healthcare'], ['UNH', 'Healthcare'], ['JNJ', 'Healthcare'], ['ABBV', 'Healthcare'],
  ['MRK', 'Healthcare'], ['TMO', 'Healthcare'], ['DHR', 'Healthcare'], ['SYK', 'Healthcare'],
  ['EW', 'Healthcare'], ['REGN', 'Healthcare'], ['BIIB', 'Healthcare'], ['VRTX', 'Healthcare'],
  // Financials
  ['JPM', 'Financials'], ['BAC', 'Financials'], ['WFC', 'Financials'], ['GS', 'Financials'],
  ['MS', 'Financials'], ['BLK', 'Financials'], ['CB', 'Financials'], ['AXP', 'Financials'],
  ['V', 'Financials'], ['MA', 'Financials'], ['SPGI', 'Financials'],
  // Consumer Staples
  ['PG', 'Consumer Staples'], ['KO', 'Consumer Staples'], ['PEP', 'Consumer Staples'],
  ['COST', 'Consumer Staples'], ['WMT', 'Consumer Staples'], ['MCD', 'Consumer Staples'],
  ['MDLZ', 'Consumer Staples'], ['CLX', 'Consumer Staples'],
  // Industrials
  ['HON', 'Industrials'], ['UPS', 'Industrials'], ['CAT', 'Industrials'], ['DE', 'Industrials'],
  ['GE', 'Industrials'], ['RTX', 'Industrials'], ['MMM', 'Industrials'], ['ETN', 'Industrials'],
  ['ITW', 'Industrials'], ['CTAS', 'Industrials'], ['FAST', 'Industrials'],
  // Energy
  ['XOM', 'Energy'], ['CVX', 'Energy'], ['COP', 'Energy'], ['SLB', 'Energy'],
  ['EOG', 'Energy'], ['PXD', 'Energy'], ['MPC', 'Energy'], ['VLO', 'Energy'],
  // Communication Services
  ['NFLX', 'Communication Services'], ['DIS', 'Communication Services'],
  ['CMCSA', 'Communication Services'], ['T', 'Communication Services'], ['VZ', 'Communication Services'],
  ['TMUS', 'Communication Services'], ['WBD', 'Communication Services'],
  // Consumer Discretionary
  ['AMZN', 'Consumer Discretionary'], ['TSLA', 'Consumer Discretionary'],
  ['HD', 'Consumer Discretionary'], ['LOW', 'Consumer Discretionary'],
  ['TJX', 'Consumer Discretionary'], ['NKE', 'Consumer Discretionary'],
  ['SBUX', 'Consumer Discretionary'], ['BKNG', 'Consumer Discretionary'],
  // Materials
  ['LIN', 'Materials'], ['APD', 'Materials'], ['ECL', 'Materials'], ['SHW', 'Materials'],
  ['NEM', 'Materials'], ['FCX', 'Materials'],
  // Utilities
  ['NEE', 'Utilities'], ['DUK', 'Utilities'], ['SO', 'Utilities'], ['AEP', 'Utilities'],
  // Real Estate
  ['PLD', 'Real Estate'], ['AMT', 'Real Estate'], ['EQIX', 'Real Estate'],
];

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function randn(r, mean = 0, std = 1) {
  // Box-Muller
  const u1 = Math.max(1e-10, r());
  const u2 = r();
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function generateSampleData(n = 80) {
  const r = rng(20240228);
  const tickers = SAMPLE_TICKERS.slice(0, Math.min(n, SAMPLE_TICKERS.length));

  return tickers.map(([ticker, sector], i) => {
    // Give each sector a characteristic profile
    const sectorProfiles = {
      'Technology': { roicBase: 22, roicStd: 18, fcfBase: 22, growBase: 18, betaBase: 1.15, levBase: 0.3 },
      'Healthcare': { roicBase: 18, roicStd: 12, fcfBase: 18, growBase: 10, betaBase: 0.80, levBase: 1.2 },
      'Financials': { roicBase: 12, roicStd: 6, fcfBase: 12, growBase: 8, betaBase: 1.10, levBase: 2.5 },
      'Consumer Staples': { roicBase: 16, roicStd: 6, fcfBase: 12, growBase: 5, betaBase: 0.60, levBase: 1.8 },
      'Industrials': { roicBase: 14, roicStd: 8, fcfBase: 11, growBase: 8, betaBase: 1.00, levBase: 1.5 },
      'Energy': { roicBase: 10, roicStd: 12, fcfBase: 10, growBase: 5, betaBase: 1.20, levBase: 2.0 },
      'Materials': { roicBase: 12, roicStd: 8, fcfBase: 10, growBase: 6, betaBase: 1.00, levBase: 1.5 },
      'Utilities': { roicBase: 7, roicStd: 3, fcfBase: 6, growBase: 3, betaBase: 0.45, levBase: 3.5 },
      'Real Estate': { roicBase: 6, roicStd: 3, fcfBase: 8, growBase: 5, betaBase: 0.75, levBase: 4.0 },
      'Communication Services': { roicBase: 14, roicStd: 12, fcfBase: 14, growBase: 8, betaBase: 0.95, levBase: 2.0 },
      'Consumer Discretionary': { roicBase: 16, roicStd: 14, fcfBase: 12, growBase: 12, betaBase: 1.20, levBase: 1.8 },
    };

    const p = sectorProfiles[sector] || sectorProfiles['Industrials'];

    const roic = Math.round(randn(r, p.roicBase, p.roicStd) * 10) / 10;
    const roicTraj = Math.round(randn(r, 0.5, 3.5) * 10) / 10;
    const fcfMargin = Math.round(randn(r, p.fcfBase, p.fcfBase * 0.5) * 10) / 10;
    const revGrowth = Math.round(randn(r, p.growBase, p.growBase * 0.7) * 10) / 10;
    const leverage = Math.round(Math.max(-1, randn(r, p.levBase, p.levBase * 0.5)) * 10) / 10;
    const beta = Math.round(Math.max(0.1, randn(r, p.betaBase, 0.25)) * 100) / 100;
    const mktCap = Math.round(Math.exp(randn(r, Math.log(50e9), 1.8)) / 1e9 * 10) / 10;

    return {
      Ticker: ticker,
      Sector: sector,
      ROIC: roic,
      ROIC_Trajectory: roicTraj,
      FCF_Margin: fcfMargin,
      Revenue_Growth: revGrowth,
      Net_Debt_to_EBITDA: leverage,
      Beta: beta,
      Market_Cap: mktCap * 1e9,
    };
  });
}

export function sampleDataAsCsv() {
  const data = generateSampleData();
  const headers = ['Ticker', 'Sector', 'ROIC', 'ROIC_Trajectory', 'FCF_Margin', 'Revenue_Growth', 'Net_Debt_to_EBITDA', 'Beta', 'Market_Cap'];
  const rows = data.map(r => headers.map(h => r[h]).join(','));
  return [headers.join(','), ...rows].join('\n');
}
