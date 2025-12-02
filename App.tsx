import React, { useState, useMemo, useEffect } from 'react';
import { INDIAN_RUPEE } from './constants';
import { Transaction, ViewState, Asset, UserProfile, Goal, BudgetMap, PaymentMethod, AssetType } from './types';
import { storageService } from './services/storage';
import { firebaseService, UserData } from './services/firebase';
import ExpenseList from './components/ExpenseList';
import AddExpense from './components/AddExpense';
import EditAssetsModal from './components/EditAssetsModal';
import SettingsModal from './components/SettingsModal';
import ImportData from './components/ImportData';
import AnalyticsView from './components/AnalyticsView';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import OnboardingWizard from './components/OnboardingWizard';
import GoalsView from './components/GoalsView';
import CapitalMarketsView from './components/CapitalMarketsView';
import { 
  IndianRupee, 
  LayoutGrid, 
  History, 
  Upload, 
  LineChart, 
  User, 
  Target,
  Banknote,
  ChevronDown,
  WifiOff,
  CloudCheck,
  CreditCard,
  Landmark,
  Coins,
  Briefcase
} from 'lucide-react';

const App: React.FC = () => {
  // --- Data State Initialization ---
  const [transactions, setTransactions] = useState<Transaction[]>(storageService.getTransactions());
  const [assets, setAssets] = useState<Asset[]>(storageService.getAssets());
  const [userProfile, setUserProfile] = useState<UserProfile>(storageService.getUserProfile());
  const [goals, setGoals] = useState<Goal[]>(storageService.getGoals());
  const [budgets, setBudgets] = useState<BudgetMap>(storageService.getBudgets());

  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // --- Auth & Data Sync Listener ---
  useEffect(() => {
    const unsubscribeAuth = firebaseService.onAuthStateChange((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsOfflineMode(false);
        // FIX: Auto-authenticate to prevent login loop
        setIsAuthenticated(true);
      } else {
         if (!isOfflineMode) {
             setUser(null);
             setIsAuthenticated(false);
         }
      }
      setIsLoading(false);
    });

    return () => unsubscribeAuth();
  }, [isOfflineMode]);

  // --- Real-time Data Sync ---
  useEffect(() => {
      if (user && !isOfflineMode) {
          const unsubscribeData = firebaseService.subscribeToUserData(user.uid, (data: UserData) => {
              if (data.profile) {
                  setUserProfile(data.profile);
                  if (isAuthenticated && data.profile.isOnboarded === false && !showOnboarding) {
                      setShowOnboarding(true);
                  }
              }
              setTransactions(data.transactions || []);
              setAssets(data.assets || []);
              setGoals(data.goals || []);
              setBudgets(data.budgets || {});
          });
          return () => unsubscribeData();
      }
  }, [user, isOfflineMode, isAuthenticated]);

  const handleLogin = async () => {
    if (user) {
        setIsAuthenticated(true);
        if (userProfile && userProfile.isOnboarded === false) setShowOnboarding(true);
    } else {
        try {
            await firebaseService.signIn();
            setIsAuthenticated(true);
        } catch (error: any) {
            console.warn("Cloud connection failed:", error.message);
        }
    }
  };

  const handleNewUserFlow = async () => {
    try {
        await firebaseService.signIn();
        setIsAuthenticated(true);
        setShowOnboarding(true);
    } catch (error) {
        console.error("Failed to init new user session", error);
    }
  };

  const handleSimLogin = () => {
      const localUser = { uid: 'sim_user_local', isAnonymous: true, email: 'sim@vizbuck.local' };
      setUser(localUser);
      setIsAuthenticated(true);
      setIsOfflineMode(true);
      setIsLoading(false);
      setShowOnboarding(false);
      
      setTransactions(storageService.getTransactions());
      setAssets(storageService.getAssets());
      setUserProfile(storageService.getUserProfile());
      setGoals(storageService.getGoals());
      setBudgets(storageService.getBudgets());
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    setTransactions([]);
    setAssets([]);
    setGoals([]);
    setBudgets({});
    
    if (user && !isOfflineMode) {
        try {
            await firebaseService.logoutUser();
        } catch (e) {
            console.error("Logout failed", e);
        }
    }
    
    setUser(null);
    setIsOfflineMode(false);
    setCurrentView('dashboard');
    setShowOnboarding(false);
  };
  
  const handleSwitchMode = () => {
      handleLogout();
  };

  const handleResetData = async () => {
      const emptyTxns: Transaction[] = [];
      const emptyAssets: Asset[] = [];
      const emptyGoals: Goal[] = [];
      const emptyBudgets: BudgetMap = {};
      
      const newProfile = { ...userProfile, isOnboarded: false };
      
      setTransactions(emptyTxns);
      setAssets(emptyAssets);
      setGoals(emptyGoals);
      setBudgets(emptyBudgets);
      setUserProfile(newProfile);

      if (isOfflineMode) {
          storageService.updateTransactions(emptyTxns);
          storageService.saveAssets(emptyAssets);
          storageService.saveGoals(emptyGoals);
          storageService.saveBudgets(emptyBudgets);
          storageService.saveUserProfile(newProfile);
      } else if (user) {
          await firebaseService.saveUserData(user.uid, {
              transactions: emptyTxns,
              assets: emptyAssets,
              goals: emptyGoals,
              budgets: emptyBudgets,
              profile: newProfile
          });
      }

      setShowOnboarding(true);
  };
  
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toLocaleString('default', { month: 'long' }));
  
  const [isEditAssetModalOpen, setIsEditAssetModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [assetModalTab, setAssetModalTab] = useState<'liquid' | 'investment'>('liquid');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- Transaction Handlers ---
  const handleAddTransaction = async (newTransaction: Omit<Transaction, 'id'>) => {
    const transaction: Transaction = { ...newTransaction, id: Math.random().toString(36).substr(2, 9) };
    const updatedTransactions = [transaction, ...transactions];
    setTransactions(updatedTransactions);
    if (isOfflineMode) storageService.updateTransactions(updatedTransactions);
    if (user && !isOfflineMode) await firebaseService.saveUserData(user.uid, { transactions: updatedTransactions });
  };
  
  const handleImportSuccess = (updatedTransactions?: Transaction[], updatedAssets?: Asset[]) => {
    if (updatedTransactions) setTransactions(updatedTransactions);
    if (updatedAssets) setAssets(updatedAssets);
    if (isOfflineMode && !updatedTransactions) {
        setTransactions(storageService.getTransactions());
        setAssets(storageService.getAssets());
    }
    setCurrentView('transactions');
  };

  const handleUpdateTransactions = async (ids: string[], updates: Partial<Transaction>) => {
    const updatedTransactions = transactions.map(t => ids.includes(t.id) ? { ...t, ...updates } : t);
    setTransactions(updatedTransactions);
    if (isOfflineMode) storageService.updateTransactions(updatedTransactions);
    if (user && !isOfflineMode) await firebaseService.saveUserData(user.uid, { transactions: updatedTransactions });
  };

  const handleDeleteTransactions = async (ids: string[]) => {
    // --- Forensic Logging Start ---
    console.log("🔴 [App] Delete operation initiated");
    console.log(`🔴 [App] Targets: ${ids.length} transaction(s)`, ids);
    console.log(`🔴 [App] Current Store State: ${transactions.length} items`);
    
    // Validation
    const targetsSet = new Set(ids);
    const exists = transactions.some(t => targetsSet.has(t.id));
    if (!exists) {
        console.error("⚠️ [App] CRITICAL: Attempted to delete IDs that do not exist in current state!", ids);
        return; 
    }

    const updatedTransactions = transactions.filter(t => !ids.includes(t.id));
    console.log(`🟢 [App] State After Filter: ${updatedTransactions.length} items (Removed ${transactions.length - updatedTransactions.length})`);
    // --- Forensic Logging End ---

    setTransactions(updatedTransactions);
    if (isOfflineMode) storageService.updateTransactions(updatedTransactions);
    if (user && !isOfflineMode) await firebaseService.saveUserData(user.uid, { transactions: updatedTransactions });
  };

  const handleSaveAssets = async (updatedAssets: Asset[]) => {
    setAssets(updatedAssets);
    if (isOfflineMode) storageService.saveAssets(updatedAssets);
    if (user && !isOfflineMode) await firebaseService.saveUserData(user.uid, { assets: updatedAssets });
  };

  const handleSaveProfile = async (updatedProfile: UserProfile, updatedBudgets?: BudgetMap) => {
    setUserProfile(updatedProfile);
    if(updatedBudgets) setBudgets(updatedBudgets);
    
    if (isOfflineMode) {
        storageService.saveUserProfile(updatedProfile);
        if(updatedBudgets) storageService.saveBudgets(updatedBudgets);
    }
    
    if (user && !isOfflineMode) {
      try {
          const updatePayload: any = { profile: updatedProfile };
          if (updatedBudgets) updatePayload.budgets = updatedBudgets;
          await firebaseService.saveUserData(user.uid, updatePayload);
      } catch (err) {
          console.error("Failed to save profile to cloud:", err);
          // Optional: Show toast error here
      }
    }
  };

  const handleOpenAssetModal = (initialTab: 'liquid' | 'investment' = 'liquid') => {
    setAssetModalTab(initialTab);
    setIsEditAssetModalOpen(true);
  };

  const handleOnboardingComplete = async (profile: UserProfile, initialAssets: Asset[], initialBudgets: BudgetMap, initialTransactions: Transaction[]) => {
      const finalizedProfile = { ...profile, isOnboarded: true };
      setUserProfile(finalizedProfile);
      setAssets(initialAssets);
      setBudgets(initialBudgets);
      const allTransactions = [...initialTransactions, ...transactions];
      setTransactions(allTransactions);
      
      if (isOfflineMode) {
          storageService.saveUserProfile(finalizedProfile);
          storageService.saveAssets(initialAssets);
          storageService.saveBudgets(initialBudgets);
          storageService.updateTransactions(allTransactions);
      }

      if (user && !isOfflineMode) {
          await firebaseService.saveUserData(user.uid, { 
            profile: finalizedProfile, 
            assets: initialAssets, 
            budgets: initialBudgets,
            transactions: allTransactions,
            goals: goals
          });
      }
      setShowOnboarding(false);
  };

  const dashboardStats = useMemo(() => {
    // CURRENT MONTH CALCULATION
    const monthIndex = new Date(`${selectedMonth} 1, 2000`).getMonth();
    const startOfSelectedMonth = new Date(selectedYear, monthIndex, 1);
    const endOfSelectedMonth = new Date(selectedYear, monthIndex + 1, 0, 23, 59, 59);

    const periodTxns = transactions.filter(t => {
        const d = new Date(t.date);
        return d >= startOfSelectedMonth && d <= endOfSelectedMonth && t.nature !== 'adjustment';
    });

    const calculateAssetFlow = (types: AssetType[], paymentMethods: PaymentMethod[], endDate: Date) => {
        const relevantAssets = assets.filter(a => types.includes(a.type));
        
        const closingBalance = relevantAssets.reduce((total, asset) => {
            let historicValue = asset.amount;
            const assetAsOfDate = new Date(asset.asOfDate);

            if (assetAsOfDate > endDate) { 
                const txnsToRewind = transactions.filter(t => {
                    const txDate = new Date(t.date);
                    return txDate > endDate && txDate <= assetAsOfDate && paymentMethods.includes(t.paymentMethod);
                });
                txnsToRewind.forEach(t => {
                    if (t.type === 'debit') historicValue += t.amount;
                    else historicValue -= t.amount;
                });
            } else {
                const txnsToApply = transactions.filter(t => {
                    const txDate = new Date(t.date);
                    return txDate > assetAsOfDate && txDate <= endDate && paymentMethods.includes(t.paymentMethod);
                });
                txnsToApply.forEach(t => {
                     if (t.type === 'debit') historicValue -= t.amount;
                    else historicValue += t.amount;
                });
            }
            return total + historicValue;
        }, 0);

        const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        const relevantPeriodTxns = transactions.filter(t => {
             const d = new Date(t.date);
             return d >= startDate && d <= endDate && paymentMethods.includes(t.paymentMethod) && t.nature !== 'adjustment';
        });

        let openingBalance = closingBalance;
        let inflow = 0;
        let outflow = 0;
        
        relevantPeriodTxns.forEach(t => {
            if (t.type === 'debit') {
                openingBalance += t.amount;
                outflow += t.amount;
            } else {
                openingBalance -= t.amount;
                inflow += t.amount;
            }
        });
        return { opening: openingBalance, closing: closingBalance, inflow, outflow };
    };

    const bankStats = calculateAssetFlow(['bank'], [PaymentMethod.UPI, PaymentMethod.NetBanking, PaymentMethod.Other], endOfSelectedMonth);
    const cashStats = calculateAssetFlow(['cash'], [PaymentMethod.Cash], endOfSelectedMonth);
    const creditStats = calculateAssetFlow(['credit'], [PaymentMethod.Card], endOfSelectedMonth);
    const receivableStats = calculateAssetFlow(['receivable'], [], endOfSelectedMonth);

    // PREVIOUS MONTH CALCULATION FOR % GROWTH
    const prevMonthDate = new Date(selectedYear, monthIndex - 1, 1);
    const endOfPrevMonth = new Date(selectedYear, monthIndex, 0, 23, 59, 59);

    const prevBankStats = calculateAssetFlow(['bank'], [PaymentMethod.UPI, PaymentMethod.NetBanking, PaymentMethod.Other], endOfPrevMonth);
    const prevCashStats = calculateAssetFlow(['cash'], [PaymentMethod.Cash], endOfPrevMonth);
    const prevCreditStats = calculateAssetFlow(['credit'], [PaymentMethod.Card], endOfPrevMonth);
    
    const reserveTypes: AssetType[] = ['stock', 'us_stock', 'crypto', 'fund', 'deposit', 'real_estate', 'elss', 'pf', 'metal', 'nps', 'other'];
    const reserveAssets = assets.filter(a => reserveTypes.includes(a.type));
    const totalReserves = reserveAssets.reduce((sum, a) => sum + a.amount, 0);
    const netWorth = bankStats.closing + cashStats.closing + creditStats.closing + receivableStats.closing + totalReserves;
    
    return { 
        bankStats, cashStats, creditStats, receivableStats, 
        prevBankStats, prevCashStats, prevCreditStats,
        totalReserves, reserveAssets: reserveAssets, netWorth, monthTxns: periodTxns 
    };
  }, [assets, transactions, selectedYear, selectedMonth]);

  const monthsList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const yearsList = Array.from(new Set(transactions.map(t => new Date(t.date).getFullYear()))).sort((a: number, b: number) => b - a);
  if (yearsList.length === 0) yearsList.push(new Date().getFullYear());

  const handleAddGoal = async (newGoal: Omit<Goal, 'id'>) => {
      const goal = { ...newGoal, id: Math.random().toString(36).substr(2, 9) };
      const updated = [...goals, goal]; 
      setGoals(updated); 
      if (isOfflineMode) storageService.saveGoals(updated);
      if (user && !isOfflineMode) await firebaseService.saveUserData(user.uid, { goals: updated });
  };
  const handleUpdateGoal = async (updatedGoal: Goal) => {
      const updated = goals.map(g => g.id === updatedGoal.id ? updatedGoal : g); 
      setGoals(updated); 
      if (isOfflineMode) storageService.saveGoals(updated);
      if (user && !isOfflineMode) await firebaseService.saveUserData(user.uid, { goals: updated });
  };
  const handleDeleteGoal = async (id: string) => {
      if(!window.confirm("Delete goal?")) return;
      const updated = goals.filter(g => g.id !== id); 
      setGoals(updated); 
      if (isOfflineMode) storageService.saveGoals(updated);
      if (user && !isOfflineMode) await firebaseService.saveUserData(user.uid, { goals: updated });
  };

  if (isLoading) return null;
  if (!isAuthenticated) return <Login onLogin={handleLogin} onSimLogin={handleSimLogin} onNewUser={handleNewUserFlow} />;
  if (showOnboarding) return <OnboardingWizard onComplete={handleOnboardingComplete} initialProfile={userProfile} />;

  const totalLiquidity = {
      opening: dashboardStats.bankStats.opening + dashboardStats.cashStats.opening + dashboardStats.creditStats.opening,
      inflow: dashboardStats.bankStats.inflow + dashboardStats.cashStats.inflow + dashboardStats.creditStats.inflow,
      outflow: dashboardStats.bankStats.outflow + dashboardStats.cashStats.outflow + dashboardStats.creditStats.outflow,
      closing: dashboardStats.bankStats.closing + dashboardStats.cashStats.closing + dashboardStats.creditStats.closing,
  };

  const prevTotalLiquidity = {
      opening: dashboardStats.prevBankStats.opening + dashboardStats.prevCashStats.opening + dashboardStats.prevCreditStats.opening,
      inflow: dashboardStats.prevBankStats.inflow + dashboardStats.prevCashStats.inflow + dashboardStats.prevCreditStats.inflow,
      outflow: dashboardStats.prevBankStats.outflow + dashboardStats.prevCashStats.outflow + dashboardStats.prevCreditStats.outflow,
      closing: dashboardStats.prevBankStats.closing + dashboardStats.prevCashStats.closing + dashboardStats.prevCreditStats.closing,
  };

  const getPercentageChange = (curr: number, prev: number) => {
      if (prev === 0) return curr === 0 ? 0 : 100;
      return ((curr - prev) / prev) * 100;
  };

  const changes = {
      opening: getPercentageChange(totalLiquidity.opening, prevTotalLiquidity.opening),
      inflow: getPercentageChange(totalLiquidity.inflow, prevTotalLiquidity.inflow),
      outflow: getPercentageChange(totalLiquidity.outflow, prevTotalLiquidity.outflow),
      closing: getPercentageChange(totalLiquidity.closing, prevTotalLiquidity.closing)
  };

  const ChangeIndicator = ({ val }: { val: number }) => {
      if(isNaN(val) || val === 0) return null;
      const isPositive = val > 0;
      return (
          <span className={`text-[10px] font-bold ml-1 ${isPositive ? 'text-positive' : 'text-neon-red'}`}>
             {isPositive ? '▲' : '▼'} {Math.abs(val).toFixed(1)}%
          </span>
      );
  };
  
  const TileTable = ({ rows, totalLabel, totalValue, totalColor = 'text-white' }: any) => (
    <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <table className="w-full text-sm">
                <thead className="text-[10px] uppercase text-muted font-bold border-b border-border sticky top-0 bg-panel z-10 font-mono">
                    <tr>
                        <th className="text-left py-3 pl-2">Asset</th>
                        <th className="text-right py-3 pr-2">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {rows.map((r: any, i: number) => (
                        <tr key={i} className="group hover:bg-white/5 transition-colors">
                            <td className="py-3 pl-2 text-gray-300 font-medium flex items-center gap-2">
                                {r.icon && <div className="p-2 rounded-xl bg-surface text-muted group-hover:text-brand transition-colors"><r.icon size={12} /></div>} 
                                {r.label}
                            </td>
                            <td className={`py-3 pr-2 text-right font-mono font-bold ${r.val < 0 ? 'text-neon-red' : 'text-main'}`}>
                                {INDIAN_RUPEE.format(r.val)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {totalLabel && (
            <div className="pt-4 mt-2 border-t border-border flex justify-between items-center px-2">
                <span className="text-xs font-bold text-muted uppercase tracking-wider font-mono">{totalLabel}</span>
                <span className={`text-base font-bold font-mono ${totalColor}`}>{INDIAN_RUPEE.format(totalValue)}</span>
            </div>
        )}
    </div>
  );
  
  const liquidityRows = [
      { 
          icon: Landmark, 
          label: 'Bank', 
          current: dashboardStats.bankStats,
          prev: dashboardStats.prevBankStats
      },
      { 
          icon: Banknote, 
          label: 'Cash', 
          current: dashboardStats.cashStats,
          prev: dashboardStats.prevCashStats
      },
      { 
          icon: CreditCard, 
          label: 'Credit Cards', 
          current: dashboardStats.creditStats,
          prev: dashboardStats.prevCreditStats
      },
  ];

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'capital_markets', label: 'Capital Mkts', icon: Briefcase },
    { id: 'transactions', label: 'Txns', icon: History },
    { id: 'analytics', label: 'Analytics', icon: LineChart },
    { id: 'goals', label: 'Goals', icon: Target },
  ];

  return (
    <div className="min-h-screen bg-canvas text-main font-sans flex flex-col selection:bg-brand/30 pb-12 transition-colors duration-300">
      
      <nav className="sticky top-0 z-40 bg-canvas/80 backdrop-blur-md border-b border-border transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
            {/* Top Row: Logo & User Actions */}
            <div className="flex items-center justify-between px-4 md:px-6 py-4">
                <button onClick={() => setIsSidebarOpen(true)} className="flex items-center gap-3 group focus:outline-none">
                    <div className="w-10 h-10 bg-brand/10 border border-brand flex items-center justify-center text-brand shadow-[0_0_15px_rgba(1,119,251,0.2)] rounded-2xl group-hover:bg-brand/20 transition-all duration-300 transform">
                        <IndianRupee size={20} strokeWidth={2.5} />
                    </div>
                    <div className="text-left hidden md:block">
                        <h1 className="text-xl font-bold text-main tracking-tight group-hover:text-brand transition-colors font-display uppercase">VizBuck</h1>
                    </div>
                </button>
                
                {/* Desktop Nav - Hidden on Mobile */}
                <div className="hidden md:flex items-center gap-1 bg-panel p-1.5 border border-border rounded-full shadow-sm">
                    {navItems.map(item => (<button key={item.id} onClick={() => setCurrentView(item.id as ViewState)} className={`flex items-center gap-2 px-5 py-2 text-xs font-bold transition-all duration-300 rounded-full uppercase tracking-wide font-mono ${currentView === item.id ? 'bg-brand text-white shadow-md' : 'text-muted hover:text-main hover:bg-white/5'}`}><item.icon size={16} strokeWidth={2.5} />{item.label}</button>))}
                </div>

                <div className="flex items-center gap-4">
                    {isOfflineMode ? (
                        <button onClick={handleSwitchMode} className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-wide hover:bg-white/10 transition-colors font-mono" title="Switch to Live Mode">
                            <WifiOff size={14} /> SIM Mode
                        </button>
                    ) : (
                        <button onClick={handleSwitchMode} className="hidden md:flex items-center gap-2 px-4 py-2 bg-brand/10 border border-brand/20 rounded-full text-[10px] font-bold text-brand uppercase tracking-wide hover:bg-brand/20 transition-colors font-mono" title="Switch to SIM Mode">
                            <CloudCheck size={14} /> Live Mode
                        </button>
                    )}
                    <button onClick={() => setIsSettingsModalOpen(true)} className="w-10 h-10 bg-panel flex items-center justify-center text-xs font-bold border border-border text-muted hover:border-brand hover:text-brand transition-all rounded-2xl overflow-hidden shadow-sm">
                        {userProfile.avatar ? (<img src={userProfile.avatar} alt="User" className="w-full h-full object-cover" />) : (<User size={20} />)}
                    </button>
                </div>
            </div>

            {/* Mobile Nav - Visible only on Mobile (Scrollable Row) */}
            <div className="md:hidden px-4 pb-4 overflow-x-auto no-scrollbar flex items-center gap-2">
                 {navItems.map(item => (
                    <button 
                        key={item.id} 
                        onClick={() => setCurrentView(item.id as ViewState)} 
                        className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all duration-300 rounded-2xl uppercase tracking-wide font-mono border ${currentView === item.id ? 'bg-brand text-white border-brand shadow-lg shadow-brand/20' : 'bg-panel text-muted border-border hover:text-main hover:bg-white/5'}`}
                    >
                        <item.icon size={16} strokeWidth={2.5} />
                        {item.label}
                    </button>
                 ))}
            </div>
        </div>
      </nav>

      {/* Month Selector - Sticky Position Calculation: Header Row 1 (~72px) + Header Row 2 (~56px) = ~128px */}
      <div className="bg-canvas border-b border-border py-4 px-2 sm:px-4 sticky top-[128px] md:top-[72px] z-30 shadow-sm transition-all duration-300">
          <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar justify-start">
              <div className="relative group shrink-0">
                  <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-panel border border-border rounded-2xl text-sm font-bold text-brand cursor-pointer hover:border-brand/50 transition-colors font-mono shadow-sm">
                      <span>{selectedYear}</span><ChevronDown size={14} />
                  </div>
                  <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  >
                      {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
              </div>
              <div className="h-8 w-[1px] bg-border shrink-0"></div>
              {/* Scrollable Months Container */}
              <div className="flex items-center gap-1 sm:gap-2 bg-panel p-1 rounded-2xl border border-border overflow-x-auto no-scrollbar max-w-full">
                  {monthsList.map(m => (
                      <button 
                        key={m}
                        onClick={() => setSelectedMonth(m)}
                        className={`px-3 sm:px-4 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap uppercase tracking-wider font-mono text-[11px] sm:text-xs shrink-0 ${selectedMonth === m ? 'bg-brand text-white shadow-sm' : 'text-muted hover:text-main hover:bg-white/5'}`}
                      >
                          {m.substring(0, 3)}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end pb-6 border-b border-border gap-4">
             <div>
                <h2 className="text-3xl font-bold text-main tracking-tight mb-1 font-display uppercase">{currentView === 'dashboard' ? 'Overview' : currentView === 'import' ? 'Import Data' : currentView.replace('_', ' ')}</h2>
                <p className="text-muted text-sm font-mono">Financial Snapshot • {selectedMonth} {selectedYear}</p>
             </div>
             {currentView === 'dashboard' && (
                <div className="bg-panel px-6 py-4 rounded-3xl border border-border flex flex-col items-center sm:items-end shadow-lg w-full sm:w-auto">
                    <span className="text-xs text-muted uppercase font-bold tracking-wider mb-1 font-mono">Net Worth</span>
                    <span className="text-3xl text-brand font-bold tracking-tight font-mono">{INDIAN_RUPEE.format(dashboardStats.netWorth)}</span>
                </div>
             )}
        </div>
       
        {currentView === 'dashboard' && (
            <div className="grid grid-cols-1 gap-6">
                
                {/* CONSOLIDATED LIQUIDITY TILE */}
                <div className="glass-panel rounded-3xl p-4 sm:p-8 flex flex-col hover:border-brand/30 transition-colors">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-brand/10 rounded-2xl text-brand border border-brand/20"><History size={20} /></div>
                        <h3 className="text-base font-bold text-main uppercase font-mono tracking-wide">Consolidated Liquidity</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[600px]">
                            <thead className="text-[10px] uppercase text-muted font-bold border-b border-border font-mono">
                                <tr>
                                    <th className="text-left py-3 pl-2">Channel</th>
                                    <th className="text-center py-3">Opening</th>
                                    <th className="text-center py-3 text-positive">Inflow</th>
                                    <th className="text-center py-3 text-neon-red">Outflow</th>
                                    <th className="text-center py-3 pr-2 text-main">Closing</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {liquidityRows.map((r, i) => (
                                    <tr key={i} className="group hover:bg-white/5 transition-colors">
                                        <td className="py-3 pl-2 text-gray-300 font-medium flex items-center gap-2">
                                            <div className="p-2 rounded-xl bg-surface text-muted group-hover:text-brand transition-colors"><r.icon size={12} /></div> 
                                            {r.label}
                                        </td>
                                        <td className="py-3 text-center font-mono text-muted">
                                            {INDIAN_RUPEE.format(r.current.opening)}
                                            <ChangeIndicator val={getPercentageChange(r.current.opening, r.prev.opening)} />
                                        </td>
                                        <td className="py-3 text-center font-mono text-positive">
                                            {INDIAN_RUPEE.format(r.current.inflow)}
                                            <ChangeIndicator val={getPercentageChange(r.current.inflow, r.prev.inflow)} />
                                        </td>
                                        <td className="py-3 text-center font-mono text-neon-red">
                                            {INDIAN_RUPEE.format(r.current.outflow)}
                                            <ChangeIndicator val={getPercentageChange(r.current.outflow, r.prev.outflow)} />
                                        </td>
                                        <td className="py-3 pr-2 text-center font-mono font-bold text-main">
                                            {INDIAN_RUPEE.format(r.current.closing)}
                                            <ChangeIndicator val={getPercentageChange(r.current.closing, r.prev.closing)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t-2 border-border">
                                <tr className="font-bold">
                                    <td className="py-3 pl-2 uppercase text-xs tracking-wider">Total</td>
                                    <td className="py-3 text-center font-mono text-muted">
                                        {INDIAN_RUPEE.format(totalLiquidity.opening)}
                                        <ChangeIndicator val={changes.opening} />
                                    </td>
                                    <td className="py-3 text-center font-mono text-positive">
                                        {INDIAN_RUPEE.format(totalLiquidity.inflow)}
                                        <ChangeIndicator val={changes.inflow} />
                                    </td>
                                    <td className="py-3 text-center font-mono text-neon-red">
                                        {INDIAN_RUPEE.format(totalLiquidity.outflow)}
                                        <ChangeIndicator val={changes.outflow} />
                                    </td>
                                    <td className="py-3 pr-2 text-center font-mono text-main">
                                        {INDIAN_RUPEE.format(totalLiquidity.closing)}
                                        <ChangeIndicator val={changes.closing} />
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* RESERVES TILE */}
                <div className="glass-panel rounded-3xl p-4 sm:p-8 flex flex-col hover:border-brand/30 transition-colors">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-neon-violet/10 rounded-2xl text-neon-violet border border-neon-violet/20"><Coins size={20} /></div>
                        <h3 className="text-base font-bold text-main uppercase font-mono tracking-wide">Reserves Breakdown</h3>
                     </div>
                     <TileTable 
                        rows={dashboardStats.reserveAssets.map(a => ({ label: a.name, val: a.amount, icon: Coins }))}
                        totalLabel="Total Reserves"
                        totalValue={dashboardStats.totalReserves}
                        totalColor="text-neon-violet"
                     />
                </div>

            </div>
          )}

          {currentView === 'capital_markets' && (<CapitalMarketsView assets={assets} onSaveAssets={handleSaveAssets} />)}

          {currentView === 'transactions' && (
            <ExpenseList 
                expenses={dashboardStats.monthTxns} 
                onUpdate={handleUpdateTransactions} 
                onDelete={handleDeleteTransactions} 
                onAddClick={() => setIsAddExpenseModalOpen(true)}
                onImportClick={() => setCurrentView('import')}
            />
          )}

          {currentView === 'analytics' && (<AnalyticsView transactions={transactions} assets={assets} budgets={budgets} selectedMonth={selectedMonth} selectedYear={selectedYear} />)}
          
          {currentView === 'goals' && (<GoalsView goals={goals} onAddGoal={handleAddGoal} onUpdateGoal={handleUpdateGoal} onDeleteGoal={handleDeleteGoal} />)}
          
          {currentView === 'import' && (<ImportData onImportSuccess={handleImportSuccess} userId={user?.uid} currentTransactions={transactions} currentAssets={assets} />)}
      </main>

      {/* FOOTER REMOVED - Nav moved to header */}

      <EditAssetsModal assets={assets} isOpen={isEditAssetModalOpen} onClose={() => setIsEditAssetModalOpen(false)} onSave={handleSaveAssets} initialTab={assetModalTab} />
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
        userProfile={userProfile} 
        onSaveProfile={handleSaveProfile} 
        onLogout={handleLogout} 
        theme={theme} 
        onThemeChange={setTheme} 
        currentBudgets={budgets} 
        onOpenAssets={handleOpenAssetModal} 
        isOfflineMode={isOfflineMode}
        onSwitchMode={handleSwitchMode}
        onResetData={handleResetData}
      />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} currentView={currentView} onViewChange={setCurrentView}/>
      <AddExpense isOpen={isAddExpenseModalOpen} onClose={() => setIsAddExpenseModalOpen(false)} onAdd={handleAddTransaction} />
    </div>
  );
};

export default App;