import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  createWorkout,
  fetchWorkouts,
  type Workout,
} from '@/api/workoutApi';

/** Renders the workout list and log form. */
export default function WorkoutListScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [performedAt, setPerformedAt] = useState(
    new Date().toISOString()
  );

  const loadWorkouts = async () => {
    setLoading(true);
    try {
      const data = await fetchWorkouts();
      setWorkouts(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load workouts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkouts();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Workout name is required.');
      return;
    }

    try {
      await createWorkout({
        name: name.trim(),
        notes: notes.trim() ? notes.trim() : null,
        performed_at: performedAt,
      });
      setName('');
      setNotes('');
      setPerformedAt(new Date().toISOString());
      await loadWorkouts();
    } catch (error) {
      Alert.alert('Error', 'Failed to save workout');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log Workout</Text>
      <TextInput
        placeholder="Workout name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />
      <TextInput
        placeholder="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        style={styles.input}
      />
      <TextInput
        placeholder="Performed at (ISO)"
        value={performedAt}
        onChangeText={setPerformedAt}
        style={styles.input}
      />
      <Button title="Save workout" onPress={handleCreate} />

      <Text style={styles.sectionTitle}>Your Workouts</Text>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              {item.notes ? <Text>{item.notes}</Text> : null}
              <Text style={styles.cardMeta}>{item.performed_at}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  input: {
    borderColor: '#d0d0d0',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  card: {
    borderColor: '#e0e0e0',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: '#6b6b6b',
    marginTop: 4,
  },
});
