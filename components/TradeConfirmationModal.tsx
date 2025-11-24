import React from 'react';
import { OptionType, TradeType } from '../types';
import { calculateTradeDetails, formatCurrency } from '../services/mathUtils';
import { CheckCircle2, XCircle, Info, Wallet } from 'lucide-react';
import { APP_CONFIG } from '../constants';

interface Props {
  strike: number;
  optionType: OptionType;
  tradeType: TradeType;
  price: number;
  lots: number;
  currentBalance: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const TradeConfirmationModal: React.FC<Props> = ({
  strike,
  optionType,
  tradeType,
  price,
  lots,
  currentBalance,
  onConfirm,
  onCancel
}) => {
  const qty = lots * APP_CONFIG.LOT_SIZE;
  const { marginRequired, charges, breakevenPrice, turnover } = calculateTradeDetails(
      price, strike, optionType, tradeType, lots
  );

  // For SELL: Margin is blocked + charges paid
  // For BUY: Premium is paid + charges paid
  const totalCost = (tradeType === 'SELL' ? marginRequired : turnover) + charges.total;
  const projectedBalance = currentBalance - totalCost;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        
        <div className="p-6 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Confirm Order
                <span className={`text-xs px-2 py-1 rounded font-bold ${tradeType === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {tradeType}
                </span>
            </h2>
            <div className="mt-1 text-gray-400 text-sm">
                NIFTY <span className="text-white font-mono">{strike} {optionType}</span> @ ₹{price.toFixed(2)}
            </div>
        </div>

        <div className="p-6 space-y-4">
            
            {/* Balance Preview - NEW */}
            <div className="bg-gray-950 rounded-xl border border-gray-800 p-3 flex flex-col gap-2">
                 <div className="flex justify-between items-center text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Wallet size={12}/> Current Balance</span>
                    <span className="font-mono">{formatCurrency(currentBalance, 0)}</span>
                 </div>
                 <div className="flex justify-between items-center text-xs text-red-400">
                    <span>Less: Total Cost</span>
                    <span className="font-mono">-{formatCurrency(totalCost, 0)}</span>
                 </div>
                 <div className="h-px bg-gray-800 my-1"></div>
                 <div className="flex justify-between items-center text-sm font-bold text-white">
                    <span>Projected Balance</span>
                    <span className="font-mono">{formatCurrency(projectedBalance, 0)}</span>
                 </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Net Premium</div>
                    <div className="text-white font-medium font-mono">{formatCurrency(turnover)}</div>
                </div>
                <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Breakeven</div>
                    <div className="text-blue-300 font-medium font-mono">{breakevenPrice.toFixed(2)}</div>
                </div>
            </div>

            {/* Charges Breakdown */}
            <div className="bg-gray-950 rounded-xl border border-gray-800 p-4 text-xs space-y-2">
                 <div className="flex items-center gap-2 text-gray-400 font-bold uppercase text-[10px] mb-2">
                    <Info size={12} /> Estimated Charges Breakdown
                 </div>
                 
                 <div className="grid grid-cols-2 gap-y-1 text-gray-500">
                    <div className="flex justify-between pr-2"><span>Brokerage:</span> <span>₹{charges.brokerage}</span></div>
                    <div className="flex justify-between pl-2 border-l border-gray-800"><span>STT:</span> <span>₹{charges.stt.toFixed(2)}</span></div>
                    
                    <div className="flex justify-between pr-2"><span>Exchange:</span> <span>₹{charges.exchangeTxn.toFixed(2)}</span></div>
                    <div className="flex justify-between pl-2 border-l border-gray-800"><span>Stamp Duty:</span> <span>₹{charges.stampDuty.toFixed(2)}</span></div>
                    
                    <div className="flex justify-between pr-2"><span>SEBI/IPFT:</span> <span>₹{(charges.sebi + charges.ipft).toFixed(2)}</span></div>
                    <div className="flex justify-between pl-2 border-l border-gray-800"><span>GST (18%):</span> <span>₹{charges.gst.toFixed(2)}</span></div>
                 </div>
                 
                 <div className="pt-2 mt-2 border-t border-gray-800 flex justify-between font-bold text-red-300">
                    <span>Total Charges:</span>
                    <span>{formatCurrency(charges.total)}</span>
                 </div>
            </div>

            {/* Margin Alert */}
            <div className={`p-4 rounded-xl border ${tradeType === 'SELL' ? 'bg-orange-500/10 border-orange-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-bold uppercase ${tradeType === 'SELL' ? 'text-orange-400' : 'text-blue-400'}`}>
                        {tradeType === 'SELL' ? 'Est. Margin Blocked' : 'Premium Deducted'}
                    </span>
                    <span className="text-lg font-bold text-white font-mono">
                        {formatCurrency(marginRequired)}
                    </span>
                </div>
                <p className="text-[10px] text-gray-500">
                    {tradeType === 'SELL' 
                        ? "Margin blocked + charges deducted from balance." 
                        : "Premium + charges deducted from available balance."}
                </p>
            </div>

        </div>

        <div className="p-4 bg-gray-950 border-t border-gray-800 flex gap-3">
            <button 
                onClick={onCancel}
                className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
                <XCircle size={18} />
                Cancel
            </button>
            <button 
                onClick={onConfirm}
                className={`flex-1 px-4 py-3 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-lg ${tradeType === 'BUY' ? 'bg-green-600 hover:bg-green-700 shadow-green-900/20' : 'bg-red-600 hover:bg-red-700 shadow-red-900/20'}`}
            >
                <CheckCircle2 size={18} />
                Confirm
            </button>
        </div>

      </div>
    </div>
  );
};