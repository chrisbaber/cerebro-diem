import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  FAB,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import * as api from '@/services/api';
import type { RootStackParamList } from '@/app/Navigation';
import type { Project, ProjectStatus } from '@cerebro-diem/core';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_FILTERS: { label: string; value: ProjectStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Waiting', value: 'waiting' },
  { label: 'Blocked', value: 'blocked' },
  { label: 'Someday', value: 'someday' },
  { label: 'Done', value: 'done' },
];

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: '#2E7D32',
  waiting: '#F57C00',
  blocked: '#C62828',
  someday: '#7B1FA2',
  done: '#546E7A',
};

export default function ProjectsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [selectedStatus, setSelectedStatus] = React.useState<ProjectStatus | 'all'>('active');

  const { data: projects, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });

  const filteredProjects = React.useMemo(() => {
    if (!projects) return [];
    if (selectedStatus === 'all') return projects;
    return projects.filter(p => p.status === selectedStatus);
  }, [projects, selectedStatus]);

  const getStatusColor = (status: ProjectStatus) => STATUS_COLORS[status] || theme.colors.primary;

  const isStale = (updatedAt: string) => {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    return new Date(updatedAt) < fiveDaysAgo;
  };

  const renderProject = ({ item }: { item: Project }) => {
    const stale = item.status === 'active' && isStale(item.updated_at);

    return (
      <Pressable onPress={() => navigation.navigate('ProjectDetail', { id: item.id })}>
        <Surface style={styles.card} elevation={1}>
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(item.status as ProjectStatus) },
                ]}
              />
              <Text variant="titleMedium" style={styles.name}>
                {item.name}
              </Text>
              {stale && (
                <Icon name="alert-circle" size={18} color={theme.colors.error} style={{ marginLeft: 8 }} />
              )}
            </View>
            <Chip
              mode="flat"
              compact
              textStyle={{ fontSize: 10, color: getStatusColor(item.status as ProjectStatus) }}
              style={{ backgroundColor: `${getStatusColor(item.status as ProjectStatus)}20` }}
            >
              {item.status}
            </Chip>
          </View>

          {item.next_action && (
            <View style={styles.nextAction}>
              <Icon name="arrow-right-circle" size={16} color={theme.colors.primary} />
              <Text
                variant="bodyMedium"
                numberOfLines={2}
                style={[styles.nextActionText, { color: theme.colors.onSurfaceVariant }]}
              >
                {item.next_action}
              </Text>
            </View>
          )}

          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            Updated {formatTimeAgo(item.updated_at)}
          </Text>
        </Surface>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Projects
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
      ) : filteredProjects.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="folder-outline" size={64} color={theme.colors.outlineVariant} />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
            No {selectedStatus !== 'all' ? selectedStatus : ''} projects
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
            Capture a thought about a project to add it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={item => item.id}
          renderItem={renderProject}
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
          // TODO: Open add project modal
        }}
      />
    </SafeAreaView>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return `${Math.floor(diffDays / 7)} weeks ago`;
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  name: {
    fontWeight: '600',
    flex: 1,
  },
  nextAction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
  },
  nextActionText: {
    marginLeft: 8,
    flex: 1,
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
