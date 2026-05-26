import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '@/theme/colors';
import { spacing, typography, fontWeight, radius } from '@/theme/typography';
import { X, Zap } from 'lucide-react-native';
import { exerciseDbService, ExerciseDbExercise } from '@/api/exerciseDbService';

interface ExerciseBrowserProps {
  visible: boolean;
  bodyPart?: string | null;
  onClose: () => void;
  onSelectExercise: (exercise: ExerciseDbExercise) => void;
}

const EQUIPMENT_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Barbell', value: 'barbell' },
  { label: 'Dumbbell', value: 'dumbbell' },
  { label: 'Machine', value: 'machine' },
  { label: 'Cable', value: 'cable' },
  { label: 'Bodyweight', value: 'body weight' },
  { label: 'Kettlebell', value: 'kettlebell' },
  { label: 'Medicine Ball', value: 'medicine ball' },
];

export function ExerciseBrowser({
  visible,
  bodyPart,
  onClose,
  onSelectExercise,
}: ExerciseBrowserProps) {
  const [exercises, setExercises] = useState<ExerciseDbExercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<ExerciseDbExercise[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (visible && bodyPart) {
      loadExercises();
    }
  }, [visible, bodyPart]);

  useEffect(() => {
    if (selectedEquipment) {
      const filtered = exercises.filter((ex) =>
        ex.equipment.toLowerCase().includes(selectedEquipment.toLowerCase())
      );
      setFilteredExercises(filtered);
    } else {
      setFilteredExercises(exercises);
    }
  }, [selectedEquipment, exercises]);

  const loadExercises = async () => {
    if (!bodyPart) return;
    setIsLoading(true);
    try {
      const data = await exerciseDbService.getExercisesByBodyPart(bodyPart);
      setExercises(data);
      setFilteredExercises(data);
    } catch (error) {
      console.error('[Gemi] Error loading exercises:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderExerciseCard = ({ item }: { item: ExerciseDbExercise }) => (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseTitle}>
          <Text style={styles.exerciseName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.equipmentBadges}>
            {item.equipment && (
              <View style={styles.equipmentBadge}>
                <Text style={styles.equipmentBadgeText}>{item.equipment.substring(0, 12)}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.exerciseActions}>
          <TouchableOpacity
            style={styles.expandBtn}
            onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
            activeOpacity={0.8}
            hitSlop={8}
          >
            <Text style={styles.expandBtnText}>{expandedId === item.id ? 'Less' : 'More'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => onSelectExercise(item)} activeOpacity={0.85} hitSlop={8}>
          <Zap size={16} color={Colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Overview */}
      <Text style={styles.overview} numberOfLines={2}>
        {item.target || item.bodyPart}
      </Text>

      {/* Expanded Content */}
      {expandedId === item.id && (
        <View style={styles.expandedContent}>
          {/* Target Muscles */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💪 Target Muscles</Text>
            <View style={styles.muscleList}>
              {item.target.length > 0 && (
                <View style={styles.muscleBadge}>
                  <Text style={styles.muscleBadgeText}>{item.target}</Text>
                </View>
              )}
              {item.secondaryMuscles.map((muscle) => (
                <View key={muscle} style={styles.muscleBadge}>
                  <Text style={styles.muscleBadgeText}>{muscle}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Instructions</Text>
            {item.instructions.map((instruction, idx) => (
              <View key={idx} style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>{idx + 1}.</Text>
                <Text style={styles.instructionText}>{instruction}</Text>
              </View>
            ))}
          </View>

          {item.gifUrl && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎥 Demo</Text>
              <Image source={{ uri: item.gifUrl }} style={styles.gif} resizeMode="contain" />
            </View>
          )}
        </View>
      )}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {bodyPart ? bodyPart.toUpperCase() : 'Exercises'}
            </Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.6}>
              <X size={20} color={Colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Equipment Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={styles.filterContent}
          >
            {EQUIPMENT_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterBtn,
                  selectedEquipment === filter.value && styles.filterBtnActive,
                ]}
                onPress={() => setSelectedEquipment(filter.value)}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    selectedEquipment === filter.value && styles.filterBtnTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Exercise List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primaryContainer} />
              <Text style={styles.loadingText}>Loading exercises...</Text>
            </View>
          ) : filteredExercises.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No exercises found</Text>
            </View>
          ) : (
            <FlatList
              data={filteredExercises}
              renderItem={renderExerciseCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
    paddingTop: spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.15)',
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  expandBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.25)',
    backgroundColor: Colors.background,
  },
  expandBtnText: {
    fontSize: typography.xs,
    color: Colors.outline,
    fontWeight: fontWeight.bold,
  },
  headerTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  filterContainer: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.15)',
  },
  filterContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
  },
  filterBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.25)',
    backgroundColor: Colors.background,
  },
  filterBtnActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  filterBtnText: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
  },
  filterBtnTextActive: {
    color: Colors.onPrimary,
  },
  listContent: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.sm,
    color: Colors.outline,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sm,
    color: Colors.outline,
  },
  exerciseCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.2)',
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.xs,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  exerciseTitle: {
    flex: 1,
    marginRight: spacing.sm,
  },
  exerciseName: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.xs,
  },
  equipmentBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  equipmentBadge: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 0.5,
    borderColor: Colors.primaryContainer,
  },
  equipmentBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: Colors.primaryContainer,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overview: {
    fontSize: typography.xs,
    color: Colors.outline,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(190, 200, 210, 0.15)',
    paddingTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.xs,
  },
  muscleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  muscleBadge: {
    backgroundColor: '#a855f744',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: '#a855f7',
  },
  muscleBadgeText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: '#a855f7',
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  instructionNumber: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.primaryContainer,
    marginRight: spacing.sm,
    minWidth: 20,
  },
  instructionText: {
    flex: 1,
    fontSize: typography.xs,
    color: Colors.onSurface,
    lineHeight: 16,
  },
  gif: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    backgroundColor: Colors.background,
  },
});
