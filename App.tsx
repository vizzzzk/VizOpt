



import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { APP_CONFIG, REFRESH_INTERVAL_MS, FIREBASE_CONFIG } from './constants';
import { Position, PortfolioSummary, OptionData, MarketAnalysis, OptionType, TradeType, ExpiryDate, PortfolioHistoryPoint } from './types';
import { fetchMockData, mockExpiries, getMockMarketAnalysis } from './services/mockData';
import { fetchUpstoxOptionChain, fetchUpstoxContractExpiries, fetchIndiaVix } from './services/upstox';
import { calculateTradeDetails, calculateCharges, isMarketOpen, getNextMarketOpenTime, formatCurrency } from './services/mathUtils';
import { DashboardStats } from './components/DashboardStats';
import { MarketAnalysisPanel } from './components/MarketAnalysisPanel';
import { OptionChain } from './components/OptionChain';
import { PositionsTable } from './components/PositionsTable';
import { AuthModal } from './components/AuthModal';
import { TradeConfirmationModal } from './components/TradeConfirmationModal';
import { LoginModal } from './components/LoginModal';
import { ProfileModal } from './components/ProfileModal';
import { AlertModal, AlertType } from './components/AlertModal';
import { connectToFirebase, subscribeToPortfolio, savePortfolioToCloud, UserPortfolioData } from './services/firebase';
import { RefreshCw, Wifi, WifiOff, Shield, Activity, Cloud, Loader2, User, Link2 } from 'lucide-react';

const App: React.FC = () => {
  // --- Authentication State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  // --- App State with Persistence ---
  const [authToken, setAuthToken] = useState<string | null>(() => {
      return sessionStorage.getItem('vizopt_upstox_token'); 
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isConnected, setIsConnected] = useState(!!authToken); 

  const [availableExpiries, setAvailableExpiries] = useState<ExpiryDate[]>(mockExpiries);
  const [selectedExpiry, setSelectedExpiry] = useState(mockExpiries[0].date);
  const [spotPrice, setSpotPrice] = useState(APP_CONFIG.SPOT_PRICE_INITIAL);
  const [optionChain, setOptionChain] = useState<OptionData[]>([]);
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // --- Firebase Sync State ---
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // Custom Alert State
  const [alertState, setAlertState] = useState<{
      isOpen: boolean;
      type: AlertType;
      title: string;
      message: string;
      isConfirm: boolean;
      onConfirm?: () => void;
  }>({
      isOpen: false,
      type: 'info',
      title: '',
      message: '',
      isConfirm: false
  });

  // --- Portfolio Data State ---
  const [balance, setBalance] = useState(APP_CONFIG.STARTING_BALANCE);
  const [userAvatar, setUserAvatar] = useState<string>('');
  const [userDisplayName, setUserDisplayName] = useState<string>('');
  const [userMaxLots, setUserMaxLots] = useState<number>(APP_CONFIG.MAX_LOTS);
  const [positions, setPositions] = useState<Position[]>([]);
  const [closedPositions, setClosedPositions] = useState<Position[]>([]);
  const [tradeIdCounter, setTradeIdCounter] = useState(1);
  const [history, setHistory] = useState<PortfolioHistoryPoint[]>([]);

  const [pendingTrade, setPendingTrade] = useState<{
    strike: number;
    optionType: OptionType;
    tradeType: TradeType;
    price: number;
    lots: number;
  } | null>(null);

  // --- Refs ---
  const positionsRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  // To prevent infinite loop of save -> update -> save
  const isRemoteUpdate = useRef(false);
  // To track last saved state hash to prevent unnecessary writes
  const lastSavedStateStr = useRef<string>("");

  // --- Utility for Custom Alerts ---
  const showAlert = (title: string, message: string, type: AlertType = 'info') => {
      setAlertState({ isOpen: true, title, message, type, isConfirm: false });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: AlertType = 'warning') => {
      setAlertState({ isOpen: true, title, message, type, isConfirm: true, onConfirm });
  };

  const closeAlert = () => setAlertState(prev => ({ ...prev, isOpen: false }));

  const scrollToPositions = () => {
      positionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  
  const scrollToDashboard = () => {
      dashboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // --- Firebase Integration ---

  // 1. Initial Login & Connection
  const handleAppLogin = async (username: string) => {
      // Safety Check: Ensure keys are present
      if (!FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey.includes("PASTE_YOUR")) {
          showAlert("Configuration Error", "Firebase API Key is missing. Please update constants.ts with keys from your Firebase Console.", "danger");
          return;
      }

      setIsCloudSyncing(true);
      try {
          // Connect to Firebase Auth
          await connectToFirebase();
          setCurrentUsername(username);
          setIsLoggedIn(true);
          setCloudStatus('connected');

          // Subscribe to Firestore Data
          subscribeToPortfolio(username, (data: UserPortfolioData) => {
             // Mark this as a remote update so we don't trigger a save back to cloud immediately
             isRemoteUpdate.current = true;
             
             setBalance(data.balance);
             setUserDisplayName(data.displayName || '');
             setUserAvatar(data.avatar || '');
             setUserMaxLots(data.maxLots || APP_CONFIG.MAX_LOTS);
             setPositions(data.positions || []);
             setClosedPositions(data.closedPositions || []);
             setHistory(data.history || []);
             setTradeIdCounter(data.tradeIdCounter || 1);
             
             setIsCloudSyncing(false);
             
             // Reset flag after render cycle - increased timeout to ensure effects have run
             setTimeout(() => { isRemoteUpdate.current = false; }, 500);
          });

      } catch (error) {
          console.error("Login Error", error);
          setCloudStatus('error');
          showAlert("Connection Error", "Could not connect to Cloud Database. Check your internet or Firebase config.", "danger");
          setIsCloudSyncing(false);
      }
  };

  // 2. Auto-Save to Cloud on Change (Optimized)
  useEffect(() => {
      if (!currentUsername || isRemoteUpdate.current || isCloudSyncing) return;

      const getStableState = () => ({
          balance,
          displayName: userDisplayName,
          avatar: userAvatar,
          maxLots: userMaxLots,
          positions: positions.map(p => ({ ...p, currentLtp: 0 })),
          closedPositions,
          historyLen: history.length, 
          tradeIdCounter
      });

      const currentState = getStableState();
      const currentStateStr = JSON.stringify(currentState);

      if (currentStateStr === lastSavedStateStr.current) return;

      const saveData = async () => {
          await savePortfolioToCloud(currentUsername, {
              balance,
              displayName: userDisplayName,
              avatar: userAvatar,
              maxLots: userMaxLots,
              positions,
              closedPositions,
              history,
              tradeIdCounter
          });
          lastSavedStateStr.current = currentStateStr;
      };

      const timeout = setTimeout(saveData, 2000);
      return () => clearTimeout(timeout);

  }, [balance, userDisplayName, userAvatar, userMaxLots, positions, closedPositions, history, tradeIdCounter, currentUsername]);

  // --- Market Data Loading ---

  useEffect(() => {
    if (authToken && isLoggedIn) {
       setIsLoadingData(true);
       fetchUpstoxContractExpiries(authToken).then(expiries => {
          if (expiries.length > 0) {
             setAvailableExpiries(expiries);
             if (!expiries.find(e => e.date === selectedExpiry)) {
                setSelectedExpiry(expiries[0].date);
             }
          }
          setIsLoadingData(false);
       }).catch(() => setIsLoadingData(false));
    }
  }, [authToken, isLoggedIn]);

  useEffect(() => {
     setOptionChain([]);
     setMarketAnalysis(null);
     setIsLoadingData(true);
  }, [selectedExpiry]);

  const loadMarketData = useCallback(async () => {
      if (!isLoggedIn) return;
      
      if (authToken) {
        try {
          if (!selectedExpiry) return;
          if (optionChain.length === 0) setIsLoadingData(true);
          
          const [{ spotPrice: newSpot, chain, maxPain }, indiaVix] = await Promise.all([
              fetchUpstoxOptionChain(authToken, selectedExpiry),
              fetchIndiaVix(authToken)
          ]);

          setSpotPrice(newSpot);
          setOptionChain(chain);
          
          const currentDte = availableExpiries.find(e => e.date === selectedExpiry)?.dte || 7;
          const analysis = getMockMarketAnalysis(chain, indiaVix, newSpot, maxPain, currentDte);
          
          setMarketAnalysis(analysis);
          setIsConnected(true);
        } catch (e) {
          console.error("Live fetch error", e);
        } finally {
          setIsLoadingData(false);
        }
      } else {
        const { spotPrice: newSpot, chain, analysis } = fetchMockData(selectedExpiry);
        setSpotPrice(newSpot);
        setOptionChain(chain);
        setMarketAnalysis(analysis);
        setIsLoadingData(false);
      }
  }, [authToken, isLoggedIn, selectedExpiry, optionChain.length, availableExpiries]);

  useEffect(() => {
    loadMarketData();
    const interval = setInterval(loadMarketData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadMarketData]);

  useEffect(() => {
      if (optionChain.length === 0) return;
      
      setPositions(prev => 
        prev.map(pos => {
          if (pos.expiry !== selectedExpiry) return pos;
          const currentOption = optionChain.find(c => c.strike === pos.strike && c.optionType === pos.optionType);
          return currentOption ? { ...pos, currentLtp: currentOption.ltp } : pos;
        })
      );
  }, [optionChain, selectedExpiry]);

  const currentExpiryDetails = useMemo(() => availableExpiries.find(e => e.date === selectedExpiry), [selectedExpiry, availableExpiries]);

  // Calculate ATM Strike
  const atmStrike = useMemo(() => {
      if (!spotPrice) return undefined;
      return Math.round(spotPrice / 50) * 50;
  }, [spotPrice]);

  const summary: PortfolioSummary = useMemo(() => {
    let unrealizedNetPnl = 0;
    let totalPremiumPaid = 0;
    let totalMarginBlocked = 0;
    
    positions.forEach(pos => {
      // Calculate PnL
      if (pos.currentLtp) {
        const gross = pos.tradeType === 'BUY' 
          ? (pos.currentLtp - pos.entryPrice) * pos.quantity
          : (pos.entryPrice - pos.currentLtp) * pos.quantity;
        
        const exitTradeType = pos.tradeType === 'BUY' ? 'SELL' : 'BUY';
        const projExitCharges = calculateCharges(pos.currentLtp, pos.quantity, exitTradeType).total;
        unrealizedNetPnl += (gross - pos.entryCharges.total - projExitCharges);
      }

      // Calculate Capital Used
      if (pos.tradeType === 'BUY') {
          totalPremiumPaid += pos.capitalInvested;
      } else {
          totalMarginBlocked += pos.capitalInvested;
      }
    });

    const realizedNetPnl = closedPositions.reduce((sum, p) => sum + (p.netPnl || 0), 0);
    const wins = closedPositions.filter(p => (p.netPnl || 0) > 0).length;
    const closedCount = closedPositions.length;
    const avgPnlPerTrade = closedCount > 0 ? realizedNetPnl / closedCount : 0;
    
    // Balance Logic:
    // 'balance' state is "Cash Available".
    const capitalUsed = totalPremiumPaid + totalMarginBlocked;
    const portfolioValue = balance + capitalUsed + unrealizedNetPnl;
    
    // Calculate total ROI based on estimated starting capital
    // Starting Capital = Current Value - Net PnL
    const estimatedStartingCapital = portfolioValue - (realizedNetPnl + unrealizedNetPnl);
    const totalRoi = estimatedStartingCapital > 0 
        ? ((realizedNetPnl + unrealizedNetPnl) / estimatedStartingCapital) * 100 
        : 0;
    
    return {
      balance: portfolioValue, // Total Account Value for History
      totalPnl: realizedNetPnl + unrealizedNetPnl,
      realizedPnl: realizedNetPnl,
      unrealizedPnl: unrealizedNetPnl,
      avgPnlPerTrade,
      openPositionsCount: positions.length,
      closedTradesCount: closedCount,
      winTrades: wins,
      lossTrades: closedCount - wins,
      winRate: closedCount > 0 ? parseFloat(((wins / closedCount) * 100).toFixed(1)) : 0,
      portfolioValue: portfolioValue,
      capitalUsed: capitalUsed,
      capitalAvailable: balance,
      totalRoi
    };
  }, [balance, positions, closedPositions]);

  // History Tracker (Optimized)
  useEffect(() => {
    if (!isLoggedIn || !currentUsername) return;
    
    const newPoint: PortfolioHistoryPoint = {
        timestamp: Date.now(),
        balance: summary.balance, 
        portfolioValue: summary.portfolioValue,
        capitalUsed: summary.capitalUsed,
        capitalAvailable: summary.capitalAvailable,
        totalPnl: summary.totalPnl,
        realizedPnl: summary.realizedPnl,
        unrealizedPnl: summary.unrealizedPnl,
        openPositionsCount: summary.openPositionsCount,
        winRate: summary.winRate
    };

    setHistory(prev => {
        // If empty, start with 2 points so graph renders
        if (prev.length === 0) {
             const pastPoint = { ...newPoint, timestamp: Date.now() - 60000 };
             return [pastPoint, newPoint];
        }

        const last = prev[prev.length - 1];
        const timeDiff = newPoint.timestamp - last.timestamp;
        const hasRealizedChange = Math.abs((last.realizedPnl || 0) - (newPoint.realizedPnl || 0)) > 1;
        const isPeriodicUpdate = timeDiff > 60000;

        if (hasRealizedChange || isPeriodicUpdate) {
            const updated = [...prev, newPoint];
            if (updated.length > 200) return updated.slice(updated.length - 200);
            return updated;
        }

        return prev;
    });
  }, [summary, isLoggedIn, currentUsername]);

  const handleLogout = () => {
      setIsLoggedIn(false);
      setCurrentUsername(null);
      setAuthToken(null);
      sessionStorage.removeItem('vizopt_upstox_token'); 
      setShowProfileModal(false);
  };

  const handleUpdateProfile = (data: { balance: number, avatar: string, displayName: string, maxLots: number }) => {
      setBalance(data.balance);
      setUserAvatar(data.avatar);
      setUserDisplayName(data.displayName);
      setUserMaxLots(data.maxLots);
  };

  const resetPortfolio = () => {
      if (!currentUsername) return;
      showConfirm(
          'Reset Portfolio?', 
          `Are you sure you want to reset user '${currentUsername}'? Balance will reset to ₹2,00,000 and all trades will be cleared from the Cloud.`,
          () => {
              setBalance(APP_CONFIG.STARTING_BALANCE);
              setPositions([]);
              setClosedPositions([]);
              setHistory([]);
              setTradeIdCounter(1);
          },
          'danger'
      );
  };

  const initiateTrade = (strike: number, optionType: OptionType, tradeType: TradeType, price: number) => {
      if (authToken && !isMarketOpen()) {
        const reopenTime = getNextMarketOpenTime();
        showAlert('Market is Closed', `Live trades cannot be executed now. Market will reopen at ${reopenTime}.`, 'warning');
        return;
      }
      setPendingTrade({ strike, optionType, tradeType, price, lots: 1 });
  };

  const confirmTrade = () => {
    if (!pendingTrade) return;
    const { strike, optionType, tradeType, price, lots } = pendingTrade;
    
    if (lots > userMaxLots) {
        showAlert('Risk Management Alert', `Order exceeds your max limit of ${userMaxLots} lots per trade.`, 'warning');
        return;
    }

    const qty = lots * APP_CONFIG.LOT_SIZE;
    const { marginRequired, charges } = calculateTradeDetails(price, strike, optionType, tradeType, lots);
    const totalCost = (tradeType === 'SELL' ? marginRequired : (price * qty)) + charges.total;

    if (balance < totalCost) {
        showAlert('Insufficient Funds', `Required: ${formatCurrency(totalCost)}\nAvailable: ${formatCurrency(balance)}`, 'danger');
        return;
    }

    setBalance(prev => prev - totalCost);

    const newPosition: Position = {
      tradeId: tradeIdCounter + Date.now(), 
      tradeType,
      strike,
      optionType,
      quantity: qty,
      lots,
      entryPrice: price,
      entryTime: new Date().toISOString(),
      expiry: selectedExpiry,
      status: 'OPEN',
      currentLtp: price,
      capitalInvested: tradeType === 'SELL' ? marginRequired : (price * qty),
      entryCharges: charges
    };

    setPositions([newPosition, ...positions]);
    setPendingTrade(null);
  };

  const handleClosePosition = (tradeId: number) => {
    const pos = positions.find(p => p.tradeId === tradeId);
    if (!pos) return;

    const currentPrice = pos.currentLtp || pos.entryPrice;
    
    const exitTradeType = pos.tradeType === 'BUY' ? 'SELL' : 'BUY';
    const exitCharges = calculateCharges(currentPrice, pos.quantity, exitTradeType);

    const grossPnl = pos.tradeType === 'BUY' 
      ? (currentPrice - pos.entryPrice) * pos.quantity
      : (pos.entryPrice - currentPrice) * pos.quantity;
    
    const totalCharges = pos.entryCharges.total + exitCharges.total;
    const netPnl = grossPnl - totalCharges;
    const roi = (netPnl / pos.capitalInvested) * 100;

    let creditAmount = 0;
    if (pos.tradeType === 'SELL') {
        creditAmount = pos.capitalInvested + grossPnl - exitCharges.total; 
    } else {
        creditAmount = (currentPrice * pos.quantity) - exitCharges.total;
    }
    
    setBalance(prev => prev + creditAmount);

    const closedPos: Position = {
      ...pos,
      status: 'CLOSED',
      exitPrice: currentPrice,
      exitTime: new Date().toISOString(),
      exitCharges,
      totalCharges,
      grossPnl,
      netPnl,
      roi
    };

    setClosedPositions([closedPos, ...closedPositions]);
    setPositions(positions.filter(p => p.tradeId !== tradeId));
  };

  const handleCloseAllPositions = () => {
      showConfirm(
          'Close All Positions?', 
          'This will close all active trades at current market price.', 
          () => {
             let netBalanceChange = 0;
             const closedBatch: Position[] = [];

             positions.forEach(pos => {
                const currentPrice = pos.currentLtp || pos.entryPrice;
                const exitTradeType = pos.tradeType === 'BUY' ? 'SELL' : 'BUY';
                const exitCharges = calculateCharges(currentPrice, pos.quantity, exitTradeType);

                const grossPnl = pos.tradeType === 'BUY' 
                  ? (currentPrice - pos.entryPrice) * pos.quantity
                  : (pos.entryPrice - currentPrice) * pos.quantity;
                
                const totalCharges = pos.entryCharges.total + exitCharges.total;
                const netPnl = grossPnl - totalCharges;
                const roi = (netPnl / pos.capitalInvested) * 100;

                let creditAmount = 0;
                if (pos.tradeType === 'SELL') {
                    creditAmount = pos.capitalInvested + grossPnl - exitCharges.total; 
                } else {
                    creditAmount = (currentPrice * pos.quantity) - exitCharges.total;
                }
                netBalanceChange += creditAmount;

                closedBatch.push({
                    ...pos,
                    status: 'CLOSED',
                    exitPrice: currentPrice,
                    exitTime: new Date().toISOString(),
                    exitCharges,
                    totalCharges,
                    grossPnl,
                    netPnl,
                    roi
                });
             });

             setBalance(prev => prev + netBalanceChange);
             setClosedPositions([...closedBatch, ...closedPositions]);
             setPositions([]);
          }
      );
  };

  if (!isLoggedIn) {
    return <LoginModal onLogin={handleAppLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-300 font-sans pb-10">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo Area */}
            <div className="flex items-center gap-3">
               <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-700 rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/20">
                  <Activity className="text-white" size={20} />
               </div>
               <div>
                  <h1 className="text-lg md:text-xl font-bold tracking-tight text-white">Viz<span className="text-purple-400">Opt</span></h1>
               </div>
            </div>

            {/* Center - Cloud Status (Desktop) */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900/50 border border-gray-800">
                {isCloudSyncing ? (
                    <>
                        <Loader2 size={12} className="text-purple-400 animate-spin" />
                        <span className="text-xs text-gray-500">Syncing...</span>
                    </>
                ) : cloudStatus === 'connected' ? (
                    <>
                        <Cloud size={12} className="text-green-500" />
                        <span className="text-xs text-green-500 font-medium">Cloud Active</span>
                    </>
                ) : (
                     <>
                        <Cloud size={12} className="text-red-500" />
                        <span className="text-xs text-red-500">Offline</span>
                    </>
                )}
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 sm:gap-4">
               {/* Connect Broker Button */}
               <button 
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-700 transition-colors shadow-sm"
                  title="Connect Upstox"
               >
                  <Link2 size={14} className="text-purple-400" />
                  <span className="hidden sm:inline text-xs font-bold">Connect</span>
               </button>

               {/* Live/Sim Badge */}
               <div className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full border text-[10px] sm:text-xs font-bold uppercase ${isConnected ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'}`}>
                  {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                  <span className="hidden sm:inline">{isConnected ? 'Live Data' : 'Sim Mode'}</span>
               </div>

               {/* Expiry Dropdown */}
               <div className="relative">
                  <select 
                    value={selectedExpiry}
                    onChange={(e) => setSelectedExpiry(e.target.value)}
                    disabled={!isLoggedIn || isLoadingData}
                    className="appearance-none bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white text-xs font-bold py-2 pl-3 pr-8 rounded-lg cursor-pointer focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed max-w-[120px] sm:max-w-none"
                  >
                    {availableExpiries.map(exp => (
                        <option key={exp.date} value={exp.date}>{exp.label}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
               </div>

               {/* User Avatar (Profile Trigger) */}
               <div 
                 className="flex items-center gap-2 cursor-pointer pl-2 border-l border-gray-800"
                 onClick={() => setShowProfileModal(true)}
               >
                 <div className="text-right hidden md:block">
                     <div className="text-xs font-bold text-white">{userDisplayName || 'Trader'}</div>
                     <div className="text-[10px] text-gray-500 font-mono">{formatCurrency(balance, 0)}</div>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center overflow-hidden hover:border-purple-500 transition-colors">
                    {userAvatar ? (
                        <img key={userAvatar} src={userAvatar} alt="User" className="w-full h-full object-cover" />
                    ) : (
                        <User size={16} className="text-gray-400" />
                    )}
                 </div>
               </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Dashboard Stats & Graph */}
        <div ref={dashboardRef} className="scroll-mt-24">
           <DashboardStats 
             summary={summary} 
             history={history} 
             onReset={resetPortfolio} 
             onCloseAll={handleCloseAllPositions} 
             onScrollToPositions={scrollToPositions}
            />
        </div>

        {/* Analysis & Option Chain Section */}
        {marketAnalysis && (
            <MarketAnalysisPanel 
                analysis={marketAnalysis} 
                spotPrice={spotPrice}
                selectedExpiry={currentExpiryDetails?.label || selectedExpiry}
                dte={currentExpiryDetails?.dte}
                atmStrike={atmStrike}
                onTrade={initiateTrade}
            />
        )}

        {/* Option Chain & Positions Stack */}
        <div className="flex flex-col gap-6">
            
            {/* Full Width Option Chain */}
            <div className="w-full">
                {optionChain.length > 0 ? (
                    <OptionChain 
                        chain={optionChain} 
                        spotPrice={spotPrice} 
                        onTrade={initiateTrade} 
                        isLive={isConnected}
                    />
                ) : (
                    <div className="bg-gray-850 border border-gray-750 rounded-xl p-12 text-center">
                        <Loader2 size={40} className="animate-spin mx-auto text-purple-500 mb-4" />
                        <p className="text-gray-400">Loading Option Chain...</p>
                    </div>
                )}
            </div>

            {/* Positions Tables (Side by Side on Large Screens) */}
            <div ref={positionsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 scroll-mt-24">
                <PositionsTable 
                    positions={positions} 
                    isClosed={false} 
                    onClosePosition={handleClosePosition} 
                    onCloseAll={handleCloseAllPositions}
                    onRefresh={isConnected ? loadMarketData : undefined}
                    onPnlClick={scrollToDashboard}
                />
                <PositionsTable 
                    positions={closedPositions} 
                    isClosed={true} 
                    onPnlClick={scrollToDashboard}
                />
            </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full bg-gray-950/90 backdrop-blur border-t border-gray-800 py-2 z-30 px-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px] text-gray-500 overflow-x-auto no-scrollbar">
               <div className="flex gap-2 sm:gap-3 items-center whitespace-nowrap min-w-full sm:min-w-0">
                   <span className="font-bold text-gray-400">VizOpt v{APP_CONFIG.VERSION}</span>
                   <span className="text-gray-600">•</span>
                   <span className={isConnected ? 'text-green-500' : 'text-yellow-500'}>
                       {isConnected ? 'Live Mode' : 'Sim Mode'}
                   </span>
                   <span className="text-gray-600">•</span>
                   <span className={cloudStatus === 'connected' ? 'text-blue-400' : 'text-gray-600'}>
                       Cloud {cloudStatus === 'connected' ? 'Active' : 'Offline'}
                   </span>
                   <span className="text-gray-600">•</span>
                   <button 
                      onClick={() => setShowAuthModal(true)}
                      className="text-gray-400 hover:text-white underline decoration-dotted underline-offset-2 transition-colors"
                   >
                      Connect broker
                   </button>
               </div>
          </div>
      </footer>

      {/* Modals */}
      {showAuthModal && (
        <AuthModal onAuthenticated={(token) => {
          setAuthToken(token);
          sessionStorage.setItem('vizopt_upstox_token', token);
          setShowAuthModal(false);
          setIsConnected(true);
        }} />
      )}

      {pendingTrade && (
        <TradeConfirmationModal
            {...pendingTrade}
            currentBalance={balance}
            onConfirm={confirmTrade}
            onCancel={() => setPendingTrade(null)}
        />
      )}

      <ProfileModal 
         isOpen={showProfileModal}
         onClose={() => setShowProfileModal(false)}
         username={currentUsername || ''}
         displayName={userDisplayName}
         currentBalance={balance}
         currentAvatar={userAvatar}
         currentMaxLots={userMaxLots}
         onUpdateProfile={handleUpdateProfile}
         onLogout={handleLogout}
      />

      <AlertModal 
         isOpen={alertState.isOpen}
         type={alertState.type}
         title={alertState.title}
         message={alertState.message}
         isConfirm={alertState.isConfirm}
         onConfirm={alertState.onConfirm}
         onClose={closeAlert}
      />

    </div>
  );
};

export default App;