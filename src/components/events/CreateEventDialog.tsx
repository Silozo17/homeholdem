import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Loader2, CalendarIcon, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { sendEmail } from '@/lib/email';
import { eventCreatedTemplate } from '@/lib/email-templates';
import { buildAppUrl } from '@/lib/app-url';

const createEventSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  maxTables: z.string(),
  seatsPerTable: z.string(),
});

type CreateEventFormData = z.infer<typeof createEventSchema>;

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: string;
  clubName: string;
  onSuccess: () => void;
}

export function CreateEventDialog({ open, onOpenChange, clubId, clubName, onSuccess }: CreateEventDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [dateOptions, setDateOptions] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState('19:00');
  const { user } = useAuth();

  const form = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: { 
      title: '', 
      description: '', 
      location: '',
      maxTables: '1',
      seatsPerTable: '10',
    },
  });

  const addDateOption = () => {
    if (!selectedDate) return;
    
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const dateWithTime = new Date(selectedDate);
    dateWithTime.setHours(hours, minutes, 0, 0);
    
    // Check for duplicates
    if (dateOptions.some(d => d.getTime() === dateWithTime.getTime())) {
      toast.error('This date/time is already added');
      return;
    }
    
    setDateOptions([...dateOptions, dateWithTime].sort((a, b) => a.getTime() - b.getTime()));
    setSelectedDate(undefined);
  };

  const removeDateOption = (index: number) => {
    setDateOptions(dateOptions.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: CreateEventFormData) => {
    if (!user) return;
    
    if (dateOptions.length === 0) {
      toast.error('Please add at least one date option');
      return;
    }

    setIsLoading(true);

    // Create the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        club_id: clubId,
        title: data.title,
        description: data.description || null,
        location: data.location || null,
        max_tables: parseInt(data.maxTables),
        seats_per_table: parseInt(data.seatsPerTable),
        created_by: user.id,
      })
      .select('id')
      .single();

    if (eventError || !event) {
      setIsLoading(false);
      toast.error('Failed to create event: ' + eventError?.message);
      return;
    }

    // Create date options
    const { error: dateError } = await supabase
      .from('event_date_options')
      .insert(
        dateOptions.map(date => ({
          event_id: event.id,
          proposed_date: date.toISOString(),
        }))
      );

    if (dateError) {
      setIsLoading(false);
      toast.error('Event created but failed to add date options');
      return;
    }

    // Send email notifications to club members (fire and forget)
    sendEventNotifications(event.id, data.title, data.description || undefined);

    setIsLoading(false);
    toast.success('Event created! Members can now vote on dates.');
    form.reset();
    setDateOptions([]);
    onOpenChange(false);
    onSuccess();
  };

  const sendEventNotifications = async (eventId: string, eventTitle: string, description?: string) => {
    try {
      // Fetch club members with their emails (excluding the creator)
      const { data: members } = await supabase
        .from('club_members')
        .select('user_id, profiles(email)')
        .eq('club_id', clubId)
        .neq('user_id', user!.id);

      if (!members || members.length === 0) return;

      const memberEmails = members
        .map((m) => (m.profiles as any)?.email)
        .filter((email): email is string => !!email);

      if (memberEmails.length === 0) return;

      const eventUrl = buildAppUrl(`/event/${eventId}`);
      const formattedDates = dateOptions.map((d) => format(d, "EEEE, MMMM d 'at' h:mm a"));

      const html = eventCreatedTemplate({
        eventTitle,
        clubName,
        description,
        dateOptions: formattedDates,
        eventUrl,
      });

      await sendEmail({
        to: memberEmails,
        subject: `🃏 New Event: ${eventTitle}`,
        html,
      });
    } catch (error) {
      console.error('Failed to send event notifications:', error);
      // Don't show error to user - event was created successfully
    }
  };

  const timeOptions = [];
  for (let h = 12; h <= 23; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      timeOptions.push(time);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gold-gradient">Create Event</DialogTitle>
          <DialogDescription>
            Plan a poker night and let members vote on the best date.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="January Poker Night" 
                      className="bg-input/50 border-border/50"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Monthly Texas Hold'em tournament"
                      className="bg-input/50 border-border/50 resize-none"
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="TBD - host will confirm"
                      className="bg-input/50 border-border/50"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxTables"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tables</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-input/50 border-border/50">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 Table</SelectItem>
                        <SelectItem value="2">2 Tables</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="seatsPerTable"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seats/Table</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-input/50 border-border/50">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[6, 7, 8, 9, 10].map(n => (
                          <SelectItem key={n} value={n.toString()}>{n} seats</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date Options Section */}
            <div className="space-y-3">
              <FormLabel>Date Options for Voting</FormLabel>
              
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal bg-input/50 border-border/50",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger className="w-24 bg-input/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button 
                  type="button" 
                  size="icon" 
                  onClick={addDateOption}
                  disabled={!selectedDate}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {dateOptions.length > 0 && (
                <div className="space-y-2">
                  {dateOptions.map((date, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-2 bg-secondary/50 rounded-md"
                    >
                      <span className="text-sm">
                        {format(date, "EEE, MMM d 'at' h:mm a")}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeDateOption(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {dateOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add at least one date option for members to vote on.
                </p>
              )}
            </div>

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
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                ) : (
                  'Create Event'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
