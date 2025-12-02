import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Asset, AssetType } from '../types';
import { fetchStockPrice } from '../services/geminiService';
import { INDIAN_RUPEE, USD_CURRENCY, PIE_CHART_COLORS } from '../constants';
import { 
    TrendingUp, 
    IndianRupee, 
    DollarSign, 
    Boxes, 
    ShieldCheck, 
    Gem, 
    Bitcoin,
    Plus,
    BarChart2,
    Loader2,
    Trash2,
    Edit2,
    X,
    Save,
    ArrowUp,
    ArrowDown,
    CheckSquare,
    Square,
    AlertCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface CapitalMarketsViewProps {
  assets: Asset[];
  onSaveAssets: (updatedAssets: Asset[]) => void;
}

type SubView = 'dashboard' | 'indian_stocks' | 'us_stocks' | 'mutual_funds' | 'nps' | 'metals' | 'crypto';


// --- Edit Asset Modal ---
const EditAssetModal = ({ asset, onClose, onSave }: { asset: Asset, onClose: () => void, onSave: (data: Partial<Asset>) => void }) => {
    const [name, setName] = useState(asset.name);
    const [quantity, setQuantity] = useState(asset.quantity?.toString() || '');
    const [cost, setCost] = useState(asset.costPerUnit?.toString() || '');

    const handleSave = () => {
        onSave({
            id: asset.id,
            name,
            quantity: parseFloat(quantity) || 0,
            costPerUnit: parseFloat(cost) || 0,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-panel border border-white/10 rounded-3xl w-[95%] max-w-md shadow-2xl p-8">
                <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-tight">Edit Asset</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1 block">Asset Name/Symbol</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-charcoal border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-accent focus:outline-none" autoFocus />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1 block">Quantity</label>
                            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-charcoal border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-accent focus:outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1 block">Avg. Cost</label>
                            <input type="number" value={cost} onChange={e => setCost(e.target.value)} className="w-full bg-charcoal border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-accent focus:outline-none" />
                        </div>
                    </div>
                    <button onClick={handleSave} className="w-full bg-accent hover:bg-blue-400 text-obsidian font-bold py-3.5 rounded-2xl mt-4 transition-all uppercase tracking-wide text-sm shadow-lg shadow-accent/20 flex items-center justify-center gap-2">
                        <Save size={16} /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Investment Dashboard ---
const DashboardContent = ({ assets }: { assets: Asset[] }) => {
    const { totalInvestment, currentValue, overallPnl, overallPnlPercent, allocationData, performers } = useMemo(() => {
        let totalInvestment = 0;
        let currentValue = 0;
        
        const allocationMap: Record<string, number> = {};
        
        const processedAssets = assets.map(asset => {
            const investment = (asset.quantity || 0) * (asset.costPerUnit || 0);
            const value = asset.amount;
            const pnl = value - investment;
            const pnlPercent = investment > 0 ? (pnl / investment) * 100 : 0;
            
            totalInvestment += investment;
            currentValue += value;

            const typeLabel = asset.type.replace('_', ' ').toUpperCase();
            allocationMap[typeLabel] = (allocationMap[typeLabel] || 0) + value;

            return { ...asset, pnl, pnlPercent };
        });

        const overallPnl = currentValue - totalInvestment;
        const overallPnlPercent = totalInvestment > 0 ? (overallPnl / totalInvestment) * 100 : 0;
        
        const allocationData = Object.entries(allocationMap).map(([name, value]) => ({ name, value }));

        processedAssets.sort((a, b) => b.pnlPercent - a.pnlPercent);
        const topPerformers = processedAssets.slice(0, 5);
        const bottomPerformers = processedAssets.length > 5 ? processedAssets.slice(-5).reverse() : [];

        return { totalInvestment, currentValue, overallPnl, overallPnlPercent, allocationData, performers: { top: topPerformers, bottom: bottomPerformers } };
    }, [assets]);
    
    const PerfList = ({ title, data, isGainers }: { title: string, data: any[], isGainers: boolean }) => (
       <div>
         <h4 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isGainers ? 'text-positive' : 'text-neon-red'}`}>{title}</h4>
         <div className="space-y-2">
            {data.length === 0 && <p className="text-xs text-muted italic">Not enough data.</p>}
            {data.map(asset => (
                <div key={asset.id} className="flex justify-between items-center text-xs p-2 rounded-lg hover:bg-white/5">
                    <span className="font-semibold text-white truncate w-2/3">{asset.name}</span>
                    <span className={`font-mono font-bold flex items-center gap-1 ${isGainers ? 'text-positive' : 'text-neon-red'}`}>
                        {isGainers ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {asset.pnlPercent.toFixed(1)}%
                    </span>
                </div>
            ))}
         </div>
       </div>
    );

    return (
      <div className="mt-6 space-y-6 animate-in fade-in duration-500">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-panel border border-border rounded-2xl p-6">
                <p className="text-sm font-bold text-muted uppercase tracking-wider mb-2">Current Value</p>
                <p className="text-3xl font-bold text-white font-mono">{INDIAN_RUPEE.format(currentValue)}</p>
            </div>
             <div className="bg-panel border border-border rounded-2xl p-6">
                <p className="text-sm font-bold text-muted uppercase tracking-wider mb-2">Total Investment</p>
                <p className="text-3xl font-bold text-white font-mono">{INDIAN_RUPEE.format(totalInvestment)}</p>
            </div>
             <div className="bg-panel border border-border rounded-2xl p-6">
                <p className="text-sm font-bold text-muted uppercase tracking-wider mb-2">Overall P&L</p>
                <div className={`text-3xl font-bold font-mono flex items-center gap-3 ${overallPnl >= 0 ? 'text-positive' : 'text-neon-red'}`}>
                    <span>{overallPnl >= 0 ? '+' : ''}{INDIAN_RUPEE.format(overallPnl)}</span>
                    <span className="text-base">({overallPnlPercent.toFixed(2)}%)</span>
                </div>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
             <div className="lg:col-span-3 bg-panel border border-border rounded-2xl p-4 sm:p-6 h-[400px] flex flex-col">
                <h3 className="text-lg font-bold text-white mb-4">Asset Allocation</h3>
                 {/* Fixed Height Container to prevent Recharts -1 error */}
                 <div className="w-full h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={allocationData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={5}>
                                {allocationData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#131635', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '1rem', fontFamily: 'Urbanist' }}
                                formatter={(value: number) => [INDIAN_RUPEE.format(value), 'Value']}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                 </div>
             </div>
             <div className="lg:col-span-2 bg-panel border border-border rounded-2xl p-4 sm:p-6 h-[400px] flex flex-col justify-between">
                <PerfList title="Top Gainers" data={performers.top} isGainers={true} />
                <div className="border-t border-dashed border-border my-4"></div>
                <PerfList title="Top Losers" data={performers.bottom} isGainers={false} />
             </div>
         </div>
      </div>
    );
};

// --- A reusable component for each asset category view ---
interface AssetCategoryViewProps {
    config: any;
    assets: Asset[];
    onAddAsset: (data: { symbol: string; quantity: number; cost: number; }) => Promise<void>;
    onDeleteAssets: (ids: string[]) => void;
    onEditAsset: (asset: Asset) => void;
}

const AssetCategoryView: React.FC<AssetCategoryViewProps> = ({ config, assets, onAddAsset, onDeleteAssets, onEditAsset }) => {
    const portfolioAssets = assets.filter(a => a.type === config.assetType);
    
    // Selection & Bulk Actions State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    // Add Asset State
    const [input1, setInput1] = useState(''); // symbol
    const [input2, setInput2] = useState(''); // quantity
    const [input3, setInput3] = useState(''); // cost
    const [isAdding, setIsAdding] = useState(false);
    
    // Two-Step Delete State (Row)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const deleteTimeoutRef = useRef<number | null>(null);

    // Two-Step Delete State (Bulk)
    const [isConfirmingBulk, setIsConfirmingBulk] = useState(false);
    const bulkDeleteTimeoutRef = useRef<number | null>(null);

    // Cleanup timeouts
    useEffect(() => {
        return () => {
            if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
            if (bulkDeleteTimeoutRef.current) clearTimeout(bulkDeleteTimeoutRef.current);
        };
    }, []);

    // Selection Handlers
    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === portfolioAssets.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(portfolioAssets.map(a => a.id)));
        }
    };

    // Add Asset Handler
    const currencyFormatter = config.assetType === 'us_stock' ? USD_CURRENCY : INDIAN_RUPEE;

    const handleAddClick = async () => {
        if (!input1 || !input2 || !input3) {
            alert('Please fill all fields.');
            return;
        }
        setIsAdding(true);
        await onAddAsset({
            symbol: input1,
            quantity: parseFloat(input2),
            cost: parseFloat(input3.replace(/[^0-9.]/g, '')),
        });
        setInput1('');
        setInput2('');
        setInput3('');
        setIsAdding(false);
    };

    // --- Row Delete Handler (2-Step) ---
    const handleRemoveClick = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (confirmDeleteId === id) {
            onDeleteAssets([id]);
            setConfirmDeleteId(null);
            if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
        } else {
            setConfirmDeleteId(id);
            if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
            deleteTimeoutRef.current = window.setTimeout(() => {
                setConfirmDeleteId((prev) => (prev === id ? null : prev));
            }, 3000);
        }
    };

    // --- Bulk Delete Handler (2-Step) ---
    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;

        if (isConfirmingBulk) {
            onDeleteAssets(Array.from(selectedIds));
            setSelectedIds(new Set());
            setIsConfirmingBulk(false);
            if (bulkDeleteTimeoutRef.current) clearTimeout(bulkDeleteTimeoutRef.current);
        } else {
            setIsConfirmingBulk(true);
            if (bulkDeleteTimeoutRef.current) clearTimeout(bulkDeleteTimeoutRef.current);
            bulkDeleteTimeoutRef.current = window.setTimeout(() => {
                setIsConfirmingBulk(false);
            }, 3000);
        }
    };

    return (
        <div className="mt-6 space-y-6 animate-in fade-in duration-500">
            {/* Add Asset Form - Full Width */}
            <div className="bg-panel border border-border rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2 md:col-span-1">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider pl-1">{config.labels.input1}</label>
                        <input type="text" value={input1} onChange={(e) => setInput1(e.target.value)} placeholder={config.placeholders.input1} className="w-full bg-charcoal border border-border rounded-2xl px-3 py-2.5 text-white placeholder-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all text-sm" />
                    </div>
                    <div className="space-y-2 md:col-span-1">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider pl-1">{config.labels.input2}</label>
                        <input type="number" value={input2} onChange={(e) => setInput2(e.target.value)} placeholder={config.placeholders.input2} className="w-full bg-charcoal border border-border rounded-2xl px-3 py-2.5 text-white placeholder-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all text-sm" />
                    </div>
                    <div className="space-y-2 md:col-span-1">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider pl-1">{config.labels.input3}</label>
                        <input type="text" value={input3} onChange={(e) => setInput3(e.target.value)} placeholder={config.placeholders.input3} className="w-full bg-charcoal border border-border rounded-2xl px-3 py-2.5 text-white placeholder-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all text-sm" />
                    </div>
                    <button onClick={handleAddClick} disabled={isAdding} className="bg-brand hover:bg-brand-hover text-white font-bold py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand/20 h-fit disabled:opacity-50 disabled:cursor-wait text-sm md:col-span-1">
                        {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {isAdding ? 'Adding' : 'Add'}
                    </button>
                </div>
            </div>

            {/* Table Panel with Header */}
            <div className="bg-panel border border-border rounded-2xl overflow-hidden">
                {/* Header Row with Bulk Delete */}
                <div className="p-4 border-b border-border flex justify-between items-center bg-charcoal/30">
                     <div className="flex items-center gap-3">
                         <span className="text-sm font-bold text-white uppercase tracking-wider pl-2">Portfolio Assets</span>
                         <span className="text-xs text-muted font-mono px-2 py-0.5 bg-white/5 rounded-md">{portfolioAssets.length} Items</span>
                     </div>
                     
                     <button
                        onClick={handleBulkDelete}
                        disabled={selectedIds.size === 0}
                        className={`
                            px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all uppercase tracking-wide border font-mono
                            ${selectedIds.size === 0 
                                ? 'bg-charcoal text-muted border-border opacity-40 cursor-not-allowed' 
                                : isConfirmingBulk 
                                    ? 'bg-neon-red text-white border-neon-red hover:bg-red-600 shadow-lg shadow-neon-red/20' 
                                    : 'bg-neon-red/10 text-neon-red border-neon-red/20 hover:border-neon-red/50 hover:bg-neon-red/20'
                            }
                        `}
                    >
                        {isConfirmingBulk ? <AlertCircle size={14} /> : <Trash2 size={14} />}
                        <span className="hidden sm:inline">{isConfirmingBulk ? `CONFIRM (${selectedIds.size})?` : 'Delete Selected'}</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[800px]">
                        <thead className="border-b border-border bg-charcoal/50">
                            <tr>
                                <th className="pl-4 pr-2 py-4 w-12 text-center">
                                    <button onClick={toggleSelectAll} className="hover:text-white text-muted transition-colors">
                                        {selectedIds.size > 0 && selectedIds.size === portfolioAssets.length ? <CheckSquare size={18} className="text-brand"/> : <Square size={18} />}
                                    </button>
                                </th>
                                {config.tableHeaders.map((header: string) => (
                                    <th key={header} className={`text-left text-xs font-bold text-muted uppercase tracking-wider pb-4 px-2 sm:px-4 pt-6 ${header.includes('COST') || header.includes('PRICE') || header.includes('VALUE') || header.includes('P&L') ? 'text-right' : ''}`}>{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {portfolioAssets.length === 0 ? (
                                <tr>
                                    <td colSpan={config.tableHeaders.length + 1} className="text-center py-20">
                                        <div className="flex flex-col items-center gap-4 text-muted">
                                            <BarChart2 size={40} className="text-charcoal" />
                                            <h3 className="font-bold text-lg text-white">Your portfolio for this category is empty.</h3>
                                            <p className="text-sm">Add an asset to get started.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                portfolioAssets.map(asset => {
                                    const currentValue = (asset.quantity || 0) * (asset.currentPrice || 0);
                                    const totalCost = (asset.quantity || 0) * (asset.costPerUnit || 0);
                                    const pnl = currentValue - totalCost;
                                    const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
                                    const isSelected = selectedIds.has(asset.id);
                                    const isConfirming = confirmDeleteId === asset.id;

                                    return (
                                        <tr key={asset.id} className={`border-b border-border last:border-0 transition-colors group ${isSelected ? 'bg-brand/10' : 'hover:bg-charcoal/40'} ${isConfirming ? 'bg-neon-red/5' : ''}`}>
                                            <td className="pl-4 pr-2 py-4 text-center cursor-pointer" onClick={() => toggleSelection(asset.id)}>
                                                {isSelected ? <CheckSquare size={18} className="text-brand"/> : <Square size={18} className="text-muted group-hover:text-white"/>}
                                            </td>
                                            <td className="px-2 sm:px-4 py-4 font-semibold text-white truncate max-w-[150px] cursor-pointer" onClick={() => toggleSelection(asset.id)}>
                                                {asset.name}
                                            </td>
                                            <td className="px-2 sm:px-4 py-4 text-right font-mono cursor-pointer" onClick={() => toggleSelection(asset.id)}>{asset.quantity}</td>
                                            <td className="px-2 sm:px-4 py-4 text-right font-mono text-muted cursor-pointer" onClick={() => toggleSelection(asset.id)}>{currencyFormatter.format(asset.costPerUnit || 0)}</td>
                                            <td className="px-2 sm:px-4 py-4 text-right font-mono text-white cursor-pointer" onClick={() => toggleSelection(asset.id)}>{currencyFormatter.format(asset.currentPrice || 0)}</td>
                                            <td className="px-2 sm:px-4 py-4 text-right font-mono font-bold text-white cursor-pointer" onClick={() => toggleSelection(asset.id)}>{currencyFormatter.format(currentValue)}</td>
                                            <td className={`px-2 sm:px-4 py-4 text-right font-mono font-bold cursor-pointer ${pnl >= 0 ? 'text-positive' : 'text-neon-red'}`} onClick={() => toggleSelection(asset.id)}>
                                                <div className="flex flex-col items-end">
                                                    <span>{currencyFormatter.format(pnl)}</span>
                                                    <span className="text-xs">({pnlPercent.toFixed(2)}%)</span>
                                                </div>
                                            </td>
                                            <td className="px-2 sm:px-4 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => onEditAsset(asset)} className="text-muted hover:text-brand p-2 hover:bg-brand/10 rounded-full transition-colors" title="Edit"><Edit2 size={14} /></button>
                                                    {/* Row Level 2-Step Remove Button */}
                                                    <button 
                                                        onClick={(e) => handleRemoveClick(e, asset.id)}
                                                        className={`
                                                            px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all shadow-sm border flex items-center gap-1
                                                            ${isConfirming 
                                                                ? 'bg-neon-red text-white border-neon-red hover:bg-red-600 scale-105' 
                                                                : 'bg-neon-red/10 text-neon-red border-neon-red/20 hover:border-neon-red/50 hover:bg-neon-red/20'
                                                            }
                                                        `}
                                                        title={isConfirming ? "Click again to confirm" : "Remove Asset"}
                                                    >
                                                        {isConfirming ? (
                                                            <>SURE?</>
                                                        ) : (
                                                            "REMOVE"
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


const CapitalMarketsView: React.FC<CapitalMarketsViewProps> = ({ assets, onSaveAssets }) => {
    const [activeView, setActiveView] = useState<SubView>('dashboard');
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
        { id: 'indian_stocks', label: 'Indian Stocks', icon: IndianRupee },
        { id: 'us_stocks', label: 'US Stocks', icon: DollarSign },
        { id: 'mutual_funds', label: 'Mutual Funds', icon: Boxes },
        { id: 'nps', label: 'NPS', icon: ShieldCheck },
        { id: 'metals', label: 'Metals', icon: Gem },
        { id: 'crypto', label: 'Crypto', icon: Bitcoin },
    ];
    
    const categoryConfig: Record<string, any> = {
        indian_stocks: { assetType: 'stock', fetchPrice: true, labels: { input1: 'Stock Symbol', input2: 'Shares', input3: 'Avg. Cost / Share' }, placeholders: { input1: 'RELIANCE.NS', input2: '10', input3: '₹150.00' }, tableHeaders: ['ASSET', 'SHARES', 'AVG. COST', 'CURRENT PRICE', 'CURRENT VALUE', 'P&L', 'ACTIONS'], },
        us_stocks: { assetType: 'us_stock', fetchPrice: true, labels: { input1: 'Stock Symbol', input2: 'Shares', input3: 'Avg. Cost / Share' }, placeholders: { input1: 'AAPL', input2: '10', input3: '$150.00' }, tableHeaders: ['ASSET', 'SHARES', 'AVG. COST', 'CURRENT PRICE', 'CURRENT VALUE', 'P&L', 'ACTIONS'], },
        mutual_funds: { assetType: 'fund', fetchPrice: true, labels: { input1: 'Fund Symbol', input2: 'Units', input3: 'Avg. NAV' }, placeholders: { input1: '0P0000X612.BO', input2: '10', input3: '₹75.50' }, tableHeaders: ['ASSET', 'UNITS', 'AVG. NAV', 'CURRENT NAV', 'CURRENT VALUE', 'P&L', 'ACTIONS'], },
        metals: { assetType: 'metal', fetchPrice: true, labels: { input1: 'Metal Symbol', input2: 'Grams', input3: 'Avg. Cost / Gram' }, placeholders: { input1: 'GOLD', input2: '10', input3: '₹7100.00' }, tableHeaders: ['ASSET', 'GRAMS', 'AVG. COST', 'CURRENT PRICE', 'CURRENT VALUE', 'P&L', 'ACTIONS'], },
        crypto: { assetType: 'crypto', fetchPrice: true, labels: { input1: 'Crypto Symbol', input2: 'Coins', input3: 'Avg. Cost / Coin' }, placeholders: { input1: 'BTC', input2: '0.1', input3: '₹5500000' }, tableHeaders: ['ASSET', 'COINS', 'AVG. COST', 'CURRENT PRICE', 'CURRENT VALUE', 'P&L', 'ACTIONS'], },
        nps: { assetType: 'nps', fetchPrice: false, labels: { input1: 'Scheme Name', input2: 'Contribution', input3: 'Current Value' }, placeholders: { input1: 'Tier 1 Equity', input2: '₹50,000', input3: '₹55,000' }, tableHeaders: ['SCHEME', 'CONTRIBUTION', 'VALUE', 'P&L', 'ACTIONS'], },
    };

    const handleAddAsset = async (newAssetData: { symbol: string; quantity: number; cost: number; }) => {
        const config = categoryConfig[activeView];
        if (!config) return;

        const { symbol, quantity, cost } = newAssetData;
        
        let currentPrice: number | null = null;
        if (config.fetchPrice) {
            currentPrice = await fetchStockPrice(symbol, config.assetType);
        } else {
            currentPrice = cost;
        }

        if (currentPrice === null) {
            alert(`Could not determine the price for ${symbol}. Please check the symbol or enter manually.`);
            return;
        }

        const newAsset: Asset = {
            id: Math.random().toString(36).substr(2, 9),
            name: symbol.toUpperCase(),
            type: config.assetType,
            quantity: quantity,
            costPerUnit: cost,
            currentPrice: currentPrice,
            amount: quantity * currentPrice,
            asOfDate: new Date().toISOString(),
        };

        const updatedAssets = [...assets, newAsset];
        onSaveAssets(updatedAssets);
    };

    const handleDeleteAssets = (ids: string[]) => {
        const updatedAssets = assets.filter(a => !ids.includes(a.id));
        onSaveAssets(updatedAssets);
    };

    const handleUpdateAsset = (updatedData: Partial<Asset>) => {
        if (!updatedData.id) return;
        const updatedAssets = assets.map(asset => {
            if (asset.id === updatedData.id) {
                const newQuantity = updatedData.quantity || asset.quantity || 0;
                return {
                    ...asset,
                    name: updatedData.name || asset.name,
                    quantity: newQuantity,
                    costPerUnit: updatedData.costPerUnit || asset.costPerUnit,
                    amount: newQuantity * (asset.currentPrice || 0),
                };
            }
            return asset;
        });
        onSaveAssets(updatedAssets);
    };

    const investmentAssets = useMemo(() => assets.filter(a => !['bank', 'credit', 'cash', 'receivable'].includes(a.type)), [assets]);

    const renderContent = () => {
        if (activeView === 'dashboard') {
            return <DashboardContent assets={investmentAssets} />;
        }
        const config = categoryConfig[activeView];
        if (config) {
            return <AssetCategoryView 
                config={config} 
                assets={assets} 
                onAddAsset={handleAddAsset} 
                onDeleteAssets={handleDeleteAssets} 
                onEditAsset={setEditingAsset} 
            />;
        }
        return (
            <div className="mt-8 text-center bg-panel border border-border rounded-3xl p-16 animate-in fade-in duration-500">
                <h2 className="text-2xl font-bold text-white">{navItems.find(item => item.id === activeView)?.label}</h2>
                <p className="text-muted">Content for this section is under development.</p>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className="bg-panel border border-border rounded-2xl p-1.5 overflow-x-auto no-scrollbar">
                <nav className="flex items-center space-x-1 sm:space-x-2">
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const isActive = activeView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveView(item.id as SubView)}
                                className={`relative flex-shrink-0 flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300
                                    ${isActive ? 'text-white' : 'text-muted hover:text-white hover:bg-white/5'}
                                `}
                            >
                                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="whitespace-nowrap">{item.label}</span>
                                {isActive && <div className="absolute -bottom-[7px] left-0 right-0 h-0.5 bg-brand rounded-full animate-in fade-in duration-300"></div>}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {renderContent()}
            
            {editingAsset && (
                <EditAssetModal
                    asset={editingAsset}
                    onClose={() => setEditingAsset(null)}
                    onSave={handleUpdateAsset}
                />
            )}
        </div>
    );
};

export default CapitalMarketsView;