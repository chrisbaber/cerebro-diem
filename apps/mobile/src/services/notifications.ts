import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import { supabase } from './supabase';

/**
 * Push Notification Service for Cerebro Diem
 * Uses Firebase Cloud Messaging (FCM)
 */

// Request permission for push notifications
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Android 13+ requires POST_NOTIFICATIONS permission
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true; // Android < 13 doesn't need explicit permission
  }

  // iOS permission request
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  return enabled;
}

// Get the FCM token for this device
export async function getFCMToken(): Promise<string | null> {
  try {
    const token = await messaging().getToken();
    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
}

// Save the FCM token to the user's profile in Supabase
export async function saveFCMToken(userId: string, token: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        fcm_token: token,
        fcm_token_updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Failed to save FCM token:', error);
    }
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
}

// Initialize push notifications
export async function initializePushNotifications(userId: string): Promise<void> {
  // Request permission
  const hasPermission = await requestNotificationPermission();

  if (!hasPermission) {
    console.log('Push notification permission denied');
    return;
  }

  // Get and save token
  const token = await getFCMToken();
  if (token) {
    await saveFCMToken(userId, token);
  }

  // Listen for token refresh
  messaging().onTokenRefresh(async (newToken) => {
    console.log('FCM Token refreshed:', newToken);
    await saveFCMToken(userId, newToken);
  });

  // Handle foreground messages
  messaging().onMessage(async (remoteMessage) => {
    console.log('Foreground message:', remoteMessage);
    // You could show an in-app notification here
  });

  // Handle background/quit messages
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('Background message:', remoteMessage);
  });
}

// Handle notification tap (when app opens from notification)
export function setupNotificationHandlers(onNotificationTap: (data: any) => void): () => void {
  // When app is opened from a quit state via notification
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log('Opened from quit state:', remoteMessage);
        onNotificationTap(remoteMessage.data);
      }
    });

  // When app is in background and opened via notification
  const unsubscribe = messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('Opened from background:', remoteMessage);
    onNotificationTap(remoteMessage.data);
  });

  return unsubscribe;
}

// Check if notifications are enabled
export async function areNotificationsEnabled(): Promise<boolean> {
  const authStatus = await messaging().hasPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}
