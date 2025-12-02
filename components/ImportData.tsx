import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  Upload, FileSpreadsheet, Loader2, AlertCircle, ShieldCheck, Database, 
  TrendingUp, TrendingDown, Minus, Search, ArrowUpDown, Filter, X, 
  Wallet, CheckCircle, Save, Edit2, Trash2, Plus
} from 'lucide-react';
import { Transaction, Category, PaymentMethod, TransactionNature, Asset, MonthlyMetric, TransactionType } from '../types';
import { INDIAN_RUPEE } from '../constants';
import { firebaseService } from '../services/firebase';
import { storageService } from '../services/storage';
import { analyzeMultipleExpenseTexts } from '../services/geminiService';

declare const XLSX: any;

// Extended Interface for Review
interface ReviewTransaction extends Partial<Transaction> {
  _tempId: string;
}

// --- Sub-Component: UploadZone ---
interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isAnalyzing: boolean;
  error?: string | null;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect, isAnalyzing, error }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcess(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndProcess(e.target.files[0]);
    }
  };

  const validateAndProcess = (file: File) => {
    const isExcel = file.name.match(/\.(xlsx|xls|csv)$/i);
    if (isExcel) {
      onFileSelect(file);
    } else {
      alert('Please upload an Excel (.xlsx, .xls) or CSV file.');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div
        className={`relative flex flex-col items-center justify-center w-full h-72 border-2 border-dashed rounded-3xl transition-all duration-200 ease-in-out cursor-pointer overflow-hidden
          ${dragActive ? 'border-brand bg-brand/10' : 'border-white/10 bg-panel hover:border-brand/50 hover:bg-white/5'}
          ${isAnalyzing ? 'pointer-events-none opacity-80' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={handleChange}
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          disabled={isAnalyzing}
        />
        
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center z-0 px-4">
          {isAnalyzing ? (
            <div className="flex flex-col items-center animate-in fade-in duration-300">
              <div className="relative">
                <Loader2 className="w-14 h-14 mb-4 text-brand animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-brand rounded-full animate-pulse"></div>
                </div>
              </div>
              <p className="mb-2 text-xl font-semibold text-white">AI Analyzing...</p>
              <p className="text-sm text-gray-400 max-w-xs mx-auto">
                Parsing rows and automatically categorizing transactions.
              </p>
            </div>
          ) : (
            <>
              <div className="p-4 bg-brand/10 rounded-full mb-4 group-hover:bg-brand/20 transition-colors">
                <Upload className="w-8 h-8 text-brand" />
              </div>
              <p className="mb-2 text-xl font-semibold text-gray-200">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Excel (.XLSX, .XLS) or CSV Files
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Secure Processing</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-brand" />
                  <span>SheetJS Engine</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Raw Data Import</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 text-rose-400 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Import Failed</h4>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-Component: MonthlyAnalytics ---
interface MonthlyAnalyticsProps {
  data: MonthlyMetric[];
  onUpdateBalance: (monthKey: string, newVal: number) => void;
}

const MonthlyAnalytics: React.FC<MonthlyAnalyticsProps> = ({ data, onUpdateBalance }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-panel rounded-3xl shadow-lg border border-white/5 overflow-hidden mb-6">
      <div className="p-6 border-b border-white/5">
        <h3 className="text-lg font-semibold text-white">Monthly Cash Flow Analysis</h3>
        <p className="text-sm text-gray-400 mt-1">
          Review flows and adjust opening balances if needed.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-charcoal border-b border-white/5">
            <tr>
              <th className="px-6 py-3 font-medium">Month</th>
              <th className="px-6 py-3 font-medium text-right min-w-[140px]">Opening Bal</th>
              <th className="px-6 py-3 font-medium text-right text-positive">Total Credits</th>
              <th className="px-6 py-3 font-medium text-right text-rose-400">Total Debits</th>
              <th className="px-6 py-3 font-medium text-right">Net Change</th>
              <th className="px-6 py-3 font-medium text-right">Closing Bal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.map((month) => (
              <tr key={month.monthKey} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-medium text-white">
                  <div className="flex flex-col">
                    <span>{month.label}</span>
                    <span className="text-xs text-gray-500 font-normal">{month.transactionCount} txns</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                   <input 
                      type="number" 
                      value={month.openingBalance || 0}
                      onChange={(e) => onUpdateBalance(month.monthKey, parseFloat(e.target.value) || 0)}
                      className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-white font-mono text-sm focus:border-brand focus:outline-none w-28 text-right font-bold"
                   />
                </td>
                <td className="px-6 py-4 text-right font-mono text-positive">
                  +{INDIAN_RUPEE.format(month.totalCredits)}
                </td>
                <td className="px-6 py-4 text-right font-mono text-rose-400">
                  -{INDIAN_RUPEE.format(month.totalDebits)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className={`inline-flex items-center gap-1 font-medium ${
                    month.netChange > 0 ? 'text-positive' : month.netChange < 0 ? 'text-rose-400' : 'text-gray-400'
                  }`}>
                    {month.netChange > 0 ? <TrendingUp className="w-3 h-3" /> : month.netChange < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    {INDIAN_RUPEE.format(Math.abs(month.netChange))}
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-bold text-white font-mono">
                  {INDIAN_RUPEE.format(month.closingBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Sub-Component: TransactionList ---
interface TransactionListProps {
  transactions: ReviewTransaction[];
  onDelete: (id: string) => void;
  onEdit: (txn: ReviewTransaction) => void;
  onAdd: () => void;
}

type SortKey = 'date' | 'amount' | 'category';
type SortOrder = 'asc' | 'desc';

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, onEdit, onAdd }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterType, setFilterType] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');

  const filteredAndSortedTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const desc = t.description || '';
        const cat = t.category || '';
        const matchesSearch = desc.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            cat.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'ALL' || (filterType === 'DEBIT' ? t.type === 'debit' : t.type === 'credit');
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        let valA = a[sortKey] || 0;
        let valB = b[sortKey] || 0;
        
        if (sortKey === 'amount') {
          valA = Number(valA);
          valB = Number(valB);
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [transactions, searchTerm, sortKey, sortOrder, filterType]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-panel rounded-3xl shadow-lg border border-white/5 overflow-hidden animate-in fade-in duration-700">
      <div className="p-6 border-b border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-white">Review Transactions</h3>
          <div className="flex items-center gap-3">
             <button 
                onClick={onAdd}
                className="px-3 py-1.5 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/20 rounded-2xl text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-colors"
             >
                <Plus size={14} /> Add Missing Transaction
             </button>
            <span className="text-sm text-gray-500">
              {filteredAndSortedTransactions.length} found
            </span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search description or category..." 
              className="w-full bg-charcoal border border-white/10 rounded-2xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all placeholder-gray-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select 
              className="px-3 py-2 text-sm bg-charcoal border border-white/10 rounded-2xl text-white focus:outline-none focus:border-brand cursor-pointer"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="ALL">All Types</option>
              <option value="DEBIT">Expenses</option>
              <option value="CREDIT">Income</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-charcoal border-b border-white/5 sticky top-0 z-10 backdrop-blur-md">
            <tr>
              <th className="px-6 py-3 font-medium cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="px-6 py-3 font-medium">Description</th>
              <th className="px-6 py-3 font-medium cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('category')}>
                <div className="flex items-center gap-1">Category <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="px-6 py-3 font-medium text-right cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('amount')}>
                <div className="flex items-center justify-end gap-1">Amount <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredAndSortedTransactions.length > 0 ? (
              filteredAndSortedTransactions.map((t) => (
                <tr key={t._tempId} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400 font-medium font-mono">
                      {t.date ? new Date(t.date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-white font-medium truncate max-w-xs" title={t.description}>
                    {t.description}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/5 text-gray-300 border border-white/10">
                      {t.category}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-bold font-mono ${t.type === 'credit' ? 'text-positive' : 'text-gray-300'}`}>
                    {t.type === 'credit' ? '+' : ''}{INDIAN_RUPEE.format(t.amount || 0)}
                  </td>
                  <td className="px-6 py-4 text-right">
                     <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => onEdit(t)} className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors" title="Edit">
                             <Edit2 size={14} />
                         </button>
                         <button onClick={() => onDelete(t._tempId)} className="p-1.5 rounded hover:bg-rose-500/20 text-gray-500 hover:text-rose-500 transition-colors" title="Delete">
                             <Trash2 size={14} />
                         </button>
                     </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Filter className="w-8 h-8 opacity-20" />
                    <p>No transactions match your filters</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// --- Main Component: ImportData ---
interface ImportDataProps {
  onImportSuccess: (transactions?: Transaction[], assets?: Asset[]) => void;
  userId?: string;
  currentTransactions?: Transaction[];
  currentAssets?: Asset[];
}

const ImportData: React.FC<ImportDataProps> = ({ onImportSuccess, userId, currentTransactions = [], currentAssets = [] }) => {
  const [extractedData, setExtractedData] = useState<ReviewTransaction[]>([]);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'review' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [analysisStartBalance, setAnalysisStartBalance] = useState<number>(0);
  
  // New state to hold manually overridden opening balances for specific months
  const [balanceOverrides, setBalanceOverrides] = useState<Record<string, number>>({});
  
  // Analytics Data
  const [monthlyMetrics, setMonthlyMetrics] = useState<MonthlyMetric[]>([]);

  // Review Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<ReviewTransaction | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});

  // Asset & Balance State
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [targetAssetId, setTargetAssetId] = useState<string>('');
  const [newAssetName, setNewAssetName] = useState('');

  const resetState = () => {
    setExtractedData([]);
    setStatus('idle');
    setError(null);
    setMonthlyMetrics([]);
    setShowBalanceModal(false);
    setTargetAssetId('');
    setNewAssetName('');
    setAnalysisStartBalance(0);
    setBalanceOverrides({});
  };

  // --- Metrics Recalculation ---
  useEffect(() => {
     if (status !== 'review') return;
     
     const sorted = [...extractedData].sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
     const groupedMap = new Map<string, MonthlyMetric>();
     
     // First pass: Aggregate transactions per month
     sorted.forEach(t => {
            if (!t.date) return;
            const d = new Date(t.date);
            const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
            const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });

            if (!groupedMap.has(monthKey)) {
                groupedMap.set(monthKey, {
                    monthKey,
                    label,
                    transactionCount: 0,
                    openingBalance: 0, // Placeholder
                    totalCredits: 0,
                    totalDebits: 0,
                    netChange: 0,
                    closingBalance: 0 // Placeholder
                });
            }

            const metric = groupedMap.get(monthKey)!;
            metric.transactionCount++;
            if (t.type === 'credit') {
                metric.totalCredits += t.amount || 0;
            } else {
                metric.totalDebits += t.amount || 0;
            }
            metric.netChange = metric.totalCredits - metric.totalDebits;
        });

     // Second pass: Link balances chronologically
     // Get sorted month keys to iterate in order
     const sortedMonthKeys = Array.from(groupedMap.keys()).sort((a, b) => {
         const [y1, m1] = a.split('-').map(Number);
         const [y2, m2] = b.split('-').map(Number);
         return y1 !== y2 ? y1 - y2 : m1 - m2;
     });

     let runningClosingBalance = analysisStartBalance;

     sortedMonthKeys.forEach((key, index) => {
         const metric = groupedMap.get(key)!;
         
         // Use manual override if present, otherwise use previous month's closing
         if (balanceOverrides[key] !== undefined) {
             metric.openingBalance = balanceOverrides[key];
         } else if (index === 0) {
             metric.openingBalance = analysisStartBalance;
         } else {
             metric.openingBalance = runningClosingBalance;
         }
         
         metric.closingBalance = metric.openingBalance + metric.netChange;
         runningClosingBalance = metric.closingBalance;
     });

     setMonthlyMetrics(Array.from(groupedMap.values()).sort((a,b) => {
          // Keep display order consistent
         const [y1, m1] = a.monthKey.split('-').map(Number);
         const [y2, m2] = b.monthKey.split('-').map(Number);
         return y1 !== y2 ? y1 - y2 : m1 - m2;
     }));
  }, [extractedData, analysisStartBalance, balanceOverrides, status]);


  // --- Parsing Logic ---
  const parseIndianDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      const clean = String(dateStr).trim().replace(/["]/g, '');
      if (clean.match(/^\d{4}-\d{2}-\d{2}/)) return new Date(clean);
      const dmy = clean.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
      if (dmy) {
          const day = parseInt(dmy[1], 10);
          const month = parseInt(dmy[2], 10) - 1; 
          let year = parseInt(dmy[3], 10);
          if (year < 100) year += 2000; // Handle 2-digit years
          if (year > 2050 || year < 2000) return null; // Sanity check to avoid '134308' issue
          return new Date(year, month, day);
      }
      const std = new Date(clean);
      if (!isNaN(std.getTime())) {
          if (std.getFullYear() > 2050 || std.getFullYear() < 2000) return null;
          return std;
      }
      return null;
  };

  const normalizeDate = (raw: any): string | null => {
      if (raw instanceof Date) return raw.toISOString();
      if (typeof raw === 'number') {
          // Excel Date serial number
          const d = new Date(Math.round((raw - 25569) * 86400 * 1000) + 43200000);
          if (d.getFullYear() > 2050 || d.getFullYear() < 2000) return null;
          return d.toISOString();
      }
      if (typeof raw === 'string') {
          const parsed = parseIndianDate(raw);
          if (parsed) return parsed.toISOString();
      }
      return null;
  };

  const cleanAmount = (raw: any): number => {
      if (typeof raw === 'number') return Math.abs(raw);
      if (!raw) return 0;
      const str = String(raw).trim();
      const cleanStr = str.replace(/[,₹$ ]/g, '');
      let val = parseFloat(cleanStr);
      if (!isNaN(val)) return Math.abs(val);
      const match = str.match(/[\d.]+/);
      if (match) return parseFloat(match[0]);
      return 0;
  };

  const handleFileProcess = (file: File) => {
    if (!file) return;
    if (typeof XLSX === 'undefined') {
        setError("Parser library (XLSX) not loaded. Please refresh the page.");
        setStatus('error');
        return;
    }
    
    resetState();
    setStatus('analyzing');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        if (!workbook.SheetNames.length) throw new Error("Excel file is empty");
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const aoa: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
        
        if (!aoa || aoa.length === 0) throw new Error("No data found in sheet");

        let headerRowIndex = -1;
        let maxScore = 0;
        let bestHeaderMap: any = {};
        let potentialOpeningBalance = 0;

        for (let i = 0; i < Math.min(aoa.length, 100); i++) {
            const row = aoa[i].map(c => String(c).toLowerCase().trim());
            let score = 0;
            const currentMap = { date: -1, desc: -1, debit: -1, credit: -1, amount: -1, type: -1 };

            row.forEach((cell, idx) => {
                if (['date', 'txn date', 'value date', 'txn_date', 'transaction date'].some(k => cell.includes(k))) { score += 10; currentMap.date = idx; }
                if (['description', 'narration', 'particulars', 'details', 'remarks'].some(k => cell.includes(k))) { score += 5; currentMap.desc = idx; }
                if (['withdrawal', 'debit', 'dr.', 'dr'].some(k => cell === k || cell.includes(k))) { score += 8; currentMap.debit = idx; }
                if (['deposit', 'credit', 'cr.', 'cr'].some(k => cell === k || cell.includes(k))) { score += 8; currentMap.credit = idx; }
                if (['amount', 'txn amount', 'transaction amount'].some(k => cell.includes(k))) { score += 5; currentMap.amount = idx; }
                if (['type', 'dr/cr', 'cr/dr'].some(k => cell === k || cell.includes(k))) { score += 5; currentMap.type = idx; }
            });

            const hasMoneyCol = (currentMap.debit !== -1 || currentMap.credit !== -1) || currentMap.amount !== -1;
            if (currentMap.date !== -1 && hasMoneyCol && score > maxScore) {
                maxScore = score;
                headerRowIndex = i;
                bestHeaderMap = currentMap;
            }
        }

        if (headerRowIndex === -1) {
            throw new Error("Could not detect header row. Ensure columns like 'Date' and 'Amount' exist.");
        }

        const transactions: ReviewTransaction[] = [];
        
        for (let i = headerRowIndex + 1; i < aoa.length; i++) {
            const row = aoa[i];
            if (!row || row.length === 0) continue;
            
            // Check for Opening Balance Rows
            const rowString = row.join(' ').toLowerCase();
            if (rowString.includes('opening balance') || rowString.includes('b/f') || rowString.includes('brought forward')) {
                // Try to find the balance amount in this row
                let foundBal = 0;
                row.forEach(cell => {
                    const amt = cleanAmount(cell);
                    if (amt > foundBal) foundBal = amt;
                });
                if(foundBal > 0) potentialOpeningBalance = foundBal;
                continue; // Skip adding this as a transaction
            }
            if (rowString.includes('total') || rowString.includes('closing balance')) continue;


            const rawDate = row[bestHeaderMap.date];
            if (!rawDate) continue;
            
            // Validate Date (filters out weird 1/1/134308 rows)
            const normalizedDate = normalizeDate(rawDate);
            if (!normalizedDate) continue;

            const rawDesc = bestHeaderMap.desc !== -1 ? row[bestHeaderMap.desc] : 'Transaction';
            const cleanDesc = String(rawDesc || '').replace(/['"]/g, '').trim();

            // STRICT FILTER: Skip empty or placeholder descriptions
            if (!cleanDesc || cleanDesc.toLowerCase() === 'no description' || cleanDesc === '-') continue;
            
            // STRICT FILTER: Skip rows that look like opening balances that slipped through
            if (cleanDesc.toLowerCase().includes('opening balance')) continue;
            if (cleanDesc.toLowerCase().includes('brought forward')) continue;

            let amount = 0;
            let type: 'credit' | 'debit' = 'debit';

            if (bestHeaderMap.debit !== -1 && bestHeaderMap.credit !== -1) {
                const dr = cleanAmount(row[bestHeaderMap.debit]);
                const cr = cleanAmount(row[bestHeaderMap.credit]);
                if (dr > 0) { amount = dr; type = 'debit'; }
                else if (cr > 0) { amount = cr; type = 'credit'; }
            } else if (bestHeaderMap.amount !== -1 && bestHeaderMap.type !== -1) {
                amount = cleanAmount(row[bestHeaderMap.amount]);
                const typeVal = String(row[bestHeaderMap.type]).toLowerCase();
                if (typeVal.includes('cr') || typeVal.includes('deposit')) type = 'credit';
                else type = 'debit';
            } else if (bestHeaderMap.amount !== -1) {
                const valStr = String(row[bestHeaderMap.amount]);
                amount = cleanAmount(row[bestHeaderMap.amount]);
                if (valStr.includes('-')) { amount = Math.abs(amount); type = 'debit'; }
                else if (valStr.toLowerCase().includes('cr')) type = 'credit';
                else if (valStr.toLowerCase().includes('dr')) type = 'debit';
                else {
                    const descLower = String(rawDesc).toLowerCase();
                    if (descLower.includes('credit') || descLower.includes('deposit')) type = 'credit';
                    else type = 'debit';
                }
            }

            if (amount > 0) {
                 transactions.push({
                     _tempId: Math.random().toString(36).substr(2, 9),
                     date: normalizedDate,
                     description: cleanDesc,
                     amount: amount,
                     type: type,
                     category: Category.Others,
                     nature: type === 'credit' ? 'income' : 'want'
                 });
            }
        }

        if (transactions.length === 0) throw new Error("Headers detected, but no valid transactions found.");
        
        // AI Batch Analysis
        const descriptions = transactions.map(t => t.description || '');
        const aiResults = await analyzeMultipleExpenseTexts(descriptions);

        const categorizedTransactions = transactions.map((txn, index) => {
            const aiResult = aiResults[index] || { category: Category.Others, nature: 'want' };
            return {
                ...txn,
                category: aiResult.category,
                nature: aiResult.nature,
            };
        });

        setExtractedData(categorizedTransactions);
        if (potentialOpeningBalance > 0) setAnalysisStartBalance(potentialOpeningBalance);
        setStatus('review');

      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to parse file.');
        setStatus('error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleInitiateImport = () => {
    if (extractedData.length === 0) return;
    setShowBalanceModal(true);
  };

  const handleFinalizeImport = async () => {
    if (!targetAssetId) {
        alert("Please select a bank account.");
        return;
    }
    if (targetAssetId === 'new' && !newAssetName) {
        alert("Please enter a name for the new account.");
        return;
    }

    // Determine final closing balance based on the last month in the metrics
    let finalClosingBalance = 0;
    if (monthlyMetrics.length > 0) {
        // Sort metrics to ensure we pick the latest month
        const sortedMetrics = [...monthlyMetrics].sort((a, b) => {
             const [y1, m1] = a.monthKey.split('-').map(Number);
             const [y2, m2] = b.monthKey.split('-').map(Number);
             return y1 !== y2 ? y1 - y2 : m1 - m2;
        });
        finalClosingBalance = sortedMetrics[sortedMetrics.length - 1].closingBalance;
    }

    // Find the latest date from the imported transactions to use as the as-of-date.
    const latestDateInStatement = extractedData.reduce((maxDate, t) => {
        const currentDate = new Date(t.date!);
        return currentDate > maxDate ? currentDate : maxDate;
    }, new Date(0));
    const asOfDate = latestDateInStatement.getTime() > 0 ? latestDateInStatement.toISOString() : new Date().toISOString();


    let finalAssets = [...currentAssets];

    if (targetAssetId === 'new') {
        const newAsset: Asset = {
            id: Math.random().toString(36).substr(2, 9),
            name: newAssetName || 'Imported Account',
            amount: finalClosingBalance,
            type: 'bank',
            asOfDate: asOfDate,
            change: 0
        };
        finalAssets.push(newAsset);
    } else {
        finalAssets = finalAssets.map(a => {
            if (a.id === targetAssetId) {
                return {
                    ...a,
                    amount: finalClosingBalance, 
                    asOfDate: asOfDate
                };
            }
            return a;
        });
    }

    // Process transactions to final format
    const newTransactions = extractedData.map(t => {
        const { _tempId, ...rest } = t;
        return {
            ...rest,
            id: Math.random().toString(36).substr(2, 9), // Generate real ID
            // Ensure required fields
            date: rest.date || new Date().toISOString(),
            description: rest.description || 'Imported Transaction',
            amount: rest.amount || 0,
            category: rest.category || Category.Others,
            type: rest.type || 'debit',
            paymentMethod: rest.paymentMethod || PaymentMethod.Other,
            nature: rest.nature || 'want'
        } as Transaction;
    });

    const allTransactions = [...newTransactions, ...currentTransactions];

    // Save Data
    if (userId) {
         // Online Mode
         try {
             await firebaseService.saveUserData(userId, {
                 transactions: allTransactions,
                 assets: finalAssets
             });
         } catch (e) {
             console.error("Firebase Save Error", e);
             alert("Failed to save to cloud. Please check connection.");
             return;
         }
    } else {
        // Offline Mode
        storageService.updateTransactions(allTransactions);
        storageService.saveAssets(finalAssets);
    }

    setStatus('success');
    setTimeout(() => {
        onImportSuccess(allTransactions, finalAssets);
    }, 1000);
  };

  // --- Render ---
  return (
     <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
         {/* Header */}
         <div className="bg-panel border border-border rounded-3xl p-8 flex justify-between items-center shadow-xl">
             <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Upload className="text-brand" /> Import Statement
                </h2>
                <p className="text-sm text-muted mt-1">
                    Upload your bank statement (Excel/CSV) to automatically track expenses.
                </p>
             </div>
             {status !== 'idle' && (
                 <button 
                    onClick={resetState}
                    className="px-4 py-2 bg-charcoal hover:bg-white/5 border border-border rounded-xl text-sm font-bold text-muted hover:text-white transition-colors"
                 >
                    Reset
                 </button>
             )}
         </div>

         {/* Steps */}
         {status === 'idle' || status === 'analyzing' || status === 'error' ? (
             <UploadZone onFileSelect={handleFileProcess} isAnalyzing={status === 'analyzing'} error={error} />
         ) : null}

         {status === 'review' && (
             <div className="space-y-6">
                 {/* 1. Analytics & Balance Check */}
                 <MonthlyAnalytics 
                    data={monthlyMetrics} 
                    onUpdateBalance={(monthKey, val) => {
                        setBalanceOverrides(prev => ({ ...prev, [monthKey]: val }));
                    }}
                 />

                 {/* 2. Transaction Review */}
                 <TransactionList 
                    transactions={extractedData} 
                    onDelete={(id) => setExtractedData(prev => prev.filter(t => t._tempId !== id))}
                    onEdit={(txn) => {
                        setEditingTransaction(txn);
                        setEditForm(txn);
                        setIsEditModalOpen(true);
                    }}
                    onAdd={() => {
                        const newTxn: ReviewTransaction = {
                            _tempId: Math.random().toString(36).substr(2, 9),
                            date: new Date().toISOString(),
                            description: 'New Transaction',
                            amount: 0,
                            type: 'debit',
                            category: Category.Others,
                            nature: 'want',
                            paymentMethod: PaymentMethod.Other
                        };
                        setExtractedData(prev => [newTxn, ...prev]);
                        setEditingTransaction(newTxn);
                        setEditForm(newTxn);
                        setIsEditModalOpen(true);
                    }}
                 />

                 {/* Action Bar */}
                 <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-charcoal/90 backdrop-blur-md border border-white/10 p-2 rounded-2xl shadow-2xl z-40 flex items-center gap-3">
                     <div className="px-4 text-sm font-medium text-gray-300">
                         <span className="text-white font-bold">{extractedData.length}</span> transactions found
                     </div>
                     <button 
                        onClick={handleInitiateImport}
                        className="bg-brand hover:bg-brand-hover text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-brand/20 transition-all flex items-center gap-2"
                     >
                         <CheckCircle size={18} /> Import & Sync
                     </button>
                 </div>
             </div>
         )}
         
         {/* Success State */}
         {status === 'success' && (
             <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in-95 duration-300">
                 <div className="w-20 h-20 bg-positive/10 rounded-full flex items-center justify-center mb-6">
                     <CheckCircle size={40} className="text-positive" />
                 </div>
                 <h3 className="text-2xl font-bold text-white mb-2">Import Successful</h3>
                 <p className="text-gray-500">Redirecting to transactions...</p>
             </div>
         )}

         {/* Modals */}
         
         {/* Edit Transaction Modal */}
         {isEditModalOpen && editingTransaction && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                 <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
                 <div className="relative bg-panel border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl">
                     <h3 className="text-lg font-bold text-white mb-4">Edit Transaction</h3>
                     <div className="space-y-4">
                         <div>
                             <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                             <input 
                                type="text" 
                                value={editForm.description || ''} 
                                onChange={e => setEditForm(prev => ({...prev, description: e.target.value}))}
                                className="w-full bg-charcoal border border-white/10 rounded-xl px-4 py-2 text-white mt-1"
                             />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="text-xs font-bold text-gray-500 uppercase">Amount</label>
                                 <input 
                                    type="number" 
                                    value={editForm.amount || ''} 
                                    onChange={e => setEditForm(prev => ({...prev, amount: parseFloat(e.target.value)}))}
                                    className="w-full bg-charcoal border border-white/10 rounded-xl px-4 py-2 text-white mt-1"
                                 />
                             </div>
                             <div>
                                 <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
                                 <select 
                                    value={editForm.type} 
                                    onChange={e => setEditForm(prev => ({...prev, type: e.target.value as any}))}
                                    className="w-full bg-charcoal border border-white/10 rounded-xl px-4 py-2 text-white mt-1"
                                 >
                                     <option value="debit">Expense</option>
                                     <option value="credit">Income</option>
                                 </select>
                             </div>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                                 <select 
                                    value={editForm.category} 
                                    onChange={e => setEditForm(prev => ({...prev, category: e.target.value as any}))}
                                    className="w-full bg-charcoal border border-white/10 rounded-xl px-4 py-2 text-white mt-1"
                                 >
                                     {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                                 </select>
                             </div>
                             <div>
                                 <label className="text-xs font-bold text-gray-500 uppercase">Nature</label>
                                 <select 
                                    value={editForm.nature} 
                                    onChange={e => setEditForm(prev => ({...prev, nature: e.target.value as any}))}
                                    className="w-full bg-charcoal border border-white/10 rounded-xl px-4 py-2 text-white mt-1"
                                 >
                                     {['need', 'want', 'luxury', 'saving', 'income'].map(n => <option key={n} value={n}>{n}</option>)}
                                 </select>
                             </div>
                         </div>
                         <div className="pt-2 flex gap-3">
                             <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-white/5 rounded-xl text-gray-400 font-bold text-sm">Cancel</button>
                             <button 
                                onClick={() => {
                                    setExtractedData(prev => prev.map(t => t._tempId === editingTransaction._tempId ? { ...t, ...editForm } as ReviewTransaction : t));
                                    setIsEditModalOpen(false);
                                }} 
                                className="flex-1 py-3 bg-brand text-white rounded-xl font-bold text-sm"
                             >
                                 Save
                             </button>
                         </div>
                     </div>
                 </div>
             </div>
         )}

         {/* Select Asset Modal */}
         {showBalanceModal && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                 <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowBalanceModal(false)}></div>
                 <div className="relative bg-panel border border-white/10 rounded-3xl w-full max-w-md p-8 shadow-2xl">
                     <div className="mb-6">
                        <h3 className="text-xl font-bold text-white mb-2">Sync with Account</h3>
                        <p className="text-sm text-gray-400">
                            Select which wallet/account this statement belongs to. The closing balance will be updated automatically.
                        </p>
                     </div>
                     
                     <div className="space-y-4">
                         <div className="space-y-2">
                             <label className="text-xs font-bold text-gray-500 uppercase">Select Account</label>
                             <select 
                                value={targetAssetId} 
                                onChange={e => setTargetAssetId(e.target.value)}
                                className="w-full bg-charcoal border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand focus:outline-none"
                             >
                                 <option value="">-- Choose Account --</option>
                                 <option value="new">+ Create New Account</option>
                                 {currentAssets.filter(a => a.type === 'bank' || a.type === 'credit' || a.type === 'cash').map(a => (
                                     <option key={a.id} value={a.id}>{a.name} ({INDIAN_RUPEE.format(a.amount)})</option>
                                 ))}
                             </select>
                         </div>

                         {targetAssetId === 'new' && (
                             <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                 <label className="text-xs font-bold text-gray-500 uppercase">New Account Name</label>
                                 <input 
                                    type="text"
                                    value={newAssetName}
                                    onChange={e => setNewAssetName(e.target.value)}
                                    placeholder="e.g. HDFC Savings"
                                    className="w-full bg-charcoal border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand focus:outline-none"
                                 />
                             </div>
                         )}

                         <div className="bg-brand/10 border border-brand/20 rounded-xl p-4 mt-2">
                             <div className="flex justify-between items-center mb-1">
                                 <span className="text-sm text-brand font-medium">Calculated Closing Balance</span>
                                 <span className="text-lg font-bold text-white font-mono">
                                     {INDIAN_RUPEE.format(monthlyMetrics.length > 0 ? monthlyMetrics[monthlyMetrics.length - 1].closingBalance : 0)}
                                 </span>
                             </div>
                             <p className="text-[10px] text-brand/60">
                                 This amount will overwrite the current balance of the selected account.
                             </p>
                         </div>

                         <button 
                            onClick={handleFinalizeImport}
                            className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand/20 mt-4 transition-all"
                         >
                             Confirm & Import
                         </button>
                     </div>
                 </div>
             </div>
         )}

     </div>
  );
};

export default ImportData;