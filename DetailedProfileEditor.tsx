import { api } from '../api';

import { useState, useEffect, FormEvent } from 'react';
import { Settings, Save, Plus, Trash2 } from 'lucide-react';

interface DetailedProfile {
  biography: string;
  portfolio: { type: 'image' | 'video'; url: string; title?: string }[];
  socialLinks: { platform: string; url: string }[];
  tipJarMessage: string;
}

export default function DetailedProfileEditor({ user }: { user: any }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<DetailedProfile>({
    biography: '',
    portfolio: [],
    socialLinks: [],
    tipJarMessage: 'Thank you for supporting my art!',
  });

  useEffect(() => {
    // Derive the detailed profile fields from the `user` prop instead of
    // fetching them from /api/me (that endpoint is disabled).
    setProfile({
      biography: user?.biography || user?.bio || '',
      portfolio: user?.portfolio || [],
      socialLinks: user?.socialLinks || [],
      tipJarMessage: user?.tipJarMessage || 'Thank you for supporting my art!'
    });
    setLoading(false);
  }, [user]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/api/profile', profile);
      alert('Detailed profile saved successfully!');
    } catch (err) {
      console.error('Failed to save detailed profile:', err);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addSocialLink = () => {
    setProfile(p => ({ ...p, socialLinks: [...p.socialLinks, { platform: 'Website', url: '' }] }));
  };

  const addPortfolioItem = () => {
    setProfile(p => ({ ...p, portfolio: [...p.portfolio, { type: 'image', url: '', title: '' }] }));
  };

  if (loading) {
    return <div className="text-gray-500 text-sm animate-pulse p-6">Loading detailed profile...</div>;
  }

  return (
    <div className="bg-[#0F0F0F] border border-[#222] rounded-3xl p-6 mt-6">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <Settings className="w-5 h-5 text-[#F27D26]" />
        Detailed Profile Page Setup
      </h3>
      
      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Biography</label>
          <textarea
            value={profile.biography}
            onChange={e => setProfile(p => ({ ...p, biography: e.target.value }))}
            className="bg-[#161616] border border-[#222] rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#F27D26] min-h-[100px] leading-relaxed"
            placeholder="Tell your fans about yourself, your art, and your journey..."
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Custom Tip Jar Message</label>
          <input
            type="text"
            value={profile.tipJarMessage}
            onChange={e => setProfile(p => ({ ...p, tipJarMessage: e.target.value }))}
            className="bg-[#161616] border border-[#222] rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#F27D26]"
            placeholder="Thank you for supporting my art!"
          />
        </div>

        <div className="border-t border-[#222] pt-6">
          <div className="flex justify-between items-center mb-4">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Social Links</label>
            <button type="button" onClick={addSocialLink} className="text-xs text-[#F27D26] hover:text-[#ff8c3a] flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Link
            </button>
          </div>
          
          <div className="flex flex-col gap-3">
            {profile.socialLinks.map((link, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={link.platform}
                  onChange={e => {
                    const newLinks = [...profile.socialLinks];
                    newLinks[i].platform = e.target.value;
                    setProfile(p => ({ ...p, socialLinks: newLinks }));
                  }}
                  className="bg-[#161616] border border-[#222] rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-[#F27D26] w-1/3"
                  placeholder="Platform (e.g. Instagram)"
                />
                <input
                  type="url"
                  value={link.url}
                  onChange={e => {
                    const newLinks = [...profile.socialLinks];
                    newLinks[i].url = e.target.value;
                    setProfile(p => ({ ...p, socialLinks: newLinks }));
                  }}
                  className="bg-[#161616] border border-[#222] rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-[#F27D26] flex-grow"
                  placeholder="https://..."
                />
                <button type="button" onClick={() => {
                  const newLinks = profile.socialLinks.filter((_, idx) => idx !== i);
                  setProfile(p => ({ ...p, socialLinks: newLinks }));
                }} className="text-gray-500 hover:text-red-400 p-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {profile.socialLinks.length === 0 && (
              <p className="text-xs text-gray-500 italic">No social links added yet.</p>
            )}
          </div>
        </div>

        <div className="border-t border-[#222] pt-6">
          <div className="flex justify-between items-center mb-4">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Portfolio Items</label>
            <button type="button" onClick={addPortfolioItem} className="text-xs text-[#F27D26] hover:text-[#ff8c3a] flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Item
            </button>
          </div>
          
          <div className="flex flex-col gap-4">
            {profile.portfolio.map((item, i) => (
              <div key={i} className="bg-[#111] border border-[#222] rounded-xl p-4 flex flex-col gap-3 relative">
                <button type="button" onClick={() => {
                  const newPortfolio = profile.portfolio.filter((_, idx) => idx !== i);
                  setProfile(p => ({ ...p, portfolio: newPortfolio }));
                }} className="absolute top-3 right-3 text-gray-500 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <div className="flex gap-4 items-center">
                  <select
                    value={item.type}
                    onChange={e => {
                      const newPortfolio = [...profile.portfolio];
                      newPortfolio[i].type = e.target.value as 'image' | 'video';
                      setProfile(p => ({ ...p, portfolio: newPortfolio }));
                    }}
                    className="bg-[#161616] border border-[#222] rounded-lg py-1.5 px-2 text-xs text-gray-400 focus:outline-none"
                  >
                    <option value="image">Image (URL)</option>
                    <option value="video">Video (URL)</option>
                  </select>
                </div>
                
                <input
                  type="text"
                  value={item.title || ''}
                  onChange={e => {
                    const newPortfolio = [...profile.portfolio];
                    newPortfolio[i].title = e.target.value;
                    setProfile(p => ({ ...p, portfolio: newPortfolio }));
                  }}
                  className="bg-[#161616] border border-[#222] rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-[#F27D26]"
                  placeholder="Title / Description (optional)"
                />
                
                <input
                  type="url"
                  value={item.url}
                  onChange={e => {
                    const newPortfolio = [...profile.portfolio];
                    newPortfolio[i].url = e.target.value;
                    setProfile(p => ({ ...p, portfolio: newPortfolio }));
                  }}
                  className="bg-[#161616] border border-[#222] rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-[#F27D26]"
                  placeholder="https://... (direct media link)"
                />
              </div>
            ))}
            {profile.portfolio.length === 0 && (
              <p className="text-xs text-gray-500 italic">No portfolio items added yet.</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-[#F27D26] hover:bg-[#ff8c3a] text-[#050505] font-bold py-3 rounded-xl flex items-center justify-center gap-2 mt-2 transition-all"
        >
          {saving ? (
             <span className="w-5 h-5 border-2 border-t-[#050505] border-transparent rounded-full animate-spin"></span>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Detailed Profile
            </>
          )}
        </button>
      </form>
    </div>
  );
}
