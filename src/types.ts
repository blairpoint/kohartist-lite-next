export interface Artist {
  _id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  tipJarMessage?: string;
  stripeAccountId?: string;
  socialLinks?: { platform: string; url: string }[];
  portfolio?: { type: 'image' | 'video'; url: string; title?: string }[];
}

export interface ArtistPrivate {
  username?: string;
}

export interface Event {
  _id: string;
  artistId: string;
  title: string;
  type: 'live' | 'fundraiser';
  status: 'active' | 'ended';
  currentAmount: number;
  targetAmount: number;
  createdAt: string;
}

export interface Tip {
  _id: string;
  artistId: string;
  eventId?: string;
  amount: number;
  fanName: string;
  message?: string;
  timestamp: string;
}
