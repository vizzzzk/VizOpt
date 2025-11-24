
import { OptionData, MarketAnalysis, ExpiryDate, QualifiedStrike } from "../types";
import { calculateBlackScholesDelta, calculatePoP, calculateLiquidityScore } from "./mathUtils";
import { APP_CONFIG } from "../constants";

const generateMockChain = (spotPrice: number, expiry: string): OptionData[] => {
    const strikes = [];
    const centerStrike = Math.round(spotPrice / 50) * 50;
    const range = 10; // 10 strikes up and down
    const dte = 7; // Mock DTE

    for (let i = -range; i <= range; i++) {
        const strike = centerStrike + (i * 50);
        
        // Generate Call
        const ceIv = 15 + Math.random() * 5;
        const ceMoneyness = spotPrice - strike;
        let ceLtp = Math.max(0.5, ceMoneyness + (Math.random() * 50)); 
        if (ceMoneyness < 0) ceLtp = Math.max(0.5, 200 * Math.exp(ceMoneyness/500)); // Time value decay for OTM
        
        const ceVol = Math.floor(Math.random() * 50000);
        const ceOi = Math.floor(Math.random() * 200000);
        
        strikes.push({
            strike,
            optionType: 'CE',
            delta: calculateBlackScholesDelta(spotPrice, strike, dte, ceIv, 'CE'),
            iv: parseFloat(ceIv.toFixed(2)),
            ltp: parseFloat(ceLtp.toFixed(2)),
            pop: calculatePoP(spotPrice, strike, ceLtp, ceIv, dte, 'CE'),
            liquidity: calculateLiquidityScore(ceVol, ceOi)
        } as OptionData);

        // Generate Put
        const peIv = 16 + Math.random() * 5;
        const peMoneyness = strike - spotPrice;
        let peLtp = Math.max(0.5, peMoneyness + (Math.random() * 50));
        if (peMoneyness < 0) peLtp = Math.max(0.5, 200 * Math.exp(peMoneyness/500));

        const peVol = Math.floor(Math.random() * 50000);
        const peOi = Math.floor(Math.random() * 200000);

        strikes.push({
            strike,
            optionType: 'PE',
            delta: calculateBlackScholesDelta(spotPrice, strike, dte, peIv, 'PE'),
            iv: parseFloat(peIv.toFixed(2)),
            ltp: parseFloat(peLtp.toFixed(2)),
            pop: calculatePoP(spotPrice, strike, peLtp, peIv, dte, 'PE'),
            liquidity: calculateLiquidityScore(peVol, peOi)
        } as OptionData);
    }
    return strikes;
};

