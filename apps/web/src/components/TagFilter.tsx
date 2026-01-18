import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tag, X, Plus, Check } from 'lucide-react';
import { supabase } from '../services/supabase';

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  itemType: 'person' | 'project' | 'idea' | 'task';
}

interface TagData {
  id: string;
  name: string;
  color: string;
  usage_count: number;
}

export default function TagFilter({ selectedTags, onTagsChange, itemType }: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const { data: tags = [], refetch } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data as TagData[];
    },
  });

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter(t => t !== tagId));
    } else {
      onTagsChange([...selectedTags, tagId]);
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from('tags').insert({
      user_id: session.user.id,
      name: newTagName.trim(),
    });

    setNewTagName('');
    refetch();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-outline/30 hover:bg-surface-variant transition-colors"
      >
        <Tag className="w-4 h-4" />
        <span className="text-sm">
          {selectedTags.length > 0 ? `${selectedTags.length} tags` : 'Filter by tags'}
        </span>
        {selectedTags.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTagsChange([]);
            }}
            className="ml-1 p-0.5 hover:bg-surface rounded-full"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-64 bg-surface rounded-xl shadow-lg border border-outline/30 z-20 p-3">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                    selectedTags.includes(tag.id)
                      ? 'bg-primary-container'
                      : 'hover:bg-surface-variant'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm font-medium">{tag.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-on-surface-variant">
                      {tag.usage_count}
                    </span>
                    {selectedTags.includes(tag.id) && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </button>
              ))}

              {tags.length === 0 && (
                <p className="text-sm text-on-surface-variant text-center py-2">
                  No tags yet
                </p>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-outline/30">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="New tag..."
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-outline/30 bg-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  onKeyDown={(e) => e.key === 'Enter' && createTag()}
                />
                <button
                  onClick={createTag}
                  disabled={!newTagName.trim()}
                  className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
