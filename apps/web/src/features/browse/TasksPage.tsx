import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Search, Circle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../services/supabase';
import TagFilter from '../../components/TagFilter';

const STATUS_TABS = ['pending', 'in_progress', 'done'] as const;

export default function TasksPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<typeof STATUS_TABS[number]>('pending');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', search, activeTab, selectedTags],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('status', activeTab)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'done' ? 'pending' : 'done';
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'done' ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && activeTab !== 'done';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <CheckSquare className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold">Tasks</h1>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2">
        {STATUS_TABS.map(status => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            className={`px-4 py-2 rounded-xl font-medium capitalize transition-colors ${
              activeTab === status
                ? 'bg-primary text-white'
                : 'bg-surface hover:bg-surface-variant'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-outline/30 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <TagFilter selectedTags={selectedTags} onTagsChange={setSelectedTags} itemType="task" />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-surface rounded-xl p-4 h-16" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No {activeTab.replace('_', ' ')} tasks</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task: any) => (
            <div
              key={task.id}
              className={`bg-surface rounded-xl p-4 shadow-sm flex items-center gap-4 ${
                isOverdue(task.due_date) ? 'border-l-4 border-error' : ''
              }`}
            >
              <button
                onClick={() => toggleMutation.mutate({ id: task.id, currentStatus: task.status })}
                className="flex-shrink-0"
              >
                {task.status === 'done' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <Circle className="w-6 h-6 text-on-surface-variant hover:text-primary transition-colors" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`font-medium ${task.status === 'done' ? 'line-through text-on-surface-variant' : ''}`}>
                  {task.name}
                </p>
                {task.due_date && (
                  <p className={`text-xs ${isOverdue(task.due_date) ? 'text-error' : 'text-on-surface-variant'}`}>
                    Due {format(new Date(task.due_date), 'MMM d')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
