import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, AlertCircle, UserPlus, Cloud, WifiOff, Users, Terminal, Smartphone, Loader2, ExternalLink } from 'lucide-react';
import { firebaseService } from '../services/firebase';

interface LoginProps {
  onLogin: () => void;
  onSimLogin: () => void;
  onNewUser: () => void;
}

type LoginPhase = 'mode_select' | 'user_type_select' | 'auth_existing' | 'auth_new_passkey';

const Login: React.FC<LoginProps> = ({ onLogin, onSimLogin, onNewUser }) => {
  const [phase, setPhase] = useState<LoginPhase>('mode_select');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<{code: string, message: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Matrix Digital Rain Effect - Brand Blue
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
      ctx.fillStyle = 'rgba(17, 17, 17, 0.05)'; // Dark Base
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0177fb'; // Brand Blue
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

  // Helper to generate a deterministic password based on username
  const getDerivedPassword = (user: string) => {
      return `vizbuck-${user.trim().toLowerCase()}-secure`;
  };

  const handleLiveLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) { setError({ code: 'validation', message: 'Username is required.' }); return; }
    
    setError(null);
    setLoading(true);
    
    // Safety valve: reset loading if hanging for too long (e.g. 10s)
    const safetyTimer = setTimeout(() => setLoading(false), 10000);

    try {
        const pass = getDerivedPassword(username);
        await firebaseService.loginUser(username, pass);
        clearTimeout(safetyTimer);
        // Success! App.tsx auth listener will auto-detect user and unmount this component.
    } catch (err: any) {
        clearTimeout(safetyTimer);
        console.error("Login Error:", err);
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            setError({ code: err.code, message: "Username not found. Did you mean to Create Account?" });
        } else if (err.code === 'auth/operation-not-allowed') {
            setError({ code: err.code, message: "Firebase Auth not configured." });
        } else if (err.code === 'auth/network-request-failed') {
            setError({ code: err.code, message: "Network error. Check connection." });
        } else {
            setError({ code: err.code, message: err.message });
        }
        setLoading(false);
    }
  };

  const handleCreateLiveAccount = async (e: React.FormEvent) => {
      e.preventDefault();
      if (username.length < 3) { setError({ code: 'validation', message: 'Username too short.' }); return; }
      
      setLoading(true);
      setError(null);
      const safetyTimer = setTimeout(() => setLoading(false), 10000);

      try {
          const pass = getDerivedPassword(username);
          await firebaseService.registerUser(username, pass);
          clearTimeout(safetyTimer);
          // Success! App.tsx auth listener will auto-detect user and unmount this component.
      } catch (err: any) {
          clearTimeout(safetyTimer);
          console.error("Register Error:", err);
          if (err.code === 'auth/email-already-in-use') {
              setError({ code: err.code, message: "This Username is already taken." });
          } else if (err.code === 'auth/operation-not-allowed') {
              setError({ code: err.code, message: "Firebase Auth not configured." });
          } else if (err.code === 'auth/network-request-failed') {
              setError({ code: err.code, message: "Network error. Check connection." });
          } else {
              setError({ code: err.code, message: err.message });
          }
          setLoading(false);
      }
  };

  // --- Configuration Help for operation-not-allowed ---
  if (error?.code === 'auth/operation-not-allowed') {
      return (
        <div className="min-h-screen bg-canvas flex items-center justify-center p-4 relative overflow-hidden font-sans">
            <div className="w-full max-w-md bg-panel border border-neon-red/30 rounded-3xl relative z-10 shadow-2xl p-8 text-center animate-in zoom-in-95">
                <div className="w-16 h-16 bg-neon-red/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-neon-red/20">
                    <AlertCircle size={32} className="text-neon-red" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Configuration Required</h2>
                <p className="text-sm text-gray-400 mb-6">
                    To enable username login across devices, you must enable the <b>Email/Password</b> provider in your Firebase Console.
                </p>
                
                <div className="bg-charcoal text-left p-4 rounded-xl border border-white/5 mb-6 text-xs text-gray-300 space-y-2 font-mono">
                    <p>1. Go to Firebase Console</p>
                    <p>2. Select Project &gt; <b>Authentication</b></p>
                    <p>3. Click <b>Sign-in method</b> tab</p>
                    <p>4. Click <b>Email/Password</b></p>
                    <p>5. Toggle <b>Enable</b> & Save</p>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                        <a 
                            href="https://console.firebase.google.com/" 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex-1 bg-charcoal hover:bg-white/5 border border-border text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                        >
                            <ExternalLink size={16} /> Open Console
                        </a>
                        <button 
                            onClick={() => setError(null)}
                            className="flex-1 bg-brand hover:bg-brand-hover text-white py-3 rounded-xl text-sm font-bold transition-all"
                        >
                            I Fixed It
                        </button>
                    </div>
                    <button 
                        onClick={onSimLogin} 
                        className="w-full text-xs text-muted hover:text-white py-2 underline decoration-muted/30 hover:decoration-white"
                    >
                        Skip and use Offline Mode (Data stored locally)
                    </button>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-300">
      <canvas ref={canvasRef} className="absolute inset-0 opacity-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-canvas via-transparent to-transparent"></div>

      <div className="w-full max-w-lg bg-panel border border-border rounded-3xl relative z-10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        {/* Terminal Header */}
        <div className="bg-charcoal border-b border-border p-4 flex justify-between items-center px-6 rounded-t-3xl">
            <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-neon-red"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-brand"></div>
            </div>
            <div className="text-[10px] text-muted font-bold tracking-widest uppercase">SECURE ACCESS v19.3</div>
        </div>

        <div className="p-8 md:p-12 space-y-10">
            <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-brand/5 border border-brand rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(1,119,251,0.2)]">
                    <UserPlus size={32} className="text-brand" />
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2 uppercase">VizBuck</h1>
                <p className="text-sm text-brand/80 font-medium">Next Gen Financial Intelligence</p>
            </div>

            {/* PHASE 1: MODE SELECTION (SIM vs LIVE) */}
            {phase === 'mode_select' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <button onClick={() => setPhase('user_type_select')} className="w-full bg-white/5 hover:bg-brand/10 border border-border hover:border-brand p-5 rounded-3xl transition-all group relative overflow-hidden text-left">
                         <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand group-hover:scale-110 transition-transform"><Cloud size={24} /></div>
                            <div>
                                <div className="text-lg font-bold text-white group-hover:text-brand uppercase tracking-tight transition-colors">Live Mode</div>
                                <div className="text-xs text-muted font-medium mt-0.5">Cloud Sync • Multi-Device</div>
                            </div>
                        </div>
                    </button>
                    <button onClick={onSimLogin} className="w-full bg-white/5 hover:bg-white/10 border border-border hover:border-white/30 p-5 rounded-3xl transition-all group relative overflow-hidden text-left">
                         <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform"><WifiOff size={24} /></div>
                            <div>
                                <div className="text-lg font-bold text-white group-hover:text-white uppercase tracking-tight transition-colors">SIM Mode</div>
                                <div className="text-xs text-muted font-medium mt-0.5">Offline • Local Storage Only</div>
                            </div>
                        </div>
                    </button>
                </div>
            )}

            {/* PHASE 2: USER TYPE SELECTION */}
            {phase === 'user_type_select' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <div className="text-center text-xs text-muted mb-2 uppercase tracking-wide font-bold">Authentication Protocol</div>
                    <button onClick={() => setPhase('auth_new_passkey')} className="w-full bg-charcoal hover:bg-white/5 border border-border hover:border-brand p-5 rounded-3xl transition-all text-left flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                             <UserPlus size={20} className="text-muted group-hover:text-brand transition-colors" />
                             <span className="text-sm font-bold text-white uppercase tracking-wide">Register New Account</span>
                        </div>
                        <ArrowRight size={18} className="text-muted group-hover:text-white transition-colors" />
                    </button>
                    <button onClick={() => setPhase('auth_existing')} className="w-full bg-charcoal hover:bg-white/5 border border-border hover:border-brand p-5 rounded-3xl transition-all text-left flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                             <Terminal size={20} className="text-muted group-hover:text-brand transition-colors" />
                             <span className="text-sm font-bold text-white uppercase tracking-wide">Login</span>
                        </div>
                        <ArrowRight size={18} className="text-muted group-hover:text-white transition-colors" />
                    </button>
                    <button onClick={() => setPhase('mode_select')} className="w-full text-center text-xs text-muted hover:text-white mt-4 font-medium transition-colors">[ RETURN ]</button>
                </div>
            )}

            {/* PHASE 3A: NEW USER AUTH (REGISTER) */}
            {phase === 'auth_new_passkey' && (
                <form onSubmit={handleCreateLiveAccount} className="space-y-5 animate-in fade-in slide-in-from-right-4">
                    <div className="text-center text-xs text-brand mb-2 uppercase tracking-wide font-bold">New Account Setup</div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-widest pl-1">Choose Username</label>
                        <div className="relative group">
                            <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand transition-colors" />
                            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className="w-full bg-black/40 border border-border rounded-2xl py-4 pl-12 pr-4 text-base text-white font-medium focus:border-brand focus:outline-none transition-all placeholder-muted tracking-widest font-mono" autoFocus />
                        </div>
                    </div>
                    
                    <div className="text-[10px] text-muted text-center px-4">
                        This username will be your unique key to access data across devices.
                    </div>
                    {error && <div className="text-neon-red text-xs font-bold bg-neon-red/10 p-3 border border-neon-red/20 flex items-center gap-2 rounded-2xl"><AlertCircle size={14}/> {error.message}</div>}
                    <button type="submit" disabled={loading} className="relative overflow-hidden w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-obsidian font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(1,119,251,0.3)] transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-sm group">
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <span className="relative flex items-center gap-2">CREATE ACCOUNT <ArrowRight size={18} /></span>}
                    </button>
                    <button type="button" onClick={() => setPhase('user_type_select')} className="w-full text-center text-xs text-muted hover:text-white font-medium">[ BACK ]</button>
                </form>
            )}

            {/* PHASE 3B: EXISTING USER AUTH (LOGIN) */}
            {phase === 'auth_existing' && (
                <form onSubmit={handleLiveLogin} className="space-y-5 animate-in fade-in slide-in-from-right-4">
                    <div className="text-center text-xs text-brand mb-2 uppercase tracking-wide font-bold">Secure Login</div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-widest pl-1">Username</label>
                        <div className="relative group">
                            <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand transition-colors" />
                            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className="w-full bg-black/40 border border-border rounded-2xl py-4 pl-12 pr-4 text-base text-white font-medium focus:border-brand focus:outline-none transition-all placeholder-muted tracking-widest font-mono" autoFocus />
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 text-[10px] text-brand/80">
                        <Smartphone size={12} />
                        <span>Syncs with Mobile & Desktop</span>
                    </div>
                    {error && <div className="text-neon-red text-xs font-bold bg-neon-red/10 p-3 border border-neon-red/20 flex items-center gap-2 rounded-2xl"><AlertCircle size={14}/> {error.message}</div>}
                    <button type="submit" disabled={loading} className="w-full bg-brand hover:bg-brand-hover disabled:bg-charcoal disabled:text-muted text-obsidian font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(1,119,251,0.3)] transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-sm">
                        {loading ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16}/> CONNECTING...</span> : 'LOGIN'}
                    </button>
                    <button type="button" onClick={() => setPhase('user_type_select')} className="w-full text-center text-xs text-muted hover:text-white font-medium">[ BACK ]</button>
                </form>
            )}
        </div>
        <div className="bg-charcoal/50 border-t border-border p-4 flex justify-center items-center">
             <p className="text-[10px] text-muted font-medium">VizBuck Secure • v19.3</p>
        </div>
      </div>
    </div>
  );
};

export default Login;