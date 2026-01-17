import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  TextInput,
  Button,
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
import type { TaskStatus } from '@cerebro-diem/core';

type RouteProps = RouteProp<RootStackParamList, 'TaskDetail'>;

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export default function TaskDetailScreen() {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { id } = route.params;

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => api.getTask(id),
  });

  React.useEffect(() => {
    if (task) {
      setName(task.name);
      setStatus(task.status as TaskStatus);
      setDueDate(task.due_date || '');
      setNotes(task.notes || '');
    }
  }, [task]);

  const updateMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) => api.updateTask(id, updates as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigation.goBack();
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      name,
      status,
      due_date: dueDate || null,
      notes,
    });
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus as TaskStatus);
    if (!isEditing) {
      updateMutation.mutate({ status: newStatus });
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  if (isLoading) {
    return <ActivityIndicator style={styles.loader} />;
  }

  if (!task) {
    return (
      <View style={styles.emptyState}>
        <Text>Task not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Icon name="checkbox-marked-circle" size={32} color={theme.colors.primary} />
          {isEditing ? (
            <TextInput
              mode="outlined"
              value={name}
              onChangeText={setName}
              style={styles.nameInput}
            />
          ) : (
            <Text
              variant="headlineSmall"
              style={[
                styles.name,
                task.status === 'done' && styles.nameDone,
              ]}
            >
              {task.name}
            </Text>
          )}
        </View>

        <Surface style={styles.section} elevation={1}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            Status
          </Text>
          <SegmentedButtons
            value={status}
            onValueChange={handleStatusChange}
            buttons={STATUS_OPTIONS}
          />
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            Due Date
          </Text>
          {isEditing ? (
            <TextInput
              mode="outlined"
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD (optional)"
            />
          ) : (
            <View style={styles.dueDateBox}>
              <Icon name="calendar" size={20} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyLarge" style={{ marginLeft: 8, color: theme.colors.onSurfaceVariant }}>
                {task.due_date ? formatDueDate(task.due_date) : 'No due date'}
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
              {task.notes || 'No notes'}
            </Text>
          )}
        </Surface>

        {task.completed_at && (
          <Text variant="labelSmall" style={[styles.completed, { color: theme.colors.onSurfaceVariant }]}>
            Completed: {new Date(task.completed_at).toLocaleDateString()}
          </Text>
        )}

        <Text variant="labelSmall" style={[styles.created, { color: theme.colors.onSurfaceVariant }]}>
          Created: {new Date(task.created_at).toLocaleDateString()}
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

function formatDueDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
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
  nameDone: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
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
  dueDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completed: {
    textAlign: 'center',
    marginBottom: 4,
  },
  created: {
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
