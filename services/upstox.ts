
import { UPSTOX_CONFIG } from "../constants";
import { OptionData, ExpiryDate } from "../types";
import { calculateBlackScholesDelta, calculateLiquidityScore, calculatePoP } from "./mathUtils";

// --- API Types ---
interface UpstoxTokenResponse {
  access_token: string;
  extended_token?: string;
  expires_in?: number;
  status?: string;
  message?: string;
}

interface UpstoxContractItem {
  expiry: string; // Format YYYY-MM-DD
  instrument_key: string;
  symbol: string;
}

interface UpstoxOptionItem {
  strike_price: number;
  expiry: string;
  call_options?: {
    market_data: {
      ltp: number;
      volume: number;
      oi: number;
      bid: number;
      ask: number;
    };
    option_greeks: {
      delta: number;
      gamma: number;
      theta: number;
      vega: number;
      iv: number;
    };
  };
  put_options?: {
    market_data: {
      ltp: number;
      volume: number;
      oi: number;
      bid: number;
      ask: number;
    };
    option_greeks: {
      delta: number;
      gamma: number;
      theta: number;
      vega: number;
      iv: number;
    };
  };
  underlying_spot_price: number;
}

// --- Service ---

export const getLoginUrl = () => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: UPSTOX_CONFIG.API_KEY,
    redirect_uri: UPSTOX_CONFIG.REDIRECT_URI,
    state: crypto.randomUUID()
  });
  return `${UPSTOX_CONFIG.AUTH_URL}?${params.toString()}`;
};

export const exchangeCodeForToken = async (code: string): Promise<string> => {
  const params = new URLSearchParams();
  params.append('code', code);
  params.append('client_id', UPSTOX_CONFIG.API_KEY);
  params.append('client_secret', UPSTOX_CONFIG.API_SECRET);
  params.append('redirect_uri', UPSTOX_CONFIG.REDIRECT_URI);
  params.append('grant_type', 'authorization_code');

  try {
    const response = await fetch(UPSTOX_CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params
    });

    const data: UpstoxTokenResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `API Error: ${response.status}`);
    }

    return data.access_token;
  } catch (error) {
    console.error("Token Exchange Error:", error);
    throw error;
  }
};

/**
 * Fetches India VIX value
 */
export const fetchIndiaVix = async (accessToken: string): Promise<number> => {
  try {
    const url = new URL(UPSTOX_CONFIG.LTP_URL);
    url.searchParams.append('instrument_key', UPSTOX_CONFIG.VIX_INSTRUMENT_KEY);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    const json = await response.json();
    if (json.status === 'success' && json.data) {
      // Look for the key, it might be full instrument key or symbol
      const key = Object.keys(json.data)[0];
      return json.data[key]?.last_price || 0;
    }
    return 0;
  } catch (e) {
    console.error("VIX Fetch Error:", e);
    return 0;
  }
};

/**
 * Fetches valid contract expiries from Upstox for the configured instrument.
 * This ensures we only request data for dates that actually exist.
 */
export const fetchUpstoxContractExpiries = async (accessToken: string): Promise<ExpiryDate[]> => {
  try {
    const url = new URL(UPSTOX_CONFIG.CONTRACT_URL);
    url.searchParams.append('instrument_key', UPSTOX_CONFIG.INSTRUMENT_KEY);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    const json = await response.json();
    
    if (json.status === 'error' || !json.data) {
      console.warn("Contract fetch failed, falling back to manual calculation");
      return generateManualExpiries();
    }

    // Extract unique expiry dates from the contract list
    const contracts: UpstoxContractItem[] = json.data;
    const uniqueDates = Array.from(new Set(contracts.map(c => c.expiry))).sort();
    
    // Filter out past dates just in case
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const validDates = uniqueDates.filter(d => new Date(d) >= today);

    if (validDates.length === 0) return generateManualExpiries();

    // Format them for the UI
    return validDates.slice(0, 6).map(dateStr => {
      const d = new Date(dateStr);
      const month = d.toLocaleString('default', { month: 'short' });
      const day = d.getDate();
      const year = d.getFullYear();
      const dte = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Determine if it's monthly (simplified logic: is it the last week of month?)
      const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const isMonthly = (lastDayOfMonth - day) < 7;

      return {
        date: dateStr,
        label: `${day} ${month} ${year} (${isMonthly ? 'M' : 'W'}) DTE: ${dte}`,
        dte: dte
      };
    });

  } catch (error) {
    console.error("Error fetching contract expiries:", error);
    return generateManualExpiries();
  }
};

/**
 * Fallback generator if API fails.
 * Logic updated to target TUESDAYS as requested.
 */
