import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

interface Pattern {
  id: string;
  pattern_type: string;
  title: string;
  description: string;
  data: {
    suggestion?: string;
  };
  related_items: Array<{ type: string; id: string; name?: string }>;
  significance: number;
  acknowledged: boolean;
  created_at: string;
}

interface RecurringTask {
  id: string;
  name: string;
  description: string;
  frequency: string;
  next_due_date: string;
  auto_detected: boolean;
  is_active: boolean;
}

const patternTypeLabels: Record<string, { label: string; icon: string; color: string }> = {
  recurring_topic: { label: 'Recurring Topic', icon: '🔄', color: 'bg-blue-100 text-blue-800' },
  recurring_task: { label: 'Recurring Task', icon: '📋', color: 'bg-green-100 text-green-800' },
  project_stall: { label: 'Stalled Project', icon: '⚠️', color: 'bg-yellow-100 text-yellow-800' },
  follow_up_due: { label: 'Follow-up Due', icon: '📞', color: 'bg-red-100 text-red-800' },
  time_pattern: { label: 'Time Pattern', icon: '⏰', color: 'bg-purple-100 text-purple-800' },
  sentiment_trend: { label: 'Sentiment Trend', icon: '📊', color: 'bg-indigo-100 text-indigo-800' },
  recurring_person: { label: 'Frequent Person', icon: '👤', color: 'bg-pink-100 text-pink-800' },
};

export default function PatternsPage() {
  const queryClient = useQueryClient();

  const { data: patterns, isLoading: patternsLoading } = useQuery({
    queryKey: ['patterns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patterns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Pattern[];
    },
  });

  const { data: recurringTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['recurring-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_tasks')
        .select('*')
        .order('next_due_date', { ascending: true });

      if (error) throw error;
      return data as RecurringTask[];
    },
  });

  const detectPatterns = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/detect-patterns`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Pattern detection failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-tasks'] });
    },
  });

  const acknowledgePattern = useMutation({
    mutationFn: async (patternId: string) => {
      const { error } = await supabase
        .from('patterns')
        .update({ acknowledged: true })
        .eq('id', patternId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
    },
  });

  const activateRecurringTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('recurring_tasks')
        .update({ is_active: true })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-tasks'] });
    },
  });

  const unacknowledgedPatterns = patterns?.filter(p => !p.acknowledged) || [];
  const acknowledgedPatterns = patterns?.filter(p => p.acknowledged) || [];
  const suggestedTasks = recurringTasks?.filter(t => !t.is_active && t.auto_detected) || [];
  const activeTasks = recurringTasks?.filter(t => t.is_active) || [];

  if (patternsLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Patterns & Insights</h1>
        <button
          onClick={() => detectPatterns.mutate()}
          disabled={detectPatterns.isPending}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
        >
          {detectPatterns.isPending ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>🔍 Detect Patterns</>
          )}
        </button>
      </div>

      {/* Suggested Recurring Tasks */}
      {suggestedTasks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-xl">🤖</span>
            AI-Suggested Recurring Tasks
          </h2>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
            {suggestedTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm">
                <div>
                  <p className="font-medium text-gray-900">{task.name}</p>
                  <p className="text-sm text-gray-500">
                    {task.frequency} • {task.description}
                  </p>
                </div>
                <button
                  onClick={() => activateRecurringTask.mutate(task.id)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                >
                  Activate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Patterns */}
      {unacknowledgedPatterns.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-xl">✨</span>
            New Patterns Detected
          </h2>
          <div className="space-y-3">
            {unacknowledgedPatterns.map(pattern => {
              const typeInfo = patternTypeLabels[pattern.pattern_type] || {
                label: pattern.pattern_type,
                icon: '📌',
                color: 'bg-gray-100 text-gray-800',
              };

              return (
                <div
                  key={pattern.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{typeInfo.icon}</span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                          <span className="text-xs text-gray-500">
                            {Math.round(pattern.significance * 100)}% significant
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900">{pattern.title}</h3>
                        <p className="text-gray-600 text-sm mt-1">{pattern.description}</p>
                        {pattern.data.suggestion && (
                          <p className="text-purple-600 text-sm mt-2 flex items-center gap-1">
                            <span>💡</span> {pattern.data.suggestion}
                          </p>
                        )}
                        {pattern.related_items.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {pattern.related_items.slice(0, 3).map((item, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {item.name || item.type}
                              </span>
                            ))}
                            {pattern.related_items.length > 3 && (
                              <span className="px-2 py-0.5 text-gray-500 text-xs">
                                +{pattern.related_items.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => acknowledgePattern.mutate(pattern.id)}
                      className="px-3 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg text-sm"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Recurring Tasks */}
      {activeTasks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-xl">🔁</span>
            Recurring Tasks
          </h2>
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {activeTasks.map(task => (
              <div key={task.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{task.name}</p>
                  <p className="text-sm text-gray-500">
                    {task.frequency} • Next: {new Date(task.next_due_date).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${task.auto_detected ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                  {task.auto_detected ? 'AI detected' : 'Manual'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Patterns */}
      {acknowledgedPatterns.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-500 mb-3 flex items-center gap-2">
            <span className="text-xl">📜</span>
            Past Patterns
          </h2>
          <div className="space-y-2 opacity-60">
            {acknowledgedPatterns.slice(0, 10).map(pattern => {
              const typeInfo = patternTypeLabels[pattern.pattern_type] || {
                label: pattern.pattern_type,
                icon: '📌',
                color: 'bg-gray-100 text-gray-800',
              };

              return (
                <div
                  key={pattern.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-3"
                >
                  <span className="text-xl">{typeInfo.icon}</span>
                  <div>
                    <p className="font-medium text-gray-700">{pattern.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(pattern.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {patterns?.length === 0 && recurringTasks?.length === 0 && (
        <div className="text-center py-16">
          <span className="text-6xl mb-4 block">🔮</span>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No patterns yet</h2>
          <p className="text-gray-600 mb-6">
            Keep capturing your thoughts, and we'll identify patterns over time.
          </p>
          <button
            onClick={() => detectPatterns.mutate()}
            disabled={detectPatterns.isPending}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
          >
            Run Pattern Analysis
          </button>
        </div>
      )}
    </div>
  );
}
