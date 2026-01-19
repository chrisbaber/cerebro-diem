import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import debounce from 'lodash/debounce';

interface SearchResult {
  item_type: 'capture' | 'person' | 'project' | 'idea' | 'task';
  item_id: string;
  similarity: number;
  item_data?: any;
}

const typeIcons: Record<string, string> = {
  capture: '📝',
  person: '👤',
  project: '📁',
  idea: '💡',
  task: '✓',
};

const typeColors: Record<string, string> = {
  capture: 'bg-gray-100 text-gray-800',
  person: 'bg-blue-100 text-blue-800',
  project: 'bg-purple-100 text-purple-800',
  idea: 'bg-yellow-100 text-yellow-800',
  task: 'bg-green-100 text-green-800',
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'semantic' | 'text'>('semantic');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['capture', 'person', 'project', 'idea', 'task']);

  const semanticSearch = useMutation({
    mutationFn: async (searchQuery: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/semantic-search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'search',
            query: searchQuery,
            limit: 20,
            item_types: selectedTypes,
          }),
        }
      );

      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
  });

  const textSearch = useQuery({
    queryKey: ['textSearch', query, selectedTypes],
    queryFn: async () => {
      if (!query.trim()) return { results: [] };

      const searchTerm = `%${query}%`;
      const results: SearchResult[] = [];

      // Search each selected type
      if (selectedTypes.includes('capture')) {
        const { data } = await supabase
          .from('captures')
          .select('id, raw_text, created_at')
          .ilike('raw_text', searchTerm)
          .limit(10);

        results.push(...(data || []).map(item => ({
          item_type: 'capture' as const,
          item_id: item.id,
          similarity: 1,
          item_data: item,
        })));
      }

      if (selectedTypes.includes('person')) {
        const { data } = await supabase
          .from('people')
          .select('*')
          .or(`name.ilike.${searchTerm},context.ilike.${searchTerm}`)
          .limit(10);

        results.push(...(data || []).map(item => ({
          item_type: 'person' as const,
          item_id: item.id,
          similarity: 1,
          item_data: item,
        })));
      }

      if (selectedTypes.includes('project')) {
        const { data } = await supabase
          .from('projects')
          .select('*')
          .or(`name.ilike.${searchTerm},notes.ilike.${searchTerm}`)
          .limit(10);

        results.push(...(data || []).map(item => ({
          item_type: 'project' as const,
          item_id: item.id,
          similarity: 1,
          item_data: item,
        })));
      }

      if (selectedTypes.includes('idea')) {
        const { data } = await supabase
          .from('ideas')
          .select('*')
          .or(`title.ilike.${searchTerm},one_liner.ilike.${searchTerm},notes.ilike.${searchTerm}`)
          .limit(10);

        results.push(...(data || []).map(item => ({
          item_type: 'idea' as const,
          item_id: item.id,
          similarity: 1,
          item_data: item,
        })));
      }

      if (selectedTypes.includes('task')) {
        const { data } = await supabase
          .from('tasks')
          .select('*')
          .or(`name.ilike.${searchTerm},notes.ilike.${searchTerm}`)
          .limit(10);

        results.push(...(data || []).map(item => ({
          item_type: 'task' as const,
          item_id: item.id,
          similarity: 1,
          item_data: item,
        })));
      }

      return { results };
    },
    enabled: searchType === 'text' && query.trim().length > 0,
  });

  const debouncedSemanticSearch = useCallback(
    debounce((q: string) => {
      if (q.trim()) {
        semanticSearch.mutate(q);
      }
    }, 500),
    [selectedTypes]
  );

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    if (searchType === 'semantic') {
      debouncedSemanticSearch(newQuery);
    }
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const results = searchType === 'semantic'
    ? semanticSearch.data?.results || []
    : textSearch.data?.results || [];

  const isLoading = searchType === 'semantic'
    ? semanticSearch.isPending
    : textSearch.isLoading;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Search</h1>

      {/* Search Type Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSearchType('semantic')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            searchType === 'semantic'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          🧠 Semantic Search
        </button>
        <button
          onClick={() => setSearchType('text')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            searchType === 'text'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📝 Text Search
        </button>
      </div>

      {/* Type Filters */}
      <div className="flex gap-2 mb-4">
        {Object.entries(typeIcons).map(([type, icon]) => (
          <button
            key={type}
            onClick={() => toggleType(type)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              selectedTypes.includes(type)
                ? typeColors[type]
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {icon} {type}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder={searchType === 'semantic'
            ? "Search by meaning... e.g., 'things I need to follow up on'"
            : "Search by text..."
          }
          className="w-full px-4 py-3 pl-12 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">
          🔍
        </span>
        {isLoading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-5 w-5 text-purple-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </span>
        )}
      </div>

      {/* Semantic Search Explanation */}
      {searchType === 'semantic' && !query && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-purple-900 mb-2">🧠 Semantic Search</h3>
          <p className="text-purple-700 text-sm">
            Search by meaning, not just keywords. Try queries like:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-purple-600">
            <li>• "ideas about improving productivity"</li>
            <li>• "people I should reconnect with"</li>
            <li>• "projects that are stalled"</li>
            <li>• "tasks related to marketing"</li>
          </ul>
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {results.map((result: SearchResult) => (
          <div
            key={`${result.item_type}-${result.item_id}`}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{typeIcons[result.item_type]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[result.item_type]}`}>
                    {result.item_type}
                  </span>
                  {searchType === 'semantic' && (
                    <span className="text-xs text-gray-500">
                      {Math.round(result.similarity * 100)}% match
                    </span>
                  )}
                </div>
                <p className="text-gray-900 font-medium truncate">
                  {result.item_data?.name ||
                   result.item_data?.title ||
                   result.item_data?.raw_text?.slice(0, 100) ||
                   'Loading...'}
                </p>
                {result.item_data?.context && (
                  <p className="text-gray-500 text-sm truncate">{result.item_data.context}</p>
                )}
                {result.item_data?.one_liner && (
                  <p className="text-gray-500 text-sm truncate">{result.item_data.one_liner}</p>
                )}
              </div>
            </div>
          </div>
        ))}

        {query && !isLoading && results.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-xl mb-2">No results found</p>
            <p className="text-sm">Try a different search term or adjust your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
