import mongoose from 'mongoose';

const ArtistSchema = new mongoose.Schema({
  // 1. Made optional and added a safe default fallback string
  displayName: { type: String, required: false, default: 'Anonymous Artist' },
  
  // Keep these required so users can still log in securely
  username: { type: String, required: true, unique: true }, 
  password: { type: String, required: true },               
  
  bio: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  tipJarMessage: { type: String, default: '' },
  stripeAccountId: { type: String, default: '' },
  socialLinks: { type: Array, default: [] },
  portfolio: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now },
});

const EventSchema = new mongoose.Schema({
  artistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true },
  
  // 2. Made the event title optional with a generic fallback layout
  title: { type: String, required: false, default: 'Live Event' }, 
  
  type: { type: String, enum: ['live', 'fundraiser'], default: 'live' },
  status: { type: String, enum: ['active', 'ended'], default: 'active' },
  targetAmount: { type: Number, default: 0 },
  currentAmount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const TipSchema = new mongoose.Schema({
  artistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true },
  
  // 3. Changed from true to false so a general tip can be sent without an event active
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: false, default: null }, 
  
  amount: { type: Number, required: true }, // Keep true so payments have a valid dollar amount
  fanName: { type: String, required: false, default: 'Anonymous Fan' }, 
  message: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
});

export const ArtistModel = mongoose.model('Artist', ArtistSchema);
export const EventModel = mongoose.model('Event', EventSchema);
export const TipModel = mongoose.model('Tip', TipSchema);

const RegisteredEventSchema = new mongoose.Schema({
  // Changed from required: true to allow missing user emails
  email: { type: String, required: false, default: 'anonymous@kohartist.com' },
  
  // Changed from required: true to prevent string manipulation crashes in the UI
  eventName: { type: String, required: false, default: 'Untitled Event' },
  
  // Changed from required: true to safe date defaults (defaults to the time of entry)
  startTime: { type: Date, required: false, default: Date.now },
  endTime: { type: Date, required: false, default: Date.now },
  
  // Kept as an empty array default so .map() or .length will never throw an undefined crash
  djs: { type: [String], default: [] },
  
  createdAt: { type: Date, default: Date.now },
});

export const RegisteredEventModel = mongoose.models.RegisteredEvent || mongoose.model('RegisteredEvent', RegisteredEventSchema);
