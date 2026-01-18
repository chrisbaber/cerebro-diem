import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../../stores/authStore';
import { initializePushNotifications, requestNotificationPermission } from '../../services/notifications';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: string;
  title: string;
  description: string;
  color: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'brain',
    title: 'Welcome to Cerebro Diem',
    description: 'Your AI-powered second brain. Capture thoughts instantly, and let AI organize them for you.',
    color: '#6750A4',
  },
  {
    id: '2',
    icon: 'microphone',
    title: 'Capture with Your Voice',
    description: 'Just hold the mic button and speak. We\'ll transcribe and categorize your thoughts automatically.',
    color: '#7C4DFF',
  },
  {
    id: '3',
    icon: 'robot',
    title: 'AI Does the Work',
    description: 'Every capture is classified into People, Projects, Ideas, or Tasks. No folders, no tags, no friction.',
    color: '#00BFA5',
  },
  {
    id: '4',
    icon: 'bell-ring',
    title: 'Daily Digest',
    description: 'Get a personalized summary each morning with your top priorities and stuck projects.',
    color: '#FF6D00',
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [permissionsRequested, setPermissionsRequested] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { user } = useAuthStore();

  const requestPermissions = async () => {
    setPermissionsRequested(true);

    // Request microphone permission
    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Cerebro Diem needs microphone access for voice capture.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
      } catch (err) {
        console.warn('Microphone permission error:', err);
      }
    }

    // Request notification permission
    await requestNotificationPermission();

    // Initialize push notifications if user is logged in
    if (user?.id) {
      await initializePushNotifications(user.id);
    }
  };

  const handleNext = async () => {
    if (currentIndex === slides.length - 1) {
      // Last slide - request permissions before completing
      if (!permissionsRequested) {
        await requestPermissions();
      }
      // Mark onboarding as complete
      storage.set('onboarding_completed', true);
      onComplete();
    } else {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  const handleSkip = () => {
    storage.set('onboarding_completed', true);
    onComplete();
  };

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => {
    return (
      <View style={[styles.slide, { width }]}>
        <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
          <Icon name={item.icon} size={80} color={item.color} />
        </View>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>{item.title}</Text>
        <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          {item.description}
        </Text>
      </View>
    );
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity,
                  backgroundColor: theme.colors.primary,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.skipContainer}>
        {!isLastSlide && (
          <Button mode="text" onPress={handleSkip} textColor={theme.colors.primary}>
            Skip
          </Button>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {renderDots()}

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleNext}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          {isLastSlide ? 'Get Started' : 'Next'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  buttonContainer: {
    paddingHorizontal: 40,
    paddingBottom: 50,
  },
  button: {
    borderRadius: 28,
  },
  buttonContent: {
    height: 56,
  },
});
