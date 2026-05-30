import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import { X, Zap } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, spacing } from '@/theme/typography';
import { exerciseDbService, ExerciseDbExercise, EquipmentOption } from '@/api/exerciseDbService';
const POPULAR_EXERCISES = [
  'bench press',
  'squat',
  'deadlift',
  'overhead press',
  'pull up',
  'push up',
  'lat pulldown',
  'row',
  'bicep curl',
  'tricep extension',
  'dip',
  'leg press',
  'calf raise',
  'lunges',
  'plank',
  'crunch',
  'hip thrust',
  'face pull',
];

const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const getExerciseName = (exercise: ExerciseDbExercise) => {
  return exercise.name?.trim() || `Exercise ${exercise.id}`;
};

const getPopularityRank = (name: string) => {
  const normalized = normalizeName(name);
  const index = POPULAR_EXERCISES.findIndex((term) => normalized.includes(term));
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

export interface Exercise {
  id: string;
  name: string;
  category: string;
  isCustom?: boolean;
}

interface WGERExerciseBrowserProps {
  visible: boolean;
  muscleId: number | null;
  muscleName?: string;
  onClose: () => void;
  onSelectExercise: (exercise: ExerciseDbExercise) => void;
  addedExerciseNames?: string[];
}

export const WGERExerciseBrowser: React.FC<WGERExerciseBrowserProps> = ({
  visible,
  muscleId,
  muscleName = '',
  onClose,
  onSelectExercise,
  addedExerciseNames = [],
}) => {
  const [exercises, setExercises] = useState<ExerciseDbExercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<ExerciseDbExercise[]>([]);
  const [equipment, setEquipment] = useState<EquipmentOption[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load exercises when modal opens
  useEffect(() => {
    if (visible && muscleId) {
      loadExercises();
    }
  }, [visible, muscleId]);

  const loadExercises = async () => {
    setIsLoading(true);
    try {
      const [exercisesList, equipmentList] = await Promise.all([
        exerciseDbService.getExercisesByMuscle(muscleId!),
        exerciseDbService.getEquipment(),
      ]);

      setExercises(exercisesList);
      setFilteredExercises(exercisesList);
      setEquipment(equipmentList);
      setSelectedEquipment(null);
      setSearchQuery('');
    } catch (error) {
      console.error('Error loading exercises:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter exercises by equipment and search query
  useEffect(() => {
    let filtered = exercises;

    if (selectedEquipment !== null) {
      filtered = filtered.filter((ex) => normalizeName(ex.equipment) === normalizeName(selectedEquipment));
    }

    if (searchQuery.trim()) {
      const query = normalizeName(searchQuery);
      filtered = filtered.filter((ex) => normalizeName(getExerciseName(ex)).includes(query));
    }

    const sorted = [...filtered].sort((a, b) => {
      const aName = getExerciseName(a);
      const bName = getExerciseName(b);
      const aRank = getPopularityRank(aName);
      const bRank = getPopularityRank(bName);

      if (aRank !== bRank) return aRank - bRank;
      return aName.localeCompare(bName);
    });

    setFilteredExercises(sorted);
  }, [selectedEquipment, exercises, searchQuery]);

  const renderExerciseCard = ({ item }: { item: ExerciseDbExercise }) => {
    const isExpanded = expandedId === item.id;
    const isPrimary = item.primaryMuscleIds.includes(muscleId!);
    const exerciseName = getExerciseName(item);
    const equipmentNames = item.equipment ? item.equipment : '';
    const isAdded = addedExerciseNames.some(
      (n) => normalizeName(n) === normalizeName(exerciseName)
    );

    return (
      <View style={[styles.exerciseCard, isAdded && styles.exerciseCardAdded]}>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={[styles.exerciseName, isAdded && styles.exerciseNameAdded]}>{exerciseName}</Text>
            <View style={styles.badgeRow}>
              {isPrimary && <Text style={styles.primaryBadge}>Primary</Text>}
              {isAdded && (
                <View style={styles.addedBadge}>
                  <Text style={styles.addedBadgeText}>✓ Added</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => !isAdded && onSelectExercise(item)}
            activeOpacity={isAdded ? 1 : 0.7}
            style={[styles.zapBtn, isAdded && styles.zapBtnAdded]}
          >
            {isAdded
              ? <Text style={styles.zapBtnAddedText}>✓</Text>
              : <Zap size={20} color={Colors.primary} />
            }
          </TouchableOpacity>
        </View>

        {equipmentNames.length > 0 && (
          <View style={styles.equipmentBadges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{equipmentNames}</Text>
            </View>
          </View>
        )}

        <Text style={styles.shortDescription} numberOfLines={2}>
          {item.target || item.bodyPart || 'Targeted muscle'}
        </Text>

        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.expandButtonText}>{isExpanded ? 'Hide Details' : 'Show Details'}</Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Target Muscles */}
            {(item.target.length > 0 || item.secondaryMuscles.length > 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💪 Targeted Muscles</Text>
                <View style={styles.muscleList}>
                  {item.target.length > 0 && (
                    <View style={styles.muscleBadge}>
                      <Text style={styles.muscleBadgeText}>{item.target}</Text>
                    </View>
                  )}
                  {item.secondaryMuscles.map((muscle) => (
                    <View key={muscle} style={[styles.muscleBadge, styles.muscleBadgeSecondary]}>
                      <Text style={styles.muscleBadgeTextSecondary}>{muscle}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Instructions */}
            {item.instructions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📋 Instructions</Text>
                {item.instructions.map((note, idx) => (
                  <View key={idx} style={styles.instructionStep}>
                    <Text style={styles.stepNumber}>{idx + 1}.</Text>
                    <Text style={styles.stepText}>{note}</Text>
                  </View>
                ))}
              </View>
            )}

            {item.gifUrl.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎥 Demo</Text>
                <Image source={{ uri: item.gifUrl }} style={styles.gif} resizeMode="contain" />
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Exercises for {muscleName}</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.6}>
            <X size={24} color={Colors.onSurface} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search exercises"
            placeholderTextColor={Colors.outline}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Equipment Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedEquipment === null && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedEquipment(null)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedEquipment === null && styles.filterButtonTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {equipment.map((eq) => (
            <TouchableOpacity
              key={eq.id}
              style={[
                styles.filterButton,
                selectedEquipment === eq.id && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedEquipment(eq.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedEquipment === eq.id && styles.filterButtonTextActive,
                ]}
              >
                {eq.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Exercise List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : filteredExercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No exercises found</Text>
          </View>
        ) : (
          <FlatList
            data={filteredExercises}
            renderItem={renderExerciseCard}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            scrollEnabled
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outline,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  searchContainer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outline,
  },
  searchInput: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.outline,
    paddingHorizontal: spacing.base,
    fontSize: typography.sm,
    color: Colors.onSurface,
    backgroundColor: Colors.background,
  },
  filterScroll: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outline,
  },
  filterContainer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  filterButton: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.background,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: typography.xs,
    color: Colors.onBackground,
    fontWeight: fontWeight.medium,
  },
  filterButtonTextActive: {
    color: Colors.onPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    gap: spacing.base,
  },
  exerciseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: Colors.outline,
  },
  exerciseCardAdded: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  exerciseNameAdded: {
    color: Colors.outline,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  addedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  addedBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#10b981',
  },
  zapBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zapBtnAdded: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  zapBtnAddedText: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
    color: '#10b981',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  exerciseName: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.xs,
  },
  primaryBadge: {
    fontSize: typography.xs,
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  equipmentBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  badge: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: typography.xs,
    color: Colors.onSecondary,
    fontWeight: fontWeight.medium,
  },
  shortDescription: {
    fontSize: typography.sm,
    color: Colors.outline,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  expandButton: {
    paddingVertical: spacing.xs,
  },
  expandButtonText: {
    fontSize: typography.sm,
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  expandedContent: {
    marginTop: spacing.base,
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.outline,
  },
  section: {
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.sm,
  },
  muscleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  muscleBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
  },
  muscleBadgeText: {
    fontSize: typography.xs,
    color: Colors.onPrimary,
    fontWeight: fontWeight.bold,
  },
  muscleBadgeSecondary: {
    backgroundColor: '#e3f2fd',
  },
  muscleBadgeTextSecondary: {
    color: Colors.primary,
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  stepNumber: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
    marginRight: spacing.sm,
    minWidth: 20,
  },
  stepText: {
    flex: 1,
    fontSize: typography.sm,
    color: Colors.onSurface,
    lineHeight: 20,
  },
  gif: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.base,
    color: Colors.outline,
  },
});
