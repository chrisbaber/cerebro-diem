import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import {
  Text,
  TextInput,
  Surface,
  useTheme,
  IconButton,
  Badge,
  ActivityIndicator,
  Snackbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useCaptureStore } from '@/stores/captureStore';
import * as api from '@/services/api';
import type { RootStackParamList } from '@/app/Navigation';
import VoiceCaptureButton from './VoiceCaptureButton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [captureText, setCaptureText] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const { captureText: submitCapture, isCapturing, error, clearError } = useCaptureStore();

  // Fetch data
  const { data: digest, isLoading: loadingDigest } = useQuery({
    queryKey: ['latestDigest'],
    queryFn: () => api.getLatestDigest('daily'),
  });

  const { data: needsReview, refetch: refetchReview } = useQuery({
    queryKey: ['needsReview'],
    queryFn: api.getNeedsReview,
  });

  const { data: recentCaptures, isLoading: loadingCaptures, refetch: refetchCaptures } = useQuery({
    queryKey: ['recentCaptures'],
    queryFn: () => api.getCaptures(5),
  });

  const reviewCount = needsReview?.length || 0;

  const handleTextCapture = async () => {
    if (!captureText.trim()) return;

    try {
      await submitCapture(captureText.trim());
      setCaptureText('');
      setShowSuccess(true);
      refetchCaptures();
      refetchReview();
    } catch (e) {
      // Error handled by store
    }
  };

  const onRefresh = useCallback(() => {
    refetchCaptures();
    refetchReview();
  }, [refetchCaptures, refetchReview]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'person':
        return 'account';
      case 'project':
        return 'folder';
      case 'idea':
        return 'lightbulb';
      case 'task':
        return 'checkbox-marked-circle';
      default:
        return 'file-document';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="brain" size={28} color={theme.colors.primary} />
          <Text variant="titleLarge" style={styles.headerTitle}>
            Cerebro Diem
          </Text>
        </View>
        <View style={styles.headerRight}>
          <IconButton
            icon="bell-outline"
            onPress={() => navigation.navigate('Digest')}
          />
          <IconButton
            icon="cog-outline"
            onPress={() => navigation.navigate('Settings')}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loadingCaptures} onRefresh={onRefresh} />
        }
      >
        {/* Capture Input */}
        <Surface style={styles.captureCard} elevation={1}>
          <TextInput
            placeholder="What's on your mind?"
            value={captureText}
            onChangeText={setCaptureText}
            mode="outlined"
            multiline
            numberOfLines={3}
            right={
              captureText.trim() ? (
                <TextInput.Icon
                  icon="send"
                  onPress={handleTextCapture}
                  disabled={isCapturing}
                />
              ) : null
            }
            style={styles.captureInput}
          />
          <View style={styles.captureActions}>
            <VoiceCaptureButton
              onCaptureComplete={() => {
                setShowSuccess(true);
                refetchCaptures();
                refetchReview();
              }}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Hold to record
            </Text>
          </View>
        </Surface>

        {/* Today's Digest */}
        {digest && !digest.read && (
          <Pressable onPress={() => navigation.navigate('Digest')}>
            <Surface style={styles.digestCard} elevation={1}>
              <View style={styles.digestHeader}>
                <Icon name="email-newsletter" size={24} color={theme.colors.primary} />
                <Text variant="titleMedium" style={styles.digestTitle}>
                  Today's Digest
                </Text>
              </View>
              <Text
                variant="bodyMedium"
                numberOfLines={4}
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {digest.content.slice(0, 200)}...
              </Text>
              <Text variant="labelMedium" style={{ color: theme.colors.primary, marginTop: 8 }}>
                View Full Digest →
              </Text>
            </Surface>
          </Pressable>
        )}

        {/* Needs Review */}
        {reviewCount > 0 && (
          <Pressable onPress={() => navigation.navigate('ReviewQueue')}>
            <Surface style={styles.reviewCard} elevation={1}>
              <View style={styles.reviewContent}>
                <Icon name="inbox" size={24} color={theme.colors.tertiary} />
                <Text variant="titleMedium" style={styles.reviewText}>
                  {reviewCount} item{reviewCount !== 1 ? 's' : ''} need review
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
            </Surface>
          </Pressable>
        )}

        {/* Recent Activity */}
        <View style={styles.recentSection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Recent Activity
          </Text>
          {loadingCaptures ? (
            <ActivityIndicator style={styles.loader} />
          ) : recentCaptures && recentCaptures.length > 0 ? (
            recentCaptures.map(capture => (
              <Surface key={capture.id} style={styles.captureItem} elevation={0}>
                <Icon
                  name="text-box-outline"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="bodyMedium"
                  numberOfLines={2}
                  style={styles.captureItemText}
                >
                  {capture.raw_text}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {formatTimeAgo(capture.created_at)}
                </Text>
              </Surface>
            ))
          ) : (
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', padding: 24 }}
            >
              No captures yet. Start by typing or recording a thought above!
            </Text>
          )}
        </View>
      </ScrollView>

      <Snackbar
        visible={showSuccess}
        onDismiss={() => setShowSuccess(false)}
        duration={2000}
        action={{
          label: 'OK',
          onPress: () => setShowSuccess(false),
        }}
      >
        Thought captured!
      </Snackbar>

      <Snackbar
        visible={!!error}
        onDismiss={clearError}
        duration={3000}
        action={{
          label: 'OK',
          onPress: clearError,
        }}
      >
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    marginLeft: 8,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  captureCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  captureInput: {
    backgroundColor: 'transparent',
  },
  captureActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  digestCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  digestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  digestTitle: {
    marginLeft: 8,
    fontWeight: '600',
  },
  reviewCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewText: {
    marginLeft: 12,
  },
  recentSection: {
    marginTop: 8,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  captureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  captureItemText: {
    flex: 1,
    marginHorizontal: 12,
  },
  loader: {
    padding: 24,
  },
});
