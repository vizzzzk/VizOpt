
import React, { useState } from 'react';
import { APP_CONFIG } from '../constants';
import { User, ArrowRight, AlertCircle } from 'lucide-react';

interface Props {
  onLogin: (username: string) => void;
}

export const LoginModal: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === APP_CONFIG.ACCESS_USERNAME) {
      onLogin(username.trim());
    } else {
      setError('Invalid Username. Access Denied.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
       <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
          <div className="p-8">
             <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/20">
                <User className="text-white" size={32} />
             </div>
             <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">Viz<span className="text-purple-400">Opt</span> Terminal</h1>
                <p className="text-gray-400 text-sm">Enter your username to access the dashboard.</p>
             </div>

             <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Username</label>
                   <input 
                     type="password" 
                     value={username}
                     onChange={(e) => {
                         setUsername(e.target.value);
                         setError('');
                     }}
                     className="w-full bg-black/50 border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                     placeholder="Enter username..."
                     autoFocus
                   />
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}

                <button 
                   type="submit"
                   className="w-full bg-white text-black hover:bg-gray-200 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
                >
                   <span>Access Terminal</span>
                   <ArrowRight size={18} />
                </button>
             </form>
          </div>
          <div className="bg-gray-950 p-4 text-center border-t border-gray-800">
             <p className="text-[10px] text-gray-600">Secured Environment v{APP_CONFIG.VERSION}</p>
          </div>
       </div>
    </div>
  );
};