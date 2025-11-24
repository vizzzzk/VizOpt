




import React from 'react';
import { MarketAnalysis, OptionType, TradeType, QualifiedStrike } from '../types';
import { ArrowUpRight, ArrowDownRight, Minus, Flame, Activity, CalendarClock, Info, Waves, CheckCircle2, Sparkles, Zap, Radar, Crosshair } from 'lucide-react';
import { formatOI } from '../services/mathUtils';

interface Props {
  analysis: MarketAnalysis;
  spotPrice: number;
  selectedExpiry: string;
  dte?: number;
  atmStrike?: number;
  onTrade: (strike: number, type: OptionType, tradeSide: TradeType, price: number) => void;
}

const StrikeRow: React.FC<{
  data: QualifiedStrike;
  onTrade: (strike: number, type: OptionType, tradeSide: TradeType, price: number) => void;
}> = ({ data, onTrade }) => {
    return (
        <div className="flex items-center justify-between p-2 bg-gray-900/50 rounded border border-gray-800 hover:border-gray-600 transition-colors group">
            <div className="flex items-center gap-3">
                <div className={`text-xs font-bold font-mono tabular-nums ${data.optionType === 'CE' ? 'text-green-400' : 'text-red-400'}`}>
                    {data.strike} {data.optionType}
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] text-gray-500">Premium</span>
                    <span className="text-xs font-sans font-medium tabular-nums text-white">₹{data.ltp.toFixed(2)}</span>
                </div>
                <div className="flex flex-col pl-2 border-l border-gray-800">
                    <span className="text-[9px] text-gray-500">Delta</span>
                    <span className="text-xs font-sans font-medium tabular-nums text-teal-400">{Math.abs(data.delta).toFixed(2)}</span>
                </div>
                 <div className="flex flex-col pl-2 border-l border-gray-800">
                    <span className="text-[9px] text-gray-500">OI</span>
                    <span className="text-[10px] font-sans tabular-nums text-gray-300">
                        {formatOI(data.oi)}
                    </span>
                </div>
            </div>
            <button 
                onClick={() => onTrade(data.strike, data.optionType, 'SELL', data.ltp)}
                className="opacity-0 group-hover:opacity-100 bg-gray-800 hover:bg-gray-700 text-white text-[10px] px-3 py-1.5 rounded transition-all border border-gray-700"
            >
                SELL
            </button>
        </div>
    );
};

const TopPickCard: React.FC<{
    data: QualifiedStrike;
    onTrade: (strike: number, type: OptionType, tradeSide: TradeType, price: number) => void;
}> = ({ data, onTrade }) => {
    const isCE = data.optionType === 'CE';
    return (
        <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-3 md:p-4 flex flex-col overflow-hidden group hover:border-purple-500/50 transition-all">
             <div className="absolute top-0 right-0 bg-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase flex items-center gap-1 shadow-lg shadow-purple-900/50">
                <Sparkles size={10} /> Top Pick
             </div>
             
             <div className="flex justify-between items-end mb-3 mt-2">
                 <div>
                     <div className={`text-lg font-black font-mono ${isCE ? 'text-green-400' : 'text-red-400'}`}>
                         {data.strike} {data.optionType}
                     </div>
                     <div className="text-[10px] text-gray-400 uppercase tracking-wider">Ideally Sell</div>
                 </div>
                 <div className="text-right">
                     <div className="text-2xl font-bold text-white tabular-nums">₹{data.ltp.toFixed(2)}</div>
                     <div className="text-[10px] text-gray-500">Premium</div>
                 </div>
             </div>

             <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-400 border-t border-gray-700/50 pt-2 mb-3">
                 <div>
                     <span className="block text-gray-500">Delta</span>
                     <span className="text-teal-300 font-mono font-bold">{Math.abs(data.delta).toFixed(2)}</span>
                 </div>
                 <div className="text-center">
                     <span className="block text-gray-500">IV</span>
                     <span className="text-blue-300 font-mono font-bold">{data.iv.toFixed(1)}%</span>
                 </div>
                 <div className="text-right">
                     <span className="block text-gray-500">Liq. Score</span>
                     <span className="text-purple-300 font-mono font-bold">{data.liquidityScore}/20</span>
                 </div>
             </div>
             
             <button 
                onClick={() => onTrade(data.strike, data.optionType, 'SELL', data.ltp)}
                className={`w-full py-2 rounded-lg font-bold text-xs uppercase transition-colors flex items-center justify-center gap-2 ${isCE ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30'}`}
             >
                <Zap size={12} /> Sell {data.optionType}
             </button>
        </div>
    );
};

