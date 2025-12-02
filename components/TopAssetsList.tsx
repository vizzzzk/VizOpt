import React from 'react';
import { Asset } from '../types';
import { INDIAN_RUPEE } from '../constants';
import { Landmark, Briefcase, Bitcoin, Banknote } from 'lucide-react';

interface TopAssetsListProps {
  assets: Asset[];
}

const getAssetIcon = (type: string) => {
  switch (type) {
    case 'bank': case 'deposit': return <Landmark className="w-5 h-5 text-gray-500" />;
    case 'stock': return <Briefcase className="w-5 h-5 text-gray-500" />;
    case 'crypto': return <Bitcoin className="w-5 h-5 text-gray-500" />;
    case 'fund': case 'elss': return <Banknote className="w-5 h-5 text-gray-500" />;
    default: return <Landmark className="w-5 h-5 text-gray-500" />;
  }
};

const TopAssetsList: React.FC<TopAssetsListProps> = ({ assets }) => {
  const topAssets = [...assets]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return (
    <div className="bg-panel border border-white/5 p-4 md:p-6 rounded-3xl h-[400px] flex flex-col">
      <h3 className="text-sm font-bold text-gray-200 mb-4 uppercase tracking-wider border-l-4 border-neon-violet pl-3">
        Top Holdings
      </h3>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {topAssets.length === 0 ? (
           <div className="flex items-center justify-center h-full text-gray-600">No assets found.</div>
        ) : (
          <div className="space-y-2">
            {topAssets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-4 p-3 bg-charcoal/60 border border-transparent hover:border-white/10 transition-colors rounded-2xl group">
                <div className="w-8 h-8 flex items-center justify-center text-gray-500 group-hover:text-mint transition-colors">
                  {getAssetIcon(asset.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">{asset.name}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{asset.type}</p>
                </div>
                <div className="text-right">
                   <p className="text-sm font-bold text-white font-mono">{INDIAN_RUPEE.format(asset.amount)}</p>
                   {asset.change !== undefined && asset.change !== 0 ? (
                        <span className={`text-xs font-bold ${asset.change > 0 ? 'text-positive' : 'text-neon-red'}`}>
                            {asset.change > 0 ? '▲' : '▼'} {Math.abs(asset.change)}%
                        </span>
                    ) : (
                        <span className="text-xs text-gray-600">-</span>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopAssetsList;