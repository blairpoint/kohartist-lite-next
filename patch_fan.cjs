const fs = require('fs');
let code = fs.readFileSync('src/fanportal.tsx', 'utf8');

// Replace imports
code = code.replace(/import { db.*?} from '\.\/lib\/firebase';/g, "import { api } from './api';");
code = code.replace(/import {[\s\S]*?} from 'firebase\/firestore';/g, '');

// Fix id references
code = code.replace(/selectedArtist\.id/g, 'selectedArtist._id');
code = code.replace(/artist\.id/g, 'artist._id');
code = code.replace(/event\.id/g, 'event._id');
code = code.replace(/eventId: activeEvent\.id/g, 'eventId: activeEvent._id');
code = code.replace(/artistId: selectedArtist\.id/g, 'artistId: selectedArtist._id');

// Replace data fetching
code = code.replace(/const fetchArtists = async \(\) => {[\s\S]*?fetchArtists\(\);/g, `const fetchArtists = async () => {
      try {
        const res = await api.get('/api/artists');
        setArtists(res);
      } catch (err) {}
    };
    fetchArtists();`);

code = code.replace(/const fetchEvents = async \(\) => {[\s\S]*?fetchEvents\(\);/g, `const fetchEvents = async () => {
      try {
        const res = await api.get('/api/events');
        setEvents(res);
      } catch (err) {}
    };
    fetchEvents();`);

// Replace tip creation
code = code.replace(/const tipData = {[\s\S]*?await addDoc\(collection\(db, 'tips'\), tipData\);/g, `const tipData = {
        artistId: selectedArtist._id,
        eventId: activeEvent ? activeEvent._id : null,
        amount: Number(selectedAmount),
        fanName: fanName.trim(),
        message: fanMessage.trim()
      };
      await api.post('/api/tips', tipData);`);

fs.writeFileSync('src/fanportal.tsx', code);
