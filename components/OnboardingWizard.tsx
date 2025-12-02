import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, Asset, BudgetMap, Category, Transaction } from '../types';
import { IndianRupee, ArrowRight, User, ImageIcon, Upload } from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: (profile: UserProfile, assets: Asset[], budgets: BudgetMap, transactions: Transaction[]) => void;
  initialProfile: UserProfile;
}

// Helper: Compress Image (duplicated here to keep file independent if needed, or could import)
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
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
};

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, initialProfile }) => {
  const [displayName, setDisplayName] = useState(initialProfile.displayName || '');
  const [avatar, setAvatar] = useState<string | null>(initialProfile.avatar || null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Reuse Matrix Effect for consistency - Blue Theme
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$₹%";
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops: number[] = [];

    for (let i = 0; i < columns; i++) {
      drops[i] = 1;
    }

    const draw = () => {
      ctx.fillStyle = 'rgba(11, 14, 17, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#3B82F6'; // Brand Blue
      ctx.font = `${fontSize}px 'Urbanist', sans-serif`;
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };
    const interval = setInterval(draw, 33);
    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    return () => { clearInterval(interval); window.removeEventListener('resize', handleResize); };
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const compressed = await compressImage(e.target.files[0]);
        setAvatar(compressed);
    }
  };

  const handleComplete = () => {
    const newAssets: Asset[] = [];
    const newBudgets: BudgetMap = {
        [Category.Housing]: 0,
        [Category.Groceries]: 0,
        [Category.Utilities]: 0,
        [Category.Transport]: 0,
        [Category.Food]: 0,
        [Category.Shopping]: 0,
        [Category.Entertainment]: 0,
        [Category.Health]: 0,
        [Category.DomesticHelp]: 0,
        [Category.Investments]: 0,
        [Category.Salary]: 0,
        [Category.Others]: 0
    };
    const newTransactions: Transaction[] = [];

    onComplete(
        { ...initialProfile, displayName, avatar, isOnboarded: true },
        newAssets,
        newBudgets,
        newTransactions
    );
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4 relative overflow-hidden font-mono transition-colors duration-300">
       <canvas ref={canvasRef} className="absolute inset-0 opacity-10 pointer-events-none" />
       <div className="absolute inset-0 bg-gradient-to-t from-canvas via-transparent to-transparent"></div>

       <div className="w-full max-w-lg bg-panel border border-brand/20 rounded-3xl relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-brand to-transparent"></div>
          <div className="bg-charcoal border-b border-white/5 p-2 flex justify-between items-center px-4 rounded-t-3xl">
              <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500/50"></div>
              </div>
              <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">System Initialization</div>
          </div>

          <div className="p-8 md:p-10 space-y-8">
              <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-brand/5 border border-brand rounded-3xl flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                      <User size={30} className="text-brand" />
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-widest uppercase mb-1">Identify Yourself</h1>
                  <p className="text-xs text-brand/60">Establish ledger profile parameters.</p>
              </div>

              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                   <div className="flex justify-center">
                        <div className="relative group cursor-pointer">
                            <div className="w-24 h-24 rounded-full border-2 border-brand/30 bg-black flex items-center justify-center overflow-hidden hover:border-brand transition-all shadow-lg hover:shadow-brand/20">
                                {avatar ? (
                                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon size={32} className="text-gray-600 group-hover:text-brand transition-colors" />
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 p-2 bg-brand text-obsidian rounded-full shadow-lg cursor-pointer hover:bg-blue-400 transition-colors border border-black">
                                <Upload size={14} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                            </label>
                        </div>
                   </div>

                   <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Display Name</label>
                        <input 
                            type="text" 
                            value={displayName} 
                            onChange={(e) => setDisplayName(e.target.value)} 
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-xl text-white focus:border-brand focus:outline-none transition-all placeholder-gray-700 font-mono text-center" 
                            placeholder="USER_01" 
                            autoFocus 
                        />
                   </div>
              </div>

              <div className="pt-4">
                  <button 
                    onClick={handleComplete} 
                    disabled={!displayName} 
                    className="relative overflow-hidden w-full bg-brand hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-xs md:text-sm group"
                  >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/40 to-transparent -translate-x-full animate-shimmer"></div>
                      <span className="relative flex items-center gap-2">Launch Terminal <ArrowRight size={16} /></span>
                  </button>
              </div>
          </div>
          
          <div className="bg-charcoal/50 border-t border-white/5 p-3 flex justify-center items-center rounded-b-3xl">
               <p className="text-[10px] text-gray-600 font-mono">VizBuck Secure • Setup v19.3</p>
          </div>
       </div>
    </div>
  );
};

export default OnboardingWizard;