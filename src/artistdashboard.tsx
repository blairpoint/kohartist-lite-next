import { useState, useEffect, useRef, FormEvent } from "react";
import { api } from './api';
import { Artist, ArtistPrivate, Event, Tip } from './types';
import { 
  Flame, DollarSign, Edit3, PlusCircle, Settings, LogOut, CheckCircle, Gift, BarChart2, Radio, BellRing, Target, Volume2, ShieldAlert, QrCode, Maximize2, X
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import DetailedProfileEditor from './components/DetailedProfileEditor';
import DatabaseBackupPanel from './components/DatabaseBackupPanel';

interface ArtistDashboardProps {
  user: any;
}

export default function ArtistDashboard({ user }: ArtistDashboardProps) {
  // Database states
  const [profile, setProfile] = useState<Artist | null>(null);
  const [privateSettings, setPrivateSettings] = useState<ArtistPrivate | null>(null);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  
  // UX / view states
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [startingEvent, setStartingEvent] = useState(false);
  const [completingEvent, setCompletingEvent] = useState(false);
  const [isFullscreenQR, setIsFullscreenQR] = useState(false);

  // Profile forms
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Event forms
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventType, setEventType] = useState<'live' | 'fundraiser'>('live');
  const [targetAmount, setTargetAmount] = useState<string>('');

  // Live alert state
  const [activeAlert, setActiveAlert] = useState<Tip | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousTipsLength = useRef<number>(-1);

  // Sound chime helper using Web Audio API
  const playAlertChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, start: number, duration: number, type: OscillatorType = 'sine') => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.frequency.value = freq;
        osc.type = type;
        gainNode.gain.setValueAtTime(0.2, start);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = audioCtx.currentTime;
      // Beautiful notification chime
      playTone(587.33, now, 0.25, 'triangle'); // D5
      playTone(880.00, now + 0.12, 0.4, 'sine'); // A5
    } catch (e) {
      console.warn("Chime Audio failed to play", e);
    }
  };

  // 1. Fetch Profile
  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      try {
        const res = await api.get('/api/me');
        if (mounted) {
          setProfile(res);
          setDisplayName(res.displayName);
          setBio(res.bio || '');
          setAvatarUrl(res.avatarUrl || '');
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setProfile(null);
          setLoading(false);
        }
      }
    };
    fetchProfile();
    return () => { mounted = false; };
  }, [user.uid]);

  // 2. Fetch Events and Tips
  useEffect(() => {
    if (!profile) return;

    // Listen to Events
    let interval: any;
    const fetchEventsAndTips = async () => {
      try {
        const [eventsRes, tipsRes] = await Promise.all([
          api.get('/api/events/' + profile._id),
          api.get('/api/tips/' + profile._id)
        ]);
        const active = eventsRes.filter((e: any) => e.status === 'active');
        const past = eventsRes.filter((e: any) => e.status === 'ended');
        setActiveEvent(active[0] || null);
        setPastEvents(past);
        
        if (previousTipsLength.current !== -1 && tipsRes.length > previousTipsLength.current) {
          const newTip = tipsRes[0];
          setActiveAlert(newTip);
          playAlertChime();
          setTimeout(() => setActiveAlert(null), 5000);
        }
        previousTipsLength.current = tipsRes.length;
        setTips(tipsRes);
      } catch (err) {}
    };
    fetchEventsAndTips();
    interval = setInterval(fetchEventsAndTips, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [profile, user.uid]);

  // References & Profile Handlers
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setAvatarUrl(dataUrl);
      try {
        const res = await api.put('/api/profile', { avatarUrl: dataUrl });
        if (profile) {
          setProfile({ ...profile, avatarUrl: res.avatarUrl });
        }
      } catch (err) {
        console.error("Avatar upload failed:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      alert("Display Name is required.");
      return;
    }
    setCreatingProfile(true);
    try {
      const res = await api.put('/api/profile', {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim()
      });
      setProfile(res);
    } catch (err) {
      console.error("Profile creation failed:", err);
      alert("Failed to complete registration.");
    } finally {
      setCreatingProfile(false);
    }
  };

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      alert("Display Name cannot be empty.");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await api.put('/api/profile', {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim()
      });
      if (profile) {
        setProfile({
          ...profile,
          displayName: res.displayName,
          bio: res.bio,
          avatarUrl: res.avatarUrl
        });
      }
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Profile update failed:", error);
      alert("Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Launch New Live Set/Fundraiser
  const handleStartEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      alert("Event Title is required.");
      return;
    }

    setStartingEvent(true);
    try {
      const eventData: any = {
        title: eventTitle.trim(),
        type: eventType,
        targetAmount: eventType === 'fundraiser' && targetAmount ? parseFloat(targetAmount) : 0
      };
      const res = await api.post('/api/events', eventData);
      setActiveEvent(res);
      setEventTitle('');
      setEventDescription('');
      setTargetAmount('');
    } catch (error) {
      console.error("Starting event failed:", error);
      alert("Failed to activate event.");
    } finally {
      setStartingEvent(false);
    }
  };

  // Stop current live event
  const handleCompleteEvent = async () => {
    if (!activeEvent) return;
    if (!confirm("Are you sure you want to end this performance set? This will deactivate tipping for this set.")) return;

    setCompletingEvent(true);
    try {
      await api.put('/api/events/' + activeEvent._id + '/end', {});
      setActiveEvent(null);
    } catch (error) {
      console.error("Completing event failed:", error);
      alert("Failed to complete event.");
    } finally {
      setCompletingEvent(false);
    }
  };

  // Chart data formatting (Tipping history)
  const getChartData = () => {
    // Group tips by date
    const dateGroups: { [key: string]: number } = {};
    const sortedTips = [...tips].reverse();

    sortedTips.forEach(tip => {
      if (!tip.timestamp) return;
      const date = new Date(tip.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      dateGroups[date] = (dateGroups[date] || 0) + tip.amount;
    });

    return Object.keys(dateGroups).map(date => ({
      date,
      amount: dateGroups[date]
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F27D26]"></div>
      </div>
    );
  }

  // Check if profile exists; if not, force public registration form
  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-[#0F0F0F] border border-[#222] rounded-3xl p-8 md:p-10 shadow-2xl relative">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Claim Your Handle</h2>
            <p className="text-sm text-gray-400">Complete your artist registration to start accepting gifted tips.</p>
          </div>

          <form onSubmit={handleCreateProfile} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase ml-1">Artist / DJ Name</label>
              <input
                type="text"
                required
                placeholder="e.g. DJ Slate, Cosmic Rhythm"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#161616] border border-gray-700/80 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#F27D26] font-semibold"
                maxLength={50}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase ml-1">Bio / Tagline</label>
              <textarea
                placeholder="Describe your sound, live streams, or fundraiser purpose..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-[#161616] border border-gray-700/80 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#F27D26] min-h-[100px] text-sm"
                maxLength={300}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase ml-1">Avatar Profile Image (Optional)</label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="w-full bg-[#161616] border border-gray-700/80 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-[#F27D26] text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#F27D26]/10 file:text-[#F27D26] hover:file:bg-[#F27D26]/20"
                />
                {avatarUrl && (
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-[#222]">
                    <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingProfile}
              className="w-full bg-[#F27D26] hover:bg-[#ea580c] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl mt-2 flex justify-center items-center gap-2 transition-all shadow-[0_0_20px_rgba(242,125,38,0.15)]"
            >
              {creatingProfile ? "REGISTERING..." : "COMPLETE REGISTRATION"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totalEarnings = tips.reduce((sum, t) => sum + t.amount, 0);
  const chartData = getChartData();

  const artistUrl = `https://give.kohartist.com/b/4gM28s7TC0919IKdiYa3u01?artist_id=${user.uid}&prefilled_custom_field%5Bkoha_recipient%5D=${encodeURIComponent(profile.displayName)}`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative">
      {/* Fullscreen QR Code Modal */}
      {isFullscreenQR && (
        <div className="fixed inset-0 bg-[#050505] z-50 flex flex-col items-center justify-center animate-fade-in p-6">
          <button 
            onClick={() => setIsFullscreenQR(false)}
            className="absolute top-8 right-8 text-gray-500 hover:text-white bg-gray-900/50 p-3 rounded-full border border-[#222]"
          >
            <X className="w-8 h-8" />
          </button>
          
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter">
              {profile.displayName}
            </h2>
            <p className="text-xl text-[#F27D26] uppercase font-bold tracking-widest">
              Scan to Tip — Zero Fees
            </p>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_0_100px_rgba(242,125,38,0.2)]">
            <QRCodeSVG 
              value={artistUrl} 
              size={350}
              bgColor={"#ffffff"}
              fgColor={"#050505"}
              level={"H"}
              includeMargin={false}
            />
          </div>
          
          <div className="mt-12 text-gray-500 font-mono text-sm uppercase tracking-widest">
            {artistUrl}
          </div>
        </div>
      )}

      {/* Real-time Toast notification popup for streaming overlays */}
      {activeAlert && (
        <div className="fixed top-24 right-6 bg-[#161616] border border-[#F27D26] text-white rounded-2xl p-5 shadow-[0_0_30px_rgba(242,125,38,0.4)] flex items-center gap-4 z-50 animate-bounce max-w-sm">
          <div className="w-12 h-12 rounded-full bg-[#F27D26]/10 border border-[#F27D26]/20 text-[#F27D26] flex items-center justify-center shrink-0">
            <BellRing className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#F27D26]">NEW LIVE TIP RECEIPT!</span>
            <h4 className="text-lg font-bold">${activeAlert.amount} from {activeAlert.fanName}</h4>
            {activeAlert.message && <p className="text-xs text-gray-400 italic line-clamp-1">"{activeAlert.message}"</p>}
          </div>
        </div>
      )}

      {/* Workspace Header Panel */}
      <div className="bg-[#0F0F0F] border border-[#222] rounded-3xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
          <div 
            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md overflow-hidden cursor-pointer relative group shrink-0 ${profile.avatarUrl ? 'bg-[#050505] border border-[#222]' : 'bg-gradient-to-tr from-[#F27D26] to-[#ea580c]'}`}
            onClick={() => fileInputRef.current?.click()}
            title="Upload Avatar"
          >
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              profile.displayName[0].toUpperCase()
            )}
            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white">Edit</span>
            </div>
          </div>
          <input 
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleAvatarUpload}
          />
          <div>
            <h2 className="text-2xl font-bold text-white">{profile.displayName}</h2>
            <p className="text-sm text-gray-400">Artist ID: <code className="text-xs bg-gray-900 px-2 py-0.5 rounded text-[#F27D26]">{profile._id.substr(0, 8)}...</code></p>
          </div>
        </div>

        {/* Aggregate Stats */}
        <div className="flex items-center gap-6 divide-x divide-gray-800">
          <div className="text-center pl-0">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">Total Received</span>
            <span className="text-2xl font-extrabold text-white">${totalEarnings}</span>
          </div>
          <div className="text-center pl-6">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">Tipping events</span>
            <span className="text-2xl font-extrabold text-[#F27D26]">{pastEvents.length + (activeEvent ? 1 : 0)}</span>
          </div>
          <div className="text-center pl-6">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">Stripe Gateway</span>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full mt-1 inline-block">STABLE ACTIVE</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Controls & Setup */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Active Event Board */}
          {activeEvent ? (
            <div className="bg-[#F27D26]/10 border border-[#F27D26]/20 rounded-3xl p-6 relative overflow-hidden" id="dashboard-active-event">
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-[#F27D26] text-white text-[10px] uppercase font-extrabold px-3 py-1 rounded-full animate-pulse shadow">
                <Radio className="w-3 h-3 animate-spin" /> LIVE BROADCAST
              </div>

              <span className="text-xs text-[#F27D26] uppercase font-bold tracking-wider mb-1 block">
                {activeEvent.type === 'live' ? 'Live Stream Performance Set' : 'Music Fundraiser Goal'}
              </span>
              <h3 className="text-2xl font-extrabold text-white mb-2">{activeEvent.title}</h3>
              {activeEvent.description && <p className="text-sm text-gray-300 mb-6 max-w-xl">{activeEvent.description}</p>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center bg-gray-900/60 p-5 rounded-2xl border border-[#222]/60 mb-6">
                <div>
                  <span className="text-xs text-gray-400 block mb-1 uppercase tracking-wider font-mono">Current Tip Pool</span>
                  <div className="flex items-center text-4xl font-extrabold text-white">
                    <DollarSign className="w-7 h-7 text-[#F27D26]" />
                    <span>{activeEvent.currentAmount}</span>
                  </div>
                </div>

                {activeEvent.type === 'fundraiser' && activeEvent.targetAmount && (
                  <div>
                    <span className="text-xs text-gray-400 block mb-1 uppercase tracking-wider font-mono">Fundraiser Target</span>
                    <div className="flex items-center text-2xl font-bold text-gray-300">
                      <span>${activeEvent.targetAmount}</span>
                    </div>
                  </div>
                )}
              </div>

              {activeEvent.type === 'fundraiser' && activeEvent.targetAmount && (
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-semibold">
                    <span>Goal Completion</span>
                    <span>{Math.round((activeEvent.currentAmount / activeEvent.targetAmount) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-950 rounded-full h-3 overflow-hidden border border-[#222]">
                    <div 
                      className="bg-gradient-to-r from-[#F27D26] to-[#F27D26] h-3 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (activeEvent.currentAmount / activeEvent.targetAmount) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* QR / Tip link generator */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#222]/50 pt-5">
                <p className="text-xs text-gray-400 leading-relaxed max-w-md">
                  Keep this window open! Fans will visit your page to send tips. Any sent tip will play a chime sound and flash instantly here.
                </p>
                <button
                  onClick={handleCompleteEvent}
                  disabled={completingEvent}
                  className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm shrink-0 flex items-center gap-1.5 shadow"
                  id="dashboard-btn-stop-set"
                >
                  <CheckCircle className="w-4 h-4" />
                  {completingEvent ? "COMPLETING SET..." : "COMPLETE LIVE SET"}
                </button>
              </div>
            </div>
          ) : (
            // Form to launch new tipping event
            <div className="bg-[#0F0F0F] border border-[#222] rounded-3xl p-6 md:p-8" id="dashboard-setup-event">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#F27D26]" /> Start Live Performance / Fundraiser
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                To accept tips, you must declare an active live event set. Fans cannot tip if you are offline.
              </p>

              <form onSubmit={handleStartEvent} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase ml-1">Event / Stream Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Live DJ Sunset Set @ Club Neon"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      className="w-full bg-[#161616] border border-[#222] rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#F27D26] font-semibold"
                      maxLength={100}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase ml-1">Event Type</label>
                    <select
                      value={eventType}
                      onChange={(e: any) => setEventType(e.target.value)}
                      className="w-full bg-[#161616] border border-[#222] rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#F27D26] font-semibold h-[48px]"
                    >
                      <option value="live">Live Show performance</option>
                      <option value="fundraiser">Special Fundraiser Project</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase ml-1">Set Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="Tell fans what they are tuning into, or what charity this fundraiser is backing..."
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    className="w-full bg-[#161616] border border-[#222] rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#F27D26] text-sm"
                    maxLength={500}
                  />
                </div>

                {eventType === 'fundraiser' && (
                  <div className="flex flex-col gap-1.5 animate-fade-in">
                    <label className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase ml-1">Target Amount Goal (USD)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <input
                        type="number"
                        placeholder="e.g. 500"
                        value={targetAmount}
                        onChange={(e) => setTargetAmount(e.target.value)}
                        className="w-full bg-[#161616] border border-[#222] rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#F27D26] font-semibold"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={startingEvent}
                  className="w-full bg-[#F27D26] hover:bg-[#ff8c3a] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl mt-2 flex justify-center items-center gap-2 transition-all shadow-[0_0_20px_rgba(242,125,38,0.15)]"
                  id="dashboard-btn-start-event"
                >
                  <Radio className="w-4 h-4" />
                  {startingEvent ? "INITIATING LIVE BROADCAST..." : "ACTIVATE FEE-LESS TIPPING SET"}
                </button>
              </form>
            </div>
          )}

          {/* Tips Performance Chart */}
          {tips.length > 0 && (
            <div className="bg-[#0F0F0F] border border-[#222] rounded-3xl p-6 md:p-8" id="dashboard-charts">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-[#F27D26]" /> Tipping Analytics
              </h3>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F27D26" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#F27D26" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #374151', borderRadius: '12px', color: '#fff' }} />
                    <Area type="monotone" dataKey="amount" stroke="#F27D26" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" name="Tips Volume ($)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Settings, Live alerts & Tip Ledger */}
        <div className="flex flex-col gap-8">
          
          {/* Tip QR Code Card */}
          <div className="bg-[#0F0F0F] border border-[#222] rounded-3xl p-6 flex flex-col items-center text-center relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#F27D26]/10 blur-[50px] rounded-full pointer-events-none"></div>
            
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#F27D26]" /> 
              Your Tipping Code
            </h3>
            <p className="text-xs text-gray-400 mb-6 max-w-[200px]">
              Fans can scan this during your sets to send tips directly.
            </p>

            <div className="bg-white p-3 rounded-2xl mb-4 relative cursor-pointer" onClick={() => setIsFullscreenQR(true)}>
              <QRCodeSVG 
                value={artistUrl} 
                size={140}
                bgColor={"#ffffff"}
                fgColor={"#050505"}
                level={"H"}
                includeMargin={false}
              />
              <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="w-8 h-8 text-white" />
              </div>
            </div>

            <button 
              onClick={() => setIsFullscreenQR(true)}
              className="w-full py-2.5 bg-[#161616] hover:bg-[#222] border border-[#222] rounded-xl text-sm font-bold text-white transition-colors"
            >
              FULLSCREEN DISPLAY
            </button>
          </div>

          {/* Audio Chime controls */}
          <div className="bg-[#0F0F0F] border border-[#222] rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-5 h-5 text-[#F27D26] animate-pulse" />
              <div>
                <h4 className="text-sm font-semibold text-white">Live Audio Chime</h4>
                <p className="text-[10px] text-gray-500">Play tone when fans send tips</p>
              </div>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                soundEnabled 
                  ? 'bg-[#F27D26]/10 border-[#F27D26]/20 text-[#F27D26]' 
                  : 'bg-gray-900 border-[#222] text-gray-500'
              }`}
            >
              {soundEnabled ? "ENABLED" : "MUTED"}
            </button>
          </div>

          {/* Profile settings panel */}
          <div className="bg-[#0F0F0F] border border-[#222] rounded-3xl p-6" id="dashboard-profile-settings">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#F27D26]" /> Public Profile Settings
            </h3>
            
            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 tracking-wider">Display Handle</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-[#161616] border border-[#222] rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-[#F27D26] font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 tracking-wider">Avatar image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="bg-[#161616] border border-[#222] rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#F27D26] file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#F27D26]/10 file:text-[#F27D26] hover:file:bg-[#F27D26]/20"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 tracking-wider">Biography / Tagline</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="bg-[#161616] border border-[#222] rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#F27D26] min-h-[80px]"
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="bg-[#F27D26]/10 border border-[#F27D26]/20 text-[#F27D26] hover:bg-[#F27D26] hover:text-white font-bold py-2 px-4 rounded-xl text-xs transition-all mt-1"
              >
                {savingProfile ? "SAVING CHANGES..." : "SAVE CHANGES"}
              </button>
            </form>
          </div>

          <DetailedProfileEditor user={user} />

          <DatabaseBackupPanel />

          {/* Tipping Ledger list */}
          <div className="bg-[#0F0F0F] border border-[#222] rounded-3xl p-6 flex-grow flex flex-col" id="dashboard-ledger">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 shrink-0">
              <Gift className="w-4 h-4 text-[#F27D26]" /> Tipping Ledger feed
            </h3>

            {tips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#222] rounded-2xl flex-grow">
                <Gift className="w-8 h-8 text-gray-700 mb-2" />
                <p className="text-xs text-gray-500">No tips received yet.</p>
                <p className="text-[10px] text-gray-600 max-w-[150px] mt-1">Start a Live Set and share your link with fans!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
                {tips.map((tip) => (
                  <div key={tip._id} className="bg-gray-900/50 border border-[#222]/60 rounded-xl p-3.5 flex gap-3 items-start hover:border-[#222] transition-colors">
                    <div className="bg-[#F27D26]/10 border border-[#F27D26]/20 text-[#F27D26] font-mono text-xs font-bold px-2 py-1 rounded">
                      ${tip.amount}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{tip.fanName}</h4>
                      {tip.message && <p className="text-[11px] text-gray-400 mt-0.5 italic line-clamp-2">"{tip.message}"</p>}
                      <span className="text-[9px] font-mono text-gray-600 block mt-1">
                        {tip.timestamp ? new Date(tip.timestamp).toLocaleTimeString() : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
