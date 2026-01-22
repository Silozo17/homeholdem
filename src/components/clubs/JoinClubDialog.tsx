import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const joinClubSchema = z.object({
  inviteCode: z.string().length(6, 'Invite code must be 6 characters').toUpperCase(),
});

type JoinClubFormData = z.infer<typeof joinClubSchema>;

interface JoinClubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function JoinClubDialog({ open, onOpenChange, onSuccess }: JoinClubDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const form = useForm<JoinClubFormData>({
    resolver: zodResolver(joinClubSchema),
    defaultValues: { inviteCode: '' },
  });

  const onSubmit = async (data: JoinClubFormData) => {
    if (!user) return;
    
    setIsLoading(true);
    
    // Find club by invite code
    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .select('id, name')
      .eq('invite_code', data.inviteCode.toUpperCase())
      .single();

    if (clubError || !club) {
      setIsLoading(false);
      toast.error('Invalid invite code. Please check and try again.');
      return;
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('club_members')
      .select('id')
      .eq('club_id', club.id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      setIsLoading(false);
      toast.error('You are already a member of this club.');
      return;
    }

    // Join the club
    const { error: joinError } = await supabase
      .from('club_members')
      .insert({
        club_id: club.id,
        user_id: user.id,
        role: 'member',
      });

    setIsLoading(false);

    if (joinError) {
      toast.error('Failed to join club: ' + joinError.message);
      return;
    }

    toast.success(`Welcome to ${club.name}!`);
    form.reset();
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-gold-gradient">Join a Club</DialogTitle>
          <DialogDescription>
            Enter the 6-character invite code to join an existing club.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="inviteCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invite Code</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="ABC123"
                      className="bg-input/50 border-border/50 text-center text-2xl tracking-[0.5em] uppercase font-mono"
                      maxLength={6}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 glow-gold" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Joining...</>
                ) : (
                  'Join Club'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
