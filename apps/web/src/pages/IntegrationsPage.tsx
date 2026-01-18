import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface EmailAddress {
  id: string;
  address: string;
  is_active: boolean;
  emails_received: number;
  created_at: string;
}

interface IntegrationConnection {
  id: string;
  provider: string;
  workspace_name: string;
  is_active: boolean;
  created_at: string;
}

export default function IntegrationsPage() {
  const queryClient = useQueryClient();

  // Email addresses
  const { data: emailAddresses } = useQuery({
    queryKey: ['email-addresses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_addresses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmailAddress[];
    },
  });

  // Integration connections
  const { data: connections } = useQuery({
    queryKey: ['integration-connections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as IntegrationConnection[];
    },
  });

  // Generate email address
  const generateEmail = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate unique email address
      const suffix = Math.random().toString(36).substring(2, 10);
      const address = `capture-${suffix}@inbound.cerebrodiem.com`;

      const { data, error } = await supabase
        .from('email_addresses')
        .insert({
          user_id: user.id,
          address,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-addresses'] });
    },
  });

  // Toggle email address
  const toggleEmail = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('email_addresses')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-addresses'] });
    },
  });

  // Delete email address
  const deleteEmail = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-addresses'] });
    },
  });

  // Slack OAuth
  const connectSlack = () => {
    const clientId = import.meta.env.VITE_SLACK_CLIENT_ID;
    const redirectUri = `${window.location.origin}/integrations/slack/callback`;
    const scopes = 'chat:write,channels:history,groups:history,im:history,mpim:history,users:read';

    window.location.href = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;
  };

  // Disconnect integration
  const disconnectIntegration = useMutation({
    mutationFn: async (provider: string) => {
      const { error } = await supabase
        .from('integration_connections')
        .update({ is_active: false })
        .eq('provider', provider);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-connections'] });
    },
  });

  const slackConnection = connections?.find(c => c.provider === 'slack' && c.is_active);
  const teamsConnection = connections?.find(c => c.provider === 'teams' && c.is_active);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Integrations</h1>

      {/* Email Capture */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-xl">📧</span>
          Email Capture
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-gray-600 mb-4">
            Forward emails to your personal capture address to automatically import them as thoughts.
          </p>

          {emailAddresses?.length === 0 ? (
            <button
              onClick={() => generateEmail.mutate()}
              disabled={generateEmail.isPending}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {generateEmail.isPending ? 'Generating...' : 'Generate Email Address'}
            </button>
          ) : (
            <div className="space-y-3">
              {emailAddresses?.map(email => (
                <div key={email.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-gray-200 px-2 py-1 rounded font-mono">
                        {email.address}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(email.address)}
                        className="text-gray-500 hover:text-gray-700"
                        title="Copy"
                      >
                        📋
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {email.emails_received} emails received • {email.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleEmail.mutate({ id: email.id, is_active: !email.is_active })}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        email.is_active
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {email.is_active ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this email address?')) {
                          deleteEmail.mutate(email.id);
                        }
                      }}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-sm font-medium hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Forward any email to your capture address</li>
              <li>The email subject and body will be extracted</li>
              <li>AI will classify it and add to your knowledge base</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Slack Integration */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-xl">💬</span>
          Slack
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          {slackConnection ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl">🔗</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Connected to {slackConnection.workspace_name}</p>
                    <p className="text-sm text-gray-500">
                      Since {new Date(slackConnection.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => disconnectIntegration.mutate('slack')}
                  className="px-4 py-2 bg-red-100 text-red-800 rounded-lg font-medium hover:bg-red-200"
                >
                  Disconnect
                </button>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-green-800">
                  <span className="font-medium">✓ Active:</span> DM the Cerebro Diem bot or mention it in any channel to capture thoughts.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">
                Connect Slack to capture thoughts by messaging the Cerebro Diem bot or mentioning it in channels.
              </p>
              <button
                onClick={connectSlack}
                className="px-4 py-2 bg-[#4A154B] text-white rounded-lg font-medium hover:bg-[#3a1039] flex items-center gap-2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                </svg>
                Connect Slack
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Microsoft Teams */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-xl">👥</span>
          Microsoft Teams
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          {teamsConnection ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🔗</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Connected to {teamsConnection.workspace_name}</p>
                  <p className="text-sm text-gray-500">
                    Since {new Date(teamsConnection.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => disconnectIntegration.mutate('teams')}
                className="px-4 py-2 bg-red-100 text-red-800 rounded-lg font-medium hover:bg-red-200"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">
                Connect Microsoft Teams to capture thoughts from Teams messages.
              </p>
              <button
                disabled
                className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg font-medium cursor-not-allowed flex items-center gap-2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.25 3H14.5v3.5h5.5v12H14.5V22h4.75a2.25 2.25 0 0 0 2.25-2.25V5.25A2.25 2.25 0 0 0 19.25 3zM17 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM13 6.5H4.75A2.25 2.25 0 0 0 2.5 8.75v10.5A2.25 2.25 0 0 0 4.75 21.5H13V6.5zM6.5 18.5v-9h4.5v9H6.5z"/>
                </svg>
                Coming Soon
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Calendar (from v1.2) */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-xl">📅</span>
          Calendar
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-gray-600 mb-4">
            Connect your calendar to link events with people, projects, and tasks.
          </p>
          <a
            href="/settings/calendar"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 inline-block"
          >
            Manage Calendar Integration →
          </a>
        </div>
      </section>

      {/* Webhooks */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-xl">🔗</span>
          Webhooks & API
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-gray-600 mb-4">
            Use webhooks to integrate Cerebro Diem with your own tools and automation.
          </p>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">
              Coming soon: REST API and webhook endpoints for custom integrations.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
