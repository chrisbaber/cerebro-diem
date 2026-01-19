import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Mail, RefreshCw } from 'lucide-react';
import { supabase } from '../../services/supabase';

export default function DigestPage() {
  const { data: digests = [], isLoading, refetch } = useQuery({
    queryKey: ['digests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('digests')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data || [];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (type: 'daily' | 'weekly') => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-digest`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: session.user.id, type }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      return response.json();
    },
    onSuccess: () => refetch(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Mail className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold">Digests</h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => generateMutation.mutate('daily')}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
            Generate Daily
          </button>
          <button
            onClick={() => generateMutation.mutate('weekly')}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-xl hover:bg-secondary/90 transition-colors disabled:opacity-50"
          >
            Generate Weekly
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-surface rounded-xl p-6 h-48" />
          ))}
        </div>
      ) : digests.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No digests yet</p>
          <p className="text-sm mt-2">Generate your first digest to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {digests.map((digest: any) => (
            <div key={digest.id} className="bg-surface rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  digest.type === 'weekly'
                    ? 'bg-secondary-container text-secondary'
                    : 'bg-primary-container text-primary'
                }`}>
                  {digest.type}
                </span>
                <span className="text-sm text-on-surface-variant">
                  {format(new Date(digest.generated_at), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
                </span>
              </div>
              <div className="prose prose-sm max-w-none text-on-surface-variant whitespace-pre-wrap">
                {digest.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
