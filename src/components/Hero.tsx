import { useState, FormEvent } from 'react';
import { ArrowRight, Flame, ShieldAlert } from 'lucide-react';

interface HeroProps {
  onStartRegistration: (email: string) => void;
  activeEventsCount: number;
}

export default function Hero({ onStartRegistration, activeEventsCount }: HeroProps) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      alert('Please enter a valid email address to start registration.');
      return;
    }
    onStartRegistration(email.trim());
  };

  return (
    <div className="relative py-12 md:py-16 overflow-hidden">
      {/* Visual Ambient Blur */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-[#F27D26] opacity-[0.04] blur-[120px] rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto px-4">
        <div className="flex flex-col text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F27D26]/10 border border-[#F27D26]/20 mb-6 w-fit mx-auto lg:mx-0">
            <div className="w-1.5 h-1.5 bg-[#F27D26] rounded-full shadow-[0_0_8px_#F27D26]"></div>
            <span className="text-[10px] font-bold text-[#F27D26] uppercase tracking-[0.1em]">Now Live: No Platform Fees</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-light tracking-tight leading-[1.05] mb-6">
            Keep every <span className="italic font-serif">cent</span>.<br />
            <span className="font-bold">Zero fees.</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-lg mx-auto lg:mx-0 mb-10">
            The direct payment network for creators. We cover banking costs so you receive exactly what your fans give. No cuts, no hidden math.
          </p>

          <div className="bg-[#111] border-l-2 border-[#F27D26] p-5 rounded-r-xl flex gap-4 items-start max-w-md mx-auto lg:mx-0 text-left">
            <div className="mt-0.5 text-[#F27D26] shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-200 uppercase tracking-wider mb-1">Live Eligibility Only</h4>
              <p className="text-sm text-gray-500 leading-snug italic">
                Donations are active only during verified live performances or registered charity events.
              </p>
            </div>
          </div>

          {activeEventsCount > 0 && (
            <div className="inline-flex items-center gap-2 text-sm text-gray-300 font-medium justify-center lg:justify-start mt-6">
              <Flame className="w-4 h-4 text-[#F27D26] animate-bounce" />
              There are <span className="text-white font-bold underline decoration-[#F27D26] decoration-2">{activeEventsCount} active events</span> happening live right now!
            </div>
          )}
        </div>

        {/* Action card for fast sign-up */}
        <div className="w-full max-w-md mx-auto lg:mr-0 lg:ml-auto">
          <div className="bg-[#0F0F0F] border border-[#222] rounded-[32px] p-8 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-[#F27D26]/5 blur-[60px] rounded-full"></div>
            
            <div className="text-center mb-8 relative z-10">
              <h2 className="text-2xl font-bold mb-2">Artist Workspace</h2>
              <p className="text-sm text-gray-500">Secure your handle and start accepting direct tips.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
              <div className="bg-[#161616] rounded-2xl p-4 border border-[#222]">
                <div className="flex justify-between items-center text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">
                  <span>Traditional Apps</span>
                  <span>Kohartist</span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-red-400 font-medium">Keep 85% to 90%</span>
                  <span className="text-emerald-400 font-bold">Keep 100% Guaranteed</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase ml-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#161616] border border-[#222] rounded-xl py-3.5 px-4 text-white focus:outline-none focus:border-[#F27D26] font-semibold text-sm w-full"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#F27D26] hover:bg-[#ff8c3a] text-[#050505] font-bold py-4 rounded-2xl flex justify-center items-center gap-2 transition-all shadow-lg hover:shadow-[#F27D26]/20 cursor-pointer"
                id="hero-btn-proceed"
              >
                START REGISTRATION
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
