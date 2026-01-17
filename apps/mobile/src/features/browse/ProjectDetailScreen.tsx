import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  TextInput,
  Button,
  Chip,
  SegmentedButtons,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import * as api from '@/services/api';
import type { RootStackParamList } from '@/app/Navigation';
import type { ProjectStatus } from '@cerebro-diem/core';

type RouteProps = RouteProp<RootStackParamList, 'ProjectDetail'>;

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'someday', label: 'Someday' },
  { value: 'done', label: 'Done' },
];

export default function ProjectDetailScreen() {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { id } = route.params;

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [nextAction, setNextAction] = useState('');
  const [notes, setNotes] = useState('');

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.getProject(id),
  });

  React.useEffect(() => {
    if (project) {
      setName(project.name);
      setStatus(project.status as ProjectStatus);
      setNextAction(project.next_action || '');
      setNotes(project.notes || '');
    }
  }, [project]);

  const updateMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) => api.updateProject(id, updates as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigation.goBack();
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ name, status, next_action: nextAction, notes });
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus as ProjectStatus);
    if (!isEditing) {
      updateMutation.mutate({ status: newStatus });
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Project', 'Are you sure you want to delete this project?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  if (isLoading) {
    return <ActivityIndicator style={styles.loader} />;
  }

  if (!project) {
    return (
      <View style={styles.emptyState}>
        <Text>Project not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Icon name="folder" size={32} color={theme.colors.primary} />
          {isEditing ? (
            <TextInput
              mode="outlined"
              value={name}
              onChangeText={setName}
              style={styles.nameInput}
            />
          ) : (
            <Text variant="headlineSmall" style={styles.name}>
              {project.name}
            </Text>
          )}
        </View>

        <Surface style={styles.section} elevation={1}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            Status
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <SegmentedButtons
              value={status}
              onValueChange={handleStatusChange}
              buttons={STATUS_OPTIONS}
              density="small"
            />
          </ScrollView>
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            Next Action
          </Text>
          {isEditing ? (
            <TextInput
              mode="outlined"
              value={nextAction}
              onChangeText={setNextAction}
              placeholder="What's the next concrete step?"
              multiline
            />
          ) : (
            <View style={styles.nextActionBox}>
              <Icon name="arrow-right-circle" size={20} color={theme.colors.primary} />
              <Text variant="bodyLarge" style={styles.nextActionText}>
                {project.next_action || 'No next action defined'}
              </Text>
            </View>
          )}
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            Notes
          </Text>
          {isEditing ? (
            <TextInput
              mode="outlined"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              placeholder="Additional notes..."
            />
          ) : (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {project.notes || 'No notes'}
            </Text>
          )}
        </Surface>

        <Text variant="labelSmall" style={[styles.lastUpdated, { color: theme.colors.onSurfaceVariant }]}>
          Last updated: {new Date(project.updated_at).toLocaleDateString()}
        </Text>

        <View style={styles.actions}>
          {isEditing ? (
            <>
              <Button mode="outlined" onPress={() => setIsEditing(false)} style={styles.actionButton}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={updateMutation.isPending}
                style={styles.actionButton}
              >
                Save
              </Button>
            </>
          ) : (
            <>
              <Button mode="outlined" onPress={() => setIsEditing(true)} style={styles.actionButton}>
                Edit
              </Button>
              <Button
                mode="outlined"
                onPress={handleDelete}
                textColor={theme.colors.error}
                style={styles.actionButton}
              >
                Delete
              </Button>
            </>
          )}
        </View>
      </ScrollView>
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
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  name: {
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  nameInput: {
    flex: 1,
    marginLeft: 12,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  nextActionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
  },
  nextActionText: {
    marginLeft: 8,
    flex: 1,
  },
  lastUpdated: {
    textAlign: 'center',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
