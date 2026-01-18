import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Lightbulb, Search } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../services/supabase';
import TagFilter from '../../components/TagFilter';

export default function IdeasPage() {
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ['ideas', search, selectedTags],
    queryFn: async () => {
      let query = supabase
        .from('ideas')
        .select('*')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`title.ilike.%${search}%,one_liner.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Lightbulb className="w-8 h-8 text-tertiary" />
        <h1 className="text-2xl font-bold">Ideas</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ideas..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-outline/30 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <TagFilter selectedTags={selectedTags} onTagsChange={setSelectedTags} itemType="idea" />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-surface rounded-xl p-4 h-32" />
          ))}
        </div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No ideas yet</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea: any) => (
            <div
              key={idea.id}
              className="bg-surface rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-tertiary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold">{idea.title}</h3>
                  {idea.one_liner && (
                    <p className="text-sm text-on-surface-variant italic mt-1">
                      "{idea.one_liner}"
                    </p>
                  )}
                  <p className="text-xs text-on-surface-variant mt-2">
                    {format(new Date(idea.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
