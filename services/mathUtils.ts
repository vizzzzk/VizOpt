



import { OptionType, TradeType, Position, ChargesBreakdown } from "../types";
import { APP_CONFIG } from "../constants";

/**
 * Standard Normal Cumulative Distribution Function (CDF)
 */
const cumulativeNormalDistribution = (x: number): number => {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014337 * Math.exp(-x * x / 2);
  const prob = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - prob : prob;
};

/**
 * Calculates Delta using Black-Scholes
 */
export const calculateBlackScholesDelta = (
  spot: number,
  strike: number,
  dte: number,
  iv: number,
  optionType: OptionType
): number => {
  if (dte <= 0) return 0.0;
  
  const t = dte / 365.0;
  const v = iv / 100.0;
  const r = 0.10; // 10% Risk Free Rate
  
  const d1 = (Math.log(spot / strike) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
  
  let delta = 0;
  if (optionType === 'CE') {
    delta = cumulativeNormalDistribution(d1);
  } else {
    delta = cumulativeNormalDistribution(d1) - 1;
  }

  return parseFloat(Math.max(-1, Math.min(1, delta)).toFixed(4));
};

/**
 * Calculates Probability of Profit (PoP)
 */
export const calculatePoP = (
  spot: number,
  strike: number,
  ltp: number,
  iv: number,
  dte: number,
  optionType: OptionType
): number => {
  if (dte <= 0) return ltp <= 0 ? 100.0 : 0.0;

  const t = dte / 365.0;
  const v = iv / 100.0;
  const r = 0.10; 

  const d1 = (Math.log(spot / strike) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
  const d2 = d1 - v * Math.sqrt(t);
  
  // Seller Win Rate (Prob of expiring OTM)
  let probExpiringWorthless = 0;
  
  if (optionType === 'CE') {
      probExpiringWorthless = cumulativeNormalDistribution(-d2);
  } else {
      probExpiringWorthless = cumulativeNormalDistribution(d2);
  }

  return parseFloat((probExpiringWorthless * 100).toFixed(2));
};

export const calculateLiquidityScore = (volume: number, oi: number) => {
  let volumeScore = volume ? Math.min(volume / 1000, 10) : 0;
  let oiScore = oi ? Math.min(oi / 10000, 10) : 0;

  if (volume < 100) volumeScore *= 0.5;
  if (oi < 1000) oiScore *= 0.5;

  const totalScore = volumeScore + oiScore;
  let grade = "Poor";
  if (totalScore >= 15) grade = "Excellent";
  else if (totalScore >= 10) grade = "Good";
  else if (totalScore >= 5) grade = "Fair";

  return {
    score: parseFloat(totalScore.toFixed(1)),
    grade,
    volume,
    oi
  };
};

export const formatCurrency = (amount: number, decimals: number = 2) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(amount);
};

export const formatOI = (oi: number): string => {
  if (oi === undefined || oi === null) return '0';
  if (oi >= 10000000) return `${(oi / 10000000).toFixed(2)}Cr`;
  if (oi >= 100000) return `${(oi / 100000).toFixed(2)}L`;
  if (oi >= 1000) return `${(oi / 1000).toFixed(1)}K`;
  return oi.toString();
};

/**
 * Calculate accurate taxes and charges based on Indian F&O Regulations (Updated Oct 2024)
 */
export const calculateCharges = (
    price: number,
    quantity: number,
    tradeType: TradeType
): ChargesBreakdown => {
    const turnover = price * quantity;

    // 1. Brokerage: Flat ₹20 per executed order
    const brokerage = 20;

    // 2. STT: 0.1% on Sell Premium only
    const stt = tradeType === 'SELL' ? (turnover * 0.001) : 0;

    // 3. Exchange Transaction Charges (NSE): 0.03503% on premium
    const exchangeTxn = turnover * 0.0003503;

    // 4. Stamp Duty: 0.003% on Buy side only
    const stampDuty = tradeType === 'BUY' ? (turnover * 0.00003) : 0;

    // 5. SEBI Turnover Fees: ₹10 per crore (0.0001%)
    const sebi = turnover * 0.000001;

    // 6. IPFT: ₹0.50 per lakh (0.0005%) on premium
    const ipft = turnover * 0.000005;

    // 7. GST: 18% on (Brokerage + Exchange + SEBI + IPFT)
    // Note: STT and Stamp Duty are taxes, usually excluded from GST base
    const gstBase = brokerage + exchangeTxn + sebi + ipft;
    const gst = gstBase * 0.18;

    const total = brokerage + stt + exchangeTxn + stampDuty + sebi + ipft + gst;

    return {
        brokerage,
        stt,
        exchangeTxn,
        stampDuty,
        sebi,
        ipft,
        gst,
        total
    };
};

/**
 * Calculates estimated margin, charges, and breakeven for a trade ENTRY
 */
export const calculateTradeDetails = (
    price: number,
    strike: number,
    optionType: OptionType,
    tradeType: TradeType,
    lots: number
) => {
    const qty = lots * APP_CONFIG.LOT_SIZE;
    const turnover = price * qty;
    
    // Margin Calculation
    let marginRequired = 0;
    if (tradeType === 'BUY') {
        marginRequired = turnover; // Premium only
    } else {
        // Sell Margin Dynamic Estimation
        // Formula: Approx (7% of Notional Contract Value) + (Premium * Qty)
        // Notional = Strike * Qty
        // This varies the margin based on the strike price and the premium received.
        const notionalValue = strike * qty;
        const baseMargin = notionalValue * 0.07; // 7% Base Span + Exposure approx
        const premiumMargin = price * qty;
        marginRequired = baseMargin + premiumMargin; 
    }

    // Calculate Entry Charges
    const charges = calculateCharges(price, qty, tradeType);

    // Breakeven
    let breakevenPrice = 0;
    if (optionType === 'CE') {
        if (tradeType === 'BUY') breakevenPrice = strike + price;
        else breakevenPrice = strike + price;
    } else {
        if (tradeType === 'BUY') breakevenPrice = strike - price;
        else breakevenPrice = strike - price;
    }

    return {
        marginRequired,
        charges,
        breakevenPrice,
        turnover
    };
};

/**
 * Export trades to CSV
 */
export const exportTradesToCSV = (trades: Position[]) => {
    if (trades.length === 0) return;

    // Define headers
    const headers = [
        "Trade ID", "Date", "Instrument", "Type", "Qty", 
        "Entry Price", "Exit Price", "Capital Inv.", 
        "Gross P&L", "Total Charges", "Net P&L", "Status"
    ];

    // Format rows
    const rows = trades.map(t => {
        const instrument = `NIFTY ${t.expiry} ${t.strike} ${t.optionType}`;
        const date = new Date(t.entryTime).toLocaleDateString();
        
        return [
            t.tradeId,
            date,
            instrument,
            t.tradeType,
            t.quantity,
            t.entryPrice.toFixed(2),
            t.exitPrice ? t.exitPrice.toFixed(2) : '-',
            t.capitalInvested.toFixed(2),
            t.grossPnl ? t.grossPnl.toFixed(2) : '0.00',
            t.totalCharges ? t.totalCharges.toFixed(2) : t.entryCharges.total.toFixed(2), // Approx for open
            t.netPnl ? t.netPnl.toFixed(2) : '-',
            t.status
        ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vizopt_trades_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Checks if Indian Stock Market (NSE) is open (09:15 - 15:30, Mon-Fri)
 * STRICTLY uses UTC conversion to ensure accuracy regardless of local device timezone.
 */
export const isMarketOpen = (): boolean => {
  const now = new Date();
  const utcTime = now.getTime();
  
  // IST is UTC + 5:30
  // We shift the UTC timestamp by 5.5 hours.
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(utcTime + istOffset);

  // Use getUTC methods to read the shifted time as if it were local
  const day = istTime.getUTCDay(); // 0 is Sunday, 6 is Saturday
  const hour = istTime.getUTCHours();
  const minute = istTime.getUTCMinutes();

  // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) return false;

  // Market Hours: 09:15 to 15:30
  const timeInMinutes = hour * 60 + minute;
  const marketOpen = 9 * 60 + 15;
  const marketClose = 15 * 60 + 30;

  return timeInMinutes >= marketOpen && timeInMinutes <= marketClose;
};

/**
 * Calculates the next market open date and time in a readable format.
 * STRICTLY uses UTC conversion.
 */
export const getNextMarketOpenTime = (): string => {
  const now = new Date();
  const utcTime = now.getTime();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(utcTime + istOffset);

  const day = istTime.getUTCDay(); 
  const hour = istTime.getUTCHours();
  const minute = istTime.getUTCMinutes();
  const currentMinutes = hour * 60 + minute;
  const marketCloseMinutes = 15 * 60 + 30; // 15:30

  // We will manipulate istTime to find target open, then read values.
  let targetDate = new Date(istTime);
  // Set to 09:15 of current day initially (using UTC setters because of our shift strategy)
  targetDate.setUTCHours(9, 15, 0, 0);

  if (day === 0) { 
    // Sunday -> Opens Monday (+1 day)
    targetDate.setUTCDate(targetDate.getUTCDate() + 1);
  } else if (day === 6) { 
    // Saturday -> Opens Monday (+2 days)
    targetDate.setUTCDate(targetDate.getUTCDate() + 2);
  } else if (currentMinutes > marketCloseMinutes) {
    // After Market Close on a Weekday
    if (day === 5) { 
       // Friday -> Opens Monday (+3 days)
       targetDate.setUTCDate(targetDate.getUTCDate() + 3);
    } else { 
       // Mon-Thu -> Opens Tomorrow (+1 day)
       targetDate.setUTCDate(targetDate.getUTCDate() + 1);
    }
  }
  // If weekday before 09:15, targetDate (Today 09:15) is correct.

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const tDay = days[targetDate.getUTCDay()];
  const tDate = targetDate.getUTCDate();
  const tMonth = months[targetDate.getUTCMonth()];
  const tYear = targetDate.getUTCFullYear();

  return `${tDay}, ${tDate} ${tMonth} ${tYear} at 09:15 AM IST`;
};