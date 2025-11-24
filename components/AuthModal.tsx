import React, { useState } from 'react';
import { getLoginUrl, exchangeCodeForToken } from '../services/upstox';
import { Lock, Key, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  onAuthenticated: (token: string) => void;
}

export const AuthModal: React.FC<Props> = ({ onAuthenticated }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      
      // Regex to extract code between 'code=' and '&' or end of string
      // Example: https://.../?code=ZBJWGl&ucc=...
      const match = val.match(/code=([^&]+)/);
      
      if (match && match[1]) {
          setCode(match[1]);
      } else {
          setCode(val);
      }
  };

  const handleLogin = async () => {
    if (!code.trim()) {
      setError("Please enter the authorization code");
      return;
    }
    setLoading(true);
    setError('');

    try {
      const token = await exchangeCodeForToken(code.trim());
      onAuthenticated(token);
    } catch (err: any) {
      setError(err.message || "Authentication failed. Check code and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-upstox-purple/20 p-6 border-b border-gray-700 flex flex-col items-center">
          <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
            <Lock className="text-white" size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">Connect to Upstox</h2>
          <p className="text-gray-400 text-sm text-center mt-2">
            Access live Nifty 50 option chain data and real-time market Greeks.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Step 1 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Step 1: Authorize</label>
            <a 
              href={getLoginUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg border border-gray-600 transition-all group"
            >
              <span>Open Upstox Login</span>
              <ExternalLink size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </a>
            <p className="text-[10px] text-gray-500">
              This will open a new tab. Login, then <strong>copy the entire URL</strong> of the page you are redirected to.
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Step 2: Input Link or Code</label>
             <div className="relative">
                <Key className="absolute left-3 top-3 text-gray-500" size={16} />
                <input 
                  type="text" 
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="Paste full redirect URL or code here..."
                  className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
             </div>
             <p className="text-[10px] text-gray-500">
                 We automatically extract the 6-digit code if you paste the full link.
             </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2 text-red-400 text-xs">
               <AlertCircle size={14} className="mt-0.5 shrink-0" />
               <span>{error}</span>
            </div>
          )}

          {/* Action */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Connect & Fetch Live Data'}
          </button>

        </div>
        
        {/* Footer */}
        <div className="bg-gray-950 p-4 text-center text-[10px] text-gray-600 border-t border-gray-800">
           Secure connection. Tokens are stored in browser memory only.
        </div>
      </div>
    </div>
  );
};