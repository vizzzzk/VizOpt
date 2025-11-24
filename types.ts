
export type TradeType = 'BUY' | 'SELL';
export type OptionType = 'CE' | 'PE';
export type PositionStatus = 'OPEN' | 'CLOSED';

export interface ChargesBreakdown {
  brokerage: number;
  stt: number;
  exchangeTxn: number;
  stampDuty: number;
  sebi: number;
  ipft: number;
  gst: number;
  total: number;
}

export interface Position {
  tradeId: number;
  tradeType: TradeType;
  strike: number;
  optionType: OptionType;
  quantity: number;
  lots: number;
  entryPrice: number;
  entryTime: string;
  expiry: string;
  status: PositionStatus;
  currentLtp?: number; // For real-time tracking
  exitPrice?: number;
  exitTime?: string;
  
  // Financials
  capitalInvested: number; // Margin blocked (Sell) or Premium paid (Buy)
  entryCharges: ChargesBreakdown;
  exitCharges?: ChargesBreakdown;
  grossPnl?: number;
  totalCharges?: number; // Sum of entry + exit charges
  netPnl?: number; // Gross - Total Charges
  roi?: number; // Return on Investment %
}

export interface OptionData {
  strike: number;
  optionType: OptionType;
  delta: number;
  iv: number;
  ltp: number;
  pop: number;
  liquidity: {
    score: number;
    grade: string;
    volume: number;
    oi: number;
  };
}

export interface QualifiedStrike {
  strike: number;
  optionType: OptionType;
  delta: number;
  ltp: number;
  oi: number;
  pcr: number; // Strike specific PCR
  iv: number;
  liquidityScore: number;
}

export interface MarketAnalysis {
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  weightedPcr: number;
  pcrOi: number;
  pcrVolume: number;
  maxPain: number;
  maxPainScore: number; // 0-100
  indiaVix: number;
  expiryIv: number;
  expiryIvScore: number; // 0-100
  vizSignal: {
      score: number; // 0-100
      rating: 'Good' | 'Risky';
      recommendation: string;
      breakdown: {
          wpcrScore: number;
          wallScore: number;
          vixScore: number;
      }
  };
  highOiStrikes: {
    ce: { strike: number; oi: number };
    pe: { strike: number; oi: number };
  };
  qualifiedStrikes: {
    ce: QualifiedStrike[];
    pe: QualifiedStrike[];
  };
  topPicks: {
    ce: QualifiedStrike | null;
    pe: QualifiedStrike | null;
  };
}

export interface PortfolioSummary {
  balance: number;
  totalPnl: number; // Net PnL
  realizedPnl: number;
  unrealizedPnl: number;
  avgPnlPerTrade: number; // Realized PnL / Closed Trades
  openPositionsCount: number;
  closedTradesCount: number;
  winTrades: number;
  lossTrades: number;
  winRate: number;
  // Added fields
  portfolioValue: number;
  capitalUsed: number;
  capitalAvailable: number;
  totalRoi?: number;
}

export interface ExpiryDate {
  date: string;
  label: string;
  dte?: number;
}

export interface PortfolioHistoryPoint {
  timestamp: number;
  balance: number;
  totalPnl: number;
  realizedPnl?: number;
  unrealizedPnl?: number;
  openPositionsCount: number;
  winRate: number;
  // Added fields
  portfolioValue: number;
  capitalUsed: number;
  capitalAvailable: number;
}