const generateManualExpiries = (): ExpiryDate[] => {
    const expiries: ExpiryDate[] = [];
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 2=Tue, 4=Thu
    
    // TARGET DAY: TUESDAY (2)
    const targetDay = 2; 
    
    let d = new Date(today);
    // Calculate days until next Tuesday
    let daysUntil = (targetDay + 7 - dayOfWeek) % 7;
    if (daysUntil === 0 && today.getHours() > 15) {
       daysUntil = 7; // If today is Tuesday and market closed, get next
    }
    
    d.setDate(today.getDate() + daysUntil);

    for(let i=0; i<5; i++) {
        const dateStr = d.toISOString().split('T')[0];
        const month = d.toLocaleString('default', { month: 'short' });
        const day = d.getDate();
        const year = d.getFullYear();
        
        const dte = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const isMonthly = (lastDayOfMonth - day) < 7;

        expiries.push({
            date: dateStr,
            label: `${day} ${month} ${year} (${isMonthly ? 'M' : 'W'}) DTE: ${dte}`,
            dte: dte
        });
        
        d.setDate(d.getDate() + 7);
    }
    return expiries;
};

const calculateMaxPain = (chain: OptionData[]): number => {
    const strikes = Array.from(new Set(chain.map(c => c.strike))).sort((a, b) => a - b);
    if (strikes.length === 0) return 0;

    let minLoss = Number.MAX_VALUE;
    let maxPainStrike = strikes[0];

    // For every potential expiry price (assuming it expires at one of the strikes)
    for (const expiryPrice of strikes) {
        let totalLoss = 0;

        // Calculate loss for option writers
        for (const opt of chain) {
            if (opt.optionType === 'CE') {
                 // Call writer loses if Expiry > Strike
                 // Loss = (Expiry - Strike) * OI
                 if (expiryPrice > opt.strike) {
                     totalLoss += (expiryPrice - opt.strike) * opt.liquidity.oi;
                 }
            } else {
                 // Put writer loses if Expiry < Strike
                 // Loss = (Strike - Expiry) * OI
                 if (expiryPrice < opt.strike) {
                     totalLoss += (opt.strike - expiryPrice) * opt.liquidity.oi;
                 }
            }
        }

        if (totalLoss < minLoss) {
            minLoss = totalLoss;
            maxPainStrike = expiryPrice;
        }
    }

    return maxPainStrike;
};

export const fetchUpstoxOptionChain = async (accessToken: string, expiryDate: string) => {
  try {
    const url = new URL(UPSTOX_CONFIG.CHAIN_URL);
    url.searchParams.append('instrument_key', UPSTOX_CONFIG.INSTRUMENT_KEY);
    url.searchParams.append('expiry_date', expiryDate);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    const json = await response.json();

    if (json.status === 'error' || !json.data) {
      throw new Error(json.message || "No data found for this expiry");
    }

    const rawData: UpstoxOptionItem[] = json.data;

    // 1. Get Spot Price
    const spotPrice = rawData.length > 0 ? rawData[0].underlying_spot_price : 0;

    // 2. Filter strictly by expiry
    const filteredData = rawData.filter(item => item.expiry === expiryDate);

    // 3. Calculate DTE
    const today = new Date();
    const exp = new Date(expiryDate);
    const dte = Math.max(0, Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    const chain: OptionData[] = [];

    filteredData.forEach(item => {
        const strike = item.strike_price;
        
        // Process Call
        if (item.call_options) {
            const md = item.call_options.market_data;
            const greeks = item.call_options.option_greeks;
            
            let iv = greeks?.iv || 0;
            if (iv <= 0 || iv > 200) iv = 15; 
            
            let delta = greeks?.delta;
            if (delta === undefined || delta === null) {
                delta = calculateBlackScholesDelta(spotPrice, strike, dte, iv, 'CE');
            }

            const ltp = md.ltp;
            const pop = calculatePoP(spotPrice, strike, ltp, iv, dte, 'CE');
            const liquidity = calculateLiquidityScore(md.volume, md.oi);

            chain.push({
                strike,
                optionType: 'CE',
                delta: parseFloat(delta.toFixed(4)), // 4 decimals
                iv: parseFloat(iv.toFixed(2)), // 2 decimals
                ltp,
                pop,
                liquidity
            });
        }

        // Process Put
        if (item.put_options) {
            const md = item.put_options.market_data;
            const greeks = item.put_options.option_greeks;
            
            let iv = greeks?.iv || 0;
            if (iv <= 0 || iv > 200) iv = 15;
            
            let delta = greeks?.delta;
            if (delta === undefined || delta === null) {
                delta = calculateBlackScholesDelta(spotPrice, strike, dte, iv, 'PE');
            }

            const ltp = md.ltp;
            const pop = calculatePoP(spotPrice, strike, ltp, iv, dte, 'PE');
            const liquidity = calculateLiquidityScore(md.volume, md.oi);

            chain.push({
                strike,
                optionType: 'PE',
                delta: parseFloat(delta.toFixed(4)), // 4 decimals
                iv: parseFloat(iv.toFixed(2)), // 2 decimals
                ltp,
                pop,
                liquidity
            });
        }
    });

    chain.sort((a, b) => a.strike - b.strike);
    
    // Calculate Max Pain
    const maxPain = calculateMaxPain(chain);

    return {
        spotPrice,
        chain,
        maxPain
    };

  } catch (error) {
    console.error("Fetch Chain Error:", error);
    throw error;
  }
};
