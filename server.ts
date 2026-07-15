import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { ArtistModel, EventModel, TipModel } from './src/db/models.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-kohartist-key';

async function connectDB() {
  const mongoUri = process.env.MONGO_URI;
  if (mongoUri) {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB:', mongoUri);
  } else {
    console.log('No MONGO_URI provided. Starting in-memory MongoDB for development...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log('Connected to In-Memory MongoDB:', uri);
  }
}

async function startServer() {
  await connectDB();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // Auth Middleware
  const requireAuth = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Auth API
  app.post('/api/register', async (req, res) => {
    try {
      const { username, password, displayName } = req.body;
      const existing = await ArtistModel.findOne({ username });
      if (existing) return res.status(400).json({ error: 'Username already taken' });
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const artist = new ArtistModel({ username, password: hashedPassword, displayName, stripeAccountId: `acct_${Math.random().toString(36).substr(2, 9)}` });
      await artist.save();
      
      const token = jwt.sign({ id: artist._id }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' }).json({ success: true, artist: { id: artist._id, displayName: artist.displayName } });
    } catch (err) {
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const artist = await ArtistModel.findOne({ username });
      if (!artist) return res.status(404).json({ error: 'Artist not found' });
      
      const valid = await bcrypt.compare(password, artist.password);
      if (!valid) return res.status(401).json({ error: 'Invalid password' });
      
      const token = jwt.sign({ id: artist._id }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' }).json({ success: true, artist: { id: artist._id, displayName: artist.displayName } });
    } catch (err) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/logout', (req, res) => {
    res.clearCookie('token').json({ success: true });
  });

  app.get('/api/me', requireAuth, async (req: any, res) => {
    try {
      const artist = await ArtistModel.findById(req.user.id).select('-password');
      if (!artist) return res.status(404).json({ error: 'Not found' });
      res.json(artist);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put('/api/profile', requireAuth, async (req: any, res) => {
    try {
      const { displayName, bio, avatarUrl, socialLinks, portfolio, tipJarMessage } = req.body;
      const updateData: any = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (bio !== undefined) updateData.bio = bio;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
      if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
      if (portfolio !== undefined) updateData.portfolio = portfolio;
      if (tipJarMessage !== undefined) updateData.tipJarMessage = tipJarMessage;

      const artist = await ArtistModel.findByIdAndUpdate(req.user.id, updateData, { new: true }).select('-password');
      res.json(artist);
    } catch (err) {
      res.status(500).json({ error: 'Update failed' });
    }
  });

  // Artist public info
  app.get('/api/artists', async (req, res) => {
    try {
      const artists = await ArtistModel.find().select('-password');
      res.json(artists);
    } catch (err) {
      res.status(500).json({ error: 'Fetch failed' });
    }
  });

  app.get('/api/artists/:id', async (req, res) => {
    try {
      const artist = await ArtistModel.findById(req.params.id).select('-password');
      if (!artist) return res.status(404).json({ error: 'Not found' });
      res.json(artist);
    } catch (err) {
      res.status(500).json({ error: 'Fetch failed' });
    }
  });

  // Events API
  app.get('/api/events', async (req, res) => {
    try {
      const events = await EventModel.find();
      res.json(events);
    } catch (err) {
      res.status(500).json({ error: 'Fetch failed' });
    }
  });

  app.get('/api/events/:artistId', async (req, res) => {
    try {
      const events = await EventModel.find({ artistId: req.params.artistId });
      res.json(events);
    } catch (err) {
      res.status(500).json({ error: 'Fetch failed' });
    }
  });

  app.post('/api/events', requireAuth, async (req: any, res) => {
    try {
      const { title, type, targetAmount } = req.body;
      const event = new EventModel({ artistId: req.user.id, title, type, targetAmount });
      await event.save();
      res.json(event);
    } catch (err) {
      res.status(500).json({ error: 'Create failed' });
    }
  });

  app.put('/api/events/:id/end', requireAuth, async (req: any, res) => {
    try {
      const event = await EventModel.findOneAndUpdate({ _id: req.params.id, artistId: req.user.id }, { status: 'ended' }, { new: true });
      res.json(event);
    } catch (err) {
      res.status(500).json({ error: 'Update failed' });
    }
  });

  // Tips API
  app.get('/api/tips/:artistId', async (req, res) => {
    try {
      const tips = await TipModel.find({ artistId: req.params.artistId }).sort({ timestamp: -1 });
      res.json(tips);
    } catch (err) {
      res.status(500).json({ error: 'Fetch failed' });
    }
  });

  app.post('/api/tips', async (req, res) => {
    try {
      const { artistId, eventId, amount, fanName, message } = req.body;
      const tip = new TipModel({ artistId, eventId, amount, fanName, message });
      await tip.save();
      
      // Update event currentAmount
      if (eventId) {
        await EventModel.findByIdAndUpdate(eventId, { $inc: { currentAmount: amount } });
      }
      
      res.json(tip);
    } catch (err) {
      res.status(500).json({ error: 'Tip failed' });
    }
  });

  // Database Backup / JSON Export & Import API for easy migration to hosted MongoDB
  app.get('/api/admin/export', async (req, res) => {
    try {
      const artists = await ArtistModel.find();
      const events = await EventModel.find();
      const tips = await TipModel.find();
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=kohartist_backup.json');
      res.json({
        exportDate: new Date().toISOString(),
        platform: "Kohartist",
        version: "2.0",
        collections: {
          artists,
          events,
          tips
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Export failed: ' + err.message });
    }
  });

  app.post('/api/admin/import', async (req, res) => {
    try {
      const { collections } = req.body;
      if (!collections) {
        return res.status(400).json({ error: 'Invalid backup format. Missing "collections" field.' });
      }

      const { artists, events, tips } = collections;
      let artistsImported = 0;
      let eventsImported = 0;
      let tipsImported = 0;

      if (Array.isArray(artists)) {
        for (const art of artists) {
          if (art._id) {
            await ArtistModel.findByIdAndUpdate(art._id, art, { upsert: true, new: true });
            artistsImported++;
          }
        }
      }

      if (Array.isArray(events)) {
        for (const ev of events) {
          if (ev._id) {
            await EventModel.findByIdAndUpdate(ev._id, ev, { upsert: true, new: true });
            eventsImported++;
          }
        }
      }

      if (Array.isArray(tips)) {
        for (const tp of tips) {
          if (tp._id) {
            await TipModel.findByIdAndUpdate(tp._id, tp, { upsert: true, new: true });
            tipsImported++;
          }
        }
      }

      res.json({
        success: true,
        message: 'Database import completed successfully.',
        summary: {
          artists: artistsImported,
          events: eventsImported,
          tips: tipsImported
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Import failed: ' + err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
