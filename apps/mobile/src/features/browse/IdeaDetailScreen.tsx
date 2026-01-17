import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  TextInput,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import * as api from '@/services/api';
import type { RootStackParamList } from '@/app/Navigation';

type RouteProps = RouteProp<RootStackParamList, 'IdeaDetail'>;

export default function IdeaDetailScreen() {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { id } = route.params;

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [oneLiner, setOneLiner] = useState('');
  const [notes, setNotes] = useState('');

  const { data: idea, isLoading } = useQuery({
    queryKey: ['idea', id],
    queryFn: () => api.getIdea(id),
  });

  React.useEffect(() => {
    if (idea) {
      setTitle(idea.title);
      setOneLiner(idea.one_liner || '');
      setNotes(idea.notes || '');
    }
  }, [idea]);

  const updateMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) => api.updateIdea(id, updates as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['idea', id] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteIdea(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      navigation.goBack();
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ title, one_liner: oneLiner, notes });
  };

  const handleDelete = () => {
    Alert.alert('Delete Idea', 'Are you sure you want to delete this idea?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  if (isLoading) {
    return <ActivityIndicator style={styles.loader} />;
  }

  if (!idea) {
    return (
      <View style={styles.emptyState}>
        <Text>Idea not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Icon name="lightbulb" size={32} color={theme.colors.tertiary} />
          {isEditing ? (
            <TextInput
              mode="outlined"
              value={title}
              onChangeText={setTitle}
              style={styles.titleInput}
            />
          ) : (
            <Text variant="headlineSmall" style={styles.title}>
              {idea.title}
            </Text>
          )}
        </View>

        <Surface style={styles.section} elevation={1}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            One-Liner
          </Text>
          {isEditing ? (
            <TextInput
              mode="outlined"
              value={oneLiner}
              onChangeText={setOneLiner}
              placeholder="The core insight in one sentence"
              multiline
            />
          ) : (
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
              {idea.one_liner || 'No one-liner added'}
            </Text>
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
              numberOfLines={6}
              placeholder="Elaborate on this idea..."
            />
          ) : (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {idea.notes || 'No notes'}
            </Text>
          )}
        </Surface>

        <Text variant="labelSmall" style={[styles.created, { color: theme.colors.onSurfaceVariant }]}>
          Created: {new Date(idea.created_at).toLocaleDateString()}
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
  title: {
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  titleInput: {
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
