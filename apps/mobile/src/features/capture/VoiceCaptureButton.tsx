import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Platform,
  PermissionsAndroid,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
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
  const isRecordingRef = useRef(false);
  const hasPermissionRef = useRef<boolean | null>(null);

  const {
    isRecording,
    recordingDuration,
    isCapturing,
    captureVoice,
    startRecording,
    stopRecording,
    updateRecordingDuration,
  } = useCaptureStore();

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    if (isRecording) {
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

  const checkPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const result = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        hasPermissionRef.current = result;
        return result;
      } catch (err) {
        console.warn('Permission check failed:', err);
        return false;
      }
    }
    hasPermissionRef.current = true;
    return true;
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
        const granted =
          grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
          PermissionsAndroid.RESULTS.GRANTED;
        hasPermissionRef.current = granted;
        return granted;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handleStartRecording = useCallback(async () => {
    if (isRecordingRef.current || isCapturing) return;

    // If we don't have permission, request it first (this will break the touch flow, but that's OK)
    if (hasPermissionRef.current === false) {
      const granted = await requestPermissions();
      if (!granted) {
        console.warn('Microphone permission denied');
        return;
      }
    }

    try {
      isRecordingRef.current = true;
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
      isRecordingRef.current = false;
      stopRecording();
    }
  }, [isCapturing, startRecording, stopRecording, updateRecordingDuration]);

  const handleStopRecording = useCallback(async () => {
    if (!isRecordingRef.current) return;

    isRecordingRef.current = false;

    try {
      await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      stopRecording();

      if (recordingPath.current) {
        const audioBase64 = await RNFS.readFile(recordingPath.current, 'base64');
        await captureVoice(audioBase64, 'm4a');
        await RNFS.unlink(recordingPath.current);
        onCaptureComplete?.();
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
      stopRecording();
    }
  }, [captureVoice, stopRecording, onCaptureComplete]);

  // Use PanResponder for reliable touch tracking on Android
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderGrant: (
        _event: GestureResponderEvent,
        _gestureState: PanResponderGestureState
      ) => {
        handleStartRecording();
      },
      onPanResponderRelease: (
        _event: GestureResponderEvent,
        _gestureState: PanResponderGestureState
      ) => {
        handleStopRecording();
      },
      onPanResponderTerminate: (
        _event: GestureResponderEvent,
        _gestureState: PanResponderGestureState
      ) => {
        // Touch was interrupted (e.g., by system gesture)
        handleStopRecording();
      },
      onPanResponderTerminationRequest: () => false, // Don't give up responder
    })
  ).current;

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View
        {...panResponder.panHandlers}
        style={[
          styles.buttonContainer,
          isCapturing && styles.disabled,
        ]}
        pointerEvents={isCapturing ? 'none' : 'auto'}
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
      </View>

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
  disabled: {
    opacity: 0.5,
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
