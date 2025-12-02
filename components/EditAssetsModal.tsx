import React, { useState, useEffect } from 'react';
import { Asset, AssetType } from '../types';
import { X, Save, Plus, Trash2, TrendingUp, Wallet } from 'lucide-react';

interface EditAssetsModalProps {
  assets: Asset[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedAssets: Asset[]) => void;
  initialTab: 'liquid' | 'investment';
}

const EditAssetsModal: React.FC<EditAssetsModalProps> = ({ assets, isOpen, onClose, onSave, initialTab }) => {
  const [editedAssets, setEditedAssets] = useState<Asset[]>(assets);
  const [activeTab, setActiveTab] = useState<'liquid' | 'investment'>(initialTab);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetAmount, setNewAssetAmount] = useState('');
  const [newAssetType, setNewAssetType] = useState<AssetType>(initialTab === 'liquid' ? 'bank' : 'stock');

  useEffect(() => {
    if (isOpen) {
      setEditedAssets(assets);
      setActiveTab(initialTab);
      setNewAssetType(initialTab === 'liquid' ? 'bank' : 'stock');
    }
  }, [assets, isOpen, initialTab]);

  if (!isOpen) return null;

  const handleChange = (id: string, field: 'name' | 'amount', value: string) => {
    setEditedAssets(prev => prev.map(a => 
      a.id === id ? { ...a, [field]: field === 'amount' ? parseFloat(value) || 0 : value } : a
    ));
  };

  const handleDelete = (id: string) => {
    setEditedAssets(prev => prev.filter(a => a.id !== id));
  };

  const handleAdd = () => {
    if (!newAssetName || !newAssetAmount) return;
    const newAsset: Asset = {
      id: Math.random().toString(36).substr(2, 9),
      name: newAssetName,
      amount: parseFloat(newAssetAmount),
      type: newAssetType,
      change: 0,
      asOfDate: new Date().toISOString()
    };
    setEditedAssets([...editedAssets, newAsset]);
    setNewAssetName('');
    setNewAssetAmount('');
  };

  const handleSave = () => {
    onSave(editedAssets);
    onClose();
  };

  const isLiquid = (type: AssetType) => ['bank', 'credit', 'cash', 'receivable', 'fiat'].includes(type);
  
  const currentList = activeTab === 'liquid' 
    ? editedAssets.filter(a => isLiquid(a.type))
    : editedAssets.filter(a => !isLiquid(a.type));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-charcoal border border-white/10 rounded-3xl w-[95%] max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
        
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-panel rounded-t-3xl">
          <h3 className="text-xl font-bold text-white tracking-tight uppercase">Manage Assets</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex p-4 gap-4 bg-charcoal">
          <button 
            onClick={() => { setActiveTab('liquid'); setNewAssetType('bank'); }}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all uppercase tracking-wide ${activeTab === 'liquid' ? 'bg-accent text-obsidian shadow-lg shadow-accent/20' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'}`}
          >
            <Wallet size={16} /> Wallets
          </button>
          <button 
            onClick={() => { setActiveTab('investment'); setNewAssetType('stock'); }}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all uppercase tracking-wide ${activeTab === 'investment' ? 'bg-panel border border-accent text-accent shadow-lg shadow-accent/10' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'}`}
          >
            <TrendingUp size={16} /> Investments
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/20 custom-scrollbar">
          {currentList.map(asset => (
            <div key={asset.id} className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-accent/30 transition-colors group">
              <div className="flex-1 space-y-2">
                 <div className="flex justify-between items-start">
                    <input 
                      type="text"
                      value={asset.name}
                      onChange={(e) => handleChange(asset.id, 'name', e.target.value)}
                      className="w-full bg-transparent text-sm text-gray-400 font-bold uppercase tracking-wider focus:outline-none focus:text-accent"
                    />
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-white/10 text-gray-500 font-bold uppercase">{asset.type.replace('_', ' ')}</span>
                 </div>
                 <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-bold">₹</span>
                    <input 
                      type="number"
                      value={asset.amount}
                      onChange={(e) => handleChange(asset.id, 'amount', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-7 pr-3 text-white focus:border-accent focus:outline-none transition-all text-sm font-bold"
                    />
                 </div>
              </div>
              <button 
                onClick={() => handleDelete(asset.id)}
                className="p-3 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-colors mt-auto"
                title="Remove Asset"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          <div className="mt-6 pt-6 border-t border-dashed border-white/10">
            <p className="text-xs text-gray-500 mb-3 font-bold uppercase tracking-wider pl-1">Add New Item</p>
            <div className="flex flex-col gap-3">
               <div className="flex flex-col sm:flex-row gap-3">
                 {activeTab === 'liquid' ? (
                     <select 
                        value={newAssetType} 
                        onChange={(e) => setNewAssetType(e.target.value as AssetType)}
                        className="bg-black/40 border border-white/10 rounded-2xl px-3 py-3 text-xs text-gray-300 focus:outline-none font-medium w-full sm:w-auto"
                     >
                        <option value="bank">Bank</option><option value="credit">Credit Card</option><option value="cash">Cash</option><option value="receivable">Receivable</option>
                     </select>
                 ) : (
                    <select 
                        value={newAssetType} 
                        onChange={(e) => setNewAssetType(e.target.value as AssetType)}
                        className="bg-black/40 border border-white/10 rounded-2xl px-3 py-3 text-xs text-gray-300 focus:outline-none font-medium w-full sm:w-auto"
                    >
                        <option value="deposit">Fixed Deposit</option><option value="stock">Stock</option><option value="crypto">Crypto</option><option value="fund">Mutual Fund</option><option value="elss">ELSS</option><option value="real_estate">Real Estate</option><option value="pf">Provident Fund</option>
                    </select>
                 )}
                 <input 
                    type="text" placeholder="Name" value={newAssetName} onChange={(e) => setNewAssetName(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-accent focus:outline-none font-medium"
                />
               </div>
              <div className="flex gap-3">
                <input 
                    type="number" placeholder="Amount" value={newAssetAmount} onChange={(e) => setNewAssetAmount(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-accent focus:outline-none font-medium"
                />
                <button 
                    onClick={handleAdd} disabled={!newAssetName || !newAssetAmount}
                    className="px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:bg-gray-800 text-white rounded-2xl transition-colors flex items-center justify-center shrink-0"
                >
                    <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-panel rounded-b-3xl">
          <button 
            onClick={handleSave}
            className="w-full bg-accent hover:bg-teal-400 text-obsidian font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all uppercase tracking-wide text-sm"
          >
            <Save size={18} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditAssetsModal;