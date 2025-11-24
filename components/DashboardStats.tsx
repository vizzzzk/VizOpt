

import React, { useState, useMemo, useRef } from 'react';
import { PortfolioSummary, PortfolioHistoryPoint } from '../types';
import { formatCurrency } from '../services/mathUtils';
import { RotateCcw, X, ChevronRight } from 'lucide-react';

interface Props {
  summary: PortfolioSummary;
  history: PortfolioHistoryPoint[];
  onReset: () => void;
  onCloseAll?: () => void;
  onScrollToPositions?: () => void;
}

type TimeFrame = '1D' | '1W' | '1M' | 'ALL';

// Chart Modal Component
const HistoryChartModal = ({ 
    title, 
    dataKey, 
    history, 
    color, 
    isMultiLine,
    mode,
    onClose 
}: { 
    title: string, 
    dataKey: keyof PortfolioHistoryPoint, 
    history: PortfolioHistoryPoint[], 
    color: string,
    isMultiLine?: boolean,
    mode?: 'PNL' | 'VALUE', // Mode to distinguish graph types
    onClose: () => void 
}) => {
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('1D');
    const [hoverData, setHoverData] = useState<{ x: number, value: number, timestamp: number, realized?: number, unrealized?: number, capUsed?: number, capAvail?: number } | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    // Filter Data based on TimeFrame
    const filteredHistory = useMemo(() => {
        if (!history || history.length === 0) return [];
        const now = Date.now();
        let cutoff = 0;
        
        switch (timeFrame) {
            case '1D': cutoff = now - 24 * 60 * 60 * 1000; break;
            case '1W': cutoff = now - 7 * 24 * 60 * 60 * 1000; break;
            case '1M': cutoff = now - 30 * 24 * 60 * 60 * 1000; break;
            case 'ALL': cutoff = 0; break;
        }

        return history.filter(h => h.timestamp >= cutoff);
    }, [history, timeFrame]);

    // Handle empty data
    if (filteredHistory.length === 0) {
         return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 text-center max-w-sm w-full" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-white font-bold">{title}</h3>
                        <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
                    </div>
                    <p className="text-gray-400 text-sm py-8">No data available yet.</p>
                    <p className="text-xs text-gray-600">Trades will appear here.</p>
                </div>
            </div>
         )
    }

    // Handle single point data by duplicating it to create a flat line
    let graphData = filteredHistory;
    if (graphData.length === 1) {
        graphData = [
            graphData[0], 
            { ...graphData[0], timestamp: graphData[0].timestamp + 60000 } // Add 1 minute to create a line
        ];
    }

    // Prepare Data for SVG
    const width = 500;
    const height = 250;
    const padding = 20;
    
    // Determine secondary lines based on Mode
    let secondary1Values: number[] = [];
    let secondary2Values: number[] = [];
    
    if (mode === 'PNL') {
        secondary1Values = graphData.map(h => h.realizedPnl || 0);
        secondary2Values = graphData.map(h => h.unrealizedPnl || 0);
    } else if (mode === 'VALUE') {
        secondary1Values = graphData.map(h => h.capitalUsed || 0);
        secondary2Values = graphData.map(h => h.capitalAvailable || 0);
    }

    const mainValues = graphData.map(h => h[dataKey]);
    
    const allValues = isMultiLine ? [...mainValues, ...secondary1Values, ...secondary2Values] : mainValues;

    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const range = maxVal - minVal || 1;

    const getY = (val: number) => height - padding - ((val - minVal) / range) * (height - 2 * padding);
    const getX = (index: number) => padding + (index / (mainValues.length - 1)) * (width - 2 * padding);

    // Map points
    const pointsData = graphData.map((h, index) => {
        const point: any = {
            x: getX(index),
            y: getY(h[dataKey]),
            value: h[dataKey],
            timestamp: h.timestamp
        };
        
        if (mode === 'PNL') {
            point.realized = h.realizedPnl;
            point.unrealized = h.unrealizedPnl;
            point.ySec1 = getY(h.realizedPnl || 0);
            point.ySec2 = getY(h.unrealizedPnl || 0);
        } else if (mode === 'VALUE') {
            point.capUsed = h.capitalUsed;
            point.capAvail = h.capitalAvailable;
            point.ySec1 = getY(h.capitalUsed || 0);
            point.ySec2 = getY(h.capitalAvailable || 0);
        }
        return point;
    });

    const pointsStr = pointsData.map(p => `${p.x},${p.y}`).join(' ');
    const sec1Str = isMultiLine ? pointsData.map(p => `${p.x},${p.ySec1}`).join(' ') : '';
    const sec2Str = isMultiLine ? pointsData.map(p => `${p.x},${p.ySec2}`).join(' ') : '';
    
    // Area Fill (Main Line)
    const fillPath = `M ${pointsData[0].x},${height} L ${pointsStr} L ${pointsData[pointsData.length - 1].x},${height} Z`;
    const gradId = `grad-${dataKey}`;
    
    const getHexColor = (cls: string) => {
        if (cls.includes('green')) return '#4ade80';
        if (cls.includes('red')) return '#f87171';
        if (cls.includes('purple')) return '#c084fc';
        if (cls.includes('blue')) return '#60a5fa';
        if (cls.includes('orange')) return '#fb923c';
        if (cls.includes('teal')) return '#2dd4bf';
        return '#9ca3af';
    };
    const hexColor = getHexColor(color);

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        
        const scaleX = width / rect.width;
        const svgX = offsetX * scaleX;

        // Simple linear search for closest point
        let closest = pointsData[0];
        let minDist = Math.abs(svgX - closest.x);
        for (let i = 1; i < pointsData.length; i++) {
            const dist = Math.abs(svgX - pointsData[i].x);
            if (dist < minDist) {
                minDist = dist;
                closest = pointsData[i];
            }
        }
        setHoverData(closest);
    };

    const formatValue = (val: number) => {
        if (dataKey === 'totalPnl' || dataKey === 'portfolioValue' || dataKey === 'balance') return formatCurrency(val, 0);
        return val.toFixed(1);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-[#0f172a] border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                     <div className="flex items-center gap-3">
                         <h3 className="font-bold text-white text-lg tracking-tight">{title} Trend</h3>
                         <div className="flex gap-1 bg-gray-900 p-0.5 rounded-lg border border-gray-800">
                            {(['1D', '1W', '1M', 'ALL'] as TimeFrame[]).map(tf => (
                                <button 
                                    key={tf}
                                    onClick={() => setTimeFrame(tf)}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${timeFrame === tf ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>
                     </div>
                     <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
                </div>

                <div className="p-6 relative select-none flex-grow bg-[#0b101b]">
                    <div className="relative w-full h-64">
                         <svg 
                            ref={svgRef}
                            viewBox={`0 0 ${width} ${height}`} 
                            preserveAspectRatio="none"
                            className="w-full h-full overflow-visible cursor-crosshair"
                            onMouseMove={handleMouseMove}
                            onMouseLeave={() => setHoverData(null)}
                        >
                            <defs>
                                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={hexColor} stopOpacity="0.4" />
                                    <stop offset="100%" stopColor={hexColor} stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            
                            {/* Main Area Fill */}
                            <path d={fillPath} fill={`url(#${gradId})`} stroke="none" />

                            {/* Secondary Lines based on Mode */}
                            {isMultiLine && mode === 'PNL' && (
                                <>
                                    <polyline fill="none" stroke="#3b82f6" strokeWidth="1.5" points={sec1Str} strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" strokeDasharray="4 2" />
                                    <polyline fill="none" stroke="#f59e0b" strokeWidth="1.5" points={sec2Str} strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" strokeDasharray="4 2" />
                                </>
                            )}
                            
                            {isMultiLine && mode === 'VALUE' && (
                                <>
                                    {/* Capital Used - Red */}
                                    <polyline fill="none" stroke="#f87171" strokeWidth="1.5" points={sec1Str} strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" strokeDasharray="4 2" />
                                    {/* Capital Available - Blue */}
                                    <polyline fill="none" stroke="#60a5fa" strokeWidth="1.5" points={sec2Str} strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" strokeDasharray="4 2" />
                                </>
                            )}

                            {/* Main Line */}
                            <polyline fill="none" stroke={hexColor} strokeWidth="2.5" points={pointsStr} strokeLinecap="round" strokeLinejoin="round" />
                            
                            {/* Hover Cursor Line */}
                            {hoverData && (
                                <line 
                                    x1={hoverData.x} y1={0} 
                                    x2={hoverData.x} y2={height} 
                                    stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5"
                                />
                            )}
                            
                            {/* Current Point Dot */}
                            {hoverData ? (
                                <circle cx={hoverData.x} cy={getY(hoverData.value)} r="5" fill={hexColor} stroke="#0f172a" strokeWidth="2" />
                            ) : (
                                <circle cx={pointsData[pointsData.length-1].x} cy={pointsData[pointsData.length-1].y} r="4" fill={hexColor} className="animate-pulse" />
                            )}
                        </svg>

                        {/* Tooltip */}
                        {hoverData && (
                             <div 
                                className="absolute pointer-events-none z-10 min-w-[180px]"
                                style={{ 
                                    left: `${(hoverData.x / width) * 100}%`, 
                                    top: `10%`,
                                    transform: `translateX(${hoverData.x > width/2 ? '-110%' : '10%'})`
                                }}
                             >
                                 <div className="bg-gray-800/95 backdrop-blur-md border border-gray-700 p-3 rounded-xl shadow-2xl flex flex-col gap-1 text-xs">
                                    <span className="text-gray-500 text-[10px] font-bold uppercase">{new Date(hoverData.timestamp).toLocaleTimeString()}</span>
                                    
                                    <div className="flex justify-between gap-4 border-b border-gray-700 pb-1 mb-1">
                                        <span className="text-white font-bold">{mode === 'PNL' ? 'Total P&L' : 'Portfolio Value'}</span>
                                        <span className="text-white font-bold font-mono">{formatValue(hoverData.value)}</span>
                                    </div>

                                    {mode === 'PNL' && hoverData.realized !== undefined && (
                                        <>
                                            <div className="flex justify-between gap-4">
                                                <span className="text-blue-400">Realized</span>
                                                <span className="text-blue-300 font-mono">{formatCurrency(hoverData.realized, 0)}</span>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <span className="text-orange-400">Unrealized</span>
                                                <span className="text-orange-300 font-mono">{formatCurrency(hoverData.unrealized, 0)}</span>
                                            </div>
                                        </>
                                    )}

                                    {mode === 'VALUE' && hoverData.capUsed !== undefined && (
                                        <>
                                             <div className="flex justify-between gap-4">
                                                <span className="text-blue-400">Available</span>
                                                <span className="text-blue-300 font-mono">{formatCurrency(hoverData.capAvail || 0, 0)}</span>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <span className="text-red-400">Used</span>
                                                <span className="text-red-300 font-mono">{formatCurrency(hoverData.capUsed, 0)}</span>
                                            </div>
                                        </>
                                    )}
                                 </div>
                             </div>
                        )}
                        
                        {/* Legend */}
                        {isMultiLine && mode === 'PNL' && (
                            <div className="absolute bottom-2 right-2 flex gap-3 text-[10px] font-bold bg-gray-900/50 p-1.5 rounded border border-gray-800">
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400"></div> Total</div>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Realized</div>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Unrealized</div>
                            </div>
                        )}
                        {isMultiLine && mode === 'VALUE' && (
                            <div className="absolute bottom-2 right-2 flex gap-3 text-[10px] font-bold bg-gray-900/50 p-1.5 rounded border border-gray-800">
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-400"></div> Value</div>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Free</div>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div> Used</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const DashboardStats: React.FC<Props> = ({ summary, history, onReset, onCloseAll, onScrollToPositions }) => {
    const [chartModal, setChartModal] = useState<{ title: string, key: keyof PortfolioHistoryPoint, color: string, isMultiLine?: boolean, mode?: 'PNL' | 'VALUE' } | null>(null);

    const formatPnl = (val: number) => {
        return formatCurrency(Math.round(val), 0);
    };

    const roiColor = (summary.totalRoi || 0) >= 0 ? 'text-green-300' : 'text-red-300';
    const roiBg = (summary.totalRoi || 0) >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20';

    return (
        <>
            {chartModal && (
                <HistoryChartModal 
                    title={chartModal.title} 
                    dataKey={chartModal.key} 
                    history={history} 
                    color={chartModal.color}
                    isMultiLine={chartModal.isMultiLine}
                    mode={chartModal.mode}
                    onClose={() => setChartModal(null)}
                />
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* TILE 1: PORTFOLIO */}
                <div 
                    className="bg-[#1e293b] border border-gray-700/50 p-3 rounded-2xl relative group cursor-pointer hover:border-gray-600 transition-all shadow-lg shadow-black/20"
                    onClick={() => setChartModal({ title: 'Portfolio Value Analysis', key: 'portfolioValue', color: 'text-purple-400', isMultiLine: true, mode: 'VALUE' })}
                >
                    <div className="flex justify-between items-center mb-1">
                         <span className="text-gray-400 font-bold tracking-widest text-[10px] uppercase">Portfolio</span>
                         <button 
                            onClick={(e) => { e.stopPropagation(); onReset(); }} 
                            className="text-gray-500 hover:text-white transition-colors"
                         >
                            <RotateCcw size={12} />
                         </button>
                    </div>
                    
                    <div className="text-2xl font-bold text-white font-mono tracking-tight mb-2">
                        {formatCurrency(summary.portfolioValue, 0)}
                    </div>
                    
                    <div className="flex items-center gap-2 text-[10px] font-mono border-t border-gray-700/50 pt-2">
                        <span className="text-gray-500">Used: <span className="text-red-400">{formatCurrency(summary.capitalUsed, 0)}</span></span>
                        <span className="text-gray-500">Free: <span className="text-blue-400">{formatCurrency(summary.capitalAvailable, 0)}</span></span>
                    </div>
                </div>

                {/* TILE 2: TOTAL P&L */}
                <div 
                    className="bg-[#1e293b] border border-gray-700/50 p-3 rounded-2xl relative group cursor-pointer hover:border-gray-600 transition-all shadow-lg shadow-black/20"
                    onClick={() => setChartModal({ title: 'P&L Analysis', key: 'totalPnl', color: summary.totalPnl >= 0 ? 'text-green-400' : 'text-red-400', isMultiLine: true, mode: 'PNL' })}
                >
                    <div className="flex justify-between items-center mb-1">
                         <span className="text-gray-400 font-bold tracking-widest text-[10px] uppercase">Total P&L</span>
                         <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${roiBg} ${roiColor}`}>
                            {(summary.totalRoi || 0) > 0 ? '+' : ''}{(summary.totalRoi || 0).toFixed(1)}%
                         </span>
                    </div>
                    
                    <div className={`text-2xl font-bold font-mono tracking-tight mb-2 ${summary.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPnl(summary.totalPnl)}
                    </div>
                    
                    <div className="flex items-center gap-2 text-[10px] font-mono border-t border-gray-700/50 pt-2">
                        <span className="text-gray-500">R: <span className={summary.realizedPnl >= 0 ? 'text-blue-300' : 'text-red-300'}>{formatPnl(summary.realizedPnl)}</span></span>
                        <span className="text-gray-500">U: <span className={summary.unrealizedPnl >= 0 ? 'text-orange-300' : 'text-red-300'}>{formatPnl(summary.unrealizedPnl)}</span></span>
                    </div>
                </div>

                {/* TILE 3: AVG P&L / TRADE */}
                <div 
                    className="bg-[#1e293b] border border-gray-700/50 p-3 rounded-2xl relative group cursor-pointer hover:border-gray-600 transition-all shadow-lg shadow-black/20"
                    onClick={() => setChartModal({ title: 'Avg P&L Performance', key: 'totalPnl', color: summary.avgPnlPerTrade >= 0 ? 'text-teal-400' : 'text-red-400' })}
                >
                    <div className="flex justify-between items-center mb-1">
                         <span className="text-gray-400 font-bold tracking-widest text-[10px] uppercase">AVG P&L/TRADE</span>
                    </div>
                    
                    <div className={`text-2xl font-bold font-mono tracking-tight ${summary.avgPnlPerTrade >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                        {formatPnl(summary.avgPnlPerTrade)}
                    </div>
                    
                    {/* Active Button moved to bottom right */}
                    <div className="flex justify-end mt-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onScrollToPositions?.(); }}
                            className="text-[10px] font-bold text-gray-500 hover:text-white uppercase flex items-center gap-1 bg-gray-900/50 px-2 py-1 rounded border border-gray-800 hover:border-gray-600 transition-all"
                        >
                            Active
                        </button>
                    </div>
                </div>

                {/* TILE 4: WIN RATE */}
                 <div 
                    className="bg-[#1e293b] border border-gray-700/50 p-3 rounded-2xl relative group cursor-pointer hover:border-gray-600 transition-all shadow-lg shadow-black/20"
                    onClick={() => setChartModal({ title: 'Win Rate Trend', key: 'winRate', color: 'text-orange-400' })}
                 >
                    <div className="flex justify-between items-center mb-1">
                         <span className="text-gray-400 font-bold tracking-widest text-[10px] uppercase">Win Rate</span>
                    </div>
                    
                    <div className="text-2xl font-bold text-white font-mono tracking-tight mb-2">
                        {summary.winRate}%
                    </div>
                    
                    <div className="flex items-center gap-2 text-[10px] font-mono pt-2 border-t border-gray-700/50">
                        <span className="text-green-400 font-bold">{summary.winTrades}W</span>
                        <span className="text-gray-600">-</span>
                        <span className="text-red-400 font-bold">{summary.lossTrades}L</span>
                    </div>
                </div>
            </div>
        </>
    );
};