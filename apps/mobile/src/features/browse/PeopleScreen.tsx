import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  FAB,
  Searchbar,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import * as api from '@/services/api';
import type { RootStackParamList } from '@/app/Navigation';
import type { Person } from '@cerebro-diem/core';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PeopleScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: people, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['people'],
    queryFn: api.getPeople,
  });

  const filteredPeople = React.useMemo(() => {
    if (!searchQuery) return people || [];
    const query = searchQuery.toLowerCase();
    return (people || []).filter(
      p =>
        p.name.toLowerCase().includes(query) ||
        p.context?.toLowerCase().includes(query)
    );
  }, [people, searchQuery]);

  const renderPerson = ({ item }: { item: Person }) => {
    const followUpCount = item.follow_ups?.length || 0;
    const lastTouched = formatTimeAgo(item.last_touched);

    return (
      <Surface
        style={styles.card}
        elevation={1}
        onTouchEnd={() => navigation.navigate('PersonDetail', { id: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
            <Icon name="account" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.name}>
              {item.name}
            </Text>
            {item.context && (
              <Text
                variant="bodyMedium"
                numberOfLines={1}
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {item.context}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {followUpCount > 0
              ? `${followUpCount} follow-up${followUpCount !== 1 ? 's' : ''}`
              : 'No follow-ups'}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {lastTouched}
          </Text>
        </View>
      </Surface>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          People
        </Text>
      </View>

      <Searchbar
        placeholder="Search people..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : filteredPeople.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="account-group-outline" size={64} color={theme.colors.outlineVariant} />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
            {searchQuery ? 'No people found' : 'No people yet'}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
            {searchQuery
              ? 'Try a different search term'
              : 'Capture a thought about someone to add them here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredPeople}
          keyExtractor={item => item.id}
          renderItem={renderPerson}
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
          // TODO: Open add person modal
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

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
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
  searchbar: {
    marginHorizontal: 16,
    marginBottom: 8,
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
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
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
