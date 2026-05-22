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
  createDietLog,
  fetchDietLogs,
  type DietLog,
} from '@/api/dietApi';

const toNumberOrNull = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

/** Renders the diet log list and entry form. */
export default function DietLogScreen() {
  const [logs, setLogs] = useState<DietLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [loggedAt, setLoggedAt] = useState(new Date().toISOString());

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchDietLogs();
      setLogs(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load diet logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleCreate = async () => {
    if (!mealName.trim()) {
      Alert.alert('Missing meal', 'Meal name is required.');
      return;
    }

    try {
      await createDietLog({
        meal_name: mealName.trim(),
        calories: toNumberOrNull(calories),
        protein_g: toNumberOrNull(protein),
        carbs_g: toNumberOrNull(carbs),
        fat_g: toNumberOrNull(fat),
        logged_at: loggedAt,
      });
      setMealName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setLoggedAt(new Date().toISOString());
      await loadLogs();
    } catch (error) {
      Alert.alert('Error', 'Failed to save diet log');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log Meal</Text>
      <TextInput
        placeholder="Meal name"
        value={mealName}
        onChangeText={setMealName}
        style={styles.input}
      />
      <TextInput
        placeholder="Calories"
        value={calories}
        onChangeText={setCalories}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        placeholder="Protein (g)"
        value={protein}
        onChangeText={setProtein}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        placeholder="Carbs (g)"
        value={carbs}
        onChangeText={setCarbs}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        placeholder="Fat (g)"
        value={fat}
        onChangeText={setFat}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        placeholder="Logged at (ISO)"
        value={loggedAt}
        onChangeText={setLoggedAt}
        style={styles.input}
      />
      <Button title="Save meal" onPress={handleCreate} />

      <Text style={styles.sectionTitle}>Your Meals</Text>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.meal_name}</Text>
              <Text style={styles.cardMeta}>Calories: {item.calories ?? 0}</Text>
              <Text style={styles.cardMeta}>Logged: {item.logged_at}</Text>
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
