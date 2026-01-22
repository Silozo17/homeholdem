import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/common/UserAvatar';

interface HostVolunteerProps {
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

export function HostVolunteer({ volunteers, currentUserId, onVolunteer, onConfirm, showVolunteerSection = true }: HostVolunteerProps) {
  const [profiles, setProfiles] = useState<VolunteerProfile[]>([]);
  const isVolunteering = volunteers.includes(currentUserId);

  // If not showing volunteer section (host already selected but admin can change), just show the list
  if (!showVolunteerSection && profiles.length === 0 && volunteers.length > 0) {
    // Fetch profiles on mount even when not showing volunteer button
  }

  useEffect(() => {
    if (volunteers.length > 0) {
      fetchProfiles();
    }
  }, [volunteers]);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', volunteers);

    if (data) {
      setProfiles(data);
    }
  };

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

        {profiles.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm text-muted-foreground">Volunteers:</p>
            {profiles.map((profile) => (
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
            ))}
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