export const getMockMarketAnalysis = (
    chain: OptionData[], 
    indiaVix: number = 13.5,
    spotPrice: number,
    maxPainOverride?: number,
    dte: number = 7
): MarketAnalysis => {
    const totalCallOi = chain.filter(c => c.optionType === 'CE').reduce((sum, c) => sum + c.liquidity.oi, 0);
    const totalPutOi = chain.filter(c => c.optionType === 'PE').reduce((sum, c) => sum + c.liquidity.oi, 0);
    
    const pcrOi = totalCallOi > 0 ? totalPutOi / totalCallOi : 0;
    
    // Calculate Volume PCR
    const totalCallVol = chain.filter(c => c.optionType === 'CE').reduce((sum, c) => sum + c.liquidity.volume, 0);
    const totalPutVol = chain.filter(c => c.optionType === 'PE').reduce((sum, c) => sum + c.liquidity.volume, 0);
    
    const pcrVolume = totalCallVol > 0 ? totalPutVol / totalCallVol : 0;
    
    const weightedPcr = (pcrOi * 0.7) + (pcrVolume * 0.3);

    let sentiment: any = "Neutral";

    if (weightedPcr > 1.3) { 
        sentiment = "Bearish";
    } else if (weightedPcr < 0.8) {
        sentiment = "Bullish";
    }

    // Calculate Highest OI Strikes
    const calls = chain.filter(c => c.optionType === 'CE');
    const puts = chain.filter(c => c.optionType === 'PE');

    const highestCe = calls.reduce((prev, curr) => (curr.liquidity.oi > prev.liquidity.oi ? curr : prev), calls[0] || { strike: 0, liquidity: { oi: 0 } });
    const highestPe = puts.reduce((prev, curr) => (curr.liquidity.oi > prev.liquidity.oi ? curr : prev), puts[0] || { strike: 0, liquidity: { oi: 0 } });


    // Calculate Max Pain (or use override)
    let maxPain = 0;
    if (maxPainOverride) {
        maxPain = maxPainOverride;
    } else {
        const strikes = Array.from(new Set(chain.map(c => c.strike)));
        maxPain = strikes[Math.floor(strikes.length / 2)];
    }

    // --- MAX PAIN SCORE LOGIC ---
    // 1. Spot Distance Score (0-50)
    const dist = Math.abs(spotPrice - maxPain);
    let distScore = 0;
    if (dist <= 50) distScore = 50;
    else if (dist <= 80) distScore = 40;
    else if (dist <= 120) distScore = 25;
    // else 0

    // 2. Stability Score (0-30)
    // Assuming stable (30) as we don't have 1-hour historical persistence in this scope
    const stabilityScore = 30; 

    // 3. OI Cluster Alignment Score (0-20)
    // Logic: IF( AND(PE_Max_Strike < MP , CE_Max_Strike > MP), 20, 0 )
    const isAligned = highestPe.strike < maxPain && highestCe.strike > maxPain;
    const alignmentScore = isAligned ? 20 : 0;

    const maxPainScore = distScore + stabilityScore + alignmentScore;


    // Estimate Expiry IV (Average of ATM CE and PE IV)
    let expiryIv = 0;
    if (chain.length > 0) {
        // Find strike closest to spot price
        const atmStrike = chain.reduce((prev, curr) => 
            Math.abs(curr.strike - spotPrice) < Math.abs(prev.strike - spotPrice) ? curr : prev
        ).strike;

        const atmCe = chain.find(c => c.strike === atmStrike && c.optionType === 'CE');
        const atmPe = chain.find(c => c.strike === atmStrike && c.optionType === 'PE');
        
        const iv1 = atmCe?.iv || 0;
        const iv2 = atmPe?.iv || 0;
        
        if (iv1 > 0 && iv2 > 0) expiryIv = (iv1 + iv2) / 2;
        else expiryIv = Math.max(iv1, iv2);
    }

    // --- EXPIRY IV SCORE LOGIC ---
    
    // 1. Absolute Expiry IV Score (0-50)
    let ivScoreA = 0;
    if (expiryIv < 9) ivScoreA = 50;
    else if (expiryIv < 12) ivScoreA = 40;
    else if (expiryIv < 15) ivScoreA = 25;
    else if (expiryIv < 18) ivScoreA = 10;
    else ivScoreA = 0; // > 18%

    // 2. IV Trend Score (0-35)
    // Simulated
    let ivScoreB = 25; 
    if (expiryIv > 20 || indiaVix > 20) ivScoreB = 0; 
    else if (expiryIv > 16) ivScoreB = 10; 
    // else 25

    // 3. Expected Move Score (0-15)
    const timeYear = Math.max(dte, 1) / 365;
    const expectedMove = spotPrice * (expiryIv / 100) * Math.sqrt(timeYear);
    
    const oiRange = Math.abs(highestCe.strike - highestPe.strike);
    let ivScoreC = 0;
    
    if (oiRange > 0) {
        const emRatio = expectedMove / oiRange;
        if (emRatio < 0.5) ivScoreC = 15;
        else if (emRatio < 0.75) ivScoreC = 10;
        else if (emRatio < 1.0) ivScoreC = 5;
        else ivScoreC = 0;
    }

    const expiryIvScore = ivScoreA + ivScoreB + ivScoreC;


    // --- VIZ SIGNAL SCORE LOGIC (NEW v5.9) ---
    
    // C) Weighted PCR Score (0-100)
    let wpcrScore = 0;
    if (weightedPcr >= 0.95 && weightedPcr <= 1.15) wpcrScore = 100;
    else if ((weightedPcr >= 0.85 && weightedPcr < 0.95) || (weightedPcr > 1.15 && weightedPcr <= 1.25)) wpcrScore = 70;
    else if ((weightedPcr >= 0.75 && weightedPcr < 0.85) || (weightedPcr > 1.25 && weightedPcr <= 1.35)) wpcrScore = 40;
    else wpcrScore = 0;

    // D) OI Wall Distance Score (0-100)
    const wallDist = Math.abs(highestCe.strike - highestPe.strike);
    let wallScore = 0;
    if (wallDist >= 350) wallScore = 100;
    else if (wallDist >= 250) wallScore = 70;
    else if (wallDist >= 150) wallScore = 40;
    else wallScore = 0;

    // E) VIX Score (0-100)
    let vixScore = 0;
    if (indiaVix < 13) vixScore = 100;
    else if (indiaVix < 15) vixScore = 70;
    else if (indiaVix < 18) vixScore = 40;
    else vixScore = 0;

    // FINAL SIGNAL CALCULATION
    // Weights: MP(30%) + IV(30%) + PCR(20%) + Wall(10%) + VIX(10%)
    const vizSignalScore = (0.30 * maxPainScore) + 
                           (0.30 * expiryIvScore) + 
                           (0.20 * wpcrScore) + 
                           (0.10 * wallScore) + 
                           (0.10 * vixScore);

    const roundedSignalScore = parseFloat(vizSignalScore.toFixed(1));
    
    let signalRating: 'Good' | 'Risky' = roundedSignalScore >= 60 ? 'Good' : 'Risky';
    let signalRecommendation = "";

    // Strict Binary Recommendation as requested in v6.0
    if (weightedPcr <= 1.0) {
        signalRecommendation = "SELL PUTS";
    } else {
        signalRecommendation = "SELL CALLS";
    }

    // --- IDENTIFY ALL QUALIFIED STRIKES ---
    const filterQualified = (type: 'CE' | 'PE'): QualifiedStrike[] => {
        return chain
            .filter(c => {
                const d = Math.abs(c.delta);
                return c.optionType === type && d >= 0.15 && d <= 0.25;
            })
            .map(c => {
                const oppositeType = c.optionType === 'CE' ? 'PE' : 'CE';
                const oppositeOption = chain.find(op => op.strike === c.strike && op.optionType === oppositeType);
                
                const callOi = c.optionType === 'CE' ? c.liquidity.oi : (oppositeOption?.liquidity.oi || 0);
                const putOi = c.optionType === 'PE' ? c.liquidity.oi : (oppositeOption?.liquidity.oi || 0);
                
                const strikePcr = callOi > 0 ? putOi / callOi : 0;

                return {
                    strike: c.strike,
                    optionType: c.optionType,
                    delta: c.delta,
                    ltp: c.ltp,
                    oi: c.liquidity.oi,
                    pcr: parseFloat(strikePcr.toFixed(2)),
                    iv: c.iv,
                    liquidityScore: c.liquidity.score
                };
            })
            .sort((a, b) => b.oi - a.oi);
    };

    const ceQualified = filterQualified('CE');
    const peQualified = filterQualified('PE');

    // --- TOP PICKS SELECTION ---
    const scoreCandidate = (c: QualifiedStrike) => {
        const deltaScore = (0.25 - Math.abs(c.delta)) * 200; 
        const ivScore = c.iv * 1.2; 
        const liqScore = c.liquidityScore * 2.5;
        return deltaScore + ivScore + liqScore;
    };

    const selectTopPick = (candidates: QualifiedStrike[]): QualifiedStrike | null => {
        if (candidates.length === 0) return null;
        return candidates.reduce((prev, curr) => scoreCandidate(curr) > scoreCandidate(prev) ? curr : prev);
    };

    return {
        sentiment,
        weightedPcr: parseFloat(weightedPcr.toFixed(4)),
        pcrOi: parseFloat(pcrOi.toFixed(4)),
        pcrVolume: parseFloat(pcrVolume.toFixed(4)),
        maxPain,
        maxPainScore,
        indiaVix,
        expiryIv,
        expiryIvScore,
        vizSignal: {
            score: roundedSignalScore,
            rating: signalRating,
            recommendation: signalRecommendation,
            breakdown: {
                wpcrScore,
                wallScore,
                vixScore
            }
        },
        highOiStrikes: {
            ce: { strike: highestCe.strike, oi: highestCe.liquidity.oi },
            pe: { strike: highestPe.strike, oi: highestPe.liquidity.oi }
        },
        qualifiedStrikes: {
            ce: ceQualified,
            pe: peQualified
        },
        topPicks: {
            ce: selectTopPick(ceQualified),
            pe: selectTopPick(peQualified)
        }
    };
};

// Mock dates updated to THURSDAYS for Nifty 50 consistency
export const mockExpiries: ExpiryDate[] = [
    { date: '2025-08-28', label: '28 Aug 2025 (Thu) DTE: 5', dte: 5 },
    { date: '2025-09-04', label: '04 Sep 2025 (Thu) DTE: 12', dte: 12 },
    { date: '2025-09-11', label: '11 Sep 2025 (Thu) DTE: 19', dte: 19 },
    { date: '2025-09-25', label: '25 Sep 2025 (Thu) DTE: 33', dte: 33 },
];

export const fetchMockData = (expiry: string) => {
    const spotPrice = APP_CONFIG.SPOT_PRICE_INITIAL + (Math.random() * 100 - 50); // Slight fluctuation
    const chain = generateMockChain(spotPrice, expiry);
    
    // Find DTE from mockExpiries or default to 7
    const expObj = mockExpiries.find(e => e.date === expiry);
    const dte = expObj ? expObj.dte : 7;

    const analysis = getMockMarketAnalysis(chain, 13.5, spotPrice, undefined, dte);
    return { spotPrice, chain, analysis };
};
