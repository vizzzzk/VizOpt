import React, { useState, useEffect } from 'react';
import { Category, PaymentMethod, Transaction, TransactionNature } from '../types';
import { X, Save, CheckSquare, Square } from 'lucide-react';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Transaction>) => void;
  selectedCount: number;
}

const BulkEditModal: React.FC<BulkEditModalProps> = ({ isOpen, onClose, onSave, selectedCount }) => {
  const [category, setCategory] = useState<Category>(Category.Food);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [nature, setNature] = useState<TransactionNature>('want');
  
  const [updateCategory, setUpdateCategory] = useState(false);
  const [updatePaymentMethod, setUpdatePaymentMethod] = useState(false);
  const [updateNature, setUpdateNature] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUpdateCategory(false);
      setUpdatePaymentMethod(false);
      setUpdateNature(false);
      setCategory(Category.Food);
      setPaymentMethod(PaymentMethod.UPI);
      setNature('want');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const updates: Partial<Transaction> = {};
    if (updateCategory) updates.category = category;
    if (updatePaymentMethod) updates.paymentMethod = paymentMethod;
    if (updateNature) updates.nature = nature;

    if (Object.keys(updates).length > 0) {
      onSave(updates);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-charcoal border border-white/10 rounded-3xl w-[95%] max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-panel rounded-t-3xl">
          <h3 className="text-lg font-bold text-white tracking-tight uppercase">Bulk Edit ({selectedCount})</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto">
          {/* Category Selection */}
          <div className={`p-5 rounded-2xl border transition-all ${updateCategory ? 'bg-accent/5 border-accent/30' : 'bg-black/20 border-white/5'}`}>
            <div className="flex items-center gap-3 mb-3 cursor-pointer" onClick={() => setUpdateCategory(!updateCategory)}>
              {updateCategory ? <CheckSquare size={18} className="text-accent" /> : <Square size={18} className="text-gray-500" />}
              <span className={`text-sm font-bold uppercase tracking-wider ${updateCategory ? 'text-white' : 'text-gray-500'}`}>Change Category</span>
            </div>
            <select
              disabled={!updateCategory}
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {Object.values(Category).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Payment Method Selection */}
          <div className={`p-5 rounded-2xl border transition-all ${updatePaymentMethod ? 'bg-accent/5 border-accent/30' : 'bg-black/20 border-white/5'}`}>
            <div className="flex items-center gap-3 mb-3 cursor-pointer" onClick={() => setUpdatePaymentMethod(!updatePaymentMethod)}>
              {updatePaymentMethod ? <CheckSquare size={18} className="text-accent" /> : <Square size={18} className="text-gray-500" />}
              <span className={`text-sm font-bold uppercase tracking-wider ${updatePaymentMethod ? 'text-white' : 'text-gray-500'}`}>Change Payment Method</span>
            </div>
            <select
              disabled={!updatePaymentMethod}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {Object.values(PaymentMethod).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Nature Selection */}
          <div className={`p-5 rounded-2xl border transition-all ${updateNature ? 'bg-accent/5 border-accent/30' : 'bg-black/20 border-white/5'}`}>
            <div className="flex items-center gap-3 mb-3 cursor-pointer" onClick={() => setUpdateNature(!updateNature)}>
              {updateNature ? <CheckSquare size={18} className="text-accent" /> : <Square size={18} className="text-gray-500" />}
              <span className={`text-sm font-bold uppercase tracking-wider ${updateNature ? 'text-white' : 'text-gray-500'}`}>Change Nature</span>
            </div>
            <select
              disabled={!updateNature}
              value={nature}
              onChange={(e) => setNature(e.target.value as TransactionNature)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent appearance-none disabled:opacity-50 disabled:cursor-not-allowed uppercase"
            >
              {['need', 'want', 'luxury', 'saving', 'income'].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-panel rounded-b-3xl">
          <button 
            onClick={handleSave}
            disabled={!updateCategory && !updatePaymentMethod && !updateNature}
            className="w-full bg-accent hover:bg-teal-400 disabled:bg-gray-700 disabled:text-gray-500 text-obsidian font-bold py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all uppercase tracking-wide text-sm"
          >
            <Save size={18} /> Update Transactions
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkEditModal;