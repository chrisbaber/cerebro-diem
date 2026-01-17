import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  TextInput,
  Button,
  Chip,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import * as api from '@/services/api';
import type { RootStackParamList } from '@/app/Navigation';

type RouteProps = RouteProp<RootStackParamList, 'PersonDetail'>;

export default function PersonDetailScreen() {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { id } = route.params;

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [context, setContext] = useState('');
  const [newFollowUp, setNewFollowUp] = useState('');

  const { data: person, isLoading } = useQuery({
    queryKey: ['person', id],
    queryFn: () => api.getPerson(id),
  });

  React.useEffect(() => {
    if (person) {
      setName(person.name);
      setContext(person.context || '');
    }
  }, [person]);

  const updateMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) => api.updatePerson(id, updates as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', id] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deletePerson(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      navigation.goBack();
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ name, context });
  };

  const handleAddFollowUp = () => {
    if (!newFollowUp.trim() || !person) return;
    const updatedFollowUps = [...(person.follow_ups || []), newFollowUp.trim()];
    updateMutation.mutate({ follow_ups: updatedFollowUps });
    setNewFollowUp('');
  };

  const handleRemoveFollowUp = (index: number) => {
    if (!person) return;
    const updatedFollowUps = person.follow_ups.filter((_, i) => i !== index);
    updateMutation.mutate({ follow_ups: updatedFollowUps });
  };

  const handleDelete = () => {
    Alert.alert('Delete Person', 'Are you sure you want to delete this person?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  if (isLoading) {
    return <ActivityIndicator style={styles.loader} />;
  }

  if (!person) {
    return (
      <View style={styles.emptyState}>
        <Text>Person not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
            <Icon name="account" size={48} color={theme.colors.primary} />
          </View>
          {isEditing ? (
            <TextInput
              mode="outlined"
              value={name}
              onChangeText={setName}
              style={styles.nameInput}
            />
          ) : (
            <Text variant="headlineMedium" style={styles.name}>
              {person.name}
            </Text>
          )}
        </View>

        <Surface style={styles.section} elevation={1}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            Context
          </Text>
          {isEditing ? (
            <TextInput
              mode="outlined"
              value={context}
              onChangeText={setContext}
              multiline
              numberOfLines={3}
              placeholder="How do you know this person?"
            />
          ) : (
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              {person.context || 'No context added'}
            </Text>
          )}
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            Follow-ups
          </Text>
          {person.follow_ups && person.follow_ups.length > 0 ? (
            <View style={styles.followUpsList}>
              {person.follow_ups.map((followUp, index) => (
                <Chip
                  key={index}
                  mode="outlined"
                  onClose={isEditing ? () => handleRemoveFollowUp(index) : undefined}
                  style={styles.followUpChip}
                >
                  {followUp}
                </Chip>
              ))}
            </View>
          ) : (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              No follow-ups
            </Text>
          )}

          <View style={styles.addFollowUp}>
            <TextInput
              mode="outlined"
              placeholder="Add a follow-up..."
              value={newFollowUp}
              onChangeText={setNewFollowUp}
              style={styles.followUpInput}
              right={
                <TextInput.Icon
                  icon="plus"
                  onPress={handleAddFollowUp}
                  disabled={!newFollowUp.trim()}
                />
              }
            />
          </View>
        </Surface>

        <Text variant="labelSmall" style={[styles.lastTouched, { color: theme.colors.onSurfaceVariant }]}>
          Last updated: {new Date(person.last_touched).toLocaleDateString()}
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
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontWeight: 'bold',
  },
  nameInput: {
    width: '100%',
    textAlign: 'center',
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
  followUpsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  followUpChip: {
    marginBottom: 4,
  },
  addFollowUp: {
    marginTop: 12,
  },
  followUpInput: {
    backgroundColor: 'transparent',
  },
  lastTouched: {
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
