import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  FAB,
  Chip,
  Checkbox,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import * as api from '@/services/api';
import type { RootStackParamList } from '@/app/Navigation';
import type { Task, TaskStatus } from '@cerebro-diem/core';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_FILTERS: { label: string; value: TaskStatus | 'all' }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Done', value: 'done' },
  { label: 'All', value: 'all' },
];

export default function TasksScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = React.useState<TaskStatus | 'all'>('pending');

  const { data: tasks, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      api.updateTask(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const filteredTasks = React.useMemo(() => {
    if (!tasks) return [];
    if (selectedStatus === 'all') return tasks;
    return tasks.filter(t => t.status === selectedStatus);
  }, [tasks, selectedStatus]);

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const isDueToday = (dueDate: string | null) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    return (
      due.getDate() === today.getDate() &&
      due.getMonth() === today.getMonth() &&
      due.getFullYear() === today.getFullYear()
    );
  };

  const handleToggleTask = (task: Task) => {
    const newStatus: TaskStatus = task.status === 'done' ? 'pending' : 'done';
    updateTaskMutation.mutate({ id: task.id, status: newStatus });
  };

  const renderTask = ({ item }: { item: Task }) => {
    const overdue = item.status !== 'done' && isOverdue(item.due_date);
    const dueToday = item.status !== 'done' && isDueToday(item.due_date);

    return (
      <Pressable onPress={() => navigation.navigate('TaskDetail', { id: item.id })}>
        <Surface style={styles.card} elevation={1}>
          <View style={styles.cardContent}>
            <Checkbox
              status={item.status === 'done' ? 'checked' : 'unchecked'}
              onPress={() => handleToggleTask(item)}
              color={theme.colors.primary}
            />
            <View style={styles.taskInfo}>
              <Text
                variant="bodyLarge"
                style={[
                  styles.taskName,
                  item.status === 'done' && styles.taskDone,
                ]}
              >
                {item.name}
              </Text>
              {item.due_date && (
                <View style={styles.dueRow}>
                  <Icon
                    name="calendar"
                    size={14}
                    color={
                      overdue
                        ? theme.colors.error
                        : dueToday
                        ? theme.colors.tertiary
                        : theme.colors.onSurfaceVariant
                    }
                  />
                  <Text
                    variant="labelSmall"
                    style={{
                      marginLeft: 4,
                      color: overdue
                        ? theme.colors.error
                        : dueToday
                        ? theme.colors.tertiary
                        : theme.colors.onSurfaceVariant,
                    }}
                  >
                    {overdue ? 'Overdue: ' : dueToday ? 'Due today' : ''}
                    {formatDueDate(item.due_date)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Surface>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Tasks
        </Text>
      </View>

      <View style={styles.filters}>
        <FlatList
          horizontal
          data={STATUS_FILTERS}
          keyExtractor={item => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <Chip
              mode={selectedStatus === item.value ? 'flat' : 'outlined'}
              selected={selectedStatus === item.value}
              onPress={() => setSelectedStatus(item.value)}
              style={styles.filterChip}
            >
              {item.label}
            </Chip>
          )}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : filteredTasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="checkbox-marked-circle-outline" size={64} color={theme.colors.outlineVariant} />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
            {selectedStatus === 'done' ? 'No completed tasks' : 'No tasks'}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
            {selectedStatus === 'done'
              ? 'Complete some tasks to see them here'
              : 'Capture a quick action item to add it here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={item => item.id}
          renderItem={renderTask}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => {
          // TODO: Open add task modal
        }}
      />
    </SafeAreaView>
  );
}

function formatDueDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return 'Today';
  }

  if (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  ) {
    return 'Tomorrow';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  filters: {
    marginBottom: 8,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingRight: 16,
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontWeight: '500',
  },
  taskDone: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
