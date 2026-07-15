import { useState, useEffect } from 'react';
import { ShieldAlert, HelpCircle, X, ShieldCheck, Heart } from 'lucide-react';
import Header from './components/Header';
import Hero from './components/Hero';
import FanPortal from './fanportal';
import ArtistDashboard from './artistdashboard';
import { api } from './api';

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'fan' | 'artist'>('fan');
  const [selectedArtistId, setSelectedArtistId] = useState<string | undefined>(undefined);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [registerEmail, setRegisterEmail] = useState('');

  // Read initial artist ID from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialArtist = params.get('artist');
    if (initialArtist) {
      setSelectedArtistId(initialArtist);
      setActiveTab('fan');
    }
  }, []);

  const [activeEventsCount, setActiveEventsCount] = useState(0);
  const [showRuleGuide, setShowRuleGuide] = useState(false);

  // Auth state is no longer restored on load via /api/me (that call is disabled).
  // The app simply starts logged-out; users need to log in each visit,
  // and `user` gets populated directly from the /api/login or /api/register response.
  useEffect(() => {
    setAuthLoading(false);
  }, []);

  // Monitor overall active live events
  useEffect(() => {
    api.get('/api/events')
      .then((events: any[]) => {
        const active = events.filter(e => e.status === 'active');
        setActiveEventsCount(active.length);
      })
      .catch(console.error);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#e5e5e5] flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#F27D26] mb-4"></div>
        <p className="text-sm font-mono tracking-wider text-gray-500 uppercase">Synchronizing Network...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#e5e5e5] flex flex-col font-sans selection:bg-[#F27D26] selection:text-[#050505]">
      
      {/* Navigation Header */}
      <Header 
        user={user} 
        setUser={setUser}
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          // Reset artist subselection if switching tabs
          if (tab === 'fan') {
            setSelectedArtistId(undefined);
          }
        }}
        onShowRuleGuide={() => setShowRuleGuide(true)}
        showAuthModal={showAuthModal}
        setShowAuthModal={setShowAuthModal}
        isLogin={isLogin}
        setIsLogin={setIsLogin}
        registerEmail={registerEmail}
        setRegisterEmail={setRegisterEmail}
      />

      {/* Main Content Router */}
      <main className="flex-grow pb-16">
        {activeTab === 'fan' ? (
          <div>
            {/* Show landing hero if browsing artists, otherwise keep layout focused on tipping */}
            {!selectedArtistId && (
              <Hero 
                activeEventsCount={activeEventsCount} 
                onStartRegistration={(email) => {
                  if (user) {
                    setActiveTab('artist');
                  } else {
                    setRegisterEmail(email);
                    setIsLogin(false);
                    setShowAuthModal(true);
                  }
                }}
              />
            )}
            
            <FanPortal 
              selectedArtistId={selectedArtistId}
              onArtistSelect={(id) => setSelectedArtistId(id)}
              onClearArtistSelection={() => setSelectedArtistId(undefined)}
            />
          </div>
        ) : (
          <div className="animate-fade-in">
            {user ? (
              <ArtistDashboard user={user} />
            ) : (
              <div className="max-w-md mx-auto text-center py-24 px-4">
                <ShieldAlert className="w-12 h-12 text-[#F27D26] mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Artist Authentication Required</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Please log in to claim your profile, configure live streams, and view your tipping ledger.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modern Rule Dialog Modal */}
      {showRuleGuide && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0F0F0F] border border-[#222] rounded-[32px] p-6 md:p-8 max-w-lg w-full relative shadow-2xl">
            <button 
              onClick={() => setShowRuleGuide(false)}
              className="absolute top-6 right-6 text-gray-500 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#F27D26]/10 border border-[#F27D26]/20 text-[#F27D26] flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white">The Important Golden Rule</h3>
            </div>

            <div className="flex flex-col gap-5 text-sm text-gray-300 leading-relaxed">
              <p>
                In order to satisfy transaction policy constraints and prevent ledger exploits, Kohartist operates under a strict, automated security policy:
              </p>
              
              <div className="bg-[#111] border-l-2 border-[#F27D26] rounded-r-xl p-4 flex gap-3.5 items-start">
                <ShieldCheck className="w-5 h-5 text-[#F27D26] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white mb-1">Active Set Mandate</h4>
                  <p className="text-xs text-gray-400">
                    Artists can only receive gift tips during **active live events** or **pre-authorized fundraiser campaigns**. Tipping features are automatically deactivated once the set concludes.
                  </p>
                </div>
              </div>

              <div className="bg-[#111] border-l-2 border-[#F27D26] rounded-r-xl p-4 flex gap-3.5 items-start">
                <ShieldCheck className="w-5 h-5 text-[#F27D26] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white mb-1">Fee-Less Guarantee</h4>
                  <p className="text-xs text-gray-400">
                    Because we cover all standard payment processor transaction cuts, 100% of the fan's declared amount flows straight to your registered payout ledger.
                  </p>
                </div>
              </div>

            </div>

            <button
              onClick={() => setShowRuleGuide(false)}
              className="w-full bg-[#F27D26] hover:bg-[#ff8c3a] text-[#050505] font-bold py-4 rounded-2xl mt-6 transition-all shadow-lg hover:shadow-[#F27D26]/20"
            >
              ACKNOWLEDGE & CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Stable Production Footer */}
      <footer className="w-full border-t border-[#1a1a1a] py-8 px-6 md:px-12 mt-auto bg-[#050505]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] sm:text-xs font-mono text-gray-500 tracking-wider text-center md:text-left">
          <div>© 2026 KOHARTIST — DIRECT ARTIST PAYMENT NETWORK</div>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-emerald-500">STABLE PRODUCTION DEPLOY</span>
            </div>
            <div className="flex items-center gap-1">
              <span>POWERED BY STRIPE</span>
              <Heart className="w-3 h-3 text-red-500 animate-pulse fill-red-500" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
