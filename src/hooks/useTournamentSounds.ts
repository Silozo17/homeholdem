import { useState, useCallback, useRef } from 'react';

interface UseTournamentSoundsOptions {
  enabled?: boolean;
}

// Simple beep sound using Web Audio API
const createBeepSound = (frequency: number, duration: number, volume = 0.5): () => void => {
  return () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      console.error('Failed to play beep sound:', error);
    }
  };
};

// Chime sequence for level changes
const createChimeSequence = (): () => void => {
  return () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 - major chord
      
      notes.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        const startTime = audioContext.currentTime + (index * 0.15);
        gainNode.gain.setValueAtTime(0.4, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.5);
      });
    } catch (error) {
      console.error('Failed to play chime:', error);
    }
  };
};

// Alert sequence for warnings (10 seconds left)
const createAlertSequence = (): () => void => {
  return () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      [0, 0.15, 0.3].forEach((delay) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 880; // A5
        oscillator.type = 'square';
        
        const startTime = audioContext.currentTime + delay;
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.1);
      });
    } catch (error) {
      console.error('Failed to play alert:', error);
    }
  };
};

export type AnnouncementType = 'blinds_up' | 'break_start' | 'break_end' | 'final_table' | 'one_minute' | 'ten_seconds';

const ANNOUNCEMENT_MESSAGES: Record<AnnouncementType, string> = {
  blinds_up: 'Blinds up!',
  break_start: 'Break time. Players, enjoy your break.',
  break_end: 'Break is over. Please return to your seats.',
  final_table: 'Congratulations! We are now at the final table.',
  one_minute: 'One minute remaining in this level.',
  ten_seconds: 'Ten seconds.',
};

export function useTournamentSounds(options: UseTournamentSoundsOptions = {}) {
  const [soundEnabled, setSoundEnabled] = useState(options.enabled ?? true);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastAnnouncementRef = useRef<string>('');

  // Sound effect functions
  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    createChimeSequence()();
  }, [soundEnabled]);

  const playAlert = useCallback(() => {
    if (!soundEnabled) return;
    createAlertSequence()();
  }, [soundEnabled]);

  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    createBeepSound(660, 0.2, 0.4)();
  }, [soundEnabled]);

  // Voice announcement using ElevenLabs TTS
  const playAnnouncement = useCallback(async (type: AnnouncementType) => {
    if (!soundEnabled || isPlaying) return;
    
    const message = ANNOUNCEMENT_MESSAGES[type];
    
    // Prevent duplicate announcements within 2 seconds
    const announcementKey = `${type}-${Date.now()}`;
    if (lastAnnouncementRef.current === type) return;
    lastAnnouncementRef.current = type;
    
    // Play the appropriate sound effect first
    if (type === 'blinds_up' || type === 'break_end') {
      playChime();
    } else if (type === 'ten_seconds') {
      playAlert();
    } else if (type === 'one_minute') {
      playBeep();
    }
    
    // Try to play TTS announcement
    try {
      setIsPlaying(true);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tournament-announce`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ announcement: message }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to get announcement audio');
      }
      
      const data = await response.json();
      
      if (data.audioContent) {
        // Use data URI for base64 audio
        const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          setIsPlaying(false);
          setTimeout(() => {
            lastAnnouncementRef.current = '';
          }, 2000);
        };
        
        audio.onerror = () => {
          setIsPlaying(false);
          lastAnnouncementRef.current = '';
        };
        
        await audio.play();
      }
    } catch (error) {
      console.error('Failed to play announcement:', error);
      setIsPlaying(false);
      setTimeout(() => {
        lastAnnouncementRef.current = '';
      }, 2000);
    }
  }, [soundEnabled, isPlaying, playChime, playAlert, playBeep]);

  // Simple level up sound (for when TTS is not needed)
  const playLevelUp = useCallback(() => {
    if (!soundEnabled) return;
    playChime();
  }, [soundEnabled, playChime]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  return {
    soundEnabled,
    setSoundEnabled,
    toggleSound,
    isPlaying,
    playAnnouncement,
    playLevelUp,
    playChime,
    playAlert,
    playBeep,
  };
}
