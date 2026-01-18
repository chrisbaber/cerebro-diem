import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderKanban, Search } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../services/supabase';
import TagFilter from '../../components/TagFilter';

const STATUS_TABS = ['active', 'waiting', 'blocked', 'someday', 'done'] as const;

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<typeof STATUS_TABS[number]>('active');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', search, activeTab, selectedTags],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('*')
        .eq('status', activeTab)
        .order('updated_at', { ascending: false });

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <FolderKanban className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold">Projects</h1>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {STATUS_TABS.map(status => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            className={`px-4 py-2 rounded-xl font-medium capitalize whitespace-nowrap transition-colors ${
              activeTab === status
                ? 'bg-primary text-white'
                : 'bg-surface hover:bg-surface-variant'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-outline/30 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <TagFilter selectedTags={selectedTags} onTagsChange={setSelectedTags} itemType="project" />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-surface rounded-xl p-4 h-24" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <FolderKanban className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No {activeTab} projects</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project: any) => (
            <div
              key={project.id}
              className="bg-surface rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <h3 className="font-semibold">{project.name}</h3>
              {project.next_action && (
                <p className="text-sm text-on-surface-variant mt-1">
                  → {project.next_action}
                </p>
              )}
              <p className="text-xs text-on-surface-variant mt-2">
                Updated {format(new Date(project.updated_at), 'MMM d')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
