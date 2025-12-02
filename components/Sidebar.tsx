import React from 'react';
import { 
  LayoutGrid, 
  History, 
  LineChart, 
  Target, 
  X, 
  IndianRupee,
  Briefcase
} from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, currentView, onViewChange }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'capital_markets', label: 'Capital Markets', icon: Briefcase },
    { id: 'transactions', label: 'Transactions', icon: History },
    { id: 'analytics', label: 'Analytics', icon: LineChart },
    { id: 'goals', label: 'Goals', icon: Target },
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      <aside 
        className={`fixed top-0 left-0 h-full w-[75vw] min-w-[280px] md:w-[25vw] md:min-w-[300px] bg-panel border-r border-border z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } shadow-2xl flex flex-col rounded-r-3xl`}
      >
        <div className="p-6 md:p-8 flex items-center justify-between border-b border-border bg-charcoal rounded-tr-3xl">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-brand/10 border border-brand flex items-center justify-center text-brand shadow-[0_0_20px_rgba(1,119,251,0.2)] rounded-2xl shrink-0">
                <IndianRupee size={24} strokeWidth={2.5} />
             </div>
             <div>
               <h1 className="text-2xl font-bold text-white tracking-tight font-display">VizBuck</h1>
               <p className="text-xs text-brand font-mono">v19.3</p>
             </div>
           </div>
           <button 
             onClick={onClose}
             className="p-2 hover:bg-white/5 rounded-full text-muted hover:text-white transition-colors"
           >
             <X size={24} />
           </button>
        </div>

        <nav className="flex-1 p-6 space-y-3 overflow-y-auto bg-panel">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id as ViewState);
                  onClose();
                }}
                className={`w-full flex items-center justify-start gap-4 px-6 py-4 rounded-2xl text-base font-bold transition-all duration-200 group ${
                  isActive 
                    ? 'bg-brand text-white shadow-lg shadow-brand/20' 
                    : 'bg-transparent text-muted hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={20} strokeWidth={2.5} className={`shrink-0 ${isActive ? 'text-white' : 'text-muted group-hover:text-white transition-colors'}`} />
                <span className="font-mono uppercase tracking-wide text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-border bg-charcoal rounded-br-3xl">
          <p className="text-center text-[10px] text-muted font-medium font-mono uppercase tracking-widest">VizBuck Financial Intelligence</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;