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
  createProgressEntry,
  fetchProgressEntries,
  type ProgressEntry,
} from '@/api/progressApi';

const toNumberOrNull = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

/** Renders the body progress list and entry form. */
export default function ProgressScreen() {
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString());

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await fetchProgressEntries();
      setEntries(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load progress entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleCreate = async () => {
    const weightValue = Number(weight);
    if (!weight.trim() || Number.isNaN(weightValue)) {
      Alert.alert('Missing weight', 'Weight is required.');
      return;
    }

    try {
      await createProgressEntry({
        weight_kg: weightValue,
        body_fat_pct: toNumberOrNull(bodyFat),
        recorded_at: recordedAt,
      });
      setWeight('');
      setBodyFat('');
      setRecordedAt(new Date().toISOString());
      await loadEntries();
    } catch (error) {
      Alert.alert('Error', 'Failed to save entry');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log Body Progress</Text>
      <TextInput
        placeholder="Weight (kg)"
        value={weight}
        onChangeText={setWeight}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        placeholder="Body fat % (optional)"
        value={bodyFat}
        onChangeText={setBodyFat}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        placeholder="Recorded at (ISO)"
        value={recordedAt}
        onChangeText={setRecordedAt}
        style={styles.input}
      />
      <Button title="Save entry" onPress={handleCreate} />

      <Text style={styles.sectionTitle}>Your Entries</Text>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.weight_kg} kg</Text>
              <Text style={styles.cardMeta}>{item.recorded_at}</Text>
              {item.body_fat_pct !== null ? (
                <Text style={styles.cardMeta}>
                  Body fat: {item.body_fat_pct}%
                </Text>
              ) : null}
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
  },
});
