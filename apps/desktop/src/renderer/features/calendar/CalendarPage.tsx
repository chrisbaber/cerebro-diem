import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Link2 } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  is_all_day: boolean;
  related_person_id?: string;
  related_project_id?: string;
  related_task_id?: string;
}

export default function CalendarPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar-events', currentWeekStart.toISOString()],
    queryFn: async () => {
      const weekEnd = addDays(currentWeekStart, 7);
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', currentWeekStart.toISOString())
        .lt('start_time', weekEnd.toISOString())
        .order('start_time');

      if (error) throw error;
      return data as CalendarEvent[];
    },
  });

  const { data: connection } = useQuery({
    queryKey: ['calendar-connection'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      return data;
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-calendar`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'sync', provider: 'google' }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(parseISO(event.start_time), day));
  };

  const formatEventTime = (event: CalendarEvent) => {
    if (event.is_all_day) return 'All day';
    return format(parseISO(event.start_time), 'h:mm a');
  };

  const connectGoogle = async () => {
    // This would trigger OAuth flow
    // For now, show a placeholder
    alert('Google Calendar OAuth integration requires additional setup. See documentation.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Calendar className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold">Calendar</h1>
        </div>

        <div className="flex items-center gap-4">
          {connection ? (
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              Sync
            </button>
          ) : (
            <button
              onClick={connectGoogle}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
            >
              <Link2 className="w-4 h-4" />
              Connect Google Calendar
            </button>
          )}
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-surface rounded-xl p-4 shadow-sm">
        <button
          onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
          className="p-2 hover:bg-surface-variant rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold">
          {format(currentWeekStart, 'MMMM d')} - {format(addDays(currentWeekStart, 6), 'MMMM d, yyyy')}
        </h2>

        <button
          onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
          className="p-2 hover:bg-surface-variant rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map(day => (
          <div key={day.toISOString()} className="min-h-[200px]">
            <div className={`text-center p-2 rounded-t-xl ${
              isSameDay(day, new Date())
                ? 'bg-primary text-white'
                : 'bg-surface-variant'
            }`}>
              <div className="text-xs font-medium uppercase">
                {format(day, 'EEE')}
              </div>
              <div className="text-lg font-bold">
                {format(day, 'd')}
              </div>
            </div>

            <div className="bg-surface rounded-b-xl p-2 space-y-2 min-h-[160px]">
              {isLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-8 bg-surface-variant rounded" />
                  <div className="h-8 bg-surface-variant rounded" />
                </div>
              ) : (
                getEventsForDay(day).map(event => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="w-full text-left p-2 bg-primary-container rounded-lg hover:bg-primary-container/80 transition-colors"
                  >
                    <div className="text-xs text-primary font-medium">
                      {formatEventTime(event)}
                    </div>
                    <div className="text-sm font-medium truncate">
                      {event.title}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-2xl p-6 max-w-lg w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold mb-4">{selectedEvent.title}</h3>

            <div className="space-y-3 text-on-surface-variant">
              <p>
                <span className="font-medium">Time: </span>
                {selectedEvent.is_all_day
                  ? 'All day'
                  : `${format(parseISO(selectedEvent.start_time), 'h:mm a')} - ${format(parseISO(selectedEvent.end_time), 'h:mm a')}`
                }
              </p>

              {selectedEvent.location && (
                <p>
                  <span className="font-medium">Location: </span>
                  {selectedEvent.location}
                </p>
              )}

              {selectedEvent.description && (
                <p>
                  <span className="font-medium">Description: </span>
                  {selectedEvent.description}
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 text-on-surface-variant hover:bg-surface-variant rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
