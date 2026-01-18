import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Mail, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';

export default function HomePage() {
  const { data: digest } = useQuery({
    queryKey: ['latest-digest'],
    queryFn: async () => {
      const { data } = await supabase
        .from('digests')
        .select('*')
        .eq('type', 'daily')
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();
      return data;
    },
  });

  const { data: reviewCount = 0 } = useQuery({
    queryKey: ['review-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('classifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'needs_review');
      return count || 0;
    },
  });

  const { data: recentCaptures = [] } = useQuery({
    queryKey: ['recent-captures'],
    queryFn: async () => {
      const { data } = await supabase
        .from('captures')
        .select('*, classifications(*)')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'person': return '👤';
      case 'project': return '📁';
      case 'idea': return '💡';
      case 'task': return '✓';
      default: return '📝';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Today's Digest */}
      {digest && (
        <div className="bg-surface rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-semibold">Today's Digest</h2>
            <span className="text-sm text-on-surface-variant">
              {format(new Date(digest.generated_at), 'h:mm a')}
            </span>
          </div>
          <div className="prose prose-sm max-w-none text-on-surface-variant whitespace-pre-wrap">
            {digest.content}
          </div>
          <Link
            to="/digest"
            className="inline-flex items-center gap-2 mt-4 text-primary font-medium hover:underline"
          >
            View all digests <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Review Queue */}
      {reviewCount > 0 && (
        <Link
          to="/review"
          className="flex items-center justify-between bg-tertiary/10 rounded-2xl p-4 hover:bg-tertiary/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-tertiary" />
            <span className="font-medium">{reviewCount} items need review</span>
          </div>
          <ArrowRight className="w-5 h-5 text-tertiary" />
        </Link>
      )}

      {/* Recent Activity */}
      <div className="bg-surface rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>

        {recentCaptures.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant">
            <p>No captures yet. Try speaking or typing a thought!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentCaptures.map((capture: any) => {
              const classification = capture.classifications?.[0];
              return (
                <div
                  key={capture.id}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-variant transition-colors"
                >
                  <span className="text-xl">
                    {classification ? getCategoryIcon(classification.category) : '⏳'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{capture.raw_text}</p>
                    <p className="text-xs text-on-surface-variant">
                      {format(new Date(capture.created_at), 'h:mm a')}
                      {classification && ` • ${classification.category}`}
                    </p>
                  </div>
                  {classification?.status === 'auto_filed' && (
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="People" path="/people" icon="👤" />
        <StatCard label="Projects" path="/projects" icon="📁" />
        <StatCard label="Ideas" path="/ideas" icon="💡" />
        <StatCard label="Tasks" path="/tasks" icon="✓" />
      </div>
    </div>
  );
}

function StatCard({ label, path, icon }: { label: string; path: string; icon: string }) {
  return (
    <Link
      to={path}
      className="bg-surface rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-medium">{label}</div>
    </Link>
  );
}
