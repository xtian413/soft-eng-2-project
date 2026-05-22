import { StyleSheet, Text, View } from 'react-native';

/** Renders the dashboard placeholder screen. */
export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Fitness AI</Text>
      <Text style={styles.subtitle}>Track workouts, diet, and progress.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b6b6b',
  },
});
