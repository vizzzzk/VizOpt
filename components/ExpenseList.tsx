import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Transaction, Category, PaymentMethod, TransactionNature } from '../types';
import { INDIAN_RUPEE, PIE_CHART_COLORS } from '../constants';
import { Square, CheckSquare, Trash2, Plus, Edit2, Search, ArrowUp, ArrowDown, Filter, Upload, X, AlertCircle } from 'lucide-react';
import BulkEditModal from './BulkEditModal';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, PieChart, Pie
} from 'recharts';

interface ExpenseListProps {
  expenses: Transaction[];
  onUpdate: (ids: string[], updates: Partial<Transaction>) => void;
  onDelete: (ids: string[]) => void;
  onAddClick: () => void;
  onImportClick: () => void;
}

const NATURE_COLORS: Record<string, string> = {
  need: '#0177fb', // Brand Blue
  want: '#f59e0b', // Amber
  luxury: '#d946ef', // Fuchsia
  saving: '#10B981', // Green
  income: '#4cbee1', // Cyan/Mint
  adjustment: '#64748B' // Slate
};

const ExpenseList: React.FC<ExpenseListProps> = ({ 
  expenses, 
  onUpdate, 
  onDelete, 
  onAddClick,
  onImportClick
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction | null; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // --- Two-Step Delete State (Row) ---
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deleteTimeoutRef = useRef<number | null>(null);

  // --- Two-Step Delete State (Bulk) ---
  const [isConfirmingBulk, setIsConfirmingBulk] = useState(false);
  const bulkDeleteTimeoutRef = useRef<number | null>(null);

  const [columnWidths, setColumnWidths] = useState({
    select: 48,
    date: 120,
    description: 450,
    category: 180,
    nature: 120,
    amount: 180,
    actions: 110, // Increased for "SURE?" text
  });
  
  type ColumnWidthsKeys = keyof typeof columnWidths;
  const isResizing = useRef<ColumnWidthsKeys | null>(null);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [expenses]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
        if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
        if (bulkDeleteTimeoutRef.current) clearTimeout(bulkDeleteTimeoutRef.current);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent, key: ColumnWidthsKeys) => {
    e.preventDefault();
    isResizing.current = key;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
        setColumnWidths(prev => {
            const currentWidth = prev[isResizing.current!] || 0;
            const newWidth = currentWidth + e.movementX;
            return {
                ...prev,
                [isResizing.current!]: Math.max(60, newWidth),
            };
        });
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = null;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const sortedAndFilteredExpenses = useMemo(() => {
    let items = [...expenses];
    
    // Global Search
    if (searchQuery) {
        items = items.filter(expense => expense.description.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Column Filters
    Object.keys(filters).forEach(key => {
        const val = filters[key].toLowerCase();
        if (val) {
            items = items.filter(item => String((item as any)[key]).toLowerCase().includes(val));
        }
    });

    if (sortConfig.key) {
        items.sort((a, b) => {
            const valA = a[sortConfig.key!] ?? '';
            const valB = b[sortConfig.key!] ?? '';
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    return items;
  }, [expenses, searchQuery, sortConfig, filters]);
  
  const allSelected = useMemo(() =>
    expenses.length > 0 && selectedIds.size === expenses.length,
    [expenses, selectedIds]
  );

  const summary = useMemo(() => {
    const totalCredits = expenses.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    const totalDebits = expenses.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
    return {
      credits: totalCredits,
      debits: totalDebits,
      count: expenses.length,
    };
  }, [expenses]);
  
  const monthlyBreakdownData = useMemo(() => {
      const txns = expenses;
      const byCategory = txns.filter(t => t.type === 'debit').reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + t.amount;
          return acc;
      }, {} as Record<Category, number>);

      const byNature = txns.reduce((acc, t) => {
          let nature = t.nature || 'want';
          if (nature === 'adjustment') return acc;
          
          acc[nature] = (acc[nature] || 0) + t.amount;
          return acc;
      }, {} as Record<string, number>);

      return {
          categoryData: Object.entries(byCategory).map(([name, value]) => ({ name, value })).sort((a,b) => Number(b.value) - Number(a.value)),
          natureData: Object.entries(byNature).map(([name, value]) => ({ name, value, fill: NATURE_COLORS[name] || '#888' })).sort((a,b) => Number(b.value) - Number(a.value)),
      };
  }, [expenses]);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(expenses.map(e => e.id));
      setSelectedIds(allIds);
    }
  };
  
  const requestSort = (key: keyof Transaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // --- ROBUST 2-STEP DELETE HANDLER (SINGLE) ---
  const handleRemoveClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirmDeleteId === id) {
        // Step 2: Confirmed
        console.log(`✅ [ExpenseList] CONFIRMED delete for ID: ${id}`);
        onDelete([id]);
        setConfirmDeleteId(null);
        if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    } else {
        // Step 1: Request Confirmation
        console.log(`⚠️ [ExpenseList] Requested delete for ID: ${id}. Waiting for confirmation...`);
        setConfirmDeleteId(id);
        
        // Auto-reset after 3 seconds if user doesn't confirm
        if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
        deleteTimeoutRef.current = window.setTimeout(() => {
            setConfirmDeleteId((prev) => (prev === id ? null : prev));
        }, 3000);
    }
  };

  // --- ROBUST 2-STEP DELETE HANDLER (BULK) ---
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;

    if (isConfirmingBulk) {
        // Step 2: Confirmed
        console.log(`✅ [ExpenseList] CONFIRMED BULK DELETE for ${selectedIds.size} items.`);
        onDelete(Array.from(selectedIds));
        setSelectedIds(new Set());
        setIsConfirmingBulk(false);
        if (bulkDeleteTimeoutRef.current) clearTimeout(bulkDeleteTimeoutRef.current);
    } else {
        // Step 1: Request
        console.log(`⚠️ [ExpenseList] Requested BULK delete. Waiting for confirmation...`);
        setIsConfirmingBulk(true);
        if (bulkDeleteTimeoutRef.current) clearTimeout(bulkDeleteTimeoutRef.current);
        bulkDeleteTimeoutRef.current = window.setTimeout(() => {
            setIsConfirmingBulk(false);
        }, 3000);
    }
  };

  const handleBulkEditSave = (updates: Partial<Transaction>) => {
    if (selectedIds.size > 0) {
      onUpdate(Array.from(selectedIds), updates);
      setSelectedIds(new Set());
    }
  };
  
  const getNatureChipClass = (nature: TransactionNature): string => {
    switch (nature) {
        case 'need': return 'bg-brand/10 text-brand';
        case 'want': return 'bg-amber-500/10 text-amber-500';
        case 'luxury': return 'bg-fuchsia-500/10 text-fuchsia-500';
        case 'saving': return 'bg-positive/10 text-positive';
        case 'income': return 'bg-accent/10 text-accent';
        default: return 'bg-neon-violet/10 text-neon-violet';
    }
  };

  const handleFilterChange = (key: string, value: string) => {
      setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
      setFilters({});
      setSearchQuery('');
  };
  
  const ResizableHeader = ({ title, widthKey, align = 'left', sortKey, filterKey, options }: { 
      title: string, 
      widthKey: ColumnWidthsKeys, 
      align?: 'left' | 'right', 
      sortKey?: keyof Transaction,
      filterKey?: string,
      options?: string[]
  }) => {
    const alignmentClass = align === 'right' ? 'justify-end' : 'justify-start';
    const isSortable = !!sortKey;
    const isSorted = sortConfig.key === sortKey;
    const isFiltering = activeFilter === filterKey;
    const hasFilterValue = filterKey && filters[filterKey];

    return (
        <div style={{ flex: `0 0 ${columnWidths[widthKey]}px` }} className="relative group/header h-full">
            <div className={`pr-4 flex items-center gap-2 h-full ${alignmentClass}`}>
                <div className={`flex items-center gap-2 cursor-pointer hover:text-white ${isSortable ? '' : ''}`} onClick={isSortable ? () => requestSort(sortKey) : undefined}>
                    <span>{title}</span>
                    {isSorted && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                </div>
                
                {filterKey && (
                    <div className="relative">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setActiveFilter(isFiltering ? null : filterKey); }}
                            className={`p-1 rounded-md transition-colors ${hasFilterValue ? 'text-brand' : 'text-gray-600 hover:text-white'}`}
                        >
                            <Filter size={12} />
                        </button>
                        {isFiltering && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-charcoal border border-border rounded-xl shadow-xl z-50 p-2" onClick={e => e.stopPropagation()}>
                                <div className="flex justify-between items-center mb-2 pb-2 border-b border-border">
                                    <span className="text-[10px] uppercase font-bold text-muted">Filter {title}</span>
                                    <button onClick={() => setActiveFilter(null)}><X size={12}/></button>
                                </div>
                                {options ? (
                                    <select 
                                        value={filters[filterKey] || ''} 
                                        onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-brand focus:outline-none"
                                    >
                                        <option value="">All</option>
                                        {options.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                ) : (
                                    <input 
                                        type="text" 
                                        value={filters[filterKey] || ''} 
                                        onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-brand focus:outline-none"
                                        placeholder="Type to filter..."
                                        autoFocus
                                    />
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* Absolute positioning for easier grab area */}
            <div 
                onMouseDown={(e) => handleMouseDown(e, widthKey)}
                className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize z-10 flex justify-center hover:bg-white/5 -mr-2"
            >
                <div className="w-[1px] h-full bg-border group-hover/header:bg-brand" />
            </div>
        </div>
    );
  };
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-panel border border-border p-3 rounded-2xl shadow-lg">
          <p className="font-bold text-white">{label}</p>
          <p style={{ color: payload[0].payload.fill || payload[0].fill }}>{`${payload[0].name}: ${INDIAN_RUPEE.format(payload[0].value)}`}</p>
        </div>
      );
    }
    return null;
  };

  const hasActiveFilters = Object.keys(filters).length > 0 || searchQuery !== '';

  return (
    <>
    <div className="bg-panel border border-border rounded-3xl shadow-xl overflow-hidden animate-in fade-in duration-300 mb-8">
      <div className="p-6 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-tight font-display">Transactions Log</h2>
          <p className="text-sm text-muted mt-1 font-mono">Manage expenses and income records.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
             {hasActiveFilters && (
                  <button 
                    onClick={clearAllFilters}
                    className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-muted hover:text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all uppercase tracking-wide font-mono whitespace-nowrap"
                  >
                    <X size={14} /> Clear Filters
                  </button>
             )}

            <div className="relative group flex-1 w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="SEARCH..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-charcoal border border-border rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all font-mono"
                />
            </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={() => setIsBulkEditOpen(true)}
                disabled={selectedIds.size === 0}
                className="flex-1 px-4 py-2.5 bg-charcoal hover:bg-white/5 border border-border hover:border-brand/50 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wide font-mono"
                title="Edit Selected"
              >
                <Edit2 size={16} /> <span className="hidden sm:inline">Edit</span>
              </button>

              {/* ROBUST BULK DELETE BUTTON */}
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0}
                className={`
                    flex-1 px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wide font-mono
                    ${isConfirmingBulk
                        ? 'bg-neon-red text-white hover:bg-red-600 border border-neon-red shadow-lg shadow-neon-red/20'
                        : 'bg-neon-red/10 text-neon-red hover:bg-neon-red/20 border border-border hover:border-neon-red/50'
                    }
                `}
                title="Delete Selected"
              >
                {isConfirmingBulk ? <AlertCircle size={16} /> : <Trash2 size={16} />} 
                <span className="hidden sm:inline">{isConfirmingBulk ? `CONFIRM (${selectedIds.size})?` : 'Delete'}</span>
              </button>

               <button 
                onClick={onImportClick}
                className="flex-1 px-4 py-2.5 bg-charcoal hover:bg-white/5 border border-border hover:border-brand/50 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all uppercase tracking-wide font-mono"
                title="Import Statement"
              >
                <Upload size={16} /> <span className="hidden sm:inline">Import</span>
              </button>
              
              <button 
                onClick={onAddClick}
                className="flex-1 px-5 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand/20 uppercase tracking-wide font-mono"
              >
                <Plus size={18} /> <span className="hidden sm:inline">Add</span>
              </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
            <div className="flex items-center px-6 py-4 border-b border-border text-xs text-muted font-bold uppercase tracking-wider bg-charcoal/50 font-mono sticky top-0 z-10">
              <div style={{ flex: `0 0 ${columnWidths.select}px` }} className="flex items-center">
                <button onClick={toggleSelectAll} className="p-1 hover:text-white transition-colors">
                  {allSelected ? <CheckSquare size={18} className="text-brand" /> : <Square size={18} />}
                </button>
              </div>
              <ResizableHeader title="Date" widthKey="date" sortKey="date" filterKey="date" />
              <ResizableHeader title="Description" widthKey="description" sortKey="description" filterKey="description" />
              <ResizableHeader title="Category" widthKey="category" sortKey="category" filterKey="category" options={Object.values(Category)} />
              <ResizableHeader title="Nature" widthKey="nature" sortKey="nature" filterKey="nature" options={['need', 'want', 'luxury', 'saving', 'income']} />
              <ResizableHeader title="Amount" widthKey="amount" align="right" sortKey="amount" filterKey="amount" />
              <div style={{ flex: `0 0 ${columnWidths.actions}px` }} className="pr-4 text-center">Actions</div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar" onClick={() => setActiveFilter(null)}>
              {sortedAndFilteredExpenses.length === 0 ? (
                <div className="text-center py-20 text-muted font-mono">
                  <p>NO TRANSACTIONS FOUND.</p>
                </div>
              ) : (
                sortedAndFilteredExpenses.map((transaction) => {
                  const isSelected = selectedIds.has(transaction.id);
                  const isCredit = transaction.type === 'credit';
                  const isConfirming = confirmDeleteId === transaction.id;

                  return (
                    <div
                      key={transaction.id}
                      className={`flex items-center px-6 py-4 border-b border-border transition-all duration-150 text-sm group last:border-0 relative
                        ${isSelected ? 'bg-brand/10' : 'hover:bg-charcoal/40'}
                        ${isConfirming ? 'bg-neon-red/5' : ''}
                      `}
                    >
                      <div style={{ flex: `0 0 ${columnWidths.select}px` }} onClick={() => toggleSelection(transaction.id)} className="flex items-center cursor-pointer">
                        {isSelected ? <CheckSquare size={18} className="text-brand" /> : <Square size={18} className="text-muted group-hover:text-white transition-colors" />}
                      </div>
                      <div style={{ flex: `0 0 ${columnWidths.date}px` }} onClick={() => toggleSelection(transaction.id)} className="text-muted font-medium text-xs font-mono pr-4 truncate cursor-pointer">{new Date(transaction.date).toLocaleDateString('en-GB')}</div>
                      <div style={{ flex: `0 0 ${columnWidths.description}px` }} onClick={() => toggleSelection(transaction.id)} className="text-white font-semibold truncate pr-4 font-mono cursor-pointer" title={transaction.description}>{transaction.description}</div>
                      <div style={{ flex: `0 0 ${columnWidths.category}px` }} onClick={() => toggleSelection(transaction.id)} className="text-muted text-xs truncate pr-4 cursor-pointer" title={transaction.category}>
                        <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 font-mono uppercase text-[10px]">{transaction.category}</span>
                      </div>
                      <div style={{ flex: `0 0 ${columnWidths.nature}px` }} onClick={() => toggleSelection(transaction.id)} className="text-xs uppercase font-bold font-mono pr-4 cursor-pointer">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] ${getNatureChipClass(transaction.nature)}`}>
                          {transaction.nature}
                        </span>
                      </div>
                      <div style={{ flex: `0 0 ${columnWidths.amount}px` }} onClick={() => toggleSelection(transaction.id)} className={`text-right font-bold font-mono pr-4 cursor-pointer ${isCredit ? 'text-positive' : 'text-neon-red'}`}>
                        <span>{isCredit ? '+' : '-'} {INDIAN_RUPEE.format(transaction.amount)}</span>
                      </div>
                      {/* --- ROBUST 2-STEP DELETE BUTTON --- */}
                      <div style={{ flex: `0 0 ${columnWidths.actions}px` }} className="flex items-center justify-center">
                         <button 
                            type="button"
                            onClick={(e) => handleRemoveClick(e, transaction.id)} 
                            className={`
                                px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all shadow-sm border
                                ${isConfirming 
                                    ? 'bg-neon-red text-white border-neon-red hover:bg-red-600 scale-105' 
                                    : 'bg-neon-red/10 text-neon-red border-neon-red/20 hover:border-neon-red/50 hover:bg-neon-red/20'
                                }
                            `}
                            title={isConfirming ? "Click again to confirm delete" : "Remove Transaction"}
                        >
                           {isConfirming ? (
                               <span className="flex items-center gap-1"><AlertCircle size={10} /> SURE?</span>
                           ) : (
                               "REMOVE"
                           )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 p-6 border-t border-border bg-charcoal/50 rounded-b-3xl text-center">
         <div>
            <p className="text-xs font-bold text-muted uppercase tracking-widest">Transactions</p>
            <p className="text-lg font-bold text-white font-mono mt-1">{summary.count}</p>
         </div>
         <div className="border-l border-r border-border">
            <p className="text-xs font-bold text-muted uppercase tracking-widest">Total Inflow</p>
            <p className="text-lg font-bold text-positive font-mono mt-1">{INDIAN_RUPEE.format(summary.credits)}</p>
         </div>
         <div>
            <p className="text-xs font-bold text-muted uppercase tracking-widest">Total Outflow</p>
            <p className="text-lg font-bold text-neon-red font-mono mt-1">{INDIAN_RUPEE.format(summary.debits)}</p>
         </div>
      </div>
    </div>

    {/* Charts Section - Moved Below Table */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-in slide-in-from-bottom-8 duration-500">
      <div className="bg-panel border border-border p-6 rounded-3xl shadow-xl min-h-[350px]">
          <h3 className="text-base font-bold text-white mb-4 uppercase tracking-tight">Spends by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyBreakdownData.categoryData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3240" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#b5b9c4', fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="value" name="Amount" barSize={16}>
                  {monthlyBreakdownData.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} radius={[0, 8, 8, 0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
      </div>
      <div className="bg-panel border border-border p-6 rounded-3xl shadow-xl min-h-[350px]">
          <h3 className="text-base font-bold text-white mb-4 uppercase tracking-tight">Spends by Nature</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={monthlyBreakdownData.natureData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={5}>
                {monthlyBreakdownData.natureData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
      </div>
    </div>

      <BulkEditModal 
        isOpen={isBulkEditOpen} 
        onClose={() => setIsBulkEditOpen(false)} 
        onSave={handleBulkEditSave}
        selectedCount={selectedIds.size}
      />
    </>
  );
};

export default ExpenseList;