export const MarketAnalysisPanel: React.FC<Props> = ({ analysis, spotPrice, selectedExpiry, dte, atmStrike, onTrade }) => {
  const getSentimentColor = (s: string) => {
    if (s === 'Bullish') return 'text-green-400 bg-green-400/10 border-green-400/20';
    if (s === 'Bearish') return 'text-red-400 bg-red-400/10 border-red-400/20';
    return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
  };

  const getScoreColor = (score: number) => {
      if (score >= 80) return 'text-green-400';
      if (score >= 60) return 'text-teal-400';
      if (score >= 40) return 'text-yellow-400';
      return 'text-red-400';
  };

  // Strip DTE from expiry label string if present
  const displayExpiry = selectedExpiry.split(' DTE:')[0];

  return (
    <div className="bg-gray-850 border border-gray-750 rounded-xl p-4 md:p-5 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-wrap">
        
        {/* Top Row on Mobile: Spot & Sentiment */}
        <div className="flex justify-between w-full md:w-auto gap-4">
          {/* NIFTY Spot Price */}
          <div className="min-w-[120px]">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">NIFTY 50 Spot</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white font-mono tabular-nums">{spotPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Sentiment/Max OI Badges with New OI Guide Tooltip */}
          <div className={`px-3 py-2 rounded-lg border flex items-center gap-2 relative group cursor-help ${getSentimentColor(analysis.sentiment)}`}>
              <div className="flex flex-col gap-0.5">
                  <div className="text-xs font-mono flex items-center gap-1.5 leading-tight">
                      <span className="opacity-75 text-[10px] font-sans uppercase">Max CE OI</span>
                      <strong className="text-white">{analysis.highOiStrikes.ce.strike}</strong>
                      <span className="text-[10px] opacity-75">({formatOI(analysis.highOiStrikes.ce.oi)})</span>
                  </div>
                  <div className="text-xs font-mono flex items-center gap-1.5 leading-tight">
                      <span className="opacity-75 text-[10px] font-sans uppercase">Max PE OI</span>
                      <strong className="text-white">{analysis.highOiStrikes.pe.strike}</strong>
                      <span className="text-[10px] opacity-75">({formatOI(analysis.highOiStrikes.pe.oi)})</span>
                  </div>
              </div>
              
              {/* OI GUIDE TOOLTIP */}
              <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-900 p-3 rounded-lg border border-gray-700 text-xs text-gray-400 shadow-xl hidden group-hover:block z-50 text-left">
                    <strong className="text-blue-300 block mb-2 border-b border-gray-800 pb-1">OI Guide</strong>
                    <div className="space-y-2 text-[10px]">
                        <div className="flex gap-2 items-start">
                            <span className="text-gray-500">•</span>
                            <span>Spot price should be to Max Pain (within ±50–80 points)</span>
                        </div>
                        <div className="flex gap-2 items-start">
                            <span className="text-gray-500">•</span>
                            <span>Max Pain should lie inside the highest OI cluster</span>
                        </div>
                    </div>
              </div>
          </div>
        </div>

        {/* Middle Row on Mobile: Expiry & ATM */}
        <div className="flex flex-wrap md:flex-nowrap gap-4 w-full md:w-auto items-stretch">
            {/* Expiry Info */}
            <div className="flex-1 md:flex-none flex flex-col justify-center bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700/50 min-w-[220px]">
               <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider mb-1.5">
                 <CalendarClock size={12} />
                 <span>Expiry Info</span>
               </div>
               <div className="flex items-center gap-2 text-xs font-mono whitespace-nowrap">
                 <span className="text-[10px] text-gray-500 uppercase font-bold">Date</span>
                 <span className="font-bold text-white">{displayExpiry}</span>
                 <span className="w-px h-3 bg-gray-700 mx-1"></span>
                 <span className="text-[10px] text-gray-500 uppercase font-bold">DTE</span>
                 <span className="font-bold text-blue-300 tabular-nums">{dte ?? '-'} Days</span>
               </div>
            </div>

            {/* ATM Strike - Moved Before PCR - Updated Width */}
            {atmStrike && (
                 <div className="flex-1 md:flex-none flex flex-col items-center justify-center bg-gray-800/50 px-6 py-2 rounded-lg border border-gray-700/50 min-w-[140px]">
                    <div className="flex items-center gap-1 text-gray-400 text-xs uppercase tracking-wider mb-1">
                         <Crosshair size={12} className="text-blue-400" />
                         <span>ATM</span>
                    </div>
                    <span className="font-mono text-white font-bold text-lg tabular-nums leading-none">{atmStrike}</span>
                 </div>
            )}

            {/* PCR Meters */}
            <div className="flex-1 md:flex-none flex items-center justify-center gap-2 md:gap-4 text-sm bg-black/20 p-2 rounded-lg border border-gray-800 min-w-[160px]">
                {/* PCR OI */}
                <div className="flex flex-col items-center px-1 md:px-2 relative group cursor-help">
                    <div className="flex items-center gap-1 text-gray-500 text-[10px] uppercase underline decoration-dotted decoration-gray-600">
                        PCR (OI) <Info size={8} />
                    </div>
                    <span className={`font-mono font-bold tabular-nums ${analysis.pcrOi > 1.2 ? 'text-red-400' : analysis.pcrOi < 0.8 ? 'text-green-400' : 'text-white'}`}>
                        {analysis.pcrOi.toFixed(4)}
                    </span>
                    {/* PCR OI TOOLTIP - Fixed Width w-48 */}
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-gray-900 p-3 rounded-lg border border-gray-700 text-xs text-gray-400 shadow-xl hidden group-hover:block z-50">
                         <strong className="text-white block mb-2 border-b border-gray-800 pb-1">PCR Guide</strong>
                         <div className="space-y-2 text-[10px]">
                            <div className="flex justify-between">
                                <span className="text-green-400 font-bold">0.70 - 1.00</span>
                                <span className="text-gray-300">Sell Puts</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-yellow-400 font-bold">1.00 - 1.15</span>
                                <span className="text-gray-300">Go with Trend</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-red-400 font-bold">1.15 - 1.50</span>
                                <span className="text-gray-300">Sell Calls</span>
                            </div>
                            <div className="flex justify-between pt-1">
                                <span className="text-gray-500 font-bold">Out of Zone</span>
                                <span className="text-gray-400">No Trade</span>
                            </div>
                         </div>
                    </div>
                </div>
                
                <div className="w-px bg-gray-700 h-8"></div>
                
                {/* WEIGHTED PCR */}
                <div className="flex flex-col items-center px-1 md:px-2 relative group cursor-help">
                    <span className="text-gray-500 text-[10px] uppercase underline decoration-dotted decoration-gray-600">Weighted PCR</span>
                    <span className="font-mono font-bold tabular-nums text-blue-300">{analysis.weightedPcr.toFixed(4)}</span>
                    
                    {/* WEIGHTED TOOLTIP - Increased Width w-64 */}
                    <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-900 p-3 rounded-lg border border-gray-700 text-xs text-gray-400 shadow-xl hidden group-hover:block z-50">
                        <strong className="text-teal-300 block mb-2 border-b border-gray-800 pb-1">Weighted PCR Guide</strong>
                        <div className="space-y-2 text-[10px]">
                            <div className="flex justify-between">
                                <span className="text-green-400 font-bold">0.80 - 0.95</span>
                                <span className="text-gray-300">Sell Puts</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-yellow-400 font-bold">0.95 - 1.15</span>
                                <span className="text-gray-300">Go with PCR Trend</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-red-400 font-bold">1.15 - 1.30</span>
                                <span className="text-gray-300">Sell Calls</span>
                            </div>
                            <div className="flex justify-between pt-1">
                                <span className="text-gray-500 font-bold">Out of Zone</span>
                                <span className="text-gray-400">No Trade</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Key Metrics Group */}
        <div className="flex w-full md:w-auto gap-4 md:gap-6 text-sm border-t md:border-t-0 md:border-l border-gray-700 pt-4 md:pt-0 md:pl-6 justify-between md:justify-start">
            {/* Max Pain & Score */}
            <div className="flex flex-col items-start md:items-end relative group cursor-help">
                <span className="text-gray-400 text-[10px] uppercase flex items-center gap-1 underline decoration-dotted decoration-gray-600">
                    <Flame size={10} className="text-orange-400" /> Max Pain
                </span>
                <div className="flex items-baseline gap-2">
                    <span className="font-mono font-bold tabular-nums text-orange-300 text-lg">
                        {analysis.maxPain}
                    </span>
                    <span className={`text-xs font-bold px-1.5 rounded bg-gray-800 border border-gray-700 ${getScoreColor(analysis.maxPainScore)}`}>
                        {analysis.maxPainScore}
                    </span>
                </div>

                {/* MAX PAIN GUIDE TOOLTIP */}
                <div className="absolute bottom-full left-0 md:left-auto md:right-0 mb-2 w-64 bg-gray-900 p-3 rounded-lg border border-gray-700 text-xs text-gray-400 shadow-xl hidden group-hover:block z-50 text-left origin-bottom-left md:origin-bottom-right">
                    <strong className="text-orange-300 block mb-2 border-b border-gray-800 pb-1">Max Pain Guide</strong>
                     <div className="space-y-3 text-[10px]">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-green-400 font-bold text-xs">&gt; 60</span>
                                <span className="text-green-400 font-bold text-[9px] uppercase">Good</span>
                            </div>
                            <p className="text-gray-300">Go with PCR trend.</p>
                        </div>
                        
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-red-400 font-bold text-xs">&lt; 60</span>
                                <span className="text-red-400 font-bold text-[9px] uppercase">Risky</span>
                            </div>
                            <p className="text-gray-300">Avoid</p>
                        </div>
                     </div>
                </div>
            </div>

            {/* Expiry IV & Score */}
            <div className="flex flex-col items-center border-x border-gray-800 px-4 md:px-6 relative group cursor-help">
                <span className="text-gray-400 text-[10px] uppercase flex items-center gap-1 underline decoration-dotted decoration-gray-600">
                    <Waves size={10} className="text-teal-400" /> Expiry IV
                </span>
                <div className="flex items-baseline gap-2">
                    <span className="font-mono font-bold tabular-nums text-teal-300 text-lg">
                        {analysis.expiryIv.toFixed(2)}%
                    </span>
                    <span className={`text-xs font-bold px-1.5 rounded bg-gray-800 border border-gray-700 ${getScoreColor(analysis.expiryIvScore)}`}>
                        {analysis.expiryIvScore}
                    </span>
                </div>

                {/* IV GUIDE TOOLTIP */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 p-3 rounded-lg border border-gray-700 text-xs text-gray-400 shadow-xl hidden group-hover:block z-50 text-left">
                    <strong className="text-teal-300 block mb-2 border-b border-gray-800 pb-1">IV Guide</strong>
                     <div className="space-y-3 text-[10px]">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-green-400 font-bold text-xs">&gt; 60</span>
                                <span className="text-green-400 font-bold text-[9px] uppercase">Good</span>
                            </div>
                            <p className="text-gray-300">Go with PCR trend.</p>
                        </div>
                        
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-red-400 font-bold text-xs">&lt; 60</span>
                                <span className="text-red-400 font-bold text-[9px] uppercase">Risky</span>
                            </div>
                            <p className="text-gray-300">Avoid</p>
                        </div>
                     </div>
                </div>
            </div>

            {/* India VIX */}
             <div className="flex flex-col items-end relative group cursor-help">
                <span className="text-gray-400 text-[10px] uppercase flex items-center gap-1 underline decoration-dotted decoration-gray-600">
                    <Activity size={10} className="text-purple-400" /> India VIX
                </span>
                <span className={`font-mono font-bold tabular-nums text-lg ${analysis.indiaVix > 20 ? 'text-red-400' : analysis.indiaVix < 15 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {analysis.indiaVix.toFixed(2)}
                </span>

                {/* VIX TOOLTIP - w-48 */}
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-900 p-3 rounded-lg border border-gray-700 text-xs text-gray-400 shadow-xl hidden group-hover:block z-50 text-left">
                    <strong className="text-purple-300 block mb-2 border-b border-gray-800 pb-1">VIX Guide</strong>
                     <div className="space-y-2 text-[10px]">
                        <div className="flex justify-between">
                            <span className="text-green-400 font-bold">&lt; 15</span>
                            <span className="text-gray-300">Safe Zone</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-yellow-400 font-bold">15 - 20</span>
                            <span className="text-gray-300">Risky</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-red-400 font-bold">&gt; 20</span>
                            <span className="text-gray-300">Don't Trade</span>
                        </div>
                     </div>
                </div>
            </div>
        </div>

      </div>

      {/* --- VIZ SIGNAL SECTION --- */}
      <div className="mt-5 pt-4 border-t border-gray-700/50">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4 relative overflow-hidden shadow-lg group cursor-help">
              {/* Decorative glow */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 ${analysis.vizSignal.rating === 'Good' ? 'from-green-500 to-teal-500' : 'from-red-500 to-orange-500'}`}></div>
              
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${analysis.vizSignal.rating === 'Good' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          <Radar size={28} />
                      </div>
                      <div>
                          <div className="flex items-center gap-2">
                              <h3 className="text-white font-bold text-lg tracking-tight">Viz Signal</h3>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${analysis.vizSignal.rating === 'Good' ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
                                  {analysis.vizSignal.rating}
                              </span>
                          </div>
                      </div>
                  </div>

                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                       <div className="flex flex-col items-end">
                           <span className="text-[10px] text-gray-500 uppercase tracking-wider">Signal Strength</span>
                           <div className="flex items-baseline gap-1">
                               <span className={`text-3xl font-black font-mono ${analysis.vizSignal.rating === 'Good' ? 'text-green-400' : 'text-red-400'}`}>
                                   {analysis.vizSignal.score}
                               </span>
                               <span className="text-gray-600 text-sm">/100</span>
                           </div>
                       </div>
                       <div className="h-10 w-px bg-gray-700 hidden md:block"></div>
                       <div className="flex flex-col items-end min-w-[100px]">
                           <span className="text-[10px] text-gray-500 uppercase tracking-wider">Recommendation</span>
                           <span className={`text-sm font-bold uppercase px-2 py-1 rounded border ${analysis.vizSignal.rating === 'Good' ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' : 'bg-red-900/20 text-red-300 border-red-800/50'}`}>
                               {analysis.vizSignal.recommendation}
                           </span>
                       </div>
                  </div>
              </div>

              {/* SIGNAL TOOLTIP (Detailed Breakdown) */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-gray-900 p-4 rounded-xl border border-gray-700 text-xs shadow-2xl hidden group-hover:block z-50">
                    <strong className="text-white block mb-3 border-b border-gray-800 pb-2 flex justify-between">
                        <span>Signal Breakdown</span>
                        <span className="text-gray-500 font-normal">Weights Applied</span>
                    </strong>
                    <div className="space-y-2 text-[11px]">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Max Pain Score (30%)</span>
                            <span className="font-mono text-orange-300">{analysis.maxPainScore}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Expiry IV Score (30%)</span>
                            <span className="font-mono text-teal-300">{analysis.expiryIvScore}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Weighted PCR (20%)</span>
                            <span className="font-mono text-blue-300">{analysis.vizSignal.breakdown.wpcrScore}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">OI Wall Dist (10%)</span>
                            <span className="font-mono text-purple-300">{analysis.vizSignal.breakdown.wallScore}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-800 pb-2 mb-2">
                            <span className="text-gray-400">VIX Score (10%)</span>
                            <span className="font-mono text-yellow-300">{analysis.vizSignal.breakdown.vixScore}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <span className="text-white font-bold">Total Signal Score</span>
                            <span className={`font-mono font-bold text-sm ${analysis.vizSignal.rating === 'Good' ? 'text-green-400' : 'text-red-400'}`}>
                                {analysis.vizSignal.score}
                            </span>
                        </div>
                    </div>
              </div>
          </div>
      </div>

      {/* --- QUALIFIED STRIKES SECTION --- */}
      <div className="mt-5 pt-4 border-t border-gray-700/50">
          <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={14} className="text-teal-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wide">Qualified Strikes</span>
          </div>

          {/* TOP PICKS */}
          {(analysis.topPicks.ce || analysis.topPicks.pe) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                {analysis.topPicks.ce && (
                    <TopPickCard data={analysis.topPicks.ce} onTrade={onTrade} />
                )}
                {analysis.topPicks.pe && (
                    <TopPickCard data={analysis.topPicks.pe} onTrade={onTrade} />
                )}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CE Candidates */}
              <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-3">
                  <div className="text-[10px] font-bold text-gray-500 uppercase mb-2 flex justify-between">
                      <span>Calls (Bearish Sells)</span>
                      <span>{analysis.qualifiedStrikes.ce.length} Found</span>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                      {analysis.qualifiedStrikes.ce.length > 0 ? (
                          analysis.qualifiedStrikes.ce.map(item => (
                              <StrikeRow key={item.strike} data={item} onTrade={onTrade} />
                          ))
                      ) : (
                          <div className="text-xs text-gray-600 italic p-2 text-center">No qualified CE strikes found.</div>
                      )}
                  </div>
              </div>

              {/* PE Candidates */}
              <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-3">
                  <div className="text-[10px] font-bold text-gray-500 uppercase mb-2 flex justify-between">
                      <span>Puts (Bullish Sells)</span>
                      <span>{analysis.qualifiedStrikes.pe.length} Found</span>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                      {analysis.qualifiedStrikes.pe.length > 0 ? (
                          analysis.qualifiedStrikes.pe.map(item => (
                              <StrikeRow key={item.strike} data={item} onTrade={onTrade} />
                          ))
                      ) : (
                          <div className="text-xs text-gray-600 italic p-2 text-center">No qualified PE strikes found.</div>
                      )}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};