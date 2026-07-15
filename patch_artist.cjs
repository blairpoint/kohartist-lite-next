const fs = require('fs');
let code = fs.readFileSync('src/artistdashboard.tsx', 'utf8');

// Replace imports
code = code.replace(/import { db, handleFirestoreError.*?} from '\.\/lib\/firebase';/g, '');
code = code.replace(/import { User } from 'firebase\/auth';/g, '');
code = code.replace(/import {[\s\S]*?} from 'firebase\/firestore';/g, "import { api } from './api';");
code = code.replace(/user: User/g, 'user: any');

// Replace useEffect for profile/private (lines 80-114)
code = code.replace(/\/\/ 1\. Fetch \/ listen to Artist Profile[\s\S]*?\/\/ 2\. Fetch \/ listen to Events and Tips/, `// 1. Fetch Profile
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

  // 2. Fetch Events and Tips`);

// Replace handleCreateProfile (it's not used, since they create it during register)
code = code.replace(/\/\/ Create profile handler[\s\S]*?\/\/ Update profile handler/g, `// Create profile handler
  const handleCreateProfile = async (e: FormEvent) => {};
  
  // Update profile handler`);

// Replace handleUpdateProfile
code = code.replace(/\/\/ Update profile handler[\s\S]*?const fileInputRef/g, `// Update profile handler
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

  const fileInputRef`);

// Replace image upload
code = code.replace(/const artistRef = doc\(db, 'artists', user\.uid\);[\s\S]*?await updateDoc\(artistRef, { avatarUrl: dataUrl }\);/g, `await api.put('/api/profile', { avatarUrl: dataUrl });`);

// Replace event listener (lines ~120)
code = code.replace(/\/\/ Listen to Events[\s\S]*?handleStartEvent = /g, `// Listen to Events
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

  // Create profile handler
  const handleStartEvent = `);

// Replace handleStartEvent
code = code.replace(/\/\/ Launch New Live Set\/Fundraiser[\s\S]*?\/\/ Stop current live event/, `// Launch New Live Set/Fundraiser
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

  // Stop current live event`);

// Replace handleCompleteEvent
code = code.replace(/\/\/ Stop current live event[\s\S]*?\/\/ Chart data formatting/, `// Stop current live event
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

  // Chart data formatting`);

// Replace chart date parsing
code = code.replace(/new Date\(tip\.timestamp\.seconds \* 1000\)/g, "new Date(tip.timestamp)");

// Replace ID properties
code = code.replace(/profile\.id/g, "profile._id");
code = code.replace(/tip\.id/g, "tip._id");
code = code.replace(/activeEvent\.id/g, "activeEvent._id");
code = code.replace(/event\.id/g, "event._id");

fs.writeFileSync('src/artistdashboard.tsx', code);
