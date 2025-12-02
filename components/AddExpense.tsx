import React, { useState, useEffect, useRef } from 'react';
import { Category, Transaction, TransactionType, PaymentMethod, TransactionNature } from '../types';
import { analyzeExpenseText } from '../services/geminiService';
import { Sparkles, Plus, Loader2, ArrowUpCircle, ArrowDownCircle, X } from 'lucide-react';

interface AddExpenseProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
}

const AddExpense: React.FC<AddExpenseProps> = ({ isOpen, onClose, onAdd }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>(Category.Food);
  const [type, setType] = useState<TransactionType>('debit');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [nature, setNature] = useState<TransactionNature>('need');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [date, setDate] = useState('');
  
  const analysisTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset form when modal opens
    if (isOpen) {
      setDescription('');
      setAmount('');
      setCategory(Category.Food);
      setType('debit');
      setPaymentMethod(PaymentMethod.UPI);
      setNature('need');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const handleAnalyze = async () => {
    if (!description || type !== 'debit') return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeExpenseText(description);
      setCategory(result.category);
      setNature(result.nature);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Debounced automatic analysis on description change
  useEffect(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    if (description.length > 3 && type === 'debit') {
      analysisTimeoutRef.current = window.setTimeout(() => {
        handleAnalyze();
      }, 1000); // 1 second delay
    }
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [description, type]);


  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date) return;
    
    onAdd({
      description,
      amount: parseFloat(amount),
      category,
      date: new Date(date).toISOString(),
      type,
      paymentMethod,
      nature: type === 'credit' ? 'income' : nature
    });
    
    onClose(); // Close modal after adding
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-panel border border-white/10 rounded-3xl w-[95%] max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-charcoal rounded-t-3xl">
          <h3 className="text-lg font-bold text-white tracking-tight uppercase">New Transaction</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
          <div className="flex gap-2 p-1.5 bg-black/20 rounded-2xl border border-white/5">
            <button
              type="button"
              onClick={() => setType('debit')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${type === 'debit' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <ArrowDownCircle size={16} /> Expense
            </button>
            <button
              type="button"
              onClick={() => { setType('credit'); setNature('income'); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${type === 'credit' ? 'bg-positive/10 text-positive border border-positive/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <ArrowUpCircle size={16} /> Income
            </button>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">Description</label>
            <div className="relative">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === 'debit' ? "e.g., Swiggy, Uber" : "e.g., Salary, Freelance"}
                className="w-full bg-charcoal border border-white/10 rounded-2xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              />
              {type === 'debit' && (
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !description}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-accent hover:bg-accent/10 rounded-xl transition-colors disabled:opacity-50"
                  title="Auto-categorize with AI"
                >
                  {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-charcoal border border-white/10 rounded-2xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              />
            </div>
             <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-charcoal border border-white/10 rounded-2xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              />
            </div>
          </div>
          <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-charcoal border border-white/10 rounded-2xl px-4 py-4 text-gray-300 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand appearance-none transition-all"
              >
                {Object.values(Category).map(c => (
                  <option key={c} value={c} className="bg-zinc-900 text-white">{c}</option>
                ))}
              </select>
          </div>
          
           <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-charcoal border border-white/10 rounded-2xl px-4 py-4 text-gray-300 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand appearance-none transition-all"
              >
                {Object.values(PaymentMethod).map(m => (
                  <option key={m} value={m} className="bg-zinc-900 text-white">{m}</option>
                ))}
              </select>
            </div>

          {/* Nature Selector (NWLS) */}
          {type === 'debit' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">Expense Nature (NWLS)</label>
                <div className="grid grid-cols-4 gap-3">
                    {['need', 'want', 'luxury', 'saving'].map((n) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => setNature(n as TransactionNature)}
                            className={`py-3 rounded-xl text-xs font-bold uppercase transition-all border ${nature === n ? 'bg-accent text-obsidian border-accent' : 'bg-black/20 border-white/10 text-gray-500 hover:text-white'}`}
                        >
                            {n}
                        </button>
                    ))}
                </div>
              </div>
          )}

          <div className="pt-2">
             <button
              type="submit"
              className={`w-full text-white font-semibold py-4 rounded-2xl shadow-lg transition-all duration-300 flex items-center justify-center gap-2
                ${type === 'debit' 
                  ? 'bg-rose-500 hover:bg-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]' 
                  : 'bg-positive hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                }`}
            >
              <Plus className="w-5 h-5" />
              {type === 'debit' ? 'Add Expense' : 'Add Income'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;