import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HostVolunteerProps {
  volunteers: string[];
  currentUserId: string;
  onVolunteer: () => void;
  onConfirm?: (userId: string) => void;
}

interface VolunteerProfile {
  id: string;
  display_name: string;
}

export function HostVolunteer({ volunteers, currentUserId, onVolunteer, onConfirm }: HostVolunteerProps) {
  const [profiles, setProfiles] = useState<VolunteerProfile[]>([]);
  const isVolunteering = volunteers.includes(currentUserId);

  useEffect(() => {
    if (volunteers.length > 0) {
      fetchProfiles();
    }
  }, [volunteers]);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', volunteers);

    if (data) {
      setProfiles(data);
    }
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Home className="h-5 w-5 text-primary" />
          Host Needed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant={isVolunteering ? 'default' : 'outline'}
          className={cn("w-full", isVolunteering && "glow-gold")}
          onClick={onVolunteer}
        >
          {isVolunteering ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              I Can Host!
            </>
          ) : (
            <>
              <Home className="mr-2 h-4 w-4" />
              I Can Host
            </>
          )}
        </Button>

        {profiles.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm text-muted-foreground">Volunteers:</p>
            {profiles.map((profile) => (
              <div 
                key={profile.id}
                className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {profile.display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
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
