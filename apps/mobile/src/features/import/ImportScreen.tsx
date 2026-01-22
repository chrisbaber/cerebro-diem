import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  Button,
  TextInput,
  ActivityIndicator,
  Snackbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { supabase } from '@/services/supabase';
import { SUPABASE_URL } from '@/config';

type ImportType = 'url' | 'image' | 'pdf' | 'text';

export default function ImportScreen() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<ImportType>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showMessage = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const importUrl = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/import-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: 'url', url }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      showMessage('URL imported successfully!');
      setUrl('');
    } catch (error: any) {
      Alert.alert('Import Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const importImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: true,
        maxWidth: 2000,
        maxHeight: 2000,
        quality: 0.8,
      });

      if (result.didCancel || !result.assets?.[0]?.base64) {
        return;
      }

      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/import-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'image',
            content: result.assets[0].base64,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      showMessage('Image imported successfully!');
    } catch (error: any) {
      Alert.alert('Import Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const importPdf = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf],
      });

      if (!result[0]) return;

      setIsLoading(true);

      // Read file as base64
      const base64 = await RNFS.readFile(result[0].uri, 'base64');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/import-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'pdf',
            content: base64,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      showMessage('PDF imported successfully!');
    } catch (error: any) {
      if (DocumentPicker.isCancel(error)) return;
      Alert.alert('Import Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const importText = async () => {
    if (!text.trim()) {
      Alert.alert('Error', 'Please enter some text');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/import-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: 'text', content: text }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      showMessage('Text imported successfully!');
      setText('');
    } catch (error: any) {
      Alert.alert('Import Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { key: 'url', label: 'URL', icon: 'link' },
    { key: 'image', label: 'Image', icon: 'image' },
    { key: 'pdf', label: 'PDF', icon: 'file-pdf-box' },
    { key: 'text', label: 'Text', icon: 'text' },
  ] as const;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['bottom']}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Import content from various sources. AI will extract key information and classify it automatically.
        </Text>

        {/* Tab Selector */}
        <View style={styles.tabs}>
          {tabs.map((tab) => (
            <Surface
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && { backgroundColor: theme.colors.primaryContainer },
              ]}
              elevation={activeTab === tab.key ? 2 : 0}
            >
              <Button
                mode="text"
                onPress={() => setActiveTab(tab.key)}
                icon={tab.icon}
                textColor={activeTab === tab.key ? theme.colors.primary : theme.colors.onSurfaceVariant}
                compact
              >
                {tab.label}
              </Button>
            </Surface>
          ))}
        </View>

        {/* Content Area */}
        <Surface style={styles.importArea} elevation={1}>
          {activeTab === 'url' && (
            <View>
              <Icon name="link" size={48} color={theme.colors.primary} style={styles.icon} />
              <Text variant="titleMedium" style={styles.title}>Import from URL</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                Paste a URL to extract and save its content
              </Text>
              <TextInput
                mode="outlined"
                label="URL"
                value={url}
                onChangeText={setUrl}
                placeholder="https://example.com/article"
                autoCapitalize="none"
                keyboardType="url"
              />
              <Button
                mode="contained"
                onPress={importUrl}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                icon="download"
              >
                Import URL
              </Button>
            </View>
          )}

          {activeTab === 'image' && (
            <View style={styles.centerContent}>
              <Icon name="image" size={48} color={theme.colors.primary} style={styles.icon} />
              <Text variant="titleMedium" style={styles.title}>Import Image</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16, textAlign: 'center' }}>
                Select an image to extract text using OCR
              </Text>
              <Button
                mode="contained"
                onPress={importImage}
                loading={isLoading}
                disabled={isLoading}
                icon="image-plus"
              >
                Select Image
              </Button>
            </View>
          )}

          {activeTab === 'pdf' && (
            <View style={styles.centerContent}>
              <Icon name="file-pdf-box" size={48} color={theme.colors.primary} style={styles.icon} />
              <Text variant="titleMedium" style={styles.title}>Import PDF</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16, textAlign: 'center' }}>
                Select a PDF to extract its text content
              </Text>
              <Button
                mode="contained"
                onPress={importPdf}
                loading={isLoading}
                disabled={isLoading}
                icon="file-upload"
              >
                Select PDF
              </Button>
            </View>
          )}

          {activeTab === 'text' && (
            <View>
              <Icon name="text" size={48} color={theme.colors.primary} style={styles.icon} />
              <Text variant="titleMedium" style={styles.title}>Import Text</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                Paste text content to import and classify
              </Text>
              <TextInput
                mode="outlined"
                label="Text Content"
                value={text}
                onChangeText={setText}
                placeholder="Paste your text here..."
                multiline
                numberOfLines={8}
                style={styles.textInput}
              />
              <Button
                mode="contained"
                onPress={importText}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                icon="content-save"
              >
                Import Text
              </Button>
            </View>
          )}
        </Surface>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
              Processing import...
            </Text>
          </View>
        )}
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
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
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    borderRadius: 12,
  },
  importArea: {
    padding: 24,
    borderRadius: 16,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  centerContent: {
    alignItems: 'center',
  },
  textInput: {
    minHeight: 150,
  },
  button: {
    marginTop: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
