import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, X, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/common/UserAvatar';
import { toast } from 'sonner';

interface HostVolunteerProps {
  eventId: string;
  volunteers: string[];
  currentUserId: string;
  onVolunteer: () => void;
  onConfirm?: (userId: string) => void;
  showVolunteerSection?: boolean;
}

interface VolunteerProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export function HostVolunteer({ eventId, volunteers, currentUserId, onVolunteer, onConfirm, showVolunteerSection = true }: HostVolunteerProps) {
  const [profiles, setProfiles] = useState<VolunteerProfile[]>([]);
  const [votes, setVotes] = useState<Map<string, number>>(new Map());
  const [userVote, setUserVote] = useState<string | null>(null);
  const isVolunteering = volunteers.includes(currentUserId);

  useEffect(() => {
    if (volunteers.length > 0) {
      fetchProfiles();
    } else {
      setProfiles([]);
    }
  }, [volunteers]);

  useEffect(() => {
    if (eventId) {
      fetchVotes();
      subscribeToVotes();
    }
  }, [eventId]);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', volunteers);

    if (data) {
      setProfiles(data);
    }
  };

  const fetchVotes = async () => {
    const { data } = await supabase
      .from('event_host_votes')
      .select('volunteer_user_id, voter_user_id')
      .eq('event_id', eventId);

    if (data) {
      // Count votes per volunteer
      const voteCounts = new Map<string, number>();
      let myVote: string | null = null;

      data.forEach(vote => {
        voteCounts.set(vote.volunteer_user_id, (voteCounts.get(vote.volunteer_user_id) || 0) + 1);
        if (vote.voter_user_id === currentUserId) {
          myVote = vote.volunteer_user_id;
        }
      });

      setVotes(voteCounts);
      setUserVote(myVote);
    }
  };

  const subscribeToVotes = () => {
    const channel = supabase
      .channel(`host-votes-${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'event_host_votes',
        filter: `event_id=eq.${eventId}`
      }, () => {
        fetchVotes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleVote = async (volunteerId: string) => {
    // Can't vote for yourself
    if (volunteerId === currentUserId) {
      return;
    }

    // Optimistic update
    const previousVote = userVote;
    const previousVotes = new Map(votes);

    if (userVote === volunteerId) {
      // Remove vote
      setUserVote(null);
      setVotes(prev => {
        const newVotes = new Map(prev);
        newVotes.set(volunteerId, Math.max(0, (prev.get(volunteerId) || 0) - 1));
        return newVotes;
      });

      const { error } = await supabase
        .from('event_host_votes')
        .delete()
        .eq('event_id', eventId)
        .eq('voter_user_id', currentUserId);

      if (error) {
        setUserVote(previousVote);
        setVotes(previousVotes);
        toast.error('Failed to remove vote');
      }
    } else {
      // If already voted for someone else, remove that first
      if (userVote) {
        setVotes(prev => {
          const newVotes = new Map(prev);
          newVotes.set(userVote!, Math.max(0, (prev.get(userVote!) || 0) - 1));
          return newVotes;
        });

        await supabase
          .from('event_host_votes')
          .delete()
          .eq('event_id', eventId)
          .eq('voter_user_id', currentUserId);
      }

      // Add new vote
      setUserVote(volunteerId);
      setVotes(prev => {
        const newVotes = new Map(prev);
        newVotes.set(volunteerId, (prev.get(volunteerId) || 0) + 1);
        return newVotes;
      });

      const { error } = await supabase
        .from('event_host_votes')
        .insert({
          event_id: eventId,
          voter_user_id: currentUserId,
          volunteer_user_id: volunteerId
        });

      if (error) {
        setUserVote(previousVote);
        setVotes(previousVotes);
        toast.error('Failed to vote');
      }
    }
  };

  // Sort profiles by vote count (highest first)
  const sortedProfiles = [...profiles].sort((a, b) => 
    (votes.get(b.id) || 0) - (votes.get(a.id) || 0)
  );

  // Don't render at all if admin is just viewing with no volunteers
  if (!showVolunteerSection && volunteers.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Home className="h-5 w-5 text-primary" />
          {showVolunteerSection ? 'Host Needed' : 'Select New Host'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {showVolunteerSection && (
          <Button
            variant={isVolunteering ? 'outline' : 'outline'}
            className={cn(
              "w-full",
              isVolunteering 
                ? "border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive" 
                : "hover:border-primary/50"
            )}
            onClick={onVolunteer}
          >
            {isVolunteering ? (
              <>
                <X className="mr-2 h-4 w-4" />
                Withdraw Offer
              </>
            ) : (
              <>
                <Home className="mr-2 h-4 w-4" />
                I Can Host
              </>
            )}
          </Button>
        )}

        {sortedProfiles.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm text-muted-foreground">Volunteers:</p>
            {sortedProfiles.map((profile) => {
              const voteCount = votes.get(profile.id) || 0;
              const hasVoted = userVote === profile.id;
              const isOwnProfile = profile.id === currentUserId;

              return (
                <div 
                  key={profile.id}
                  className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <UserAvatar 
                      name={profile.display_name} 
                      avatarUrl={profile.avatar_url}
                      size="sm"
                    />
                    <span className="font-medium">{profile.display_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Vote button - hidden for own profile */}
                    {!isOwnProfile && (
                      <button
                        onClick={() => handleVote(profile.id)}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-md transition-colors",
                          hasVoted 
                            ? "bg-primary/20 text-primary" 
                            : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <ThumbsUp className={cn("h-4 w-4", hasVoted && "fill-primary")} />
                        {voteCount > 0 && <span className="text-sm font-medium">{voteCount}</span>}
                      </button>
                    )}
                    {/* Show count only for own profile if has votes */}
                    {isOwnProfile && voteCount > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 text-muted-foreground">
                        <ThumbsUp className="h-4 w-4" />
                        <span className="text-sm font-medium">{voteCount}</span>
                      </div>
                    )}
                    {onConfirm && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => onConfirm(profile.id)}
                      >
                        Confirm
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {volunteers.length === 0 && (
          <p className="text-xs text-muted-foreground text-center">
            No volunteers yet. Be the first!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
