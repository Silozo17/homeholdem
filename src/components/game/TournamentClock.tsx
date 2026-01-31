import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTournamentSounds, AnnouncementType } from '@/hooks/useTournamentSounds';

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
  playersRemaining?: number;
  isFinalTable?: boolean;
  currencySymbol?: string;
  chipToCashRatio?: number;
  displayBlindsAsCurrency?: boolean;
}

export function TournamentClock({ 
  session, 
  blindStructure, 
  isAdmin, 
  onUpdate,
  tvMode = false,
  playersRemaining,
  isFinalTable = false,
  currencySymbol = '£',
  chipToCashRatio = 0.01,
  displayBlindsAsCurrency = false
}: TournamentClockProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const announcedRef = useRef<Record<string, boolean>>({});
  const prevLevelRef = useRef<number>(session.current_level);
  const wasFinalTableRef = useRef<boolean>(false);

  const {
    soundEnabled,
    toggleSound,
    playAnnouncement,
    playLevelUp,
  } = useTournamentSounds({ enabled: true });

  const currentLevel = blindStructure.find(b => b.level === session.current_level);
  const nextLevel = blindStructure.find(b => b.level === session.current_level + 1);

  // Calculate time remaining from timestamps (drift-resistant)
  const calculateTimeRemaining = useCallback(() => {
    if (!currentLevel) return 0;
    
    // When paused, use stored time_remaining_seconds
    if (session.status !== 'active') {
      return session.time_remaining_seconds ?? currentLevel.duration_minutes * 60;
    }
    
    // When active, calculate from level_started_at timestamp
    if (!session.level_started_at) {
      return session.time_remaining_seconds ?? currentLevel.duration_minutes * 60;
    }
    
    const startTime = new Date(session.level_started_at).getTime();
    const initialSeconds = session.time_remaining_seconds ?? currentLevel.duration_minutes * 60;
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    
    return Math.max(0, initialSeconds - elapsedSeconds);
  }, [session.status, session.level_started_at, session.time_remaining_seconds, currentLevel]);

  // Initialize timer and sync on visibility change
  useEffect(() => {
    setTimeRemaining(calculateTimeRemaining());
  }, [calculateTimeRemaining]);

  // Recalculate immediately when app returns from background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeRemaining(calculateTimeRemaining());
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [calculateTimeRemaining]);

  // Handle level changes and announcements
  useEffect(() => {
    if (prevLevelRef.current !== session.current_level) {
      const prevLevel = blindStructure.find(b => b.level === prevLevelRef.current);
      
      // Reset announced flags for new level
      announcedRef.current = {};
      
      // Determine announcement type
      if (currentLevel?.is_break) {
        playAnnouncement('break_start');
      } else if (prevLevel?.is_break && !currentLevel?.is_break) {
        playAnnouncement('break_end');
      } else {
        playAnnouncement('blinds_up');
      }
      
      prevLevelRef.current = session.current_level;
    }
  }, [session.current_level, blindStructure, currentLevel, playAnnouncement]);

  // Handle final table announcement
  useEffect(() => {
    if (isFinalTable && !wasFinalTableRef.current) {
      playAnnouncement('final_table');
      wasFinalTableRef.current = true;
    }
  }, [isFinalTable, playAnnouncement]);

  const handleLevelComplete = useCallback(() => {
    if (nextLevel && isAdmin) {
      onUpdate({
        current_level: nextLevel.level,
        time_remaining_seconds: nextLevel.duration_minutes * 60,
        level_started_at: new Date().toISOString(),
      });
    }
  }, [nextLevel, isAdmin, onUpdate]);

  // Timer countdown with time-based announcements (recalculates from timestamp each tick)
  useEffect(() => {
    if (session.status === 'active') {
      intervalRef.current = setInterval(() => {
        const newTime = calculateTimeRemaining();
        setTimeRemaining(newTime);
        
        // Time-based announcements
        if (newTime === 301 && !announcedRef.current['five_minutes']) {
          announcedRef.current['five_minutes'] = true;
          playAnnouncement('five_minutes');
        }
        if (newTime === 61 && !announcedRef.current['one_minute']) {
          announcedRef.current['one_minute'] = true;
          playAnnouncement('one_minute');
        }
        if (newTime === 11 && !announcedRef.current['ten_seconds']) {
          announcedRef.current['ten_seconds'] = true;
          playAnnouncement('ten_seconds');
        }
        
        if (newTime <= 0) {
          handleLevelComplete();
        }
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
  }, [session.status, calculateTimeRemaining, playAnnouncement, handleLevelComplete]);

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

  const formatBlind = (chips: number) => {
    if (displayBlindsAsCurrency && chipToCashRatio > 0) {
      const value = chips * chipToCashRatio;
      if (value < 1) {
        return `${currencySymbol}${value.toFixed(2)}`;
      }
      return `${currencySymbol}${value.toFixed(2).replace(/\.00$/, '')}`;
    }
    return chips.toLocaleString();
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
                {formatBlind(currentLevel.small_blind)} / {formatBlind(currentLevel.big_blind)}
              </div>
              {currentLevel.ante > 0 && (
                <div className={cn(
                  "text-lg text-muted-foreground mt-1",
                  tvMode && "text-3xl mt-2"
                )}>
                  Ante: {formatBlind(currentLevel.ante)}
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
                  {formatBlind(nextLevel.small_blind)} / {formatBlind(nextLevel.big_blind)}
                  {nextLevel.ante > 0 && ` (ante ${formatBlind(nextLevel.ante)})`}
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
                onClick={toggleSound}
                className={cn(!soundEnabled && "text-muted-foreground")}
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
  );
}
