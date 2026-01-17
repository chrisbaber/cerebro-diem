import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAuthStore } from '@/stores/authStore';

// Auth Screens
import LoginScreen from '@/features/auth/LoginScreen';
import RegisterScreen from '@/features/auth/RegisterScreen';

// Main Screens
import HomeScreen from '@/features/capture/HomeScreen';
import PeopleScreen from '@/features/browse/PeopleScreen';
import ProjectsScreen from '@/features/browse/ProjectsScreen';
import IdeasScreen from '@/features/browse/IdeasScreen';
import TasksScreen from '@/features/browse/TasksScreen';

// Detail Screens
import PersonDetailScreen from '@/features/browse/PersonDetailScreen';
import ProjectDetailScreen from '@/features/browse/ProjectDetailScreen';
import IdeaDetailScreen from '@/features/browse/IdeaDetailScreen';
import TaskDetailScreen from '@/features/browse/TaskDetailScreen';

// Other Screens
import DigestScreen from '@/features/digest/DigestScreen';
import ReviewQueueScreen from '@/features/review/ReviewQueueScreen';
import SettingsScreen from '@/features/settings/SettingsScreen';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  PersonDetail: { id: string };
  ProjectDetail: { id: string };
  IdeaDetail: { id: string };
  TaskDetail: { id: string };
  Digest: undefined;
  ReviewQueue: undefined;
  Settings: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  People: undefined;
  Projects: undefined;
  Ideas: undefined;
  Tasks: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'People':
              iconName = focused ? 'account-group' : 'account-group-outline';
              break;
            case 'Projects':
              iconName = focused ? 'folder' : 'folder-outline';
              break;
            case 'Ideas':
              iconName = focused ? 'lightbulb' : 'lightbulb-outline';
              break;
            case 'Tasks':
              iconName = focused ? 'checkbox-marked-circle' : 'checkbox-marked-circle-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="People" component={PeopleScreen} />
      <Tab.Screen name="Projects" component={ProjectsScreen} />
      <Tab.Screen name="Ideas" component={IdeasScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { user, isInitialized } = useAuthStore();
  const theme = useTheme();

  if (!isInitialized) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.onSurface,
          border: theme.colors.outlineVariant,
          notification: theme.colors.error,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="PersonDetail"
              component={PersonDetailScreen}
              options={{ headerShown: true, title: 'Person' }}
            />
            <Stack.Screen
              name="ProjectDetail"
              component={ProjectDetailScreen}
              options={{ headerShown: true, title: 'Project' }}
            />
            <Stack.Screen
              name="IdeaDetail"
              component={IdeaDetailScreen}
              options={{ headerShown: true, title: 'Idea' }}
            />
            <Stack.Screen
              name="TaskDetail"
              component={TaskDetailScreen}
              options={{ headerShown: true, title: 'Task' }}
            />
            <Stack.Screen
              name="Digest"
              component={DigestScreen}
              options={{ headerShown: true, title: 'Daily Digest' }}
            />
            <Stack.Screen
              name="ReviewQueue"
              component={ReviewQueueScreen}
              options={{ headerShown: true, title: 'Needs Review' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ headerShown: true, title: 'Settings' }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
