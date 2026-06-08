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
import { X, Zap, Search } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, spacing, layout, radius } from '@/theme/typography';
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
                  <Text style={styles.addedBadgeText}>Added</Text>
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
              ? <Text style={styles.zapBtnAddedText}>Added</Text>
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
                <Text style={styles.sectionTitle}>Targeted Muscles</Text>
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
                <Text style={styles.sectionTitle}>Instructions</Text>
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
                <Text style={styles.sectionTitle}>Demo</Text>
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
          <View>
            <Text style={styles.eyebrow}>Muscle Map Browser</Text>
            <Text style={styles.headerTitle}>{muscleName || 'Exercises'}</Text>
          </View>
          <TouchableOpacity onPress={onClose} activeOpacity={0.6} style={styles.closeButton}>
            <X size={20} color={Colors.onSurface} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBarWrap}>
            <Search size={16} color={Colors.outline} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search exercises..."
              placeholderTextColor={Colors.outline}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <X size={14} color={Colors.outline} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Equipment Filter */}
        <View style={{ height: 52 }}>
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
        </View>

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
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.15)',
    backgroundColor: Colors.surfaceContainerLowest,
  },
  eyebrow: {
    fontSize: typography.xs,
    color: Colors.primary,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.18)',
    paddingHorizontal: spacing.sm,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    minHeight: 42,
    fontSize: typography.sm,
    color: Colors.onSurface,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 2,
  },
  filterScroll: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.15)',
    maxHeight: 52,
  },
  filterContainer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 101, 145, 0.12)',
    backgroundColor: Colors.surfaceContainerLow,
    minHeight: 32,
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: typography.xs,
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  filterButtonTextActive: {
    color: Colors.onPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.xxl,
    gap: spacing.base,
  },
  exerciseCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  exerciseCardAdded: {
    borderColor: 'rgba(16, 185, 129, 0.35)',
    backgroundColor: 'rgba(16, 185, 129, 0.02)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  exerciseName: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: 4,
  },
  exerciseNameAdded: {
    color: Colors.outline,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  primaryBadge: {
    fontSize: typography.xs - 1,
    color: Colors.primary,
    backgroundColor: 'rgba(0, 101, 145, 0.08)',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: radius.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  addedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: radius.xs,
    borderWidth: 0.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  addedBadgeText: {
    fontSize: typography.xs - 1,
    fontWeight: fontWeight.bold,
    color: '#10b981',
    textTransform: 'uppercase',
  },
  zapBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0, 101, 145, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 32,
  },
  zapBtnAdded: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  zapBtnAddedText: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: '#10b981',
  },
  equipmentBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  badge: {
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: typography.xs - 1,
    color: Colors.onSurfaceVariant,
    fontWeight: fontWeight.semiBold,
  },
  shortDescription: {
    fontSize: typography.sm,
    color: Colors.outline,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  expandButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  expandButtonText: {
    fontSize: typography.xs,
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  expandedContent: {
    marginTop: spacing.base,
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: 'rgba(190, 200, 210, 0.12)',
  },
  section: {
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  muscleBadgeText: {
    fontSize: typography.xs,
    color: Colors.onPrimary,
    fontWeight: fontWeight.bold,
  },
  muscleBadgeSecondary: {
    backgroundColor: 'rgba(0, 101, 145, 0.08)',
  },
  muscleBadgeTextSecondary: {
    fontSize: typography.xs,
    color: Colors.primary,
    fontWeight: fontWeight.semiBold,
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
    minWidth: 16,
  },
  stepText: {
    flex: 1,
    fontSize: typography.sm,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  gif: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.12)',
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
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.base,
    color: Colors.outline,
    fontWeight: fontWeight.medium,
  },
});
