import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Minimal test app - no external dependencies
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cerebro Diem</Text>
      <Text style={styles.subtitle}>Minimal Test Build</Text>
      <Text style={styles.info}>If you see this, the basic app works!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFBFE',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6750A4',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#625B71',
    marginBottom: 20,
  },
  info: {
    fontSize: 14,
    color: '#49454F',
    textAlign: 'center',
  },
});
