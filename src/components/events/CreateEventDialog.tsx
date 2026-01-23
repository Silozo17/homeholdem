import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfMonth, endOfMonth, addDays, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
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
import { Loader2, X } from 'lucide-react';
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
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedTime, setSelectedTime] = useState('19:00');
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
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

  // Combine selected dates with time whenever either changes
  useEffect(() => {
    if (selectedDates.length === 0) {
      setDateOptions([]);
      return;
    }

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const combined = selectedDates.map(date => {
      const d = new Date(date);
      d.setHours(hours, minutes, 0, 0);
      return d;
    }).sort((a, b) => a.getTime() - b.getTime());

    setDateOptions(combined);
  }, [selectedDates, selectedTime]);

  const removeDateOption = (dateToRemove: Date) => {
    setSelectedDates(prev => prev.filter(d => !isSameDay(d, dateToRemove)));
  };

  const selectWeekdayInMonth = (dayOfWeek: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const daysToAdd: Date[] = [];
    
    let current = start;
    while (current <= end) {
      if (current.getDay() === dayOfWeek && current >= today) {
        // Check if not already selected
        if (!selectedDates.some(d => isSameDay(d, current))) {
          daysToAdd.push(new Date(current));
        }
      }
      current = addDays(current, 1);
    }
    
    if (daysToAdd.length > 0) {
      setSelectedDates(prev => [...prev, ...daysToAdd]);
    }
  };

  const clearAllDates = () => {
    setSelectedDates([]);
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
    setSelectedDates([]);
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

            {/* Date Options Section - Persistent Multi-Select Calendar */}
            <div className="space-y-3">
              <FormLabel>Date Options for Voting</FormLabel>
              <p className="text-xs text-muted-foreground">
                Click dates to select/deselect. All dates will use the same start time.
              </p>
              
              {/* Persistent Calendar */}
              <div className="rounded-md border border-border/50 bg-input/30 overflow-hidden">
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => setSelectedDates(dates || [])}
                  onMonthChange={setCalendarMonth}
                  month={calendarMonth}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  className={cn("p-3 pointer-events-auto")}
                />
              </div>

              {/* Quick Select Buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => selectWeekdayInMonth(5)} // Friday
                  className="text-xs"
                >
                  + All Fridays
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => selectWeekdayInMonth(6)} // Saturday
                  className="text-xs"
                >
                  + All Saturdays
                </Button>
                {selectedDates.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearAllDates}
                    className="text-xs text-muted-foreground"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {/* Time Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Start time:</span>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger className="w-28 bg-input/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">(applies to all dates)</span>
              </div>

              {/* Selected Dates List */}
              {dateOptions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    {dateOptions.length} date{dateOptions.length !== 1 ? 's' : ''} selected
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
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
                          onClick={() => removeDateOption(date)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dateOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Select at least one date for members to vote on.
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
