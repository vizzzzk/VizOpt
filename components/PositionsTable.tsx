
import React, { useState, useMemo } from 'react';
import { Position, ChargesBreakdown } from '../types';
import { exportTradesToCSV, formatCurrency } from '../services/mathUtils';
import { Download, X, XCircle, RefreshCw, TrendingUp } from 'lucide-react';

interface Props {
  positions: Position[];
  isClosed?: boolean;
  onClosePosition?: (id: number) => void;
  onCloseAll?: () => void;
  onRefresh?: () => void;
  onPnlClick?: () => void;
}

const ChargesModal = ({ entry, exit, onClose }: { entry: ChargesBreakdown, exit?: ChargesBreakdown, onClose: () => void }) => {
    const totalBrokerage = entry.brokerage + (exit?.brokerage || 0);
    const totalStt = entry.stt + (exit?.stt || 0);
    const totalExch = entry.exchangeTxn + (exit?.exchangeTxn || 0);
    const totalGst = entry.gst + (exit?.gst || 0);
    const totalStamp = entry.stampDuty + (exit?.stampDuty || 0);
    const totalOther = (entry.sebi + entry.ipft) + (exit ? (exit.sebi + exit.ipft) : 0);
    const total = entry.total + (exit?.total || 0);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-xs shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
                    <h3 className="font-bold text-white text-sm">Charges Breakdown</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={16}/></button>
                </div>
                <div className="p-4 text-xs space-y-2">
                    <div className="flex justify-between text-gray-400"><span>Brokerage</span> <span className="text-white">₹{totalBrokerage.toFixed(2)}</span></div>
                    <div className="flex justify-between text-gray-400"><span>STT</span> <span className="text-white">₹{totalStt.toFixed(2)}</span></div>
                    <div className="flex justify-between text-gray-400"><span>Exchange Txn</span> <span className="text-white">₹{totalExch.toFixed(2)}</span></div>
                    <div className="flex justify-between text-gray-400"><span>GST (18%)</span> <span className="text-white">₹{totalGst.toFixed(2)}</span></div>
                    <div className="flex justify-between text-gray-400"><span>Stamp Duty</span> <span className="text-white">₹{totalStamp.toFixed(2)}</span></div>
                    <div className="flex justify-between text-gray-400"><span>SEBI / IPFT</span> <span className="text-white">₹{totalOther.toFixed(2)}</span></div>
                    <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between font-bold text-red-300">
                        <span>Total Charges</span>
                        <span>₹{total.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PositionsTable: React.FC<Props> = ({ positions, isClosed = false, onClosePosition, onCloseAll, onRefresh, onPnlClick }) => {
  const [activeChargesData, setActiveChargesData] = useState<{entry: ChargesBreakdown, exit?: ChargesBreakdown} | null>(null);
  const title = isClosed ? "Closed Positions" : "Open Positions";
  
  const totalTablePnl = useMemo(() => {
      return positions.reduce((sum, pos) => {
          if (isClosed) return sum + (pos.netPnl || 0);
          
          // Calculate live PnL for open
          const currentPrice = pos.currentLtp || pos.entryPrice;
          const gross = pos.tradeType === 'BUY' 
             ? (currentPrice - pos.entryPrice) * pos.quantity
             : (pos.entryPrice - currentPrice) * pos.quantity;
          return sum + (gross - (pos.totalCharges || pos.entryCharges.total));
      }, 0);
  }, [positions, isClosed]);

  if (positions.length === 0) {
    return (
      <div className="bg-gray-850 border border-gray-750 rounded-xl p-6 md:p-8 text-center">
        <h3 className="text-gray-400 font-bold mb-2">{title}</h3>
        <p className="text-gray-500 text-sm">No {isClosed ? 'closed' : 'active'} positions found.</p>
      </div>
    );
  }

  return (
    <>
    {activeChargesData && (
        <ChargesModal 
            entry={activeChargesData.entry} 
            exit={activeChargesData.exit} 
            onClose={() => setActiveChargesData(null)} 
        />
    )}

    <div className="bg-gray-850 border border-gray-750 rounded-xl overflow-hidden mb-6">
      <div className="p-3 md:p-4 border-b border-gray-750 flex justify-between items-center bg-gray-900/30">
        <div className="flex items-center gap-3">
            <h3 className="font-bold text-white text-sm md:text-base">{title}</h3>
            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">{positions.length}</span>
            
            {/* Total P&L Badge */}
            <button 
                onClick={onPnlClick}
                className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-mono font-bold ml-2 transition-colors ${totalTablePnl >= 0 ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'}`}
                title="View P&L Chart"
            >
                <TrendingUp size={12} />
                {formatCurrency(totalTablePnl, 0)}
            </button>

            {/* Refresh Button for Open Positions */}
            {!isClosed && onRefresh && (
                <button 
                    onClick={onRefresh} 
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    title="Refresh CMP"
                >
                    <RefreshCw size={14} />
                </button>
            )}
        </div>
        <div className="flex items-center gap-2">
            {!isClosed && onCloseAll && positions.length > 0 && (
                <button 
                    onClick={onCloseAll}
                    className="flex items-center gap-1 text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 px-2 py-1.5 md:px-3 rounded border border-red-900/50 transition-colors"
                    title="Close All Positions"
                >
                    <XCircle size={12} />
                    <span className="hidden sm:inline">Close All</span>
                </button>
            )}
            {isClosed && (
                <button 
                    onClick={() => exportTradesToCSV(positions)}
                    className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1.5 md:px-3 rounded border border-gray-700 transition-colors"
                >
                    <Download size={12} />
                    <span className="hidden sm:inline">Export CSV</span>
                    <span className="sm:hidden">CSV</span>
                </button>
            )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
            <tr>
              <th className="px-3 py-2 md:px-4 md:py-3">Instrument</th>
              <th className="px-3 py-2 md:px-4 md:py-3">Type</th>
              <th className="px-3 py-2 md:px-4 md:py-3 text-right">Qty</th>
              <th className="px-3 py-2 md:px-4 md:py-3 text-right">Price</th>
              <th className="px-3 py-2 md:px-4 md:py-3 text-right">Cap. Inv.</th>
              <th className="px-3 py-2 md:px-4 md:py-3 text-right">Gross P&L</th>
              <th className="px-3 py-2 md:px-4 md:py-3 text-right">Charges</th>
              <th className="px-3 py-2 md:px-4 md:py-3 text-right">Net P&L</th>
              {isClosed && <th className="px-3 py-2 md:px-4 md:py-3 text-right">ROI</th>}
              {!isClosed && <th className="px-3 py-2 md:px-4 md:py-3 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-750">
            {positions.map((pos) => {
              const currentPrice = isClosed ? pos.exitPrice! : (pos.currentLtp || pos.entryPrice);
              
              let grossPnl = pos.grossPnl || 0;
              if (!isClosed && pos.currentLtp) {
                  grossPnl = pos.tradeType === 'BUY' 
                    ? (pos.currentLtp - pos.entryPrice) * pos.quantity 
                    : (pos.entryPrice - pos.currentLtp) * pos.quantity;
              }

              const chargesVal = pos.totalCharges || pos.entryCharges.total;
              const netPnl = isClosed ? (pos.netPnl || 0) : (grossPnl - chargesVal);

              const pnlColor = netPnl >= 0 ? 'text-green-400' : 'text-red-400';
              const roiColor = (pos.roi || 0) >= 0 ? 'text-green-400' : 'text-red-400';

              return (
                <tr key={pos.tradeId} className="hover:bg-gray-800/50 transition-colors group text-xs md:text-sm">
                  <td className="px-3 py-2 md:px-4 md:py-3 font-medium text-white whitespace-nowrap">
                    <div className="flex flex-col">
                        <span>NIFTY {pos.expiry.slice(5)} {pos.strike} {pos.optionType}</span>
                        <span className="text-[10px] text-gray-500">{new Date(pos.entryTime).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 md:px-4 md:py-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] md:text-xs font-bold ${pos.tradeType === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {pos.tradeType}
                    </span>
                  </td>
                  <td className="px-3 py-2 md:px-4 md:py-3 text-right text-gray-400">{pos.quantity}</td>
                  <td className="px-3 py-2 md:px-4 md:py-3 text-right font-mono">
                      <div className="flex flex-col items-end text-[10px] md:text-xs">
                        <span className="text-gray-400">In: {pos.entryPrice.toFixed(2)}</span>
                        <span className="text-white">Cur: {currentPrice.toFixed(2)}</span>
                      </div>
                  </td>
                  <td className="px-3 py-2 md:px-4 md:py-3 text-right font-mono text-gray-400 text-[10px] md:text-xs whitespace-nowrap">
                    {formatCurrency(pos.capitalInvested)}
                  </td>
                  <td className={`px-3 py-2 md:px-4 md:py-3 text-right font-mono whitespace-nowrap ${grossPnl >= 0 ? 'text-green-300/70' : 'text-red-300/70'}`}>
                     {grossPnl > 0 ? '+' : ''}{grossPnl.toFixed(2)}
                  </td>
                  <td 
                    className="px-3 py-2 md:px-4 md:py-3 text-right font-mono text-red-300/70 whitespace-nowrap cursor-pointer"
                    onClick={() => setActiveChargesData({ entry: pos.entryCharges, exit: pos.exitCharges })}
                  >
                      <div className="flex items-center justify-end gap-1 border-b border-dotted border-gray-600 hover:border-gray-400 w-fit ml-auto transition-colors">
                        {chargesVal.toFixed(2)}
                      </div>
                  </td>
                  <td className={`px-3 py-2 md:px-4 md:py-3 text-right font-mono font-bold whitespace-nowrap ${pnlColor}`}>
                    {netPnl > 0 ? '+' : ''}{netPnl.toFixed(2)}
                  </td>
                  {isClosed && (
                      <td className={`px-3 py-2 md:px-4 md:py-3 text-right font-mono font-bold whitespace-nowrap ${roiColor}`}>
                        {pos.roi?.toFixed(2)}%
                      </td>
                  )}
                  {!isClosed && onClosePosition && (
                    <td className="px-3 py-2 md:px-4 md:py-3 text-right">
                       <button 
                       onClick={() => onClosePosition(pos.tradeId)}
                       className="text-[10px] md:text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 md:px-3 rounded transition-colors whitespace-nowrap"
                     >
                       Close
                     </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
};
