import { useState, useEffect } from "react";

import { Artist, Event } from './types';
import { Search, Flame, DollarSign, Send, Gift, HelpCircle, CheckCircle2, Award, Calendar } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from './api';

interface FanPortalProps {
  onArtistSelect?: (artistId: string) => void;
  selectedArtistId?: string;
  onClearArtistSelection?: () => void;
}

export default function FanPortal({ onArtistSelect, selectedArtistId, onClearArtistSelection }: FanPortalProps) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailedProfile, setDetailedProfile] = useState<any>(null);

  // Fetch detailed profile when artist is selected
  useEffect(() => {
    if (selectedArtistId) {
      fetch(`/api/profile/${selectedArtistId}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) setDetailedProfile(data);
          else setDetailedProfile(null);
        })
        .catch(err => {
          console.error('Failed to fetch detailed profile:', err);
          setDetailedProfile(null);
        });
    } else {
      setDetailedProfile(null);
    }
  }, [selectedArtistId]);

  // Check for Stripe success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true' && selectedArtistId) {
      // Trigger visual & audio reward
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      playTipSound();

      setTipSuccess(true);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname + "?artist=" + selectedArtistId);

      // Clear success screen after 6 seconds
      setTimeout(() => {
        setTipSuccess(false);
      }, 6000);
    }
  }, [selectedArtistId]);

  // Tipping states
  const [tipAmount, setTipAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [fanName, setFanName] = useState<string>('');
  const [tipMessage, setTipMessage] = useState<string>('');
  const [submittingTip, setSubmittingTip] = useState(false);
  const [tipSuccess, setTipSuccess] = useState(false);

  // Play satisfying sound upon successful tipping using Web Audio API
  function playTipSound() {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Chime frequency combination (Coin cash sound)
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.frequency.value = freq;
        osc.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, start);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = audioCtx.currentTime;
      playTone(523.25, now, 0.15); // C5
      playTone(659.25, now + 0.08, 0.15); // E5
      playTone(783.99, now + 0.16, 0.3); // G5
    } catch (e) {
      console.warn("AudioContext failed to play", e);
    }
  };

  // Real-time listener for artists and events via robust polling
  useEffect(() => {
    let interval: any;
    const fetchArtistsAndEvents = async () => {
      try {
        const [artistsRes, eventsRes] = await Promise.all([
          api.get('/api/artists'),
          api.get('/api/events')
        ]);
        setArtists(artistsRes);
        setEvents(eventsRes);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load portal data:', err);
      }
    };

    fetchArtistsAndEvents();
    interval = setInterval(fetchArtistsAndEvents, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleSendTip = async (artist: Artist, event: Event) => {
    const finalAmount = customAmount ? parseFloat(customAmount) : tipAmount;
    if (isNaN(finalAmount) || finalAmount <= 0) {
      alert("Please enter a valid tipping amount.");
      return;
    }
    if (finalAmount > 10000) {
      alert("Maximum single tip is $10,000.");
      return;
    }
    if (!fanName.trim()) {
      alert("Please enter your name so the artist can thank you!");
      return;
    }

    setSubmittingTip(true);
    try {
      const tipData = {
        artistId: artist._id,
        eventId: event._id,
        amount: finalAmount,
        fanName: fanName.trim(),
        message: tipMessage.trim()
      };
      await api.post('/api/tips', tipData);

      // Trigger visual & audio reward
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      playTipSound();

      setTipSuccess(true);
      setCustomAmount('');
      setTipMessage('');
      
      // Clear success screen after 4 seconds
      setTimeout(() => {
        setTipSuccess(false);
      }, 4000);

    } catch (error) {
      console.error("Tip failed:", error);
      alert("Tipping transaction failed. Please check that the event is still active and try again.");
    } finally {
      setSubmittingTip(false);
    }
  };

  const selectedArtist = artists.find(a => a._id === selectedArtistId);
  const selectedArtistActiveEvent = events.find(e => e.artistId === selectedArtistId && e.status === 'active');

  const filteredArtists = artists.filter(artist => {
    const matchesSearch = artist.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (artist.bio && artist.bio.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const getArtistActiveEvent = (artistId: string) => {
    return events.find(e => e.artistId === artistId && e.status === 'active');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative">
      {selectedArtist ? (
        // Immersive Artist Tip checkout
        <div className="bg-[#0F0F0F]/90 border border-[#222] rounded-3xl p-8 md:p-12 shadow-2xl relative max-w-3xl mx-auto">
          <button 
            onClick={onClearArtistSelection}
            className="absolute top-6 left-6 text-xs text-gray-400 hover:text-white flex items-center gap-1.5 border border-[#222] rounded-full px-3 py-1 bg-gray-900/50"
            id="fan-btn-back"
          >
            ← Back to Directory
          </button>

          {tipSuccess ? (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in" id="tip-success-card">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-extrabold text-white mb-2">Tip Transmitted Successfully!</h2>
              <p className="text-emerald-400 font-bold mb-4">100% of your funds went directly to {selectedArtist.displayName}!</p>
              <p className="text-sm text-gray-400 max-w-md">
                Your payment was securely processed via Stripe with zero platform fees. Thank you for supporting the artist!
              </p>
            </div>
          ) : (
            <div className="pt-6">
              {/* Profile Card Header */}
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-[#222]">
                <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-extrabold shadow-lg overflow-hidden shrink-0 ${selectedArtist.avatarUrl ? 'bg-[#050505] border border-[#222]' : 'bg-gradient-to-tr from-[#F27D26] to-[#ea580c]'}`}>
                  {selectedArtist.avatarUrl ? (
                    <img src={selectedArtist.avatarUrl} alt={selectedArtist.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    selectedArtist.displayName[0].toUpperCase()
                  )}
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-3xl font-bold text-white mb-1 flex items-center justify-center sm:justify-start gap-2">
                    {selectedArtist.displayName}
                    <Award className="w-5 h-5 text-[#F27D26]" />
                  </h2>
                  <p className="text-sm text-gray-400 max-w-md">{detailedProfile?.biography || selectedArtist.bio || "This artist is ready for fee-less tipping."}</p>
                  
                  {detailedProfile?.socialLinks && detailedProfile.socialLinks.length > 0 && (
                    <div className="flex gap-3 mt-3 justify-center sm:justify-start flex-wrap">
                      {detailedProfile.socialLinks.map((link: any, i: number) => (
                        <a key={i} href={link.url} target="_blank" rel="noreferrer" className="text-xs text-[#F27D26] hover:text-white border border-[#222] rounded-full px-3 py-1 bg-gray-900/50 transition-colors">
                          {link.platform}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {detailedProfile?.portfolio && detailedProfile.portfolio.length > 0 && (
                <div className="my-6 pb-6 border-b border-[#222]">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Portfolio</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {detailedProfile.portfolio.map((item: any, i: number) => (
                      <div key={i} className="group relative aspect-square rounded-xl overflow-hidden bg-[#161616] border border-[#222]">
                        {item.type === 'video' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-2 text-center">
                            <span className="text-[10px] uppercase font-bold mb-1">Video</span>
                            <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-[#F27D26] hover:underline break-all truncate w-full px-2">Watch Link</a>
                          </div>
                        ) : (
                          <img src={item.url} alt={item.title || 'Portfolio item'} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                        )}
                        {item.title && (
                          <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/90 to-transparent">
                            <p className="text-[10px] text-white font-bold truncate">{item.title}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Connection Info (Relational Security Gate Explanation) */}
              <div className="my-8">
                {selectedArtistActiveEvent ? (
                  <div className="bg-[#F27D26]/10 border border-[#F27D26]/20 rounded-2xl p-6 relative overflow-hidden" id="active-event-card">
                    <div className="absolute top-2 right-4 flex items-center gap-1.5 bg-[#F27D26] text-white text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full animate-pulse">
                      <Flame className="w-3 h-3" /> LIVE NOW
                    </div>
                    <span className="text-xs text-[#F27D26] uppercase font-bold tracking-wider mb-1 block">
                      {selectedArtistActiveEvent.type === 'live' ? 'Live Stream Performance' : 'Approved Fundraiser'}
                    </span>
                    <h3 className="text-xl font-bold text-white mb-2">{selectedArtistActiveEvent.title}</h3>
                    {selectedArtistActiveEvent.description && (
                      <p className="text-sm text-gray-300 mb-4">{selectedArtistActiveEvent.description}</p>
                    )}
                    {selectedArtistActiveEvent.type === 'fundraiser' && selectedArtistActiveEvent.targetAmount && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Target Progress</span>
                          <span className="font-bold text-white">${selectedArtistActiveEvent.currentAmount} / ${selectedArtistActiveEvent.targetAmount}</span>
                        </div>
                        <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-[#222]">
                          <div 
                            className="bg-gradient-to-r from-[#F27D26] to-[#F27D26] h-2 rounded-full" 
                            style={{ width: `${Math.min(100, (selectedArtistActiveEvent.currentAmount / selectedArtistActiveEvent.targetAmount) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {selectedArtistActiveEvent.type === 'live' && (
                      <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-900/50 p-3 rounded-xl border border-[#222]/50 mt-2">
                        <DollarSign className="w-4 h-4 text-[#F27D26]" />
                        <span>Gift Pool: <strong>${selectedArtistActiveEvent.currentAmount}</strong> accumulated during this show.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#161616] border border-red-500/20 rounded-2xl p-6 text-center" id="no-event-card">
                    <HelpCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                    <h4 className="text-lg font-bold text-white mb-1">No Active Event Found</h4>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      In line with safety guidelines, tips can only be accepted when this artist starts a Live Set or triggers an approved Fundraiser project. Come back once they go live!
                    </p>
                  </div>
                )}
              </div>

              {/* Tip Selection & Form */}
              {selectedArtistActiveEvent && (
                <div className="bg-[#161616]/50 rounded-2xl p-6 border border-[#222]" id="tip-form-container">
                  <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-[#F27D26]" /> Send Gifted tip
                  </h3>
                  {detailedProfile?.tipJarMessage && (
                    <p className="text-sm text-gray-400 mb-4 italic">"{detailedProfile.tipJarMessage}"</p>
                  )}

                  <div className="flex flex-col gap-4 mt-6">
                    <stripe-pricing-table 
                      pricing-table-id="prctbl_1Tp71YKEbwiqQxArNGBiQRod"
                      publishable-key="pk_live_51THowuKEbwiqQxArUJlzPJ8048cR5JccpPSR65IksNzHbVLGY3DMTcCdAYNaWjGx1pbedh55RoUo3ddSq1V9awFr001kkOyNaq"
                      client-reference-id={selectedArtist._id}
                    >
                    </stripe-pricing-table>
                    
                    <span className="text-[10px] font-mono text-gray-500 text-center uppercase tracking-widest mt-2 block">
                      Powered by Stripe • Zero platform cuts • 100% direct artist support
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // Artist directory search & filter list
        <div>
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold mb-3">Support Your Artists Directly</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Search and find your favorite DJs, producers, and musicians. Give with zero fee reductions.
            </p>
          </div>

          {/* Search box */}
          <div className="max-w-md mx-auto mb-10 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Search artists by display name or bio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0F0F0F] border border-[#222] rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#F27D26] transition-colors font-medium"
            />
          </div>

          {/* Loading Indicator */}
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F27D26]"></div>
            </div>
          ) : filteredArtists.length === 0 ? (
            <div className="bg-[#0F0F0F] border border-[#222] rounded-3xl p-12 text-center max-w-md mx-auto">
              <p className="text-gray-400">No artists found matching your criteria.</p>
            </div>
          ) : (
            // Grid of Artists
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArtists.map((artist) => {
                const activeEvent = getArtistActiveEvent(artist._id);
                return (
                  <div
                    key={artist._id}
                    onClick={() => onArtistSelect?.(artist._id)}
                    className="bg-[#0F0F0F] hover:bg-[#161616] border border-[#222] hover:border-gray-700/80 rounded-2xl p-6 transition-all duration-300 cursor-pointer flex flex-col group relative overflow-hidden"
                  >
                    {activeEvent && (
                      <div className="absolute top-4 right-4 flex items-center gap-1 bg-[#F27D26] text-white text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                        <Flame className="w-2.5 h-2.5" /> LIVE NOW
                      </div>
                    )}

                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-md overflow-hidden shrink-0 ${artist.avatarUrl ? 'bg-[#050505] border border-[#222]' : 'bg-gradient-to-tr from-[#F27D26] to-[#ea580c]'}`}>
                        {artist.avatarUrl ? (
                          <img src={artist.avatarUrl} alt={artist.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          artist.displayName[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-white group-hover:text-[#F27D26] transition-colors text-lg">{artist.displayName}</h3>
                        <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">
                          Artist Handle
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-400 line-clamp-2 flex-grow mb-5">
                      {artist.bio || "No biography provided yet."}
                    </p>

                    <div className="border-t border-[#222]/60 pt-4 mt-auto">
                      {activeEvent ? (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#F27D26] font-bold flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5" /> {activeEvent.title}
                          </span>
                          <span className="text-gray-400 font-semibold bg-gray-900/80 border border-[#222]/80 px-2 py-1 rounded-md">
                            ${activeEvent.currentAmount}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" /> Offline • Waiting for Live Set
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
