import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useTheme, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

import { useCaptureStore } from '@/stores/captureStore';
import * as RNFS from 'react-native-fs';

interface VoiceCaptureButtonProps {
  onCaptureComplete?: () => void;
}

const audioRecorderPlayer = new AudioRecorderPlayer();

export default function VoiceCaptureButton({ onCaptureComplete }: VoiceCaptureButtonProps) {
  const theme = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingPath = useRef<string>('');

  const {
    isRecording,
    recordingDuration,
    isCapturing,
    captureVoice,
    startRecording,
    stopRecording,
    updateRecordingDuration,
    error,
  } = useCaptureStore();

  useEffect(() => {
    if (isRecording) {
      // Pulse animation while recording
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);

        return (
          grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
          PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handlePressIn = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.warn('Microphone permission denied');
      return;
    }

    try {
      startRecording();

      const path = Platform.select({
        ios: 'recording.m4a',
        android: `${RNFS.CachesDirectoryPath}/recording.m4a`,
      });

      recordingPath.current = path || '';

      await audioRecorderPlayer.startRecorder(path);

      audioRecorderPlayer.addRecordBackListener(e => {
        updateRecordingDuration(e.currentPosition);
      });
    } catch (err) {
      console.error('Failed to start recording:', err);
      stopRecording();
    }
  };

  const handlePressOut = async () => {
    if (!isRecording) return;

    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      stopRecording();

      if (recordingPath.current) {
        // Read the file and convert to base64
        const audioBase64 = await RNFS.readFile(recordingPath.current, 'base64');

        // Submit for transcription and capture
        await captureVoice(audioBase64, 'm4a');

        // Clean up the temp file
        await RNFS.unlink(recordingPath.current);

        onCaptureComplete?.();
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
      stopRecording();
    }
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isCapturing}
        style={styles.buttonContainer}
      >
        <Animated.View
          style={[
            styles.button,
            {
              backgroundColor: isRecording ? theme.colors.error : theme.colors.primary,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Icon
            name={isRecording ? 'microphone' : 'microphone-outline'}
            size={32}
            color="#FFFFFF"
          />
        </Animated.View>
      </Pressable>

      {isRecording && (
        <View style={styles.durationContainer}>
          <View style={[styles.recordingDot, { backgroundColor: theme.colors.error }]} />
          <Text variant="labelLarge" style={{ color: theme.colors.error }}>
            {formatDuration(recordingDuration)}
          </Text>
        </View>
      )}

      {isCapturing && (
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Processing...
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  buttonContainer: {
    marginBottom: 8,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
