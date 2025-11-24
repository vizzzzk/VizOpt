import React, { useState, useEffect, useRef } from 'react';
import { User, Save, LogOut, Wallet, Upload, X, Eye, EyeOff, ShieldAlert, Settings, Camera, Trash2, Cloud, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  displayName: string;
  currentBalance: number;
  currentAvatar: string;
  currentMaxLots: number;
  onUpdateProfile: (data: { balance: number, avatar: string, displayName: string, maxLots: number }) => void;
  onLogout: () => void;
}

export const ProfileModal: React.FC<Props> = ({ 
    isOpen, onClose, username, displayName, currentBalance, currentAvatar, currentMaxLots, onUpdateProfile, onLogout 
}) => {
    const [balance, setBalance] = useState(currentBalance.toString());
    const [name, setName] = useState(displayName);
    const [avatar, setAvatar] = useState(currentAvatar);
    const [maxLots, setMaxLots] = useState(currentMaxLots.toString());
    const [showUsername, setShowUsername] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setBalance(currentBalance.toString());
            setName(displayName || username); 
            setAvatar(currentAvatar);
            setMaxLots(currentMaxLots.toString());
        }
    }, [isOpen, currentBalance, currentAvatar, displayName, username, currentMaxLots]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 800 * 1024) {
                alert("Image size too large. Please select an image under 800KB.");
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    setAvatar(reader.result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveAvatar = (e: React.MouseEvent) => {
        e.stopPropagation();
        setAvatar('');
    };

    const handleSave = () => {
        const numBalance = parseFloat(balance);
        const numMaxLots = parseInt(maxLots);

        if (isNaN(numBalance) || numBalance < 0) {
            alert("Please enter a valid positive balance.");
            return;
        }

        if (numBalance > 400000) {
            alert("Portfolio balance cannot exceed ₹4,00,000 for realistic paper trading.");
            return;
        }

        if (isNaN(numMaxLots) || numMaxLots < 1 || numMaxLots > 100) {
             alert("Max lots must be between 1 and 100.");
             return;
        }

        onUpdateProfile({
            balance: numBalance,
            avatar: avatar,
            displayName: name,
            maxLots: numMaxLots
        });
        
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Settings size={18} className="text-purple-400" /> Settings & Profile
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-500/30 bg-gray-800 flex items-center justify-center relative shadow-lg shadow-purple-900/20 transition-all group-hover:border-purple-400">
                                {avatar ? (
                                    <img key={avatar} src={avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={40} className="text-gray-500" />
                                )}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <Camera size={24} className="text-white" />
                                </div>
                            </div>
                            <div className="absolute bottom-0 right-0 bg-purple-600 rounded-full p-1.5 border-2 border-gray-900 shadow z-20">
                                <Upload size={12} className="text-white" />
                            </div>
                            
                            {/* Remove Avatar Button */}
                            {avatar && (
                                <button 
                                    onClick={handleRemoveAvatar}
                                    className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 rounded-full p-1.5 border-2 border-gray-900 shadow z-20 transition-colors"
                                    title="Remove Picture"
                                >
                                    <Trash2 size={12} className="text-white" />
                                </button>
                            )}
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="image/png, image/jpeg, image/jpg" 
                            className="hidden" 
                        />
                        <p className="text-[10px] text-gray-500">Tap image to upload (Max 800KB)</p>
                    </div>

                    {/* Identity Section */}
                    <div className="space-y-4 border-b border-gray-800 pb-4">
                        <div>
                             <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Display Name</label>
                             <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter display name"
                                className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none"
                            />
                        </div>

                        <div>
                             <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Login ID (Private)</label>
                             <div className="flex items-center gap-2 bg-gray-800/50 border border-gray-800 rounded-lg px-3 py-2">
                                <div className="flex-1 text-sm text-gray-300 font-mono">
                                    {showUsername ? `@${username}` : '••••••••'}
                                </div>
                                <button onClick={() => setShowUsername(!showUsername)} className="text-gray-500 hover:text-white">
                                    {showUsername ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                             </div>
                        </div>
                    </div>

                    {/* Financial Settings */}
                    <div className="space-y-4 border-b border-gray-800 pb-4">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Portfolio Value (₹)</label>
                                <span className="text-[9px] text-red-400">Max Limit: ₹4,00,000</span>
                            </div>
                            <div className="relative">
                                <Wallet size={14} className="absolute left-3 top-3 text-gray-500" />
                                <input 
                                    type="number" 
                                    value={balance}
                                    onChange={(e) => setBalance(e.target.value)}
                                    max={400000}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2.5 pl-9 pr-3 text-sm text-white font-mono placeholder-gray-600 focus:ring-1 focus:ring-purple-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Risk: Max Lots / Trade</label>
                            <div className="relative">
                                <ShieldAlert size={14} className="absolute left-3 top-3 text-gray-500" />
                                <input 
                                    type="number" 
                                    value={maxLots}
                                    onChange={(e) => setMaxLots(e.target.value)}
                                    min={1}
                                    max={100}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2.5 pl-9 pr-3 text-sm text-white font-mono placeholder-gray-600 focus:ring-1 focus:ring-purple-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Cloud Status */}
                    <div className="space-y-2 bg-blue-900/10 p-3 rounded-lg border border-blue-500/20">
                         <div className="flex items-center gap-2 mb-1 text-blue-400">
                             <Cloud size={16} />
                             <label className="text-xs font-bold uppercase tracking-wider">Cloud Active</label>
                         </div>
                         <p className="text-[10px] text-gray-400 leading-relaxed">
                            Your portfolio is automatically synced to the cloud. You can log in with your Username <strong>@{username}</strong> on any device to resume trading.
                         </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-950 border-t border-gray-800 flex gap-3">
                    <button 
                        onClick={onLogout}
                        className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                        <LogOut size={14} /> Logout
                    </button>
                    <button 
                        onClick={handleSave}
                        className="flex-[2] bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-purple-900/20"
                    >
                        <Save size={14} /> Save Profile
                    </button>
                </div>
            </div>
        </div>
    );
};