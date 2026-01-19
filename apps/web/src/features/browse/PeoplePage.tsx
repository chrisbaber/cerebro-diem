import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Search } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../services/supabase';
import TagFilter from '../../components/TagFilter';

interface Person {
  id: string;
  name: string;
  context: string | null;
  follow_ups: string[];
  last_touched: string;
}

export default function PeoplePage() {
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: people = [], isLoading } = useQuery({
    queryKey: ['people', search, selectedTags],
    queryFn: async () => {
      let query = supabase
        .from('people')
        .select('*')
        .order('last_touched', { ascending: false });

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by tags if any selected
      if (selectedTags.length > 0) {
        const { data: taggedItems } = await supabase
          .from('item_tags')
          .select('item_id')
          .eq('item_type', 'person')
          .in('tag_id', selectedTags);

        const taggedIds = new Set(taggedItems?.map(t => t.item_id) || []);
        return (data as Person[]).filter(p => taggedIds.has(p.id));
      }

      return data as Person[];
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Users className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold">People</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-outline/30 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <TagFilter
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
          itemType="person"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-surface rounded-xl p-4 h-24" />
          ))}
        </div>
      ) : people.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No people found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {people.map(person => (
            <div
              key={person.id}
              className="bg-surface rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-lg">
                    {person.name[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{person.name}</h3>
                  {person.context && (
                    <p className="text-sm text-on-surface-variant truncate">
                      {person.context}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-on-surface-variant">
                    <span>{person.follow_ups?.length || 0} follow-ups</span>
                    <span>{format(new Date(person.last_touched), 'MMM d')}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
