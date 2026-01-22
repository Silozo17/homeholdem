import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlindLevel {
  id: string;
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration_minutes: number;
  is_break: boolean;
}

interface GameSession {
  id: string;
  status: string;
  current_level: number;
  level_started_at: string | null;
  time_remaining_seconds: number | null;
}

interface TournamentClockProps {
  session: GameSession;
  blindStructure: BlindLevel[];
  isAdmin: boolean;
  onUpdate: (updates: Partial<GameSession>) => void;
  tvMode?: boolean;
}

export function TournamentClock({ 
  session, 
  blindStructure, 
  isAdmin, 
  onUpdate,
  tvMode = false 
}: TournamentClockProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentLevel = blindStructure.find(b => b.level === session.current_level);
  const nextLevel = blindStructure.find(b => b.level === session.current_level + 1);

  // Initialize timer
  useEffect(() => {
    if (session.time_remaining_seconds !== null) {
      setTimeRemaining(session.time_remaining_seconds);
    } else if (currentLevel) {
      setTimeRemaining(currentLevel.duration_minutes * 60);
    }
  }, [session.current_level, session.time_remaining_seconds, currentLevel]);

  // Timer countdown
  useEffect(() => {
    if (session.status === 'active') {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Level complete
            handleLevelComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session.status]);

  // Sync time to server periodically
  useEffect(() => {
    if (session.status === 'active' && isAdmin) {
      const syncInterval = setInterval(() => {
        onUpdate({ time_remaining_seconds: timeRemaining });
      }, 10000); // Sync every 10 seconds

      return () => clearInterval(syncInterval);
    }
  }, [session.status, isAdmin, timeRemaining, onUpdate]);

  const handleLevelComplete = useCallback(() => {
    if (soundEnabled) {
      playSound();
    }
    
    if (nextLevel && isAdmin) {
      onUpdate({
        current_level: nextLevel.level,
        time_remaining_seconds: nextLevel.duration_minutes * 60,
        level_started_at: new Date().toISOString(),
      });
    }
  }, [soundEnabled, nextLevel, isAdmin, onUpdate]);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const handlePlayPause = () => {
    if (session.status === 'active') {
      onUpdate({ 
        status: 'paused',
        time_remaining_seconds: timeRemaining 
      });
    } else {
      onUpdate({ 
        status: 'active',
        level_started_at: new Date().toISOString()
      });
    }
  };

  const handlePrevLevel = () => {
    if (session.current_level > 1) {
      const prevLevel = blindStructure.find(b => b.level === session.current_level - 1);
      if (prevLevel) {
        onUpdate({
          current_level: prevLevel.level,
          time_remaining_seconds: prevLevel.duration_minutes * 60,
        });
      }
    }
  };

  const handleNextLevel = () => {
    if (nextLevel) {
      onUpdate({
        current_level: nextLevel.level,
        time_remaining_seconds: nextLevel.duration_minutes * 60,
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemaining <= 60;
  const isVeryLowTime = timeRemaining <= 10;

  if (!currentLevel) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-8 text-center text-muted-foreground">
          No blind structure configured
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Hidden audio element for alerts */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2AgIB9d3B9g4OHiYeFfXZydoGGhoaHhH96dn2Eg4SGhoaEf3x4fYGChIWFhYSBfnt8gIGChISEhIOAfnx8gIGCg4OEg4KAfnx8gIGCg4OEg4KAfnx8gIGCg4OEg4J/fXx8gIGCg4ODg4F/fXt8gIGCg4ODg4F/fXt8gIGCg4ODgoF/fXt8" type="audio/wav" />
      </audio>

      <Card className={cn(
        "border-border/50 overflow-hidden transition-colors",
        currentLevel.is_break ? "bg-yellow-900/20" : "bg-card/50",
        tvMode && "bg-transparent border-0"
      )}>
        <CardContent className={cn(
          "py-6",
          tvMode && "py-12"
        )}>
          {/* Level indicator */}
          <div className={cn(
            "text-center mb-4",
            tvMode && "mb-8"
          )}>
            <div className={cn(
              "text-sm text-muted-foreground uppercase tracking-wide",
              tvMode && "text-xl"
            )}>
              {currentLevel.is_break ? 'Break' : `Level ${currentLevel.level}`}
            </div>
          </div>

          {/* Blinds display */}
          {!currentLevel.is_break && (
            <div className={cn(
              "text-center mb-4",
              tvMode && "mb-8"
            )}>
              <div className={cn(
                "text-3xl font-bold text-gold-gradient",
                tvMode && "text-7xl"
              )}>
                {currentLevel.small_blind.toLocaleString()} / {currentLevel.big_blind.toLocaleString()}
              </div>
              {currentLevel.ante > 0 && (
                <div className={cn(
                  "text-lg text-muted-foreground mt-1",
                  tvMode && "text-3xl mt-2"
                )}>
                  Ante: {currentLevel.ante.toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* Timer */}
          <div className={cn(
            "text-center mb-6",
            tvMode && "mb-12"
          )}>
            <div className={cn(
              "font-mono font-bold transition-colors",
              tvMode ? "text-[12rem] leading-none" : "text-6xl",
              isVeryLowTime && "text-destructive animate-pulse",
              isLowTime && !isVeryLowTime && "text-yellow-500"
            )}>
              {formatTime(timeRemaining)}
            </div>
          </div>

          {/* Next level preview */}
          {nextLevel && !currentLevel.is_break && (
            <div className={cn(
              "text-center text-muted-foreground mb-6",
              tvMode && "text-xl mb-10"
            )}>
              <span className="text-sm uppercase tracking-wide">Next: </span>
              {nextLevel.is_break ? (
                <span>Break</span>
              ) : (
                <span>
                  {nextLevel.small_blind.toLocaleString()} / {nextLevel.big_blind.toLocaleString()}
                  {nextLevel.ante > 0 && ` (ante ${nextLevel.ante.toLocaleString()})`}
                </span>
              )}
            </div>
          )}

          {/* Controls */}
          {isAdmin && !tvMode && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevLevel}
                disabled={session.current_level <= 1}
              >
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                className={cn(
                  "w-24 h-14",
                  session.status === 'active' ? "bg-destructive hover:bg-destructive/90" : "glow-gold"
                )}
                onClick={handlePlayPause}
              >
                {session.status === 'active' ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextLevel}
                disabled={!nextLevel}
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
