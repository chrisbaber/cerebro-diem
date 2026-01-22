import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  Button,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import * as api from '@/services/api';
import type { Classification, Category } from '@cerebro-diem/core';

interface ClassificationWithCapture extends Classification {
  captures?: {
    raw_text: string;
  };
}

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'person', label: 'Person', icon: 'account' },
  { value: 'project', label: 'Project', icon: 'folder' },
  { value: 'idea', label: 'Idea', icon: 'lightbulb' },
  { value: 'task', label: 'Task', icon: 'checkbox-marked-circle' },
];

export default function ReviewQueueScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const { data: items, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['needsReview'],
    queryFn: api.getNeedsReview,
  });

  const reclassifyMutation = useMutation({
    mutationFn: async ({
      classificationId,
      newCategory,
      extractedFields,
    }: {
      classificationId: string;
      newCategory: Category;
      extractedFields: Record<string, unknown>;
    }) => {
      // Update the classification
      await api.updateClassification(classificationId, {
        category: newCategory,
        extracted_fields: extractedFields,
        status: 'manually_filed',
      } as any);

      // The Edge Function would normally create the destination record
      // For now, we'll just mark it as manually filed
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['needsReview'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleReclassify = (item: ClassificationWithCapture, newCategory: Category) => {
    // Use the existing extracted fields or create minimal ones
    const extractedFields = (item.extracted_fields || {}) as unknown as Record<string, unknown>;

    reclassifyMutation.mutate({
      classificationId: item.id,
      newCategory,
      extractedFields,
    });
  };

  const handleConfirmAIGuess = (item: ClassificationWithCapture) => {
    reclassifyMutation.mutate({
      classificationId: item.id,
      newCategory: item.category,
      extractedFields: item.extracted_fields as unknown as Record<string, unknown>,
    });
  };

  const renderItem = ({ item }: { item: ClassificationWithCapture }) => {
    const rawText = item.captures?.raw_text || 'Unknown capture';
    const confidencePercent = Math.round(item.confidence * 100);

    return (
      <Surface style={styles.card} elevation={1}>
        <Text variant="bodyLarge" style={styles.captureText}>
          "{rawText}"
        </Text>

        <View style={styles.aiGuess}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            AI guess:
          </Text>
          <Chip
            mode="flat"
            compact
            icon={CATEGORIES.find(c => c.value === item.category)?.icon}
            style={styles.guessChip}
          >
            {item.category} ({confidencePercent}%)
          </Chip>
        </View>

        <View style={styles.actions}>
          <Button
            mode="contained-tonal"
            onPress={() => handleConfirmAIGuess(item)}
            disabled={reclassifyMutation.isPending}
            compact
            style={styles.confirmButton}
          >
            AI Got It Right
          </Button>
        </View>

        <View style={styles.categoryButtons}>
          {CATEGORIES.map(cat => (
            <Button
              key={cat.value}
              mode="outlined"
              onPress={() => handleReclassify(item, cat.value)}
              disabled={reclassifyMutation.isPending}
              compact
              icon={cat.icon}
              style={[
                styles.categoryButton,
                item.category === cat.value && styles.categoryButtonSelected,
              ]}
            >
              {cat.label}
            </Button>
          ))}
        </View>
      </Surface>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : items && items.length > 0 ? (
        <FlatList
          data={items as ClassificationWithCapture[]}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Icon name="inbox-outline" size={64} color={theme.colors.outlineVariant} />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
            All caught up!
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}
          >
            No items need review. The AI is doing a good job classifying your thoughts.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  captureText: {
    fontStyle: 'italic',
    marginBottom: 12,
  },
  aiGuess: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  guessChip: {
    marginLeft: 8,
  },
  actions: {
    marginBottom: 12,
  },
  confirmButton: {
    marginBottom: 8,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flex: 1,
    minWidth: '45%',
  },
  categoryButtonSelected: {
    borderWidth: 2,
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
});
