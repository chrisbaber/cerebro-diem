import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import * as api from '@/services/api';

export default function DigestScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const { data: digest, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['latestDigest'],
    queryFn: () => api.getLatestDigest('daily'),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.generateDigest('daily'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['latestDigest'] });
    },
  });

  // Mark as read when viewed
  useEffect(() => {
    if (digest && !digest.read) {
      api.markDigestRead(digest.id);
    }
  }, [digest]);

  const formatDigestTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {isLoading ? (
          <ActivityIndicator style={styles.loader} />
        ) : digest ? (
          <>
            <View style={styles.header}>
              <Icon name="email-newsletter" size={32} color={theme.colors.primary} />
              <View style={styles.headerText}>
                <Text variant="titleLarge" style={styles.title}>
                  Daily Digest
                </Text>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {formatDigestTime(digest.generated_at)}
                </Text>
              </View>
            </View>

            <Surface style={styles.digestCard} elevation={1}>
              <Text variant="bodyLarge" style={styles.digestContent}>
                {digest.content}
              </Text>
            </Surface>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="email-newsletter-outline" size={64} color={theme.colors.outlineVariant} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
              No digest yet
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}
            >
              Your daily digest will be generated automatically each morning, or you can generate one now.
            </Text>
          </View>
        )}

        <Button
          mode="contained"
          onPress={() => generateMutation.mutate()}
          loading={generateMutation.isPending}
          disabled={generateMutation.isPending}
          icon="refresh"
          style={styles.generateButton}
        >
          Generate New Digest
        </Button>

        {generateMutation.isError && (
          <Text variant="bodySmall" style={{ color: theme.colors.error, textAlign: 'center', marginTop: 8 }}>
            Failed to generate digest. Please try again.
          </Text>
        )}
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
    marginBottom: 16,
  },
  headerText: {
    marginLeft: 12,
  },
  title: {
    fontWeight: 'bold',
  },
  digestCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  digestContent: {
    lineHeight: 26,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginVertical: 48,
  },
  generateButton: {
    marginTop: 8,
  },
  loader: {
    marginVertical: 64,
  },
});
