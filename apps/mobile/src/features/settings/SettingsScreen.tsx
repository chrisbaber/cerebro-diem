import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  List,
  Switch,
  Button,
  Divider,
  TextInput,
  Dialog,
  Portal,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/authStore';
import * as api from '@/services/api';
import type { VoiceMode } from '@cerebro-diem/core';

export default function SettingsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();

  const [digestTimeDialogVisible, setDigestTimeDialogVisible] = useState(false);
  const [newDigestTime, setNewDigestTime] = useState('08:00');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) => api.updateProfile(updates as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  useEffect(() => {
    if (profile?.digest_time) {
      setNewDigestTime(profile.digest_time.slice(0, 5)); // HH:MM
    }
  }, [profile]);

  const handleVoiceModeToggle = () => {
    if (!profile) return;
    const newMode: VoiceMode =
      profile.voice_mode === 'push_to_talk' ? 'tap_to_start' : 'push_to_talk';
    updateProfileMutation.mutate({ voice_mode: newMode });
  };

  const handleSaveDigestTime = () => {
    updateProfileMutation.mutate({ digest_time: `${newDigestTime}:00` });
    setDigestTimeDialogVisible(false);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion
            Alert.alert('Coming Soon', 'Account deletion will be available soon.');
          },
        },
      ]
    );
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView style={styles.scrollView}>
        {/* Account Section */}
        <Surface style={styles.section} elevation={0}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            Account
          </Text>
          <List.Item
            title="Email"
            description={user?.email}
            left={props => <List.Icon {...props} icon="email" />}
          />
          <List.Item
            title="Display Name"
            description={profile?.display_name || 'Not set'}
            left={props => <List.Icon {...props} icon="account" />}
          />
        </Surface>

        <Divider />

        {/* Preferences Section */}
        <Surface style={styles.section} elevation={0}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            Preferences
          </Text>

          <List.Item
            title="Voice Capture Mode"
            description={
              profile?.voice_mode === 'push_to_talk'
                ? 'Push to talk (hold to record)'
                : 'Tap to start (auto-detect end)'
            }
            left={props => <List.Icon {...props} icon="microphone" />}
            right={() => (
              <Switch
                value={profile?.voice_mode === 'tap_to_start'}
                onValueChange={handleVoiceModeToggle}
                disabled={updateProfileMutation.isPending}
              />
            )}
          />

          <List.Item
            title="Daily Digest Time"
            description={profile?.digest_time ? formatTime(profile.digest_time.slice(0, 5)) : '8:00 AM'}
            left={props => <List.Icon {...props} icon="clock-outline" />}
            onPress={() => setDigestTimeDialogVisible(true)}
            right={props => <List.Icon {...props} icon="chevron-right" />}
          />

          <List.Item
            title="Timezone"
            description={profile?.timezone || 'America/Chicago'}
            left={props => <List.Icon {...props} icon="earth" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
          />

          <List.Item
            title="Confidence Threshold"
            description={`${Math.round((profile?.confidence_threshold || 0.6) * 100)}% - Items below this need review`}
            left={props => <List.Icon {...props} icon="tune" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
          />
        </Surface>

        <Divider />

        {/* Data Section */}
        <Surface style={styles.section} elevation={0}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            Data
          </Text>

          <List.Item
            title="Export All Data"
            description="Download your data as JSON"
            left={props => <List.Icon {...props} icon="download" />}
            onPress={() => Alert.alert('Coming Soon', 'Data export will be available soon.')}
          />
        </Surface>

        <Divider />

        {/* About Section */}
        <Surface style={styles.section} elevation={0}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            About
          </Text>

          <List.Item
            title="Version"
            description="0.1.0 (MVP)"
            left={props => <List.Icon {...props} icon="information" />}
          />

          <List.Item
            title="Privacy Policy"
            left={props => <List.Icon {...props} icon="shield-lock" />}
            onPress={() => {}}
            right={props => <List.Icon {...props} icon="open-in-new" />}
          />

          <List.Item
            title="Terms of Service"
            left={props => <List.Icon {...props} icon="file-document" />}
            onPress={() => {}}
            right={props => <List.Icon {...props} icon="open-in-new" />}
          />
        </Surface>

        <Divider />

        {/* Danger Zone */}
        <Surface style={styles.section} elevation={0}>
          <Button
            mode="outlined"
            onPress={handleLogout}
            style={styles.signOutButton}
            icon="logout"
          >
            Sign Out
          </Button>

          <Button
            mode="text"
            onPress={handleDeleteAccount}
            textColor={theme.colors.error}
            style={styles.deleteButton}
          >
            Delete Account
          </Button>
        </Surface>
      </ScrollView>

      {/* Digest Time Dialog */}
      <Portal>
        <Dialog visible={digestTimeDialogVisible} onDismiss={() => setDigestTimeDialogVisible(false)}>
          <Dialog.Title>Daily Digest Time</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
              What time should your daily digest arrive?
            </Text>
            <TextInput
              mode="outlined"
              label="Time (HH:MM)"
              value={newDigestTime}
              onChangeText={setNewDigestTime}
              placeholder="08:00"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDigestTimeDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSaveDigestTime}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingVertical: 8,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontWeight: '600',
  },
  signOutButton: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  deleteButton: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 32,
  },
});
