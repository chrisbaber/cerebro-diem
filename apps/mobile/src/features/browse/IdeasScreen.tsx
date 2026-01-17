import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
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
import type { Idea } from '@cerebro-diem/core';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function IdeasScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: ideas, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['ideas'],
    queryFn: api.getIdeas,
  });

  const filteredIdeas = React.useMemo(() => {
    if (!searchQuery) return ideas || [];
    const query = searchQuery.toLowerCase();
    return (ideas || []).filter(
      i =>
        i.title.toLowerCase().includes(query) ||
        i.one_liner?.toLowerCase().includes(query) ||
        i.notes?.toLowerCase().includes(query)
    );
  }, [ideas, searchQuery]);

  const renderIdea = ({ item }: { item: Idea }) => (
    <Pressable onPress={() => navigation.navigate('IdeaDetail', { id: item.id })}>
      <Surface style={styles.card} elevation={1}>
        <View style={styles.cardHeader}>
          <Icon name="lightbulb" size={24} color={theme.colors.tertiary} />
          <Text variant="titleMedium" style={styles.title}>
            {item.title}
          </Text>
        </View>

        {item.one_liner && (
          <Text
            variant="bodyMedium"
            numberOfLines={2}
            style={[styles.oneLiner, { color: theme.colors.onSurfaceVariant }]}
          >
            {item.one_liner}
          </Text>
        )}

        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
          {formatDate(item.created_at)}
        </Text>
      </Surface>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.headerTitle}>
          Ideas
        </Text>
      </View>

      <Searchbar
        placeholder="Search ideas..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : filteredIdeas.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="lightbulb-outline" size={64} color={theme.colors.outlineVariant} />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
            {searchQuery ? 'No ideas found' : 'No ideas yet'}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
            {searchQuery
              ? 'Try a different search term'
              : 'Capture a "what if" or creative thought to add it here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredIdeas}
          keyExtractor={item => item.id}
          renderItem={renderIdea}
          numColumns={2}
          columnWrapperStyle={styles.row}
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
          // TODO: Open add idea modal
        }}
      />
    </SafeAreaView>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
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
  headerTitle: {
    fontWeight: 'bold',
  },
  searchbar: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  list: {
    padding: 12,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    margin: 4,
    maxWidth: '48%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  oneLiner: {
    marginTop: 8,
    lineHeight: 20,
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
