import React from 'react';
import { Asset } from '../types';
import { INDIAN_RUPEE } from '../constants';
import { Plus, RefreshCcw, Calendar, ChevronDown, AlertCircle } from 'lucide-react';

interface WalletsViewProps {
  assets: Asset[];
  onEditAssets: (initialTab: 'liquid' | 'investment') => void;
  selectedMonth: string;
  availableMonths: string[];
  onMonthChange: (month: string) => void;
}

const WalletsView: React.FC<WalletsViewProps> = ({ 
    assets, 
    onEditAssets, 
    selectedMonth,
    availableMonths,
    onMonthChange
}) => {
  const bankAccounts = assets.filter(a => a.type === 'bank');
  const creditCards = assets.filter(a => a.type === 'credit');
  const cash = assets.filter(a => a.type === 'cash');

  const fixedDeposits = assets.filter(a => a.type === 'deposit');
  const stocks = assets.filter(a => a.type === 'stock');
  const crypto = assets.filter(a => a.type === 'crypto');
  const funds = assets.filter(a => a.type === 'fund');
  const elss = assets.filter(a => a.type === 'elss');

  const CardGroup = ({ title, items, onAdd }: { title: string, items: Asset[], onAdd: () => void }) => (
    <div className="bg-panel border border-border rounded-3xl p-6 min-h-[180px] flex flex-col relative group transition-all duration-300 hover:border-brand/30 hover:shadow-lg shadow-black/20">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-white font-bold text-lg tracking-tight">{title}</h3>
        <button 
            onClick={onAdd}
            className="p-2 rounded-full bg-white/5 hover:bg-brand hover:text-white text-muted transition-colors"
        >
            <Plus size={18} />
        </button>
      </div>
      <div className="space-y-4 flex-1">
        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted text-sm h-full min-h-[60px] italic">No active assets.</div>
        ) : (
          items.map(item => (
            <div key={item.id} className="flex items-center justify-between group/item p-3 bg-charcoal rounded-2xl border border-transparent hover:border-white/10 transition-colors">
              <div className="max-w-[60%]">
                <p className="text-muted font-medium text-xs uppercase tracking-wider truncate mb-1">{item.name}</p>
                <p className={`text-lg font-bold font-mono ${item.type === 'credit' ? 'text-neon-red' : 'text-white'}`}>
                    {INDIAN_RUPEE.format(item.amount)}
                </p>
              </div>
              {item.change !== undefined && item.change !== 0 && (
                 <div className={`px-2 py-1 rounded-lg text-xs font-bold ${item.change > 0 ? 'bg-positive/10 text-positive' : 'bg-neon-red/10 text-neon-red'}`}>
                     {item.change > 0 ? '▲' : '▼'} {Math.abs(item.change)}%
                 </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      <div className="bg-panel border border-border rounded-3xl p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
         <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">Wallets & Assets</h2>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted">Balances as of end of:</p>
                <span className="text-sm font-bold text-brand">{selectedMonth}</span>
            </div>
         </div>
         <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
            <button className="flex justify-center items-center gap-2 px-5 py-3 bg-brand/10 text-brand border border-brand/20 rounded-2xl text-sm font-bold hover:bg-brand/20 transition-all">
                <RefreshCcw size={16} /> Sync Accounts
            </button>
            <div className="relative group">
                <div className="flex items-center gap-2 px-5 py-3 bg-charcoal border border-border rounded-2xl text-sm text-muted font-bold min-w-[160px] cursor-pointer hover:border-brand hover:text-white transition-colors">
                    <Calendar size={16} />
                    <span>{selectedMonth}</span>
                    <ChevronDown size={16} className="ml-auto" />
                </div>
                <select 
                    value={selectedMonth}
                    onChange={(e) => onMonthChange(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                >
                    {availableMonths.map(month => (
                        <option key={month} value={month}>{month}</option>
                    ))}
                </select>
            </div>
         </div>
      </div>

      <div>
         <div className="mb-6 border-l-4 border-brand pl-4">
            <h3 className="text-xl font-bold text-white mb-1">Liquidity</h3>
            <p className="text-sm text-muted">Readily available funds for daily operations.</p>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <CardGroup title="Bank Accounts" items={bankAccounts} onAdd={() => onEditAssets('liquid')} />
            <CardGroup title="Credit Cards" items={creditCards} onAdd={() => onEditAssets('liquid')} />
            <CardGroup title="Cash on Hand" items={cash} onAdd={() => onEditAssets('liquid')} />
         </div>
      </div>

      <div>
         <div className="mb-6 border-l-4 border-neon-violet pl-4">
            <h3 className="text-xl font-bold text-white mb-1">Reserves</h3>
            <p className="text-sm text-muted">Long-term investments and wealth accumulation.</p>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <CardGroup title="Fixed Deposits" items={fixedDeposits} onAdd={() => onEditAssets('investment')} />
            <CardGroup title="Stocks & Equity" items={stocks} onAdd={() => onEditAssets('investment')} />
            <CardGroup title="Crypto Assets" items={crypto} onAdd={() => onEditAssets('investment')} />
            <CardGroup title="Mutual Funds" items={funds} onAdd={() => onEditAssets('investment')} />
            <CardGroup title="ELSS & Tax Saving" items={elss} onAdd={() => onEditAssets('investment')} />
         </div>
      </div>

    </div>
  );
};

export default WalletsView;