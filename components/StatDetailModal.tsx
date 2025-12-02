import React, { useMemo, useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Scale, CircleDollarSign, Banknote, ShieldCheck, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { INDIAN_RUPEE } from '../constants';

interface StatDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  stat: { type: string; value: number } | null;
}

const StatDetailModal: React.FC<StatDetailModalProps> = ({ isOpen, onClose, stat }) => {
  const [isChartVisible, setIsChartVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isOpen) {
      setIsChartVisible(false); // Reset
      timer = setTimeout(() => setIsChartVisible(true), 200);
    }
    return () => clearTimeout(timer);
  }, [isOpen]);

  const historicalData = useMemo(() => {
    if (!stat) return [];
    const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
    let base = stat.value * 0.75; 
    const data = months.map(month => {
      const fluctuation = Math.random() * (stat.value * 0.1) - (stat.value * 0.05);
      base += fluctuation;
      return {
        month,
        value: Math.max(0, Math.round(base))
      };
    });
    data[data.length - 1].value = stat.value; // Ensure last point is the current value
    return data;
  }, [stat]);

  if (!isOpen || !stat) return null;

  const getStatInfo = () => {
    switch (stat.type) {
      case 'Opening Balance': return { icon: Scale, color: '#a1a1aa', gradient: '#a1a1aa' };
      case 'Closing Balance': return { icon: CircleDollarSign, color: '#3B82F6', gradient: '#3B82F6' }; // Changed to Blue
      case 'Liquidity': return { icon: Banknote, color: '#008FFB', gradient: '#008FFB' };
      case 'Reserves': return { icon: ShieldCheck, color: '#775DD0', gradient: '#775DD0' };
      case 'Monthly Inflow': return { icon: TrendingUp, color: '#3B82F6', gradient: '#3B82F6' }; // Changed to Blue
      case 'Monthly Outflow': return { icon: TrendingDown, color: '#f43f5e', gradient: '#f43f5e' };
      default: return { icon: CircleDollarSign, color: '#a1a1aa', gradient: '#a1a1aa' };
    }
  };

  const { icon: Icon, color, gradient } = getStatInfo();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-charcoal border border-white/10 rounded-3xl w-[95%] max-w-xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-4 md:p-6 border-b border-white/5 flex justify-between items-center bg-panel rounded-t-3xl">
          <h3 className="text-lg font-bold text-white flex items-center gap-3 uppercase tracking-wide">
            <Icon size={18} style={{ color }} /> {stat.type} Trend
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 md:p-6 h-[250px] md:h-[300px]">
           <div className="w-full h-full min-h-[200px]">
             {isChartVisible ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={historicalData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="statGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={gradient} stopOpacity={0.25}/>
                        <stop offset="95%" stopColor={gradient} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} fontFamily="Urbanist" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#131635', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#e4e4e7', fontFamily: 'Urbanist' }}
                      itemStyle={{ color: color }}
                      formatter={(value: number) => [INDIAN_RUPEE.format(value), stat.type]}
                      cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fillOpacity={1} fill="url(#statGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
             ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <Loader2 className="animate-spin text-brand" />
                </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default StatDetailModal;