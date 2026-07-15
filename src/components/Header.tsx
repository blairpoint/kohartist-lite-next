import { useState, FormEvent, useEffect } from 'react';
import { Music, LogOut, User as UserIcon, HelpCircle, X } from 'lucide-react';
import { api } from '../api';

interface HeaderProps {
  user: any | null;
  setUser: (user: any | null) => void;
  activeTab: 'fan' | 'artist';
  setActiveTab: (tab: 'fan' | 'artist') => void;
  onShowRuleGuide: () => void;
  showAuthModal?: boolean;
  setShowAuthModal?: (show: boolean) => void;
  isLogin?: boolean;
  setIsLogin?: (isLogin: boolean) => void;
  registerEmail?: string;
  setRegisterEmail?: (email: string) => void;
}

export default function Header(props: HeaderProps) {
  const { user, setUser, activeTab, setActiveTab, onShowRuleGuide } = props;
  const [localShowAuthModal, setLocalShowAuthModal] = useState(false);
  const [localIsLogin, setLocalIsLogin] = useState(true);
  const [localUsername, setLocalUsername] = useState(() => {
    return localStorage.getItem('kohartist_saved_email') || '';
  });

  const showAuthModal = props.showAuthModal !== undefined ? props.showAuthModal : localShowAuthModal;
  const setShowAuthModal = props.setShowAuthModal !== undefined ? props.setShowAuthModal : setLocalShowAuthModal;
  const isLogin = props.isLogin !== undefined ? props.isLogin : localIsLogin;
  const setIsLogin = props.setIsLogin !== undefined ? props.setIsLogin : setLocalIsLogin;
  
  const username = (props.registerEmail !== undefined && props.registerEmail) ? props.registerEmail : localUsername;
  const setUsername = (val: string) => {
    if (props.setRegisterEmail) {
      props.setRegisterEmail(val);
    } else {
      setLocalUsername(val);
    }
  };

  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const getDefaultArtistName = (email: string) => {
    if (!email) return '';
    const part = email.split('@')[0];
    return part
      .split(/[\._-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  useEffect(() => {
    if (props.registerEmail) {
      setDisplayName(getDefaultArtistName(props.registerEmail));
    }
  }, [props.registerEmail]);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (isLogin) {
        res = await api.post('/api/login', { username, password });
      } else {
        res = await api.post('/api/register', { username, password, displayName: displayName || username });
      }

      if (res.token) {
        localStorage.setItem('kohartist_token', res.token);
        localStorage.setItem('kohartist_saved_email', username);
      }

      // Fetch complete fresh profile data to keep in-sync
      const freshUser = await api.get('/api/me');
      setUser({ ...freshUser, uid: freshUser._id });

      setShowAuthModal(false);
      setActiveTab('artist');
      // Clear form states on success
      setPassword('');
      setDisplayName('');
      if (props.setRegisterEmail) {
        props.setRegisterEmail('');
      } else {
        setLocalUsername('');
      }
    } catch (error) {
      alert(isLogin ? "Login failed. Check username and password." : "Registration failed. Username might be taken.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/logout', {});
    } catch (error) {
      console.error("Logout failed:", error);
    }
    localStorage.removeItem('kohartist_token');
    setUser(null);
    setActiveTab('fan');
  };

  return (
    <>
      <nav className="flex justify-between items-center p-6 md:px-12 w-full border-b border-[#1a1a1a] bg-[#050505]/90 backdrop-blur-md sticky top-0 z-50">
        <div 
          onClick={() => setActiveTab('fan')}
          className="flex items-center text-3xl font-bold tracking-tighter cursor-pointer select-none"
        >
          <span className="text-white drop-shadow-md">k</span>
          <svg viewBox="0 0 100 100" className="w-[1.1em] h-[1.1em] mx-[1px] -mt-1" aria-label="Kohartist Logo">
            <circle cx="50" cy="50" r="50" fill="rgba(255,255,255,0.9)" />
            <circle cx="50" cy="65" r="42" fill="#050505" />
            <path d="M50,12 C45,7 35,7 30,15 C25,23 28,35 50,52 C72,35 75,23 70,15 C65,7 55,7 50,12 Z" fill="#F27D26" />
          </svg>
          <span className="text-white drop-shadow-md">hartist</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onShowRuleGuide}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#F27D26] transition-colors border border-[#222] rounded-full px-3 py-1 bg-gray-900/50"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Important Rule
          </button>
          <button
            onClick={() => setActiveTab('fan')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full border text-sm font-medium transition-all duration-300 ${
              activeTab === 'fan'
                ? 'bg-white text-[#050505] border-white'
                : 'border-[#222] text-gray-300 hover:bg-[#111]'
            }`}
          >
            <Music className="w-4 h-4" />
            Fan Portal
          </button>
          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('artist')}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'artist'
                    ? 'bg-[#F27D26] text-[#050505] shadow-[0_0_15px_rgba(242,125,38,0.3)] hover:bg-[#ff8c3a]'
                    : 'border border-[#222] text-gray-300 hover:bg-[#111]'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                Artist Space
              </button>
              <button
                onClick={handleLogout}
                className="p-2.5 rounded-full border border-[#222] hover:bg-red-500/10 hover:text-red-400 text-gray-400 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2 bg-[#F27D26] hover:bg-[#ff8c3a] px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-[0_0_15px_rgba(242,125,38,0.2)] text-[#050505]"
            >
              <UserIcon className="w-4 h-4" />
              Artist Sign In
            </button>
          )}
        </div>
      </nav>

      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-[#0F0F0F] border border-[#222] rounded-[32px] p-8 max-w-md w-full relative shadow-2xl">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-6 right-6 text-gray-500 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-white mb-2">{isLogin ? 'Welcome Back' : 'Claim Your Handle'}</h2>
              <p className="text-sm text-gray-400">
                {isLogin ? 'Sign in to access your dashboard' : 'Join the fee-less tipping network'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              {!isLogin && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase ml-1">Artist / DJ Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DJ Slate"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-[#161616] border border-[#222] rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#F27D26] font-semibold"
                  />
                </div>
              )}
              {(!props.registerEmail || isLogin) && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase ml-1">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-[#161616] border border-[#222] rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#F27D26] font-semibold"
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase ml-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#161616] border border-[#222] rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#F27D26] font-semibold"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#F27D26] hover:bg-[#ea580c] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl mt-4 transition-all shadow-[0_0_20px_rgba(242,125,38,0.15)]"
              >
                {loading ? "PROCESSING..." : isLogin ? "SIGN IN" : "REGISTER NOW"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {isLogin ? "Don't have an account? Register" : "Already have an account? Sign In"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
