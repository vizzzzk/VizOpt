
import React from 'react';
import { OptionData, OptionType, TradeType } from '../types';
import { AlertCircle } from 'lucide-react';
import { formatOI } from '../services/mathUtils';

interface Props {
  chain: OptionData[];
  spotPrice: number;
  onTrade: (strike: number, type: OptionType, tradeSide: TradeType, price: number) => void;
  isLive?: boolean;
}

export const OptionChain: React.FC<Props> = ({ chain, spotPrice, onTrade, isLive = false }) => {
  // Group by strike
  const strikes: number[] = (Array.from(new Set(chain.map(c => c.strike))) as number[]).sort((a, b) => a - b);
  
  const getAtmStrike = () => {
    if (strikes.length === 0) return 0;
    return strikes.reduce((prev, curr) => Math.abs(curr - spotPrice) < Math.abs(prev - spotPrice) ? curr : prev);
  };

  const atmStrike = getAtmStrike();

  const renderCell = (data: OptionData | undefined, side: 'CALL' | 'PUT') => {
    if (!data) return <td colSpan={5}></td>;

    const isITM = side === 'CALL' ? data.strike < spotPrice : data.strike > spotPrice;
    const isIdealDelta = Math.abs(data.delta) >= 0.15 && Math.abs(data.delta) <= 0.25;
    
    const bgClass = isIdealDelta 
        ? 'bg-teal-500/10 border-y border-teal-500/20' 
        : isITM 
            ? 'bg-yellow-500/5' 
            : '';

    const highlightDeltaText = isIdealDelta ? 'text-teal-300 font-bold' : 'text-gray-400';
    
    return (
      <>
        {/* DELTA & OI COLUMN */}
        <td className={`px-2 py-2 text-right text-xs ${bgClass}`}>
           <div className="flex flex-col items-end">
                {/* Switched to font-sans tabular-nums for better 0 vs 8 distinction */}
                <span className={`${highlightDeltaText} font-sans tabular-nums font-medium`}>{data.delta.toFixed(4)}</span>
                <span className="text-[9px] text-gray-500 font-sans tabular-nums mt-0.5">{formatOI(data.liquidity.oi)} OI</span>
           </div>
        </td>
        
        {/* IV & POP COLUMN */}
        <td className={`px-2 py-2 text-right text-xs ${bgClass}`}>
            <div className="flex flex-col items-end">
                <span className="font-sans tabular-nums font-medium">{data.iv.toFixed(2)}%</span>
                <span className="text-[10px] text-gray-600 font-sans tabular-nums">POP {data.pop.toFixed(0)}%</span>
            </div>
        </td>
        
        {/* LTP COLUMN */}
        <td className={`px-2 py-2 text-right font-sans tabular-nums font-bold ${bgClass} ${side === 'CALL' ? 'text-green-300' : 'text-red-300'}`}>
          {data.ltp.toFixed(2)}
        </td>
        
        {/* TRADE COLUMN */}
        <td className={`px-1 py-2 text-center ${bgClass}`}>
          <div className="flex gap-1 justify-center">
            <button 
                onClick={() => onTrade(data.strike, data.optionType, 'SELL', data.ltp)}
                className="p-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded text-[10px] font-bold uppercase transition-colors border border-red-500/30"
                title="Sell (Write) Option"
            >
                S
            </button>
            <button 
                onClick={() => onTrade(data.strike, data.optionType, 'BUY', data.ltp)}
                className="p-1 bg-green-500/20 hover:bg-green-500/40 text-green-400 rounded text-[10px] font-bold uppercase transition-colors border border-green-500/30"
                title="Buy Option"
            >
                B
            </button>
          </div>
        </td>
      </>
    );
  };

  return (
    <div className="bg-gray-850 border border-gray-750 rounded-xl overflow-hidden h-[600px] flex flex-col">
      <div className="p-3 md:p-4 border-b border-gray-750 bg-gray-900/50">
        <h3 className="font-bold text-white flex flex-wrap items-center gap-2 text-sm md:text-base">
          Option Chain 
          <span className="text-xs font-normal text-gray-400 ml-2 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700 whitespace-nowrap">
             ATM: {atmStrike}
          </span>
        </h3>
      </div>
      
      <div className="overflow-auto flex-1 w-full">
        <table className="min-w-[1200px] w-full text-sm text-gray-300 relative border-collapse">
          <thead className="text-xs text-gray-400 bg-gray-900 sticky top-0 z-10 shadow-lg">
            <tr>
              <th colSpan={4} className="py-2 text-center border-b border-gray-700 text-green-400">CALLS (CE)</th>
              <th className="py-2 px-4 border-b border-gray-700 bg-gray-800 text-white">Strike</th>
              <th colSpan={4} className="py-2 text-center border-b border-gray-700 text-red-400">PUTS (PE)</th>
            </tr>
            <tr className="text-[10px] uppercase tracking-wider bg-gray-900/95 backdrop-blur">
              <th className="px-2 py-2 font-normal">Delta / OI</th>
              <th className="px-2 py-2 font-normal">IV / POP</th>
              <th className="px-2 py-2 font-normal">LTP</th>
              <th className="px-1 py-2 font-normal">Trade</th>
              
              <th className="bg-gray-800"></th>

              <th className="px-1 py-2 font-normal">Trade</th>
              <th className="px-2 py-2 font-normal">LTP</th>
              <th className="px-2 py-2 font-normal">IV / POP</th>
              <th className="px-2 py-2 font-normal">Delta / OI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {strikes.map((strike) => {
              const callData = chain.find(c => c.strike === strike && c.optionType === 'CE');
              const putData = chain.find(c => c.strike === strike && c.optionType === 'PE');
              const isAtm = strike === atmStrike;
              
              const putIsITM = putData && putData.strike > spotPrice;
              const putIsIdealDelta = putData && Math.abs(putData.delta) >= 0.15 && Math.abs(putData.delta) <= 0.25;
              const putBgClass = putIsIdealDelta 
                 ? 'bg-teal-500/10 border-y border-teal-500/20' 
                 : putIsITM 
                    ? 'bg-yellow-500/5' 
                    : '';
              const putDeltaText = putIsIdealDelta ? 'text-teal-300 font-bold' : 'text-gray-400';

              // Calculate Strike PCR
              const callOi = callData?.liquidity.oi || 0;
              const putOi = putData?.liquidity.oi || 0;
              const strikePcr = callOi > 0 ? putOi / callOi : 0;

              return (
                <tr key={strike} className={`hover:bg-gray-800 transition-colors ${isAtm ? 'bg-blue-500/5' : ''}`}>
                  {renderCell(callData, 'CALL')}
                  
                  <td className={`px-4 py-2 text-center sticky left-0 z-10 ${isAtm ? 'bg-blue-600' : 'bg-gray-800'}`}>
                    <div className="flex flex-col items-center">
                        <span className={`font-bold font-sans tabular-nums ${isAtm ? 'text-white' : 'text-gray-300'}`}>
                            {strike}
                        </span>
                        {/* Strike PCR Display */}
                        <span className={`text-[9px] font-sans tabular-nums mt-0.5 ${isAtm ? 'text-blue-200' : 'text-gray-500'}`}>
                           PCR {strikePcr.toFixed(2)}
                        </span>
                    </div>
                  </td>
                  
                  {/* Reverse order for Puts cells to mirror layout */}
                  <td className={`px-1 py-2 text-center ${putBgClass}`}>
                    <div className="flex gap-1 justify-center">
                        <button 
                            onClick={() => putData && onTrade(putData.strike, putData.optionType, 'BUY', putData.ltp)}
                            className="p-1 bg-green-500/20 hover:bg-green-500/40 text-green-400 rounded text-[10px] font-bold uppercase transition-colors border border-green-500/30"
                        >
                            B
                        </button>
                        <button 
                            onClick={() => putData && onTrade(putData.strike, putData.optionType, 'SELL', putData.ltp)}
                            className="p-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded text-[10px] font-bold uppercase transition-colors border border-red-500/30"
                        >
                            S
                        </button>
                    </div>
                  </td>
                  
                  {/* LTP */}
                  <td className={`px-2 py-2 text-left font-sans tabular-nums font-bold ${putBgClass} ${putIsITM ? 'text-red-300' : 'text-red-300'}`}>
                     {putData?.ltp.toFixed(2)}
                  </td>
                  
                  {/* IV & POP */}
                  <td className={`px-2 py-2 text-left text-xs ${putBgClass}`}>
                    <div className="flex flex-col items-start">
                        <span className="font-sans tabular-nums font-medium">{putData?.iv.toFixed(2)}%</span>
                        <span className="text-[10px] text-gray-600 font-sans tabular-nums">POP {putData?.pop.toFixed(0)}%</span>
                    </div>
                  </td>
                  
                  {/* DELTA & OI */}
                  <td className={`px-2 py-2 text-left text-xs ${putBgClass}`}>
                    <div className="flex flex-col items-start">
                        <span className={`${putDeltaText} font-sans tabular-nums font-medium`}>
                            {putData?.delta.toFixed(4)}
                        </span>
                        <span className="text-[9px] text-gray-500 font-sans tabular-nums mt-0.5">{formatOI(putData?.liquidity.oi || 0)} OI</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-900 p-2 text-xs text-gray-500 flex items-center justify-between border-t border-gray-750">
         <div className="flex items-center gap-2">
            <AlertCircle size={12} className="text-teal-400" />
            <span className="text-teal-300/80">Teal Highlight = Viz zone</span>
         </div>
         <span className={`font-bold uppercase ${isLive ? 'text-green-400' : 'text-yellow-500/80'}`}>
            {isLive ? 'Live' : 'Sim'}
         </span>
      </div>
    </div>
  );
};