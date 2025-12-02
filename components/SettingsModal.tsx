import React, { useState, useEffect } from 'react';
import { X, Upload, Save, LogOut, Settings, User, SlidersHorizontal, RefreshCw, Power } from 'lucide-react';
import { UserProfile, BudgetMap } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onSaveProfile: (profile: UserProfile, budgets?: BudgetMap) => void;
  onLogout?: () => void;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
  currentBudgets?: BudgetMap;
  onOpenAssets?: () => void;
  isOfflineMode?: boolean;
  onSwitchMode?: () => void;
  onResetData?: () => void;
}

// Helper: Compress Image to max 200x200 JPEG to stay under Firestore 1MB limits
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 200;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                // Return compressed JPEG at 0.7 quality
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
};

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, userProfile, onSaveProfile, onLogout, 
    onOpenAssets, isOfflineMode, onSwitchMode, onResetData 
}) => {
  const [displayName, setDisplayName] = useState(userProfile.displayName);
  const [avatar, setAvatar] = useState<string | null>(userProfile.avatar);

  useEffect(() => {
    setDisplayName(userProfile.displayName);
    setAvatar(userProfile.avatar);
  }, [userProfile, isOpen]);

  if (!isOpen) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Compress before setting state
      const compressed = await compressImage(e.target.files[0]);
      setAvatar(compressed);
    }
  };

  const handleSave = () => {
    onSaveProfile({ displayName, avatar });
    onClose();
  };

  const handleSwitch = () => {
      if(onSwitchMode) onSwitchMode();
      onClose();
  };

  const handleReset = () => {
      if(onResetData) {
          if(window.confirm("DANGER: This will permanently delete ALL transactions, assets, and goals. You will be redirected to the onboarding setup. Are you sure?")) {
            onResetData();
            onClose();
          }
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-canvas border border-border rounded-3xl w-[90%] max-w-md shadow-2xl overflow-hidden flex flex-col group transition-colors duration-300 max-h-[90vh]">
        <div className="absolute -inset-[1px] bg-gradient-to-r from-accent/30 via-transparent to-accent/30 rounded-3xl opacity-50 pointer-events-none"></div>

        <div className="relative p-6 border-b border-border flex justify-between items-center bg-panel shrink-0 rounded-t-3xl">
          <h3 className="text-lg font-bold text-main flex items-center gap-2 font-sans tracking-tight uppercase">
            <Settings size={18} className="text-accent" /> System Profile
          </h3>
          <button onClick={onClose} className="text-muted hover:text-main transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="relative p-8 bg-charcoal overflow-y-auto custom-scrollbar">
              <div className="space-y-8">
                <div className="flex flex-col items-center justify-center">
                    <div className="relative group/avatar">
                        <div className="w-24 h-24 rounded-full border-4 border-accent/20 overflow-hidden bg-black flex items-center justify-center">
                        {avatar ? (
                            <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User size={36} className="text-gray-600" />
                        )}
                        </div>
                        <label className="absolute bottom-0 right-0 p-2.5 bg-accent hover:bg-teal-400 rounded-full text-obsidian cursor-pointer shadow-lg transition-colors border-2 border-charcoal">
                        <Upload size={14} />
                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                        </label>
                    </div>
                    <p className="text-[10px] text-muted mt-3 font-bold font-mono uppercase tracking-wider">Identity Module</p>
                </div>

                <div className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1 flex items-center gap-1.5">
                            <div className="w-1 h-1 bg-accent rounded-full"></div> Display Name
                        </label>
                        <input 
                        type="text" 
                        value={displayName} 
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-black/20 border border-border rounded-2xl px-5 py-4 text-main font-medium focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-sm font-mono"
                        />
                    </div>

                    <div className="pt-4 border-t border-border space-y-3">
                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1 mb-2 block">
                            System Controls
                        </label>
                        
                        <button 
                            onClick={() => { onClose(); if(onOpenAssets) onOpenAssets(); }}
                            className="w-full py-4 bg-charcoal hover:bg-white/5 border border-border text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wide"
                        >
                            <SlidersHorizontal size={14} /> Adjust Opening Balances
                        </button>

                        <button 
                            onClick={handleSwitch}
                            className="w-full py-4 bg-charcoal hover:bg-white/5 border border-border text-blue-400 hover:text-blue-300 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wide"
                        >
                            <Power size={14} /> Switch to {isOfflineMode ? 'Live Mode' : 'SIM Mode'}
                        </button>
                    </div>

                     {!isOfflineMode && (
                        <div className="pt-4 border-t border-border">
                            <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest ml-1 mb-2 block">
                                Danger Zone
                            </label>
                            <button 
                                onClick={handleReset}
                                className="w-full py-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wide"
                            >
                                <RefreshCw size={14} /> Reset Data & Re-Onboard
                            </button>
                        </div>
                     )}
                </div>
              </div>
        </div>

        <div className="relative p-6 border-t border-border bg-panel flex gap-4 shrink-0 rounded-b-3xl">
           {onLogout && (
             <button 
                onClick={onLogout}
                className="flex-1 py-4 rounded-2xl border border-rose-500/20 text-rose-400 font-bold hover:bg-rose-500/10 hover:border-rose-500/40 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
             >
                <LogOut size={16} /> Logout
             </button>
           )}
           <button 
              onClick={handleSave}
              className="flex-[2] py-4 rounded-2xl bg-accent hover:bg-teal-400 text-obsidian font-bold shadow-[0_0_15px_rgba(76,190,225,0.2)] flex items-center justify-center gap-2 transition-all text-sm uppercase tracking-wide"
           >
              <Save size={16} /> Save Changes
           </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;