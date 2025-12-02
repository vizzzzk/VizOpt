import React, { useMemo, useState } from 'react';
import { Transaction, Asset, BudgetMap, Category, TransactionNature } from '../types';
import { 
  BarChart, Bar, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, AreaChart, Area, PieChart, Pie
} from 'recharts';
import { INDIAN_RUPEE, CATEGORY_COLORS, PIE_CHART_COLORS } from '../constants';
import { ChevronDown, Table } from 'lucide-react';

type YearType = 'calendar' | 'financial';

interface AnalyticsViewProps {
  transactions: Transaction[];
  assets: Asset[];
  budgets?: BudgetMap;
  selectedMonth: string;
  selectedYear: number;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ transactions, assets, budgets = {}, selectedMonth, selectedYear }) => {
  const [yearType, setYearType] = useState<YearType>('calendar');

  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => new Date(t.date).getFullYear()));
    if (years.size === 0) years.add(new Date().getFullYear());
    return Array.from(years).sort((a: number, b: number) => b - a);
  }, [transactions]);
  
  const [currentYear, setCurrentYear] = useState<number>(availableYears[0]);

  // Filter transactions based on selected year and type
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = new Date(t.date);
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11

      if (yearType === 'calendar') {
        return year === currentYear;
      } else { // Financial year (Apr to Mar)
        if (year === currentYear && month >= 3) return true; // Apr-Dec of currentYear
        if (year === currentYear + 1 && month < 3) return true; // Jan-Mar of next year
        return false;
      }
    });
  }, [transactions, currentYear, yearType]);

  // 1. ECAS Graph Data (Equity, Cash, Assets, Savings)
  const ecasData = useMemo(() => {
    const months = yearType === 'calendar'
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

    // Group current assets
    const currentEquity = assets.filter(a => a.type === 'stock' || a.type === 'fund' || a.type === 'elss').reduce((acc, a) => acc + a.amount, 0);
    const currentCash = assets.filter(a => a.type === 'cash' || a.type === 'bank').reduce((acc, a) => acc + a.amount, 0);
    const currentAssets = assets.filter(a => a.type === 'real_estate' || a.type === 'deposit').reduce((acc, a) => acc + a.amount, 0);
    const currentSavings = assets.filter(a => a.type === 'pf' || a.type === 'crypto').reduce((acc, a) => acc + a.amount, 0); // Logic choice for savings

    // Simulate history (reverse projection)
    let e = currentEquity, c = currentCash, a = currentAssets, s = currentSavings;
    const history = [];

    for(let i = months.length - 1; i >= 0; i--) {
        history.unshift({
            month: months[i],
            Equity: Math.round(e),
            Cash: Math.round(c),
            Assets: Math.round(a),
            Savings: Math.round(s),
        });
        e -= Math.random() * (currentEquity * 0.04);
        c -= Math.random() * (currentCash * 0.06);
        a -= Math.random() * (currentAssets * 0.01); // Assets stable
        s -= Math.random() * (currentSavings * 0.03);
    }
    return history;
  }, [assets, yearType, currentYear]);

  // 2. NWLS Variance Analysis (Budget vs Actual by Nature)
  const nwlsVarianceData = useMemo(() => {
      // 1. Calculate Actuals by Nature
      const actuals: Record<TransactionNature, number> = { need: 0, want: 0, luxury: 0, saving: 0, income: 0, adjustment: 0 };
      
      filteredTransactions.forEach(t => {
          if (t.type === 'debit') {
              // Fallback if nature is missing or old data
              const nature = t.nature || 'want';
              if (actuals[nature] !== undefined) actuals[nature] += t.amount;
          }
      });

      // 2. Calculate Budgets by Nature
      // Since budgets are category-based, we map Categories to default natures for this calculation
      const budgetMap: Record<TransactionNature, number> = { need: 0, want: 0, luxury: 0, saving: 0, income: 0, adjustment: 0 };
      
      const natureMapping: Record<Category, TransactionNature> = {
          [Category.Housing]: 'need', [Category.Groceries]: 'need', [Category.Utilities]: 'need', [Category.Health]: 'need', [Category.Transport]: 'need', [Category.DomesticHelp]: 'need',
          [Category.Food]: 'want', [Category.Entertainment]: 'want', [Category.Shopping]: 'want', [Category.Others]: 'want',
          [Category.Investments]: 'saving',
          [Category.Salary]: 'income'
      };

      Object.entries(budgets).forEach(([cat, amount]) => {
          const nat = natureMapping[cat as Category] || 'want';
          if(nat !== 'income') {
             budgetMap[nat] += (Number(amount) * 12); // Annualize for variance view
          }
      });
      
      return [
          { name: 'NEEDS', budget: budgetMap.need, actual: actuals.need, fill: '#0177fb' }, // Brand Blue
          { name: 'WANTS', budget: budgetMap.want, actual: actuals.want, fill: '#FF5252' }, // Red
          { name: 'LUXURIES', budget: budgetMap.luxury, actual: actuals.luxury, fill: '#7C4DFF' }, // Violet
          { name: 'SAVINGS', budget: budgetMap.saving, actual: actuals.saving, fill: '#4cbee1' }, // Accent
      ];
  }, [filteredTransactions, budgets]);

  // 3. Monthly Spend Trend
  const spendTrendData = useMemo(() => {
     const months = yearType === 'calendar'
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
     
     const monthlySpend: Record<string, number> = {};

     filteredTransactions
      .filter(t => t.type === 'debit')
      .forEach(t => {
        const monthIndex = new Date(t.date).getMonth();
        const monthName = months[yearType === 'calendar' ? monthIndex : (monthIndex - 3 + 12) % 12];
        if(monthName) {
           monthlySpend[monthName] = (monthlySpend[monthName] || 0) + t.amount;
        }
      });
      
     return months.map(month => ({
       name: month,
       spend: monthlySpend[month] || 0
     }));

  }, [filteredTransactions, yearType]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-panel border border-border p-3 rounded-2xl shadow-lg">
          <p className="font-bold text-white">{label}</p>
          <p style={{ color: payload[0].fill }}>{`${payload[0].name}: ${INDIAN_RUPEE.format(payload[0].value)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">

      {/* Filters */}
      <div className="bg-panel border border-border p-6 rounded-3xl flex flex-col md:flex-row items-center gap-4 justify-between shadow-md">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-charcoal p-1 rounded-2xl border border-border">
                <button onClick={() => setYearType('calendar')} className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${yearType === 'calendar' ? 'bg-brand text-white shadow-md' : 'text-muted hover:text-white'}`}>Calendar Year</button>
                <button onClick={() => setYearType('financial')} className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${yearType === 'financial' ? 'bg-brand text-white shadow-md' : 'text-muted hover:text-white'}`}>Financial Year</button>
            </div>
            <div className="relative group w-full sm:w-auto">
                <div className="flex items-center gap-2 px-6 py-3 bg-charcoal border border-border rounded-2xl text-sm text-white font-bold cursor-pointer hover:border-brand transition-colors w-full justify-between sm:justify-start">
                    <span>{currentYear}</span>
                    <ChevronDown size={14} className="opacity-70" />
                </div>
                <select 
                    value={currentYear}
                    onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                >
                    {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>
        </div>
      </div>

      {/* ECAS Graph (Equity, Cash, Assets, Savings) */}
      <div className="bg-panel border border-border p-6 rounded-3xl flex flex-col shadow-xl">
        <div className="mb-6 flex justify-between items-start">
            <div>
                <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-tight">ECAS Trajectory</h3>
                <p className="text-xs text-muted font-medium uppercase tracking-widest">Equity • Cash • Assets • Savings</p>
            </div>
            <div className="p-3 bg-charcoal rounded-2xl border border-border">
                <LineChart className="text-brand w-5 h-5" />
            </div>
        </div>
        <div className="flex-1 w-full min-h-[300px]">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={ecasData}>
                <defs>
                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0177fb" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0177fb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4cbee1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4cbee1" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3240" vertical={false} />
                <XAxis dataKey="month" stroke="#75787F" fontSize={12} tickLine={false} axisLine={false} fontFamily="Urbanist" />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#131635', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', fontFamily: 'Urbanist' }}
                    formatter={(value: number) => INDIAN_RUPEE.format(value)}
                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                />
                <Legend iconType="circle" />
                <Area type="monotone" dataKey="Equity" stackId="1" stroke="#0177fb" strokeWidth={2} fill="url(#colorEquity)" />
                <Area type="monotone" dataKey="Cash" stackId="1" stroke="#4cbee1" strokeWidth={2} fill="url(#colorCash)" />
                <Area type="monotone" dataKey="Assets" stackId="1" stroke="#F59E0B" strokeWidth={2} fill="#F59E0B" fillOpacity={0.1} />
                <Area type="monotone" dataKey="Savings" stackId="1" stroke="#8B5CF6" strokeWidth={2} fill="#8B5CF6" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* NWLS Variance Analysis (Budget vs Actual) */}
      <div className="bg-panel border border-border p-6 rounded-3xl flex flex-col shadow-xl">
          <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-tight">NWLS Variance</h3>
              <p className="text-xs text-muted font-medium uppercase tracking-widest">Needs • Wants • Luxuries • Savings</p>
          </div>
          <div className="flex-1 w-full min-h-[300px]">
             <ResponsiveContainer width="100%" height={300}>
                <BarChart data={nwlsVarianceData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} barGap={0}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3240" vertical={false} />
                    <XAxis dataKey="name" stroke="#75787F" fontSize={12} tickLine={false} axisLine={false} fontFamily="Urbanist" />
                    <YAxis stroke="#75787F" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} fontFamily="Urbanist" />
                    <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        contentStyle={{ backgroundColor: '#131635', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff', fontFamily: 'Urbanist' }}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="budget" name="Annual Budget" fill="#2d3240" barSize={32} radius={[12, 12, 12, 12]} />
                    <Bar dataKey="actual" name="Annual Actual" barSize={32} radius={[12, 12, 12, 12]}>
                        {nwlsVarianceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
      </div>

      {/* Monthly Expenses Bar Chart */}
      <div className="bg-panel border border-border p-6 rounded-3xl flex flex-col shadow-xl">
          <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-tight">Burn Rate Analysis</h3>
              <p className="text-xs text-muted font-medium uppercase tracking-widest">Total Outflow Trend</p>
          </div>
          <div className="flex-1 w-full min-h-[300px]">
             <ResponsiveContainer width="100%" height={300}>
                <BarChart data={spendTrendData}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#2d3240" vertical={false} />
                   <XAxis dataKey="name" stroke="#75787F" fontSize={12} tickLine={false} axisLine={false} fontFamily="Urbanist" />
                   <YAxis stroke="#75787F" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} fontFamily="Urbanist" />
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#131635', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff', fontFamily: 'Urbanist' }}
                      cursor={{ fill: 'rgba(239, 68, 68, 0.1)' }}
                      formatter={(value: number) => INDIAN_RUPEE.format(value)}
                   />
                   <Bar dataKey="spend" radius={[12, 12, 12, 12]} barSize={24} fill="#FF5252" />
                </BarChart>
             </ResponsiveContainer>
          </div>
      </div>

    </div>
  );
};

export default AnalyticsView;