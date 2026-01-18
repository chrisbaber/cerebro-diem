import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, User, Clock, Sliders, Download, Tag, Folder, Palette } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';

export default function SettingsPage() {
  const { user, signOut } = useAuthStore();
  const queryClient = useQueryClient();
  const [digestTime, setDigestTime] = useState('08:00');

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: customCategories = [] } = useQuery({
    queryKey: ['custom-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_categories')
        .select('*')
        .order('sort_order');
      if (error) return [];
      return data;
    },
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['all-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('usage_count', { ascending: false });
      if (error) return [];
      return data;
    },
  });

  useEffect(() => {
    if (profile?.digest_time) {
      setDigestTime(profile.digest_time.slice(0, 5));
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const saveDigestTime = () => {
    updateMutation.mutate({ digest_time: `${digestTime}:00` });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Settings className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Account */}
      <section className="bg-surface rounded-xl p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <User className="w-5 h-5" />
          Account
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-on-surface-variant">Email</label>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm text-on-surface-variant">Display Name</label>
            <p className="font-medium">{profile?.display_name || 'Not set'}</p>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="bg-surface rounded-xl p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <Sliders className="w-5 h-5" />
          Preferences
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-on-surface-variant mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Daily Digest Time
            </label>
            <div className="flex gap-2">
              <input
                type="time"
                value={digestTime}
                onChange={(e) => setDigestTime(e.target.value)}
                className="px-4 py-2 rounded-xl border border-outline/30 bg-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={saveDigestTime}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm text-on-surface-variant">Voice Capture Mode</label>
            <p className="font-medium capitalize">{profile?.voice_mode?.replace('_', ' ') || 'Push to talk'}</p>
          </div>

          <div>
            <label className="text-sm text-on-surface-variant">Confidence Threshold</label>
            <p className="font-medium">{Math.round((profile?.confidence_threshold || 0.6) * 100)}%</p>
          </div>
        </div>
      </section>

      {/* Custom Categories (v1.2) */}
      <section className="bg-surface rounded-xl p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <Folder className="w-5 h-5" />
          Custom Categories
        </h2>
        {customCategories.length === 0 ? (
          <p className="text-on-surface-variant text-sm">
            No custom categories yet. Custom categories allow you to extend beyond People, Projects, Ideas, and Tasks.
          </p>
        ) : (
          <div className="space-y-2">
            {customCategories.map((cat: any) => (
              <div key={cat.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-variant/30">
                <span style={{ color: cat.color }}>{cat.icon}</span>
                <span className="font-medium">{cat.name}</span>
              </div>
            ))}
          </div>
        )}
        <button className="mt-4 px-4 py-2 border border-primary text-primary rounded-xl hover:bg-primary-container/30 transition-colors">
          Add Category
        </button>
      </section>

      {/* Tags (v1.2) */}
      <section className="bg-surface rounded-xl p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <Tag className="w-5 h-5" />
          Tags
        </h2>
        {tags.length === 0 ? (
          <p className="text-on-surface-variant text-sm">
            No tags yet. Tags help you organize and filter your items.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag: any) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
                <span className="text-xs opacity-60">({tag.usage_count})</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Data */}
      <section className="bg-surface rounded-xl p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <Download className="w-5 h-5" />
          Data
        </h2>
        <button className="px-4 py-2 border border-outline/30 rounded-xl hover:bg-surface-variant transition-colors">
          Export All Data (JSON)
        </button>
      </section>

      {/* Danger Zone */}
      <section className="bg-surface rounded-xl p-6 shadow-sm border border-error/30">
        <h2 className="text-lg font-semibold mb-4 text-error">Danger Zone</h2>
        <div className="space-y-4">
          <button
            onClick={() => signOut()}
            className="px-4 py-2 border border-error text-error rounded-xl hover:bg-error/10 transition-colors"
          >
            Sign Out
          </button>
          <button className="px-4 py-2 bg-error text-white rounded-xl hover:bg-error/90 transition-colors">
            Delete Account
          </button>
        </div>
      </section>
    </div>
  );
}
